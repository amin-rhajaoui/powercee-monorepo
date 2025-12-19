import re
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, RoleChecker, get_current_user
from app.models import User, Tenant, UserRole
from app.schemas.tenant import TenantResponse
from app.services.s3_service import upload_tenant_logo

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
    logo_file: UploadFile | None = File(None, alias="logo_file"),
    primary_color: str | None = Form(None),
    secondary_color: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION]))
):
    """
    Met à jour les informations de branding du tenant de l'utilisateur actuel.
    Accès restreint au rôle DIRECTION.
    
    Accepte un fichier logo optionnel via FormData, ainsi que les couleurs.
    Si un logo est fourni, il remplace automatiquement l'ancien logo dans S3.
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

    # 2. Si un fichier logo est fourni, l'uploader et remplacer l'ancien
    if logo_file:
        try:
            new_logo_url = upload_tenant_logo(
                file=logo_file,
                tenant_name=tenant.name,
                tenant_id=tenant.id,
                old_logo_url=tenant.logo_url
            )
            tenant.logo_url = new_logo_url
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de l'upload du logo : {str(e)}"
            )

    # 3. Mise à jour des couleurs si fournies
    if primary_color is not None:
        # Validation du format hex
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', primary_color):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format de couleur primaire invalide. Utilisez le format hex (ex: #000000)."
            )
        tenant.primary_color = primary_color

    if secondary_color is not None:
        # Validation du format hex
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', secondary_color):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format de couleur secondaire invalide. Utilisez le format hex (ex: #FFFFFF)."
            )
        tenant.secondary_color = secondary_color

    # 4. Sauvegarde
    await db.commit()
    await db.refresh(tenant)

    return tenant

