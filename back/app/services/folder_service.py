import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.folder import Folder, FolderStatus
from app.models.module_draft import ModuleDraft
from app.models.property import Property
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderUpdate
from app.services.elevation_service import get_elevation
from app.services.mpr_service import calculate_mpr_color
from app.services.climate_service import get_climate_zone

logger = logging.getLogger(__name__)


def determine_emitter_type(emitters_configuration: list[dict] | None) -> str | None:
    """
    Détermine le type d'émetteur principal du logement.
    
    Args:
        emitters_configuration: Liste des configurations d'émetteurs par niveau
            Format: [{"level": 0, "emitters": ["FONTE", "RADIATEURS"]}, ...]
    
    Returns:
        "BASSE_TEMPERATURE" si tous les niveaux ont uniquement "PLANCHER_CHAUFFANT"
        "MOYENNE_HAUTE_TEMPERATURE" sinon
        None si la configuration est vide ou invalide
    """
    if not emitters_configuration or len(emitters_configuration) == 0:
        return None
    
    # Vérifier que tous les niveaux ont uniquement "PLANCHER_CHAUFFANT"
    for config in emitters_configuration:
        emitters = config.get("emitters", [])
        
        # Si aucun émetteur configuré, on considère que ce n'est pas basse température
        if not emitters or len(emitters) == 0:
            return "MOYENNE_HAUTE_TEMPERATURE"
        
        # Si un seul type d'émetteur et c'est PLANCHER_CHAUFFANT, continuer
        # Sinon, c'est moyenne/haute température
        if len(emitters) == 1 and emitters[0] == "PLANCHER_CHAUFFANT":
            continue
        else:
            return "MOYENNE_HAUTE_TEMPERATURE"
    
    # Si on arrive ici, tous les niveaux ont uniquement PLANCHER_CHAUFFANT
    return "BASSE_TEMPERATURE"


