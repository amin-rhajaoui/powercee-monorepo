"""
Router for Module Settings endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole, ModuleSettings
from app.schemas.module_settings import (
    ModuleSettingsCreate,
    ModuleSettingsUpdate,
    ModuleSettingsResponse,
)

router = APIRouter(prefix="/module-settings", tags=["Module Settings"])


@router.get("/{module_code}", response_model=ModuleSettingsResponse)
async def get_module_settings(
    module_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ModuleSettingsResponse:
    """
    Recuperer les parametres d'un module pour le tenant.
    Cree des parametres par defaut si non existants.
    """
    result = await db.execute(
        select(ModuleSettings).where(
            and_(
                ModuleSettings.tenant_id == current_user.tenant_id,
                ModuleSettings.module_code == module_code,
            )
        )
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        # Creer des parametres par defaut
        settings = ModuleSettings(
            tenant_id=current_user.tenant_id,
            module_code=module_code,
            enable_legacy_grid_rules=False,
            rounding_mode="NONE",
            min_margin_amount=0,
            default_labor_product_ids=[],
            fixed_line_items=[],
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return ModuleSettingsResponse.model_validate(settings)


@router.put("/{module_code}", response_model=ModuleSettingsResponse)
async def update_module_settings(
    module_code: str,
    data: ModuleSettingsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ModuleSettingsResponse:
    """
    Creer ou mettre a jour les parametres d'un module.
    """
    result = await db.execute(
        select(ModuleSettings).where(
            and_(
                ModuleSettings.tenant_id == current_user.tenant_id,
                ModuleSettings.module_code == module_code,
            )
        )
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        # Creer nouveaux parametres
        settings = ModuleSettings(
            tenant_id=current_user.tenant_id,
            module_code=module_code,
            **data.model_dump()
        )
        db.add(settings)
    else:
        # Mettre a jour
        update_data = data.model_dump()
        for key, value in update_data.items():
            setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)

    return ModuleSettingsResponse.model_validate(settings)


@router.patch("/{module_code}", response_model=ModuleSettingsResponse)
async def patch_module_settings(
    module_code: str,
    data: ModuleSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ModuleSettingsResponse:
    """
    Mise a jour partielle des parametres d'un module.
    """
    result = await db.execute(
        select(ModuleSettings).where(
            and_(
                ModuleSettings.tenant_id == current_user.tenant_id,
                ModuleSettings.module_code == module_code,
            )
        )
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parametres pour le module {module_code} non trouves",
        )

    # Mise a jour partielle (ignorer les champs None)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)

    return ModuleSettingsResponse.model_validate(settings)
