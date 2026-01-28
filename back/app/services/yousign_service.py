"""
Service pour l'intégration avec l'API Yousign v3.
Gère l'upload de documents, la création et l'activation de demandes de signature.
"""
import re
import logging
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import User
from app.models.folder import Folder
from app.models.client import Client
from app.models.document import Document
from app.models.integration import Integration, IntegrationType
from app.services.s3_service import get_file_from_s3

logger = logging.getLogger(__name__)

YOUSIGN_API_BASE_URL = "https://api.yousign.app/v3"
REQUEST_TIMEOUT = 40.0  # Secondes


def _sanitize_name(name: str | None) -> str:
    """
    Nettoie un nom/prénom pour l'API Yousign.
    - Remplace les underscores par des espaces
    - Supprime les caractères non autorisés (regex: [^a-zA-Z\s'-àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ])
    - Strip le résultat
    """
    if not name:
        return ""
    
    # Remplacer les underscores par des espaces
    name = name.replace("_", " ")
    
    # Regex autorisée : lettres, espaces, apostrophes, tirets, caractères accentués français
    allowed_pattern = re.compile(r"[^a-zA-Z\s'-àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]")
    name = allowed_pattern.sub("", name)
    
    return name.strip()


def _format_phone_number(phone: str | None) -> str:
    """
    Formate un numéro de téléphone en format E.164 pour Yousign.
    - Supprime tous les caractères non numériques
    - Si commence par 0 (ex: 06...), remplace par +33
    - Si commence déjà par +33, laisse tel quel
    - Sinon, ajoute +33
    
    Raises:
        ValueError: Si le numéro est vide ou invalide
    """
    if not phone:
        raise ValueError("Le numéro de téléphone est requis pour la signature électronique")
    
    # Supprimer tous les caractères non numériques sauf le +
    digits_only = re.sub(r"[^\d+]", "", phone)
    
    # Si commence par +33, laisser tel quel
    if digits_only.startswith("+33"):
        return digits_only
    
    # Supprimer le + s'il reste
    digits_only = digits_only.replace("+", "")
    
    # Si commence par 0, remplacer par +33
    if digits_only.startswith("0"):
        digits_only = "33" + digits_only[1:]
    
    # Si ne commence pas par 33, ajouter +33
    if not digits_only.startswith("33"):
        digits_only = "33" + digits_only
    
    return "+" + digits_only


async def upload_document(api_key: str, pdf_bytes: bytes) -> str:
    """
    Upload un document PDF vers Yousign.
    
    Args:
        api_key: Clé API Yousign
        pdf_bytes: Contenu du PDF en bytes
    
    Returns:
        document_id: ID du document uploadé
    
    Raises:
        httpx.HTTPStatusError: Si l'upload échoue
        ValueError: Si la clé API est invalide ou la réponse est invalide
    """
    # Vérifier que la clé API n'est pas vide
    if not api_key or not api_key.strip():
        raise ValueError("La clé API Yousign est vide ou invalide")
    
    # Vérifier que la clé API a le bon format (commence généralement par "prod_" ou "sandbox_")
    if not (api_key.startswith("prod_") or api_key.startswith("sandbox_") or api_key.startswith("test_")):
        logger.warning(f"Format de clé API suspect: {api_key[:10]}...")
    
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        files = {
            "file": ("document.pdf", pdf_bytes, "application/pdf")
        }
        data = {
            "nature": "signable_document",
            "parse_anchors": "true"
        }
        
        try:
            response = await client.post(
                f"{YOUSIGN_API_BASE_URL}/documents",
                headers={"Authorization": f"Bearer {api_key}"},
                files=files,
                data=data,
            )
            
            # Gérer les erreurs spécifiques
            if response.status_code == 403:
                error_detail = "Accès refusé par Yousign (403 Forbidden)"
                try:
                    error_body = response.json()
                    if "detail" in error_body:
                        error_detail += f": {error_body['detail']}"
                    elif "message" in error_body:
                        error_detail += f": {error_body['message']}"
                except:
                    pass
                logger.error(f"Erreur 403 YouSign: {error_detail}. Vérifiez que la clé API est valide et active.")
                raise ValueError(
                    f"Erreur lors de l'upload du document: {error_detail}. "
                    "Vérifiez que la clé API Yousign est correcte et active dans les paramètres d'intégration."
                )
            
            response.raise_for_status()
            
        except httpx.HTTPStatusError as e:
            error_detail = f"Erreur HTTP {e.response.status_code}"
            try:
                error_body = e.response.json()
                if "detail" in error_body:
                    error_detail += f": {error_body['detail']}"
                elif "message" in error_body:
                    error_detail += f": {error_body['message']}"
            except:
                error_detail += f": {e.response.text[:200]}"
            
            logger.error(f"Erreur upload YouSign: {error_detail}")
            raise ValueError(f"Erreur lors de l'upload du document: {error_detail}")
        
        result = response.json()
        document_id = result.get("id")
        
        if not document_id:
            raise ValueError("Réponse Yousign invalide: pas d'ID de document")
        
        logger.info(f"Document uploadé avec succès vers Yousign: {document_id}")
        return document_id


