"""
Service pour générer et uploader la note de dimensionnement.
"""
import logging
from typing import Any
from uuid import UUID

from app.services.pdf_service import create_sizing_note_pdf
from app.services.s3_service import upload_bytes_to_s3

logger = logging.getLogger(__name__)


async def generate_and_upload_sizing_note(
    folder_id: UUID,
    tenant_id: UUID,
    prospect_details: dict[str, Any],
    sizing_data: dict[str, Any],
    compatible_pacs: list[dict[str, Any]] | None = None,
    selected_pump: dict[str, Any] | None = None,
    selected_heater: dict[str, Any] | None = None,
    thermostat_details: dict[str, Any] | None = None,
    logo_path: str | None = None,
    module_code: str | None = None,
) -> str | None:
    """
    Génère la note de dimensionnement PDF et l'upload sur S3.
    
    Args:
        folder_id: ID du dossier
        tenant_id: ID du tenant
        prospect_details: Détails du bénéficiaire
        sizing_data: Résultats du calcul de dimensionnement
        compatible_pacs: Liste des PACs compatibles (optionnel)
        selected_pump: PAC sélectionnée (optionnel)
        selected_heater: Ballon thermodynamique associé (optionnel)
        thermostat_details: Détails du thermostat (optionnel)
        logo_path: Chemin vers le logo (optionnel)
        module_code: Code du module (optionnel)
    
    Returns:
        URL du fichier uploadé sur S3 ou None en cas d'erreur
    """
    try:
        # Générer le PDF
        pdf_bytes = create_sizing_note_pdf(
            prospect_details=prospect_details,
            sizing_data=sizing_data,
            compatible_pacs=compatible_pacs,
            selected_pump=selected_pump,
            selected_heater=selected_heater,
            thermostat_details=thermostat_details,
            logo_path=logo_path,
            module_code=module_code,
        )
        
        if not pdf_bytes:
            logger.error(f"Échec de la génération de la note de dimensionnement pour le dossier {folder_id}")
            return None
        
        # Upload sur S3
        folder = f"folders/{folder_id}"
        filename = "note_dimensionnement.pdf"
        
        file_url = upload_bytes_to_s3(
            file_bytes=pdf_bytes,
            folder=folder,
            filename=filename,
            content_type="application/pdf",
        )
        
        logger.info(f"Note de dimensionnement uploadée avec succès pour le dossier {folder_id}: {file_url}")
        return file_url
    
    except Exception as e:
        logger.error(f"Erreur lors de la génération/upload de la note de dimensionnement pour le dossier {folder_id}: {e}", exc_info=True)
        return None
