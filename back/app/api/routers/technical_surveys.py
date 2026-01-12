"""
Router for Technical Survey endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.schemas.technical_survey import (
    TechnicalSurveyResponse,
    TechnicalSurveyUpdate,
)
from app.services import technical_survey_service

router = APIRouter(prefix="/folders", tags=["Technical Surveys"])


@router.get("/{folder_id}/technical-survey", response_model=TechnicalSurveyResponse)
async def get_technical_survey(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> TechnicalSurveyResponse:
    """Récupérer ou créer un technical survey pour un dossier."""
    try:
        survey = await technical_survey_service.get_or_create_technical_survey(
            db, current_user, folder_id
        )
        return TechnicalSurveyResponse.model_validate(survey)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put("/{folder_id}/technical-survey", response_model=TechnicalSurveyResponse)
async def upsert_technical_survey(
    folder_id: UUID,
    data: TechnicalSurveyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> TechnicalSurveyResponse:
    """Créer ou mettre à jour le technical survey pour un dossier."""
    try:
        survey = await technical_survey_service.upsert_technical_survey(
            db, current_user, folder_id, data
        )
        return TechnicalSurveyResponse.model_validate(survey)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