async def create_signature_request(
    api_key: str,
    document_ids: list[str],
    client_info: dict[str, Any],
) -> str:
    """
    Crée une demande de signature Yousign.
    
    Args:
        api_key: Clé API Yousign
        document_ids: Liste des IDs de documents uploadés
        client_info: Dictionnaire avec first_name, last_name, email, phone_number
    
    Returns:
        signature_request_id: ID de la demande de signature
    
    Raises:
        httpx.HTTPStatusError: Si la création échoue
    """
    first_name = _sanitize_name(client_info.get("first_name"))
    last_name = _sanitize_name(client_info.get("last_name"))
    email = client_info.get("email", "")
    phone_number = _format_phone_number(client_info.get("phone"))
    
    # Nom de la demande
    name = f"Devis pour {first_name} {last_name}".strip()
    if not name or name == "Devis pour":
        name = "Devis"
    
    payload = {
        "name": name,
        "delivery_mode": "email",
        "timezone": "Europe/Paris",
        "documents": document_ids,
        "signers": [
            {
                "info": {
                    "first_name": first_name or "Client",
                    "last_name": last_name or "Client",
                    "email": email,
                    "phone_number": phone_number,
                    "locale": "fr"
                },
                "fields": [],  # Vide car parse_anchors utilisé
                "signature_level": "electronic_signature",
                "signature_authentication_mode": "otp_sms"
            }
        ]
    }
    
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.post(
            f"{YOUSIGN_API_BASE_URL}/signature_requests",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=payload,
        )
        response.raise_for_status()
        
        result = response.json()
        signature_request_id = result.get("id")
        
        if not signature_request_id:
            raise ValueError("Réponse Yousign invalide: pas d'ID de demande")
        
        logger.info(f"Demande de signature créée: {signature_request_id}")
        return signature_request_id


async def activate_signature_request(api_key: str, signature_request_id: str) -> dict[str, Any]:
    """
    Active une demande de signature Yousign.
    
    Args:
        api_key: Clé API Yousign
        signature_request_id: ID de la demande de signature
    
    Returns:
        Réponse de l'API Yousign avec les détails de la demande activée
    
    Raises:
        httpx.HTTPStatusError: Si l'activation échoue
    """
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.post(
            f"{YOUSIGN_API_BASE_URL}/signature_requests/{signature_request_id}/activate",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"Demande de signature activée: {signature_request_id}")
        return result


