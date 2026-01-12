"""
Service for Technical Survey CRUD operations.
"""
import logging
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.technical_survey import TechnicalSurvey
from app.models.folder import Folder
from app.models.user import User
from app.schemas.technical_survey import (
    TechnicalSurveyCreate,
    TechnicalSurveyUpdate,
)

logger = logging.getLogger(__name__)


async def get_or_create_technical_survey(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
) -> TechnicalSurvey:
    """
    Récupérer ou créer un technical survey pour un dossier.
    Vérifie que le dossier appartient au tenant de l'utilisateur.
    Crée un survey vide s'il n'existe pas.
    """
    # Vérifier que le folder existe et appartient au tenant
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
        raise ValueError(f"Folder {folder_id} not found or access denied")

    # Récupérer le survey existant
    result = await db.execute(
        select(TechnicalSurvey).where(
            and_(
                TechnicalSurvey.folder_id == folder_id,
                TechnicalSurvey.tenant_id == user.tenant_id,
            )
        )
    )
    survey = result.scalar_one_or_none()

    if survey:
        return survey

    # Créer un survey vide
    survey = TechnicalSurvey(
        folder_id=folder_id,
        tenant_id=user.tenant_id,
    )
    db.add(survey)
    await db.commit()
    await db.refresh(survey)
    logger.info(f"Created empty technical survey for folder {folder_id}")
    return survey


async def upsert_technical_survey(
    db: AsyncSession,
    user: User,
    folder_id: UUID,
    data: TechnicalSurveyCreate | TechnicalSurveyUpdate,
) -> TechnicalSurvey:
    """
    Créer ou mettre à jour le technical survey pour un dossier.
    Utilise un pattern upsert (create if not exists, update if exists).
    """
    # Vérifier que le folder existe et appartient au tenant
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
        raise ValueError(f"Folder {folder_id} not found or access denied")

    # Vérifier si le survey existe déjà
    result = await db.execute(
        select(TechnicalSurvey).where(
            and_(
                TechnicalSurvey.folder_id == folder_id,
                TechnicalSurvey.tenant_id == user.tenant_id,
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existant
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing, field, value)
        await db.commit()
        await db.refresh(existing)
        logger.info(f"Updated technical survey for folder {folder_id}")
        return existing
    else:
        # Créer nouveau
        survey = TechnicalSurvey(
            folder_id=folder_id,
            tenant_id=user.tenant_id,
            photo_house=data.photo_house,
            photo_facade=data.photo_facade,
            photo_old_system=data.photo_old_system,
            photo_electric_panel=data.photo_electric_panel,
            has_linky=data.has_linky,
            photo_linky=data.photo_linky,
            photo_breaker=data.photo_breaker,
        )
        db.add(survey)
        await db.commit()
        await db.refresh(survey)
        logger.info(f"Created technical survey for folder {folder_id}")
        return survey