async def create_folder(
    db: AsyncSession,
    user: User,
    folder_data: FolderCreate,
) -> Folder:
    """Créer un nouveau dossier avec isolation multi-tenant."""
    folder = Folder(
        tenant_id=user.tenant_id,
        client_id=folder_data.client_id,
        property_id=folder_data.property_id,
        module_code=folder_data.module_code,
        status=FolderStatus.IN_PROGRESS,
        data=folder_data.data,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


async def create_folder_from_draft(
    db: AsyncSession,
    user: User,
    draft_id: UUID,
) -> Folder | None:
    """Créer un dossier à partir d'un draft existant et archiver le draft."""
    # Récupérer le draft
    result = await db.execute(
        select(ModuleDraft).where(
            and_(
                ModuleDraft.id == draft_id,
                ModuleDraft.tenant_id == user.tenant_id,
                ModuleDraft.archived_at.is_(None),
            )
        )
    )
    draft = result.scalar_one_or_none()

    if not draft:
        return None

    # Vérifier que le draft a un client associé (obligatoire pour un dossier)
    if not draft.client_id:
        return None

    # Rafraîchir le draft pour s'assurer d'avoir les dernières données
    await db.refresh(draft)

    # Construire les données complètes du dossier depuis le draft
    # Toutes les données métier sont maintenant dans draft.data
    step2_data = draft.data.get("step2", {}) if isinstance(draft.data, dict) else {}
    step3_data = draft.data.get("step3", {}) if isinstance(draft.data, dict) else {}
    step4_data = draft.data.get("step4", {}) if isinstance(draft.data, dict) else {}
    
    # Logger pour debug
    logger.info(f"Données du draft pour création du dossier: step4_data={step4_data}")
    
    # Construire draft_data en ne copiant que les valeurs non-None
    draft_data = {
        "module_code": draft.module_code,
        "current_step": draft.current_step,
    }
    
    # Ajouter les champs BAR-TH-171 - Étape 2 (depuis draft.data.step2) seulement si présents
    if step2_data.get("is_principal_residence") is not None:
        draft_data["is_principal_residence"] = step2_data.get("is_principal_residence")
    if step2_data.get("occupation_status") is not None:
        draft_data["occupation_status"] = step2_data.get("occupation_status")
    if step2_data.get("heating_system") is not None:
        draft_data["heating_system"] = step2_data.get("heating_system")
    if step2_data.get("old_boiler_brand") is not None:
        draft_data["old_boiler_brand"] = step2_data.get("old_boiler_brand")
    if step2_data.get("is_water_heating_linked") is not None:
        draft_data["is_water_heating_linked"] = step2_data.get("is_water_heating_linked")
    if step2_data.get("water_heating_type") is not None:
        draft_data["water_heating_type"] = step2_data.get("water_heating_type")
    if step2_data.get("usage_mode") is not None:
        draft_data["usage_mode"] = step2_data.get("usage_mode")
    if step2_data.get("electrical_phase") is not None:
        draft_data["electrical_phase"] = step2_data.get("electrical_phase")
    if step2_data.get("power_kva") is not None:
        draft_data["power_kva"] = step2_data.get("power_kva")
    
    # Ajouter les champs BAR-TH-171 - Étape 3 (depuis draft.data.step3) seulement si présents
    if step3_data.get("tax_notice_url") is not None:
        draft_data["tax_notice_url"] = step3_data.get("tax_notice_url")
    if step3_data.get("address_proof_url") is not None:
        draft_data["address_proof_url"] = step3_data.get("address_proof_url")
    if step3_data.get("property_proof_url") is not None:
        draft_data["property_proof_url"] = step3_data.get("property_proof_url")
    if step3_data.get("energy_bill_url") is not None:
        draft_data["energy_bill_url"] = step3_data.get("energy_bill_url")
    if step3_data.get("reference_tax_income") is not None:
        draft_data["reference_tax_income"] = step3_data.get("reference_tax_income")
    if step3_data.get("household_size") is not None:
        draft_data["household_size"] = step3_data.get("household_size")
    
    # Ajouter les champs BAR-TH-171 - Étape 4 (depuis draft.data.step4) seulement si présents
    if step4_data.get("nb_levels") is not None:
        draft_data["nb_levels"] = step4_data.get("nb_levels")
    if step4_data.get("avg_ceiling_height") is not None:
        draft_data["avg_ceiling_height"] = step4_data.get("avg_ceiling_height")
    if step4_data.get("target_temperature") is not None:
        draft_data["target_temperature"] = step4_data.get("target_temperature")
    if step4_data.get("attic_type") is not None:
        draft_data["attic_type"] = step4_data.get("attic_type")
    if step4_data.get("is_attic_isolated") is not None:
        draft_data["is_attic_isolated"] = step4_data.get("is_attic_isolated")
    if step4_data.get("attic_isolation_year") is not None:
        draft_data["attic_isolation_year"] = step4_data.get("attic_isolation_year")
    if step4_data.get("floor_type") is not None:
        draft_data["floor_type"] = step4_data.get("floor_type")
    if step4_data.get("is_floor_isolated") is not None:
        draft_data["is_floor_isolated"] = step4_data.get("is_floor_isolated")
    if step4_data.get("floor_isolation_year") is not None:
        draft_data["floor_isolation_year"] = step4_data.get("floor_isolation_year")
    if step4_data.get("wall_isolation_type") is not None:
        draft_data["wall_isolation_type"] = step4_data.get("wall_isolation_type")
    if step4_data.get("wall_isolation_year_interior") is not None:
        draft_data["wall_isolation_year_interior"] = step4_data.get("wall_isolation_year_interior")
    if step4_data.get("wall_isolation_year_exterior") is not None:
        draft_data["wall_isolation_year_exterior"] = step4_data.get("wall_isolation_year_exterior")
    if step4_data.get("joinery_type") is not None:
        draft_data["joinery_type"] = step4_data.get("joinery_type")
    if step4_data.get("emitters_configuration") is not None:
        draft_data["emitters_configuration"] = step4_data.get("emitters_configuration")
    
    # Ajouter les données additionnelles du draft (conserver toute la structure data)
    # Cela permet de conserver step1, step2, step3, step4 si présents
    if isinstance(draft.data, dict):
        draft_data.update(draft.data)

    # Calculer la couleur MPR
    mpr_color = None
    reference_tax_income = step3_data.get("reference_tax_income")
    household_size = step3_data.get("household_size")
    if reference_tax_income is not None and household_size is not None:
        # Récupérer le code postal depuis la Property si disponible
        postal_code = None
        property_obj = None
        
        if draft.property_id:
            property_result = await db.execute(
                select(Property).where(
                    and_(
                        Property.id == draft.property_id,
                        Property.tenant_id == user.tenant_id,
                    )
                )
            )
            property_obj = property_result.scalar_one_or_none()
            if property_obj and property_obj.postal_code:
                postal_code = property_obj.postal_code
        
        if postal_code:
            try:
                mpr_color = calculate_mpr_color(
                    rfr=float(reference_tax_income),
                    household_size=household_size,
                    postal_code=postal_code
                )
                logger.info(f"Couleur MPR calculée: {mpr_color} pour RFR={reference_tax_income}, household_size={household_size}, postal_code={postal_code}")
            except Exception as e:
                logger.error(f"Erreur lors du calcul de la couleur MPR: {e}")
        else:
            logger.warning("Code postal non disponible pour calculer la couleur MPR")
    else:
        logger.warning("RFR ou household_size manquant pour calculer la couleur MPR")

    # Déterminer le type d'émetteur
    emitters_configuration = step4_data.get("emitters_configuration")
    emitter_type = determine_emitter_type(emitters_configuration)
    if emitter_type:
        logger.info(f"Type d'émetteur déterminé: {emitter_type}")

    # Récupérer l'altitude si une Property est associée
    if property_obj and property_obj.latitude is not None and property_obj.longitude is not None:
        try:
            altitude = await get_elevation(
                latitude=property_obj.latitude,
                longitude=property_obj.longitude
            )
            if altitude is not None:
                property_obj.altitude = altitude
                logger.info(f"Altitude récupérée et mise à jour: {altitude}m pour Property {property_obj.id}")
            else:
                logger.warning(f"Impossible de récupérer l'altitude pour Property {property_obj.id}")
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'altitude: {e}")

    # Récupérer la zone climatique depuis la Property ou la calculer
    zone_climatique = None
    if property_obj:
        # Utiliser la zone_climatique de la Property si disponible
        if property_obj.zone_climatique:
            zone_climatique = property_obj.zone_climatique
            logger.info(f"Zone climatique récupérée depuis Property: {zone_climatique}")
        elif property_obj.postal_code:
            # Sinon, la calculer depuis le code postal
            try:
                climate_zone = await get_climate_zone(db, property_obj.postal_code)
                if climate_zone:
                    zone_climatique = climate_zone.zone_climatique
                    # Mettre à jour la Property aussi pour éviter de recalculer
                    property_obj.zone_climatique = zone_climatique
                    logger.info(f"Zone climatique calculée: {zone_climatique} pour Property {property_obj.id}")
            except Exception as e:
                logger.error(f"Erreur lors de la récupération de la zone climatique: {e}")

    # Créer le dossier
    folder = Folder(
        tenant_id=user.tenant_id,
        client_id=draft.client_id,
        property_id=draft.property_id,
        module_code=draft.module_code,
        status=FolderStatus.IN_PROGRESS,
        data=draft_data,
        source_draft_id=draft.id,
        mpr_color=mpr_color,
        emitter_type=emitter_type,
        zone_climatique=zone_climatique,
    )
    db.add(folder)

    # Archiver le draft
    draft.archived_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(folder)
    return folder


async def get_folder(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
) -> Folder | None:
    """Récupérer un dossier par ID avec filtrage tenant_id."""
    result = await db.execute(
        select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == user.tenant_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def update_folder(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
    folder_update: FolderUpdate,
) -> Folder | None:
    """Mettre à jour un dossier avec filtrage tenant_id."""
    folder = await get_folder(db, user, folder_id)
    if not folder:
        return None

    update_data = folder_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)

    await db.commit()
    await db.refresh(folder)
    return folder


async def list_folders(
    db: AsyncSession,
    user: User,
    module_code: str | None = None,
    client_id: UUID | None = None,
    status: FolderStatus | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Folder], int]:
    """Lister les dossiers avec filtrage tenant_id et pagination."""
    conditions = [
        Folder.tenant_id == user.tenant_id,
    ]

    if module_code:
        conditions.append(Folder.module_code == module_code)
    if client_id:
        conditions.append(Folder.client_id == client_id)
    if status:
        conditions.append(Folder.status == status)

    # Compter le total
    count_result = await db.execute(
        select(func.count()).select_from(Folder).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    # Récupérer les items paginés
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Folder)
        .where(and_(*conditions))
        .order_by(Folder.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return list(items), total