async def send_folder_for_signature(
    db: AsyncSession,
    user: User,
    folder_id: str,
) -> dict[str, Any]:
    """
    Orchestre le workflow complet d'envoi d'un dossier pour signature via Yousign.
    
    Args:
        db: Session de base de données
        user: Utilisateur actuel
        folder_id: ID du dossier à envoyer
    
    Returns:
        Dictionnaire avec signature_request_id et autres infos
    
    Raises:
        ValueError: Si Yousign n'est pas configuré ou si les données sont invalides
        httpx.HTTPStatusError: Si l'API Yousign échoue
    """
    # 1. Vérifier que Yousign est configuré
    integration_result = await db.execute(
        select(Integration).where(
            and_(
                Integration.tenant_id == user.tenant_id,
                Integration.integration_type == IntegrationType.YOUSIGN,
                Integration.is_active == True,
            )
        )
    )
    integration = integration_result.scalar_one_or_none()
    
    if not integration:
        raise ValueError("L'intégration Yousign n'est pas configurée ou inactive")
    
    # Déchiffrer la clé API
    try:
        api_key = integration.api_key  # Utilise la propriété qui déchiffre automatiquement
        if not api_key or not api_key.strip():
            raise ValueError("La clé API Yousign est vide. Veuillez la configurer dans les paramètres d'intégration.")
    except ValueError as e:
        logger.error(f"Erreur lors du déchiffrement de la clé API: {e}")
        raise ValueError(
            "Impossible de déchiffrer la clé API Yousign. "
            "Vérifiez que la clé API est correctement configurée dans les paramètres d'intégration."
        )
    
    # 2. Récupérer le dossier avec le client
    folder_result = await db.execute(
        select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == user.tenant_id,
            )
        )
    )
    folder = folder_result.scalar_one_or_none()
    
    if not folder:
        raise ValueError("Dossier introuvable")
    
    # 3. Récupérer le client
    client_result = await db.execute(
        select(Client).where(
            and_(
                Client.id == folder.client_id,
                Client.tenant_id == user.tenant_id,
            )
        )
    )
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise ValueError("Client introuvable")
    
    # 4. Vérifier que le client a les informations nécessaires
    if not client.email:
        raise ValueError("L'email du client est requis pour la signature électronique")
    
    if not client.phone:
        raise ValueError("Le numéro de téléphone du client est requis pour la signature électronique")
    
    # 5. Récupérer les documents du dossier
    documents_result = await db.execute(
        select(Document).where(
            and_(
                Document.folder_id == folder_id,
                Document.tenant_id == user.tenant_id,
            )
        )
        .order_by(Document.created_at.asc())
    )
    documents = documents_result.scalars().all()
    
    if not documents:
        raise ValueError("Aucun document trouvé pour ce dossier")
    
    # 6. Upload chaque document vers Yousign
    document_ids = []
    for doc in documents:
        try:
            # Extraire la clé S3 depuis l'URL
            s3_key = doc.file_url.split('.s3.')[1].split('/', 1)[1] if '.s3.' in doc.file_url else None
            
            if not s3_key:
                logger.warning(f"URL invalide pour le document {doc.id}: {doc.file_url}")
                continue
            
            # Télécharger depuis S3
            pdf_bytes, _ = get_file_from_s3(s3_key)
            
            # Upload vers Yousign
            yousign_doc_id = await upload_document(api_key, pdf_bytes)
            document_ids.append(yousign_doc_id)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'upload du document {doc.id}: {e}")
            raise ValueError(f"Erreur lors de l'upload du document: {str(e)}")
    
    if not document_ids:
        raise ValueError("Aucun document n'a pu être uploadé vers Yousign")
    
    # 7. Créer la demande de signature
    client_info = {
        "first_name": client.first_name,
        "last_name": client.last_name,
        "email": client.email,
        "phone": client.phone,
    }
    
    signature_request_id = await create_signature_request(
        api_key,
        document_ids,
        client_info,
    )
    
    # 8. Activer la demande
    activation_result = await activate_signature_request(api_key, signature_request_id)
    
    return {
        "signature_request_id": signature_request_id,
        "document_ids": document_ids,
        "signature_link": activation_result.get("signers", [{}])[0].get("signature_link") if activation_result.get("signers") else None,
    }
