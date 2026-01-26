"""
Router pour la gestion des documents générés.
"""
import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.services.s3_service import get_file_from_s3

router = APIRouter(prefix="/documents", tags=["Documents"])


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
