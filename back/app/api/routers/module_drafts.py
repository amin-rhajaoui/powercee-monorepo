from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db, get_current_user
from app.models import User, UserRole
from app.schemas.module_draft import (
    ModuleDraftCreate,
    ModuleDraftResponse,
    ModuleDraftUpdate,
    PaginatedModuleDraftsResponse,
)
from app.services import module_draft_service

router = APIRouter(prefix="/module-drafts", tags=["Module Drafts"])


@router.post("", response_model=ModuleDraftResponse, status_code=status.HTTP_201_CREATED)
async def create_draft(
    draft_data: ModuleDraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> ModuleDraftResponse:
    """Créer un nouveau brouillon de module."""
    draft = await module_draft_service.create_draft(db, current_user, draft_data)
    return ModuleDraftResponse.model_validate(draft)


@router.get("/{draft_id}", response_model=ModuleDraftResponse)
async def get_draft(
    draft_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> ModuleDraftResponse:
    """Récupérer un brouillon par ID."""
    draft = await module_draft_service.get_draft(db, current_user, draft_id)
    if not draft:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable.",
        )
    return ModuleDraftResponse.model_validate(draft)


@router.put("/{draft_id}", response_model=ModuleDraftResponse)
async def update_draft(
    draft_id: UUID,
    draft_update: ModuleDraftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> ModuleDraftResponse:
    """Mettre à jour un brouillon."""
    draft = await module_draft_service.update_draft(db, current_user, draft_id, draft_update)
    if not draft:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable.",
        )
    return ModuleDraftResponse.model_validate(draft)


@router.get("", response_model=PaginatedModuleDraftsResponse)
async def list_drafts(
    module_code: str | None = Query(None, description="Filtre par code de module"),
    client_id: UUID | None = Query(None, description="Filtre par client"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> PaginatedModuleDraftsResponse:
    """Lister les brouillons avec pagination."""
    items, total = await module_draft_service.list_drafts(
        db,
        current_user,
        module_code=module_code,
        client_id=client_id,
        page=page,
        page_size=page_size,
    )
    return PaginatedModuleDraftsResponse(
        items=[ModuleDraftResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_draft(
    draft_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> None:
    """Supprimer un brouillon (soft delete)."""
    success = await module_draft_service.delete_draft(db, current_user, draft_id)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable.",
        )

