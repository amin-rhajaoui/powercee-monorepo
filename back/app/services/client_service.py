from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client, ClientStatus, ClientType, User, UserRole
from app.schemas.client import ClientCreate, ClientUpdate


async def _ensure_email_unique(
    db: AsyncSession,
    email: str,
    tenant_id: UUID,
    exclude_id: UUID | None = None,
) -> None:
    """Vérifie l'unicité de l'email par tenant."""
    query = select(Client).where(Client.tenant_id == tenant_id, Client.email == email.lower())
    if exclude_id:
        query = query.where(Client.id != exclude_id)
    existing = (await db.execute(query)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un client avec cet email existe déjà dans ce tenant.",
        )


def _base_scoped_query(current_user: User):
    """Construit une requête de base filtrée par rôle/tenant."""
    query = select(Client).where(Client.tenant_id == current_user.tenant_id)

    if current_user.role == UserRole.DIRECTION:
        return query

    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            return query.where(False)  # Pas d'agence associée => aucun accès
        return query.where(Client.agency_id == current_user.agency_id)

    if current_user.role == UserRole.COMMERCIAL:
        return query.where(Client.owner_id == current_user.id)

    # Autres rôles non autorisés
    return query.where(False)


async def list_clients(
    db: AsyncSession,
    current_user: User,
    *,
    search: str | None,
    type_filter: str | None,
    status_filter: str | None,
    page: int,
    page_size: int,
    sort_by: str | None,
    sort_dir: str | None,
):
    """Retourne une liste paginée de clients selon le rôle et les filtres."""
    query = _base_scoped_query(current_user)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            func.lower(Client.email).ilike(pattern)
            | func.lower(Client.first_name).ilike(pattern)
            | func.lower(Client.last_name).ilike(pattern)
            | func.lower(Client.company_name).ilike(pattern)
        )

    if type_filter:
        query = query.where(Client.type == ClientType(type_filter))

    if status_filter:
        query = query.where(Client.status == ClientStatus(status_filter))

    # Tri sécurisé sur whitelist
    sort_column_map = {
        "name": func.coalesce(Client.company_name, Client.last_name, Client.first_name),
        "company_name": Client.company_name,
        "email": Client.email,
        "status": Client.status,
        "type": Client.type,
        "created_at": Client.created_at,
    }
    order_expr = Client.created_at.desc()
    if sort_by and sort_by in sort_column_map:
        col = sort_column_map[sort_by]
        order_expr = col.desc() if sort_dir == "desc" else col.asc()
    query = query.order_by(order_expr)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return items, total


async def get_client(
    db: AsyncSession,
    current_user: User,
    client_id: UUID,
) -> Client:
    """Récupère un client en appliquant les restrictions d'accès."""
    query = _base_scoped_query(current_user).where(Client.id == client_id)
    client = (await db.execute(query)).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    return client


def _assert_can_mutate(client: Client, current_user: User) -> None:
    """Vérifie les droits de modification sur un client."""
    if current_user.role == UserRole.DIRECTION:
        return

    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id or client.agency_id != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit à ce client pour cette agence.",
            )
        return

    if current_user.role == UserRole.COMMERCIAL:
        if client.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez modifier que vos clients.",
            )
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissions insuffisantes.")


async def create_client(
    db: AsyncSession,
    current_user: User,
    client_in: ClientCreate,
) -> Client:
    """Crée un nouveau client (tenant_id injecté côté backend)."""
    await _ensure_email_unique(db, client_in.email, current_user.tenant_id)

    agency_id: Optional[UUID] = client_in.agency_id
    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucune agence associée à l'utilisateur ADMIN_AGENCE.",
            )
        agency_id = current_user.agency_id

    if current_user.role == UserRole.COMMERCIAL and not agency_id:
        # Si le commercial est rattaché à une agence, on la force
        agency_id = current_user.agency_id

    client_data = client_in.model_dump(exclude={'agency_id'})
    client = Client(
        **client_data,
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        agency_id=agency_id,
        status=ClientStatus.ACTIF,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def update_client(
    db: AsyncSession,
    current_user: User,
    client_id: UUID,
    client_in: ClientUpdate,
) -> Client:
    """Met à jour un client existant avec contrôle d'accès et unicité email."""
    client = await get_client(db, current_user, client_id)
    _assert_can_mutate(client, current_user)

    if client_in.email:
        await _ensure_email_unique(db, client_in.email, current_user.tenant_id, exclude_id=client.id)

    update_data = client_in.model_dump(exclude_unset=True)

    # Protection: ADMIN_AGENCE ne peut pas changer d'agence
    if current_user.role == UserRole.ADMIN_AGENCE:
        update_data.pop("agency_id", None)
    elif current_user.role == UserRole.COMMERCIAL:
        # Le commercial peut associer à son agence uniquement
        if "agency_id" in update_data and update_data["agency_id"] != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agence non autorisée pour ce client.",
            )

    for field, value in update_data.items():
        setattr(client, field, value)
    client.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(client)
    return client


async def archive_client(
    db: AsyncSession,
    current_user: User,
    client_id: UUID,
) -> Client:
    """Soft delete d'un client."""
    client = await get_client(db, current_user, client_id)
    _assert_can_mutate(client, current_user)

    client.status = ClientStatus.ARCHIVE
    client.archived_at = datetime.now(timezone.utc)
    client.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(client)
    return client


async def restore_client(
    db: AsyncSession,
    current_user: User,
    client_id: UUID,
) -> Client:
    """Réactive un client archivé."""
    client = await get_client(db, current_user, client_id)
    _assert_can_mutate(client, current_user)

    client.status = ClientStatus.ACTIF
    client.archived_at = None
    client.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(client)
    return client


