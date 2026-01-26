"""
Service pour fusionner plusieurs PDFs en un seul fichier.
"""
import io
import logging
from typing import Any

from PyPDF2 import PdfMerger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import User
from app.models.document import Document
from app.services.s3_service import get_file_from_s3

logger = logging.getLogger(__name__)


async def merge_folder_documents(
    db: AsyncSession,
    user: User,
    folder_id: str,
) -> bytes:
    """
    Fusionne tous les PDFs d'un dossier en un seul fichier PDF.
    
    Args:
        db: Session de base de données
        user: Utilisateur actuel (pour isolation tenant)
        folder_id: ID du dossier
    
    Returns:
        Bytes du PDF fusionné
    
    Raises:
        ValueError: Si aucun document n'est trouvé ou si la fusion échoue
    """
    # Récupérer tous les documents du dossier
    documents_result = await db.execute(
        select(Document).where(
            and_(
                Document.folder_id == folder_id,
                Document.tenant_id == user.tenant_id,
            )
        )
        .order_by(Document.created_at.asc())  # Ordre chronologique
    )
    documents = documents_result.scalars().all()
    
    if not documents:
        raise ValueError("Aucun document trouvé pour ce dossier")
    
    # Créer le merger PDF
    merger = PdfMerger()
    
    try:
        # Ajouter chaque document au merger
        for doc in documents:
            try:
                # Extraire la clé S3 depuis l'URL
                s3_key = doc.file_url.split('.s3.')[1].split('/', 1)[1] if '.s3.' in doc.file_url else None
                
                if not s3_key:
                    logger.warning(f"URL invalide pour le document {doc.id}: {doc.file_url}")
                    continue
                
                # Télécharger depuis S3
                pdf_bytes, _ = get_file_from_s3(s3_key)
                
                # Ajouter au merger
                merger.append(io.BytesIO(pdf_bytes))
                
                logger.debug(f"Document {doc.id} ajouté à la fusion")
                
            except Exception as e:
                logger.error(f"Erreur lors de l'ajout du document {doc.id} à la fusion: {e}")
                # Continuer avec les autres documents plutôt que d'échouer complètement
                continue
        
        # Si aucun document n'a pu être ajouté, lever une erreur
        if len(merger.pages) == 0:
            raise ValueError("Aucun document n'a pu être fusionné")
        
        # Générer le PDF fusionné
        output = io.BytesIO()
        merger.write(output)
        merger.close()
        
        pdf_bytes = output.getvalue()
        logger.info(f"Fusion réussie: {len(documents)} documents fusionnés en un PDF de {len(pdf_bytes)} bytes")
        
        return pdf_bytes
        
    except Exception as e:
        merger.close()
        logger.error(f"Erreur lors de la fusion des PDFs: {e}")
        raise ValueError(f"Erreur lors de la fusion des documents: {str(e)}") from e
