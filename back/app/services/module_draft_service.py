from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.module_draft import ModuleDraft
from app.models.user import User
from app.schemas.module_draft import ModuleDraftCreate, ModuleDraftUpdate


async def create_draft(
    db: AsyncSession,
    user: User,
    draft_data: ModuleDraftCreate,
) -> ModuleDraft:
    """Créer un nouveau brouillon de module avec isolation multi-tenant."""
    draft = ModuleDraft(
        tenant_id=user.tenant_id,
        module_code=draft_data.module_code,
        client_id=draft_data.client_id,
        property_id=draft_data.property_id,
        current_step=draft_data.current_step,
        data=draft_data.data,
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def get_draft(
    db: AsyncSession,
    user: User,
    draft_id: UUID,
) -> ModuleDraft | None:
    """Récupérer un brouillon par ID avec filtrage tenant_id."""
    result = await db.execute(
        select(ModuleDraft).where(
            and_(
                ModuleDraft.id == draft_id,
                ModuleDraft.tenant_id == user.tenant_id,
                ModuleDraft.archived_at.is_(None),
            )
        )
    )
    return result.scalar_one_or_none()


async def update_draft(
    db: AsyncSession,
    user: User,
    draft_id: UUID,
    draft_update: ModuleDraftUpdate,
) -> ModuleDraft | None:
    """Mettre à jour un brouillon avec filtrage tenant_id."""
    draft = await get_draft(db, user, draft_id)
    if not draft:
        return None

    update_data = draft_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)

    await db.commit()
    await db.refresh(draft)
    return draft


async def list_drafts(
    db: AsyncSession,
    user: User,
    module_code: str | None = None,
    client_id: UUID | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[ModuleDraft], int]:
    """Lister les brouillons avec filtrage tenant_id et pagination."""
    conditions = [
        ModuleDraft.tenant_id == user.tenant_id,
        ModuleDraft.archived_at.is_(None),
    ]

    if module_code:
        conditions.append(ModuleDraft.module_code == module_code)
    if client_id:
        conditions.append(ModuleDraft.client_id == client_id)

    # Compter le total
    count_result = await db.execute(
        select(func.count()).select_from(ModuleDraft).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    # Récupérer les items paginés
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ModuleDraft)
        .where(and_(*conditions))
        .order_by(ModuleDraft.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return list(items), total


async def delete_draft(
    db: AsyncSession,
    user: User,
    draft_id: UUID,
) -> bool:
    """Supprimer un brouillon (soft delete) avec filtrage tenant_id."""
    draft = await get_draft(db, user, draft_id)
    if not draft:
        return False

    from datetime import datetime, timezone

    draft.archived_at = datetime.now(timezone.utc)
    await db.commit()
    return True

