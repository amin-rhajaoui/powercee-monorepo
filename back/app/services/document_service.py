"""
Service pour finaliser un dossier et générer les documents PDF.
"""
import logging
import os
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.agency import Agency
from app.models.client import Client
from app.models.document import Document, DocumentType
from app.models.folder import Folder, FolderStatus
from app.models.product import Product
from app.models.property import Property
from app.models.quote_draft import QuoteDraft
from app.models.tenant import Tenant
from app.models.user import User
from app.services.pdf_fillers import fill_cdc_cee_pdf, fill_tva_attestation
from app.services.pricing import PricingService
from app.services.quote_generator import generate_quote_pdf
from app.services.s3_service import upload_bytes_to_s3, get_file_from_s3
from app.services.sizing_note_service import generate_and_upload_sizing_note

logger = logging.getLogger(__name__)

# ===== DEBUG: Sauvegarder les PDFs pour debugging =====
DEBUG_PDF_ENABLED = True  # Mettre False pour désactiver le debugging
DEBUG_PDF_DIR = "/tmp/powercee_pdf_debug"


def _debug_save_pdf(pdf_bytes: bytes, stage: str, doc_type: str, folder_id: UUID) -> str | None:
    """
    Sauvegarde un PDF pour debugging.

    Args:
        pdf_bytes: Le contenu du PDF
        stage: L'étape (1_generated, 2_uploaded_to_s3, 3_served)
        doc_type: Le type de document (tva, cdc)
        folder_id: L'ID du dossier

    Returns:
        Le chemin du fichier sauvegardé
    """
    if not DEBUG_PDF_ENABLED:
        return None

    try:
        # Créer le dossier de debug
        os.makedirs(DEBUG_PDF_DIR, exist_ok=True)

        # Générer un nom de fichier unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{stage}_{doc_type}_{str(folder_id)[:8]}_{timestamp}.pdf"
        filepath = os.path.join(DEBUG_PDF_DIR, filename)

        # Sauvegarder le PDF
        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        logger.info(f"[DEBUG PDF] Sauvegardé: {filepath} ({len(pdf_bytes)} bytes)")
        return filepath
    except Exception as e:
        logger.error(f"[DEBUG PDF] Erreur lors de la sauvegarde: {e}")
        return None


def _debug_verify_from_s3(s3_url: str, doc_type: str, folder_id: UUID) -> str | None:
    """
    Re-télécharge un PDF depuis S3 immédiatement après l'upload pour vérifier.
    """
    if not DEBUG_PDF_ENABLED:
        return None

    try:
        # Extraire la clé S3 depuis l'URL
        s3_key = s3_url.split('.s3.')[1].split('/', 1)[1] if '.s3.' in s3_url else None
        if not s3_key:
            logger.error(f"[DEBUG PDF] Impossible d'extraire la clé S3 depuis: {s3_url}")
            return None

        # Télécharger depuis S3
        content, _ = get_file_from_s3(s3_key)

        # Sauvegarder
        return _debug_save_pdf(content, "2_from_s3", doc_type, folder_id)
    except Exception as e:
        logger.error(f"[DEBUG PDF] Erreur lors de la vérification S3: {e}")
        return None
# ===== FIN DEBUG =====


async def generate_quote_number(
    db: AsyncSession,
    tenant_id: UUID,
) -> str:
    """
    Génère un numéro de devis incrémental pour un tenant.
    Format: DEV-001, DEV-002, etc.
    
    Args:
        db: Session de base de données
        tenant_id: ID du tenant
    
    Returns:
        Numéro de devis (ex: "DEV-001")
    """
    # Compter le nombre de dossiers avec quote_number pour ce tenant
    result = await db.execute(
        select(func.count(Folder.quote_number))
        .where(
            and_(
                Folder.tenant_id == tenant_id,
                Folder.quote_number.isnot(None)
            )
        )
    )
    count = result.scalar() or 0
    
    # Générer le numéro suivant
    next_number = count + 1
    quote_number = f"DEV-{next_number:03d}"
    
    logger.info(f"Numéro de devis généré pour tenant {tenant_id}: {quote_number}")
    return quote_number


