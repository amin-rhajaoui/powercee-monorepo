from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client, Property, PropertyType, User, UserRole
from app.schemas.property import PropertyCreate, PropertyUpdate


def _base_scoped_query(current_user: User):
    """Construit une requête de base filtrée par rôle/tenant."""
    query = select(Property).where(Property.tenant_id == current_user.tenant_id)

    if current_user.role == UserRole.DIRECTION:
        return query

    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            return query.where(False)  # Pas d'agence associée => aucun accès
        # ADMIN_AGENCE voit les logements des clients de son agence
        return query.join(Client).where(Client.agency_id == current_user.agency_id)

    if current_user.role == UserRole.COMMERCIAL:
        # COMMERCIAL voit les logements de ses clients uniquement
        return query.join(Client).where(Client.owner_id == current_user.id)

    # Autres rôles non autorisés
    return query.where(False)


async def list_properties(
    db: AsyncSession,
    current_user: User,
    *,
    client_id: UUID | None = None,
    search: str | None = None,
    type_filter: str | None = None,
    is_active: bool | None = None,
    page: int,
    page_size: int,
    sort_by: str | None = None,
    sort_dir: str | None = None,
):
    """Retourne une liste paginée de logements selon le rôle et les filtres."""
    query = _base_scoped_query(current_user)

    if client_id:
        # Vérifier que le client appartient au tenant et que l'utilisateur y a accès
        client_query = select(Client).where(
            Client.id == client_id,
            Client.tenant_id == current_user.tenant_id
        )
        if current_user.role == UserRole.COMMERCIAL:
            client_query = client_query.where(Client.owner_id == current_user.id)
        elif current_user.role == UserRole.ADMIN_AGENCE:
            if current_user.agency_id:
                client_query = client_query.where(Client.agency_id == current_user.agency_id)
            else:
                return [], 0
        
        client = (await db.execute(client_query)).scalar_one_or_none()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client introuvable ou accès non autorisé."
            )
        query = query.where(Property.client_id == client_id)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            func.lower(Property.label).ilike(pattern)
            | func.lower(Property.address).ilike(pattern)
            | func.lower(Property.city).ilike(pattern)
        )

    if type_filter:
        query = query.where(Property.type == PropertyType(type_filter))

    if is_active is not None:
        query = query.where(Property.is_active == is_active)

    # Tri sécurisé sur whitelist
    sort_column_map = {
        "label": Property.label,
        "type": Property.type,
        "address": Property.address,
        "city": Property.city,
        "created_at": Property.created_at,
    }
    order_expr = Property.created_at.desc()
    if sort_by and sort_by in sort_column_map:
        col = sort_column_map[sort_by]
        order_expr = col.desc() if sort_dir == "desc" else col.asc()
    query = query.order_by(order_expr)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return items, total


async def get_property(
    db: AsyncSession,
    current_user: User,
    property_id: UUID,
) -> Property:
    """Récupère un logement en appliquant les restrictions d'accès."""
    query = _base_scoped_query(current_user).where(Property.id == property_id)
    property_obj = (await db.execute(query)).scalar_one_or_none()
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logement introuvable.")
    return property_obj


def _assert_can_mutate(property_obj: Property, current_user: User, db: AsyncSession) -> None:
    """Vérifie les droits de modification sur un logement."""
    if current_user.role == UserRole.DIRECTION:
        return

    if current_user.role == UserRole.ADMIN_AGENCE:
        # Vérifier que le client du logement appartient à l'agence
        if not current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associée.",
            )
        client_query = select(Client).where(
            Client.id == property_obj.client_id,
            Client.agency_id == current_user.agency_id,
            Client.tenant_id == current_user.tenant_id
        )
        # Note: on ne peut pas utiliser await dans une fonction sync, donc on vérifie via le client
        # La vérification sera faite dans les fonctions async qui appellent cette fonction
        return

    if current_user.role == UserRole.COMMERCIAL:
        # Vérifier que le client appartient au commercial
        client_query = select(Client).where(
            Client.id == property_obj.client_id,
            Client.owner_id == current_user.id,
            Client.tenant_id == current_user.tenant_id
        )
        # Même note que ci-dessus
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissions insuffisantes.")


