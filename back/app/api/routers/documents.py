"""
Router pour la gestion des documents générés.
"""
import io
import logging
import os
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.models.document import Document, DocumentType
from app.schemas.document import DocumentResponse
from app.services.s3_service import get_file_from_s3

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger(__name__)

# ===== DEBUG: Sauvegarder les PDFs pour debugging =====
DEBUG_PDF_ENABLED = True  # Mettre False pour désactiver le debugging
DEBUG_PDF_DIR = "/tmp/powercee_pdf_debug"


def _debug_save_served_pdf(pdf_bytes: bytes, doc_type: str, document_id: UUID) -> str | None:
    """
    Sauvegarde le PDF servi au client pour debugging.
    """
    if not DEBUG_PDF_ENABLED:
        return None

    try:
        os.makedirs(DEBUG_PDF_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"3_served_{doc_type}_{str(document_id)[:8]}_{timestamp}.pdf"
        filepath = os.path.join(DEBUG_PDF_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        logger.info(f"[DEBUG PDF] Servi sauvegardé: {filepath} ({len(pdf_bytes)} bytes)")
        return filepath
    except Exception as e:
        logger.error(f"[DEBUG PDF] Erreur lors de la sauvegarde: {e}")
        return None
# ===== FIN DEBUG =====


@router.get("/folders/{folder_id}", response_model=list[DocumentResponse])
async def get_folder_documents(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> list[DocumentResponse]:
    """
    Liste tous les documents d'un dossier.
    """
    result = await db.execute(
        select(Document).where(
            and_(
                Document.folder_id == folder_id,
                Document.tenant_id == current_user.tenant_id,
            )
        )
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> StreamingResponse:
    """
    Télécharge un document PDF depuis S3 avec authentification.
    """
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.tenant_id == current_user.tenant_id,
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable.",
        )
    
    # Extraire la clé S3 depuis l'URL
    # Format URL: https://bucket.s3.region.amazonaws.com/folders/{folder_id}/filename.pdf
    s3_key = document.file_url.split('.s3.')[1].split('/', 1)[1] if '.s3.' in document.file_url else None
    
    if not s3_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL du document invalide.",
        )
    
    try:
        content, content_type = get_file_from_s3(s3_key)

        # DEBUG: Sauvegarder le PDF servi (étape 3)
        doc_type_str = "tva" if document.document_type == DocumentType.TVA_ATTESTATION else (
            "cdc" if document.document_type == DocumentType.CDC_CEE else "other"
        )
        if doc_type_str in ["tva", "cdc"]:
            _debug_save_served_pdf(content, doc_type_str, document_id)

        return StreamingResponse(
            io.BytesIO(content),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{s3_key.split("/")[-1]}"',
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du téléchargement du document: {str(e)}",
        )
