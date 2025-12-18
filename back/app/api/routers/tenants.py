from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, RoleChecker, get_current_user
from app.models import User, Tenant, UserRole
from app.schemas.tenant import TenantBrandingUpdate, TenantResponse

router = APIRouter(prefix="/tenants", tags=["Tenants"])

@router.get("/me/branding", response_model=TenantResponse)
async def get_my_tenant_branding(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère les informations de branding du tenant de l'utilisateur actuel.
    """
    query = select(Tenant).where(Tenant.id == current_user.tenant_id)
    result = await db.execute(query)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant non trouvé."
        )

    return tenant

@router.put("/me/branding", response_model=TenantResponse)
async def update_my_tenant_branding(
    branding_data: TenantBrandingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION]))
):
    """
    Met à jour les informations de branding du tenant de l'utilisateur actuel.
    Accès restreint au rôle DIRECTION.
    """
    # 1. Récupérer le tenant de l'utilisateur
    query = select(Tenant).where(Tenant.id == current_user.tenant_id)
    result = await db.execute(query)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant non trouvé."
        )

    # 2. Mise à jour des champs fournis
    update_data = branding_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    # 3. Sauvegarde
    await db.commit()
    await db.refresh(tenant)

    return tenant