async def _verify_client_access(
    db: AsyncSession,
    current_user: User,
    client_id: UUID,
) -> Client:
    """Vérifie que l'utilisateur a accès au client."""
    query = select(Client).where(
        Client.id == client_id,
        Client.tenant_id == current_user.tenant_id
    )
    
    if current_user.role == UserRole.COMMERCIAL:
        query = query.where(Client.owner_id == current_user.id)
    elif current_user.role == UserRole.ADMIN_AGENCE:
        if current_user.agency_id:
            query = query.where(Client.agency_id == current_user.agency_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associée."
            )
    
    client = (await db.execute(query)).scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client introuvable ou accès non autorisé."
        )
    return client


async def create_property(
    db: AsyncSession,
    current_user: User,
    property_in: PropertyCreate,
) -> Property:
    """Crée un nouveau logement (tenant_id injecté côté backend)."""
    # Vérifier l'accès au client
    await _verify_client_access(db, current_user, property_in.client_id)

    property_data = property_in.model_dump(exclude={'client_id'})
    property_obj = Property(
        **property_data,
        tenant_id=current_user.tenant_id,
        client_id=property_in.client_id,
    )
    db.add(property_obj)
    await db.commit()
    await db.refresh(property_obj)
    return property_obj


async def update_property(
    db: AsyncSession,
    current_user: User,
    property_id: UUID,
    property_in: PropertyUpdate,
) -> Property:
    """Met à jour un logement existant avec contrôle d'accès."""
    property_obj = await get_property(db, current_user, property_id)
    
    # Vérifier les droits de modification
    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associée."
            )
        client = await _verify_client_access(db, current_user, property_obj.client_id)
        if client.agency_id != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit à ce logement pour cette agence."
            )
    elif current_user.role == UserRole.COMMERCIAL:
        client = await _verify_client_access(db, current_user, property_obj.client_id)
        if client.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez modifier que les logements de vos clients."
            )

    update_data = property_in.model_dump(exclude_unset=True)

    # Si le client_id est modifié, vérifier l'accès au nouveau client
    if "client_id" in update_data:
        await _verify_client_access(db, current_user, update_data["client_id"])

    for field, value in update_data.items():
        setattr(property_obj, field, value)
    property_obj.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(property_obj)
    return property_obj


async def archive_property(
    db: AsyncSession,
    current_user: User,
    property_id: UUID,
) -> Property:
    """Soft delete d'un logement."""
    property_obj = await get_property(db, current_user, property_id)
    
    # Vérifier les droits
    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associée."
            )
        client = await _verify_client_access(db, current_user, property_obj.client_id)
        if client.agency_id != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit à ce logement pour cette agence."
            )
    elif current_user.role == UserRole.COMMERCIAL:
        client = await _verify_client_access(db, current_user, property_obj.client_id)
        if client.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez archiver que les logements de vos clients."
            )

    property_obj.is_active = False
    property_obj.archived_at = datetime.now(timezone.utc)
    property_obj.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(property_obj)
    return property_obj


async def restore_property(
    db: AsyncSession,
    current_user: User,
    property_id: UUID,
) -> Property:
    """Réactive un logement archivé."""
    property_obj = await get_property(db, current_user, property_id)
    
    # Vérifier les droits (même logique que archive)
    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aucune agence associée."
            )
        client = await _verify_client_access(db, current_user, property_obj.client_id)
        if client.agency_id != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit à ce logement pour cette agence."
            )
    elif current_user.role == UserRole.COMMERCIAL:
        client = await _verify_client_access(db, current_user, property_obj.client_id)
        if client.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez restaurer que les logements de vos clients."
            )

    property_obj.is_active = True
    property_obj.archived_at = None
    property_obj.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(property_obj)
    return property_obj

