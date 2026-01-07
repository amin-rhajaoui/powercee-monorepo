from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db, get_current_user
from app.models import PropertyType, User, UserRole
from app.schemas.property import (
    PaginatedPropertiesResponse,
    PropertyCreate,
    PropertyResponse,
    PropertyUpdate,
)
from app.services import property_service

router = APIRouter(prefix="/properties", tags=["Properties"])


@router.get("", response_model=PaginatedPropertiesResponse)
async def list_properties(
    client_id: UUID | None = Query(None, description="Filtre par client"),
    search: str | None = Query(None, description="Recherche label/adresse/ville"),
    type_filter: PropertyType | None = Query(None, alias="type", description="Filtre par type"),
    is_active: bool | None = Query(None, description="Filtre par statut actif"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str | None = Query("created_at", pattern="^(label|type|address|city|created_at)$"),
    sort_dir: str | None = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedPropertiesResponse:
    """Liste paginée des logements du tenant (sécurité par rôle appliquée côté backend)."""
    items, total = await property_service.list_properties(
        db,
        current_user,
        client_id=client_id,
        search=search,
        type_filter=type_filter,
        is_active=is_active,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return PaginatedPropertiesResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PropertyResponse:
    """Récupère un logement par ID (tenant-scoped)."""
    return await property_service.get_property(db, current_user, property_id)


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_in: PropertyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.COMMERCIAL, UserRole.DIRECTION])),
) -> PropertyResponse:
    """Crée un logement. Rôles autorisés: COMMERCIAL, DIRECTION."""
    return await property_service.create_property(db, current_user, property_in)


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: UUID,
    property_in: PropertyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.COMMERCIAL, UserRole.DIRECTION])),
) -> PropertyResponse:
    """Met à jour un logement (contrôle d'accès par rôle côté service)."""
    return await property_service.update_property(db, current_user, property_id, property_in)


@router.post("/{property_id}/archive", response_model=PropertyResponse)
async def archive_property(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.COMMERCIAL, UserRole.DIRECTION])),
) -> PropertyResponse:
    """Archive (soft delete) un logement."""
    return await property_service.archive_property(db, current_user, property_id)


@router.post("/{property_id}/restore", response_model=PropertyResponse)
async def restore_property(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.COMMERCIAL, UserRole.DIRECTION])),
) -> PropertyResponse:
    """Restaure un logement archivé."""
    return await property_service.restore_property(db, current_user, property_id)



