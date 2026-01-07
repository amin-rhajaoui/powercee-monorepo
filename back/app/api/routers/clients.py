from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models import ClientStatus, ClientType, PropertyType, User
from app.schemas.client import (
  ClientCreate,
  ClientResponse,
  ClientUpdate,
  PaginatedClientsResponse,
)
from app.schemas.property import PaginatedPropertiesResponse
from app.services import client_service, property_service

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=PaginatedClientsResponse)
async def list_clients(
    search: str | None = Query(None, description="Recherche nom/email"),
    type_filter: ClientType | None = Query(None, alias="type", description="Filtre par type"),
    status_filter: ClientStatus | None = Query(None, alias="status", description="Filtre par statut"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str | None = Query("created_at", pattern="^(name|company_name|email|status|type|created_at)$"),
    sort_dir: str | None = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedClientsResponse:
    """Liste paginée des clients du tenant (sécurité par rôle appliquée côté backend)."""
    items, total = await client_service.list_clients(
        db,
        current_user,
        search=search,
        type_filter=type_filter,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return PaginatedClientsResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Récupère un client par ID (tenant-scoped)."""
    return await client_service.get_client(db, current_user, client_id)


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Crée un client. Rôles autorisés: COMMERCIAL (ses clients), DIRECTION, ADMIN_AGENCE."""
    return await client_service.create_client(db, current_user, client_in)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Met à jour un client (contrôle d'accès par rôle côté service)."""
    return await client_service.update_client(db, current_user, client_id, client_in)


@router.post("/{client_id}/archive", response_model=ClientResponse)
async def archive_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Archive (soft delete) un client."""
    return await client_service.archive_client(db, current_user, client_id)


@router.post("/{client_id}/restore", response_model=ClientResponse)
async def restore_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientResponse:
    """Restaure un client archivé."""
    return await client_service.restore_client(db, current_user, client_id)


@router.get("/{client_id}/properties", response_model=PaginatedPropertiesResponse)
async def list_client_properties(
    client_id: UUID,
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
    """Liste paginée des logements d'un client spécifique."""
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


