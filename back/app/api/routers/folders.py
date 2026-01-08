from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.models.folder import FolderStatus
from app.schemas.folder import (
    FolderCreate,
    FolderResponse,
    FolderUpdate,
    PaginatedFoldersResponse,
)
from app.services import folder_service

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
