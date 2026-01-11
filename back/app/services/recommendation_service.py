"""
Service for Installation Recommendations CRUD operations.
"""
import logging
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.installation_recommendation import InstallationRecommendation
from app.models.folder import Folder
from app.models.user import User
from app.schemas.installation_recommendation import (
    InstallationRecommendationCreate,
    InstallationRecommendationUpdate,
)

logger = logging.getLogger(__name__)


async def get_recommendation_by_folder(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
) -> InstallationRecommendation | None:
    """
    Recuperer les preconisations d'installation pour un dossier.
    Verifie que le dossier appartient au tenant de l'utilisateur.
    """
    # Verifier que le folder appartient au tenant
    folder_result = await db.execute(
        select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == user.tenant_id,
            )
        )
    )
    folder = folder_result.scalar_one_or_none()
    if not folder:
        return None

    # Recuperer les preconisations
    result = await db.execute(
        select(InstallationRecommendation).where(
            and_(
                InstallationRecommendation.folder_id == folder_id,
                InstallationRecommendation.tenant_id == user.tenant_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def create_or_update_recommendation(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
    data: InstallationRecommendationCreate | InstallationRecommendationUpdate,
) -> InstallationRecommendation | None:
    """
    Creer ou mettre a jour les preconisations d'installation pour un dossier.
    Utilise un pattern upsert (create if not exists, update if exists).
    """
    # Verifier que le folder existe et appartient au tenant
    folder_result = await db.execute(
        select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == user.tenant_id,
            )
        )
    )
    folder = folder_result.scalar_one_or_none()
    if not folder:
        logger.warning(f"Folder {folder_id} not found for tenant {user.tenant_id}")
        return None

    # Verifier si les preconisations existent deja
    existing = await get_recommendation_by_folder(db, user, folder_id)

    if existing:
        # Update existant
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing, field, value)
        await db.commit()
        await db.refresh(existing)
        logger.info(f"Updated recommendation for folder {folder_id}")
        return existing
    else:
        # Creer nouveau
        recommendation = InstallationRecommendation(
            tenant_id=user.tenant_id,
            folder_id=folder_id,
            access_recommendations=data.access_recommendations,
            indoor_unit_recommendations=data.indoor_unit_recommendations,
            outdoor_unit_recommendations=data.outdoor_unit_recommendations,
            safety_recommendations=data.safety_recommendations,
            photo_urls=data.photo_urls or [],
        )
        db.add(recommendation)
        await db.commit()
        await db.refresh(recommendation)
        logger.info(f"Created recommendation for folder {folder_id}")
        return recommendation


async def delete_recommendation(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
) -> bool:
    """
    Supprimer les preconisations d'installation pour un dossier.
    Retourne True si supprime, False si non trouve.
    """
    recommendation = await get_recommendation_by_folder(db, user, folder_id)
    if not recommendation:
        return False

    await db.delete(recommendation)
    await db.commit()
    logger.info(f"Deleted recommendation for folder {folder_id}")
    return True
