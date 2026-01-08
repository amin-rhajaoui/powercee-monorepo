from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.folder import Folder, FolderStatus
from app.models.module_draft import ModuleDraft
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderUpdate


async def create_folder(
    db: AsyncSession,
    user: User,
    folder_data: FolderCreate,
) -> Folder:
    """Créer un nouveau dossier avec isolation multi-tenant."""
    folder = Folder(
        tenant_id=user.tenant_id,
        client_id=folder_data.client_id,
        property_id=folder_data.property_id,
        module_code=folder_data.module_code,
        status=FolderStatus.IN_PROGRESS,
        data=folder_data.data,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


async def create_folder_from_draft(
    db: AsyncSession,
    user: User,
    draft_id: UUID,
) -> Folder | None:
    """Créer un dossier à partir d'un draft existant et archiver le draft."""
    # Récupérer le draft
    result = await db.execute(
        select(ModuleDraft).where(
            and_(
                ModuleDraft.id == draft_id,
                ModuleDraft.tenant_id == user.tenant_id,
                ModuleDraft.archived_at.is_(None),
            )
        )
    )
    draft = result.scalar_one_or_none()

    if not draft:
        return None

    # Vérifier que le draft a un client associé (obligatoire pour un dossier)
    if not draft.client_id:
        return None

    # Construire les données complètes du dossier depuis le draft
    draft_data = {
        "module_code": draft.module_code,
        "current_step": draft.current_step,
        # Champs BAR-TH-171 - Étape 2
        "is_principal_residence": draft.is_principal_residence,
        "occupation_status": draft.occupation_status,
        "heating_system": draft.heating_system,
        "old_boiler_brand": draft.old_boiler_brand,
        "is_water_heating_linked": draft.is_water_heating_linked,
        "water_heating_type": draft.water_heating_type,
        "usage_mode": draft.usage_mode,
        "electrical_phase": draft.electrical_phase,
        "power_kva": draft.power_kva,
        # Champs BAR-TH-171 - Étape 3
        "tax_notice_url": draft.tax_notice_url,
        "address_proof_url": draft.address_proof_url,
        "property_proof_url": draft.property_proof_url,
        "energy_bill_url": draft.energy_bill_url,
        "reference_tax_income": draft.reference_tax_income,
        "household_size": draft.household_size,
        # Champs BAR-TH-171 - Étape 4
        "nb_levels": draft.nb_levels,
        "avg_ceiling_height": draft.avg_ceiling_height,
        "target_temperature": draft.target_temperature,
        "attic_type": draft.attic_type,
        "is_attic_isolated": draft.is_attic_isolated,
        "attic_isolation_year": draft.attic_isolation_year,
        "floor_type": draft.floor_type,
        "is_floor_isolated": draft.is_floor_isolated,
        "floor_isolation_year": draft.floor_isolation_year,
        "wall_isolation_type": draft.wall_isolation_type,
        "wall_isolation_year_interior": draft.wall_isolation_year_interior,
        "wall_isolation_year_exterior": draft.wall_isolation_year_exterior,
        "joinery_type": draft.joinery_type,
        "emitters_configuration": draft.emitters_configuration,
        # Données additionnelles du draft
        **draft.data,
    }

    # Créer le dossier
    folder = Folder(
        tenant_id=user.tenant_id,
        client_id=draft.client_id,
        property_id=draft.property_id,
        module_code=draft.module_code,
        status=FolderStatus.IN_PROGRESS,
        data=draft_data,
        source_draft_id=draft.id,
    )
    db.add(folder)

    # Archiver le draft
    draft.archived_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(folder)
    return folder


async def get_folder(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
) -> Folder | None:
    """Récupérer un dossier par ID avec filtrage tenant_id."""
    result = await db.execute(
        select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == user.tenant_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def update_folder(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
    folder_update: FolderUpdate,
) -> Folder | None:
    """Mettre à jour un dossier avec filtrage tenant_id."""
    folder = await get_folder(db, user, folder_id)
    if not folder:
        return None

    update_data = folder_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)

    await db.commit()
    await db.refresh(folder)
    return folder


async def list_folders(
    db: AsyncSession,
    user: User,
    module_code: str | None = None,
    client_id: UUID | None = None,
    status: FolderStatus | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Folder], int]:
    """Lister les dossiers avec filtrage tenant_id et pagination."""
    conditions = [
        Folder.tenant_id == user.tenant_id,
    ]

    if module_code:
        conditions.append(Folder.module_code == module_code)
    if client_id:
        conditions.append(Folder.client_id == client_id)
    if status:
        conditions.append(Folder.status == status)

    # Compter le total
    count_result = await db.execute(
        select(func.count()).select_from(Folder).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    # Récupérer les items paginés
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Folder)
        .where(and_(*conditions))
        .order_by(Folder.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return list(items), total