async def finalize_folder(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
) -> dict[str, Any] | None:
    """
    Finalise un dossier en générant les 4 documents PDF.
    
    Args:
        db: Session de base de données
        user: Utilisateur qui finalise
        folder_id: ID du dossier à finaliser
    
    Returns:
        Dictionnaire avec les URLs des documents générés ou None en cas d'erreur
    """
    try:
        # 1. Récupérer le dossier avec toutes les relations nécessaires
        result = await db.execute(
            select(Folder)
            .options(
                selectinload(Folder.client),
                selectinload(Folder.property),
                selectinload(Folder.tenant),
            )
            .where(
                and_(
                    Folder.id == folder_id,
                    Folder.tenant_id == user.tenant_id,
                )
            )
        )
        folder = result.scalar_one_or_none()
        
        if not folder:
            logger.error(f"Dossier {folder_id} introuvable pour tenant {user.tenant_id}")
            return None
        
        # 2. Vérifier que le dossier est en IN_PROGRESS
        if folder.status != FolderStatus.IN_PROGRESS:
            logger.error(f"Dossier {folder_id} déjà finalisé (status: {folder.status})")
            return None
        
        # 3. Récupérer l'agence siège social
        agency_result = await db.execute(
            select(Agency)
            .where(
                and_(
                    Agency.tenant_id == user.tenant_id,
                    Agency.is_headquarters == True,
                    Agency.is_active == True,
                )
            )
        )
        agency = agency_result.scalar_one_or_none()
        
        # 4. Récupérer le dernier QuoteDraft pour ce dossier
        logger.info(f"Recherche d'un brouillon de devis pour dossier {folder_id}, tenant {user.tenant_id}")
        
        # D'abord, vérifier combien de brouillons existent pour ce dossier (sans filtre tenant pour debug)
        all_drafts_result = await db.execute(
            select(func.count(QuoteDraft.id))
            .where(QuoteDraft.folder_id == folder_id)
        )
        all_drafts_count = all_drafts_result.scalar() or 0
        logger.info(f"Nombre total de brouillons pour dossier {folder_id}: {all_drafts_count}")
        
        # Si des brouillons existent, récupérer leurs tenant_id pour diagnostic
        if all_drafts_count > 0:
            all_drafts_info = await db.execute(
                select(QuoteDraft.id, QuoteDraft.tenant_id, QuoteDraft.created_at, QuoteDraft.updated_at)
                .where(QuoteDraft.folder_id == folder_id)
                .order_by(desc(QuoteDraft.updated_at))
            )
            drafts_info = all_drafts_info.all()
            logger.info(f"Détails des brouillons trouvés:")
            for draft_info in drafts_info:
                logger.info(
                    f"  - ID: {draft_info.id}, tenant_id: {draft_info.tenant_id}, "
                    f"créé: {draft_info.created_at}, mis à jour: {draft_info.updated_at}"
                )
        
        # Maintenant avec le filtre tenant
        draft_result = await db.execute(
            select(QuoteDraft)
            .where(
                and_(
                    QuoteDraft.folder_id == folder_id,
                    QuoteDraft.tenant_id == user.tenant_id,
                )
            )
            .order_by(desc(QuoteDraft.updated_at))
            .limit(1)
        )
        quote_draft = draft_result.scalar_one_or_none()
        
        if not quote_draft:
            # Logs de diagnostic supplémentaires
            logger.error(
                f"Aucun brouillon de devis trouvé pour le dossier {folder_id} "
                f"(tenant_id: {user.tenant_id}). "
                f"Total brouillons pour ce dossier: {all_drafts_count}"
            )
            
            # Si des brouillons existent mais pas pour ce tenant, c'est un problème d'isolation
            if all_drafts_count > 0:
                logger.error(
                    f"ATTENTION: {all_drafts_count} brouillon(s) existe(nt) pour ce dossier "
                    f"mais aucun ne correspond au tenant {user.tenant_id}. "
                    f"Problème d'isolation multi-tenant possible."
                )
            
            return None
        
        logger.info(f"Brouillon trouvé: {quote_draft.id}, créé le {quote_draft.created_at}, mis à jour le {quote_draft.updated_at}")
        
        # 5. Régénérer la simulation pour obtenir un QuotePreview à jour
        pricing_service = PricingService()
        try:
            quote_preview = await pricing_service.simulate_quote(
                db=db,
                tenant_id=user.tenant_id,
                folder_id=folder_id,
                product_ids=[UUID(str_id) for str_id in quote_draft.product_ids],
                target_rac=float(quote_draft.rac_ttc),
                module_code=quote_draft.module_code,
            )
        except Exception as e:
            logger.error(f"Erreur lors de la régénération de la simulation: {e}", exc_info=True)
            return None
        
        # 6. Générer le numéro de devis
        quote_number = await generate_quote_number(db, user.tenant_id)
        
        # 7. Préparer les données pour les documents
        # Données client/prospect
        # Déterminer le type de bien
        type_bien = 'maison'  # Par défaut
        if folder.property and folder.property.type:
            # PropertyType enum: MAISON, APPARTEMENT, AUTRE
            if folder.property.type.value == 'APPARTEMENT':
                type_bien = 'appartement'
            elif folder.property.type.value == 'MAISON':
                type_bien = 'maison'
        
        # Déterminer le statut d'occupation
        occupation_status = folder.data.get('step2', {}).get('occupation_status', 'OWNER')
        statut_occupation = 'proprietaire' if occupation_status == 'OWNER' else 'locataire'
        
        # Extraire l'adresse
        address_parts = []
        numero = ''
        adresse = ''
        if folder.property and folder.property.address:
            address_parts = folder.property.address.split(' ', 1)
            numero = address_parts[0] if len(address_parts) > 0 else ''
            adresse = address_parts[1] if len(address_parts) > 1 else folder.property.address
        
        prospect_details = {
            'nom': folder.client.last_name or '',
            'prenom': folder.client.first_name or '',
            'numero': numero,
            'adresse': adresse,
            'code_postal': folder.property.postal_code if folder.property else '',
            'ville': folder.property.city if folder.property else '',
            'telephone': folder.client.phone or '',
            'email': folder.client.email or '',
            'type_bien': type_bien,
            'statut_occupation': statut_occupation,
            'surface_chauffee': folder.property.surface_m2 if folder.property else 100,
            'systeme_chauffage_actuel': folder.data.get('step2', {}).get('heating_system', ''),
            'marque_chauffage_actuel': folder.data.get('step2', {}).get('old_boiler_brand', ''),
        }
        
        # Données sizing (depuis folder.data ou calculées)
        sizing_data = folder.data.get('sizing_data', {})
        
        # Données produits (pour pump_details et heater_details)
        pump_details = {}
        heater_details = None
        thermostat_details = None
        
        # Charger tous les produits nécessaires avec leurs relations
        product_ids = [line.product_id for line in quote_preview.lines if line.product_id]
        products_map = {}
        if product_ids:
            products_result = await db.execute(
                select(Product)
                .options(
                    joinedload(Product.heat_pump_details),
                    joinedload(Product.thermostat_details),
                )
                .where(Product.id.in_(product_ids))
            )
            products = products_result.unique().scalars().all()
            products_map = {p.id: p for p in products}
        
        # Extraire les détails depuis les produits du QuotePreview
        for line in quote_preview.lines:
            if line.product_id:
                product = products_map.get(line.product_id)
                
                if product and product.category.value == "HEAT_PUMP" and product.heat_pump_details:
                    pump_details = {
                        'marque': product.brand or '',
                        'modele': product.name or '',
                        'reference': product.reference or '',
                        'usage': 'Chauffage + ECS' if heater_details else 'Chauffage seul',
                        'alimentation': product.heat_pump_details.power_supply.value if product.heat_pump_details.power_supply else '',
                        'puissance_moins_7': str(product.heat_pump_details.power_minus_7) if product.heat_pump_details.power_minus_7 else '',
                        'etas_35': str(product.heat_pump_details.etas_35) if product.heat_pump_details.etas_35 else '',
                        'etas_55': str(product.heat_pump_details.etas_55) if product.heat_pump_details.etas_55 else '',
                        'prime_cee': float(quote_preview.cee_prime),
                    }
                elif product and product.category.value == "THERMOSTAT" and product.thermostat_details:
                    thermostat_details = {
                        'marque': product.brand or '',
                        'modele': product.name or '',
                        'reference': product.reference or '',
                    }
        
        # 8. Générer les 4 documents
        
        # 8.1. Note de dimensionnement
        sizing_note_url = await generate_and_upload_sizing_note(
            folder_id=folder_id,
            tenant_id=user.tenant_id,
            prospect_details=prospect_details,
            sizing_data=sizing_data,
            selected_pump=pump_details if pump_details else None,
            selected_heater=heater_details,
            thermostat_details=thermostat_details,
            logo_path=folder.tenant.logo_url,
            module_code=folder.module_code,
        )
        
        if not sizing_note_url:
            logger.error(f"Échec de la génération de la note de dimensionnement pour le dossier {folder_id}")
            return None
        
        # 8.2. Devis PDF
        quote_pdf_bytes = generate_quote_pdf(
            quote_preview=quote_preview,
            folder=folder,
            client=folder.client,
            property_obj=folder.property,
            tenant=folder.tenant,
            agency=agency,
            user=user,
            quote_number=quote_number,
        )
        
        if not quote_pdf_bytes:
            logger.error(f"Échec de la génération du devis PDF pour le dossier {folder_id}")
            return None
        
        quote_url = upload_bytes_to_s3(
            file_bytes=quote_pdf_bytes,
            folder=f"folders/{folder_id}",
            filename="devis.pdf",
            content_type="application/pdf",
        )
        
        # 8.3. Attestation TVA
        tva_pdf_bytes = fill_tva_attestation(prospect_details)
        if not tva_pdf_bytes:
            logger.error(f"Échec de la génération de l'attestation TVA pour le dossier {folder_id}")
            return None

        # DEBUG: Sauvegarder le PDF généré (étape 1)
        _debug_save_pdf(tva_pdf_bytes, "1_generated", "tva", folder_id)

        tva_url = upload_bytes_to_s3(
            file_bytes=tva_pdf_bytes,
            folder=f"folders/{folder_id}",
            filename="attestation_tva.pdf",
            content_type="application/pdf",
        )

        # DEBUG: Re-télécharger depuis S3 pour vérifier (étape 2)
        _debug_verify_from_s3(tva_url, "tva", folder_id)
        
        # 8.4. CDC CEE
        # Convertir quote_number en int pour fill_cdc_cee_pdf (utiliser le numéro sans DEV-)
        devis_id_int = int(quote_number.replace('DEV-', ''))
        cdc_pdf_bytes = fill_cdc_cee_pdf(
            prospect_details=prospect_details,
            pump_details=pump_details,
            devis_id=devis_id_int,
        )
        if not cdc_pdf_bytes:
            logger.error(f"Échec de la génération du CDC CEE pour le dossier {folder_id}")
            return None

        # DEBUG: Sauvegarder le PDF généré (étape 1)
        _debug_save_pdf(cdc_pdf_bytes, "1_generated", "cdc", folder_id)

        cdc_url = upload_bytes_to_s3(
            file_bytes=cdc_pdf_bytes,
            folder=f"folders/{folder_id}",
            filename="cdc_cee.pdf",
            content_type="application/pdf",
        )

        # DEBUG: Re-télécharger depuis S3 pour vérifier (étape 2)
        _debug_verify_from_s3(cdc_url, "cdc", folder_id)
        
        # 9. Créer les enregistrements Document en base
        documents = [
            Document(
                folder_id=folder_id,
                tenant_id=user.tenant_id,
                document_type=DocumentType.SIZING_NOTE,
                file_url=sizing_note_url,
            ),
            Document(
                folder_id=folder_id,
                tenant_id=user.tenant_id,
                document_type=DocumentType.QUOTE,
                file_url=quote_url,
            ),
            Document(
                folder_id=folder_id,
                tenant_id=user.tenant_id,
                document_type=DocumentType.TVA_ATTESTATION,
                file_url=tva_url,
            ),
            Document(
                folder_id=folder_id,
                tenant_id=user.tenant_id,
                document_type=DocumentType.CDC_CEE,
                file_url=cdc_url,
            ),
        ]
        
        for doc in documents:
            db.add(doc)
        
        # 10. Mettre à jour le dossier
        folder.status = FolderStatus.COMPLETED
        folder.quote_number = quote_number
        
        await db.commit()
        
        logger.info(f"Dossier {folder_id} finalisé avec succès. Numéro de devis: {quote_number}")
        
        return {
            'folder_id': str(folder_id),
            'quote_number': quote_number,
            'documents': [
                {'type': 'sizing_note', 'url': sizing_note_url},
                {'type': 'quote', 'url': quote_url},
                {'type': 'tva_attestation', 'url': tva_url},
                {'type': 'cdc_cee', 'url': cdc_url},
            ],
        }
    
    except Exception as e:
        logger.error(f"Erreur lors de la finalisation du dossier {folder_id}: {e}", exc_info=True)
        await db.rollback()
        return None
