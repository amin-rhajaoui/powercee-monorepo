"""
Router pour la gestion des intégrations (clés API).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, RoleChecker
from app.models import User, UserRole
from app.models.integration import Integration, IntegrationType
from app.schemas.integration import (
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationTypeInfo,
)

router = APIRouter(prefix="/integrations", tags=["Integrations"])

# Informations sur les types d'intégrations disponibles
INTEGRATION_INFO = {
    IntegrationType.YOUSIGN: {
        "name": "Yousign",
        "description": "Signature électronique des documents (devis, attestations, etc.)",
    },
}


def integration_to_response(integration: Integration) -> IntegrationResponse:
    """Convertit un modèle Integration en IntegrationResponse."""
    return IntegrationResponse(
        id=integration.id,
        tenant_id=integration.tenant_id,
        integration_type=integration.integration_type,
        api_key_masked=integration.get_masked_api_key(),
        is_active=integration.is_active,
        config=integration.config,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )


@router.get("/types", response_model=list[IntegrationTypeInfo])
async def get_integration_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION])),
) -> list[IntegrationTypeInfo]:
    """
    Liste tous les types d'intégrations disponibles avec leur statut de configuration.
    """
    # Récupérer les intégrations existantes du tenant
    result = await db.execute(
        select(Integration).where(Integration.tenant_id == current_user.tenant_id)
    )
    existing_integrations = {i.integration_type: i for i in result.scalars().all()}

    # Construire la liste des types avec leur statut
    types_info = []
    for int_type in IntegrationType:
        info = INTEGRATION_INFO.get(int_type, {"name": int_type.value, "description": ""})
        existing = existing_integrations.get(int_type)
        types_info.append(
            IntegrationTypeInfo(
                type=int_type,
                name=info["name"],
                description=info["description"],
                configured=existing is not None,
                is_active=existing.is_active if existing else None,
            )
        )

    return types_info


@router.get("", response_model=list[IntegrationResponse])
async def get_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION])),
) -> list[IntegrationResponse]:
    """
    Liste toutes les intégrations configurées pour le tenant.
    """
    result = await db.execute(
        select(Integration)
        .where(Integration.tenant_id == current_user.tenant_id)
        .order_by(Integration.created_at.desc())
    )
    integrations = result.scalars().all()

    return [integration_to_response(i) for i in integrations]


@router.get("/{integration_type}", response_model=IntegrationResponse)
async def get_integration(
    integration_type: IntegrationType,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION])),
) -> IntegrationResponse:
    """
    Récupère une intégration spécifique par son type.
    """
    result = await db.execute(
        select(Integration).where(
            and_(
                Integration.tenant_id == current_user.tenant_id,
                Integration.integration_type == integration_type,
            )
        )
    )
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intégration {integration_type.value} non configurée.",
        )

    return integration_to_response(integration)


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(
    data: IntegrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION])),
) -> IntegrationResponse:
    """
    Crée ou met à jour une intégration.
    Si une intégration du même type existe déjà, elle est mise à jour.
    """
    # Vérifier si une intégration de ce type existe déjà
    result = await db.execute(
        select(Integration).where(
            and_(
                Integration.tenant_id == current_user.tenant_id,
                Integration.integration_type == data.integration_type,
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Mettre à jour l'existante
        existing.api_key = data.api_key
        existing.is_active = True
        if data.config is not None:
            existing.config = data.config
        await db.commit()
        await db.refresh(existing)
        return integration_to_response(existing)

    # Créer une nouvelle intégration
    integration = Integration(
        tenant_id=current_user.tenant_id,
        integration_type=data.integration_type,
        api_key=data.api_key,
        config=data.config,
        is_active=True,
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)

    return integration_to_response(integration)


@router.patch("/{integration_type}", response_model=IntegrationResponse)
async def update_integration(
    integration_type: IntegrationType,
    data: IntegrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION])),
) -> IntegrationResponse:
    """
    Met à jour une intégration existante.
    """
    result = await db.execute(
        select(Integration).where(
            and_(
                Integration.tenant_id == current_user.tenant_id,
                Integration.integration_type == integration_type,
            )
        )
    )
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intégration {integration_type.value} non configurée.",
        )

    # Mettre à jour les champs fournis
    if data.api_key is not None:
        integration.api_key = data.api_key
    if data.is_active is not None:
        integration.is_active = data.is_active
    if data.config is not None:
        integration.config = data.config

    await db.commit()
    await db.refresh(integration)

    return integration_to_response(integration)


@router.delete("/{integration_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_type: IntegrationType,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION])),
) -> None:
    """
    Supprime une intégration.
    """
    result = await db.execute(
        select(Integration).where(
            and_(
                Integration.tenant_id == current_user.tenant_id,
                Integration.integration_type == integration_type,
            )
        )
    )
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intégration {integration_type.value} non configurée.",
        )

    await db.delete(integration)
    await db.commit()
