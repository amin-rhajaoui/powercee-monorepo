from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import Response
import io
from typing import Union

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.models.folder import FolderStatus, Folder
from app.schemas.folder import (
    FolderCreate,
    FolderResponse,
    FolderUpdate,
    PaginatedFoldersResponse,
    SendForSignatureRequest,
)
from app.services import folder_service
from app.services.document_service import finalize_folder
from app.schemas.document import FinalizeFolderResponse, DocumentResponse
from app.models.document import Document
from app.services.yousign_service import send_folder_for_signature
from app.services.pdf_merger import merge_folder_documents
from sqlalchemy import select, and_

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.post("/from-draft/{draft_id}", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder_from_draft(
    draft_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> FolderResponse:
    """Créer un dossier à partir d'un brouillon existant et archiver le brouillon."""
    folder = await folder_service.create_folder_from_draft(db, current_user, draft_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable ou incomplet (client requis).",
        )
    return FolderResponse.model_validate(folder)


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_data: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> FolderResponse:
    """Créer un nouveau dossier directement (sans passer par un brouillon)."""
    folder = await folder_service.create_folder(db, current_user, folder_data)
    return FolderResponse.model_validate(folder)


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> FolderResponse:
    """Récupérer un dossier par ID."""
    folder = await folder_service.get_folder(db, current_user, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    return FolderResponse.model_validate(folder)


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: UUID,
    folder_update: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> FolderResponse:
    """Mettre à jour un dossier."""
    folder = await folder_service.update_folder(db, current_user, folder_id, folder_update)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    return FolderResponse.model_validate(folder)


@router.get("", response_model=PaginatedFoldersResponse)
async def list_folders(
    module_code: str | None = Query(None, description="Filtre par code de module"),
    client_id: UUID | None = Query(None, description="Filtre par client"),
    status: FolderStatus | None = Query(None, description="Filtre par statut"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> PaginatedFoldersResponse:
    """Lister les dossiers avec pagination."""
    items, total = await folder_service.list_folders(
        db,
        current_user,
        module_code=module_code,
        client_id=client_id,
        status=status,
        page=page,
        page_size=page_size,
    )
    return PaginatedFoldersResponse(
        items=[FolderResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{folder_id}/finalize", response_model=FinalizeFolderResponse, status_code=status.HTTP_200_OK)
async def finalize_folder_endpoint(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> FinalizeFolderResponse:
    """
    Finalise un dossier en générant les 4 documents PDF (note de dimensionnement, devis, attestation TVA, CDC CEE).
    Le dossier passe à l'état COMPLETED et devient non modifiable.
    """
    result = await finalize_folder(db, current_user, folder_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de finaliser le dossier. Vérifiez que le dossier est en IN_PROGRESS et qu'un brouillon de devis existe.",
        )
    
    # Récupérer les documents depuis la base de données
    documents_result = await db.execute(
        select(Document).where(
            and_(
                Document.folder_id == folder_id,
                Document.tenant_id == current_user.tenant_id,
            )
        )
        .order_by(Document.created_at.desc())
    )
    documents = documents_result.scalars().all()
    
    return FinalizeFolderResponse(
        folder_id=UUID(result['folder_id']),
        quote_number=result['quote_number'],
        documents=[DocumentResponse.model_validate(doc) for doc in documents],
    )


@router.post("/{folder_id}/send-for-signature", status_code=status.HTTP_200_OK, response_model=None)
async def send_folder_for_signature_endpoint(
    folder_id: UUID,
    request: SendForSignatureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> Union[StreamingResponse, JSONResponse]:
    """
    Envoie un dossier pour signature.
    - Si method='yousign': Envoie via l'API Yousign et retourne un JSON avec les infos
    - Si method='manual': Fusionne les PDFs et retourne le fichier à télécharger
    
    Dans les deux cas, le dossier passe au statut PENDING_SIGNATURE.
    """
    # Vérifier que le dossier existe et appartient au tenant
    folder_result = await db.execute(
        select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == current_user.tenant_id,
            )
        )
    )
    folder = folder_result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    
    # Vérifier que le dossier est en COMPLETED
    if folder.status != FolderStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le dossier doit être finalisé (statut COMPLETED) avant d'être envoyé en signature.",
        )
    
    # Vérifier qu'il y a des documents
    documents_result = await db.execute(
        select(Document).where(
            and_(
                Document.folder_id == folder_id,
                Document.tenant_id == current_user.tenant_id,
            )
        )
    )
    documents = documents_result.scalars().all()
    
    if not documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun document trouvé pour ce dossier.",
        )
    
    try:
        if request.method == "yousign":
            # Envoi via Yousign
            try:
                result = await send_folder_for_signature(db, current_user, str(folder_id))
            except ValueError as e:
                # Erreur de validation ou de configuration (clé API invalide, etc.)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                )
            
            # Mettre à jour le statut du dossier
            folder.status = FolderStatus.PENDING_SIGNATURE
            await db.commit()
            await db.refresh(folder)
            
            return JSONResponse(
                content={
                    "message": "Dossier envoyé pour signature via Yousign",
                    "signature_request_id": result["signature_request_id"],
                    "signature_link": result.get("signature_link"),
                }
            )
            
        elif request.method == "manual":
            # Fusion des PDFs et téléchargement
            pdf_bytes = await merge_folder_documents(db, current_user, str(folder_id))
            
            # Mettre à jour le statut du dossier
            folder.status = FolderStatus.PENDING_SIGNATURE
            await db.commit()
            
            # Retourner le PDF fusionné
            filename = f"dossier_{folder.quote_number or folder_id}.pdf"
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Méthode invalide. Utilisez 'yousign' ou 'manual'.",
            )
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Rollback en cas d'erreur
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi pour signature: {str(e)}",
        )
