"""
Router for Installation Recommendations endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.schemas.installation_recommendation import (
    InstallationRecommendationCreate,
    InstallationRecommendationResponse,
    InstallationRecommendationUpdate,
)
from app.services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Installation Recommendations"])


@router.get("/folder/{folder_id}", response_model=InstallationRecommendationResponse | None)
async def get_recommendation(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> InstallationRecommendationResponse | None:
    """Recuperer les preconisations d'installation pour un dossier."""
    recommendation = await recommendation_service.get_recommendation_by_folder(
        db, current_user, folder_id
    )
    if recommendation is None:
        # Retourne null si pas de preconisations (pas d'erreur 404)
        return None
    return InstallationRecommendationResponse.model_validate(recommendation)


@router.post("/folder/{folder_id}", response_model=InstallationRecommendationResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    folder_id: UUID,
    data: InstallationRecommendationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> InstallationRecommendationResponse:
    """Creer les preconisations d'installation pour un dossier."""
    recommendation = await recommendation_service.create_or_update_recommendation(
        db, current_user, folder_id, data
    )
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    return InstallationRecommendationResponse.model_validate(recommendation)


@router.put("/folder/{folder_id}", response_model=InstallationRecommendationResponse)
async def update_recommendation(
    folder_id: UUID,
    data: InstallationRecommendationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> InstallationRecommendationResponse:
    """Mettre a jour les preconisations d'installation pour un dossier."""
    recommendation = await recommendation_service.create_or_update_recommendation(
        db, current_user, folder_id, data
    )
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dossier introuvable.",
        )
    return InstallationRecommendationResponse.model_validate(recommendation)


@router.delete("/folder/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recommendation(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])),
) -> None:
    """Supprimer les preconisations d'installation pour un dossier."""
    deleted = await recommendation_service.delete_recommendation(db, current_user, folder_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preconisations non trouvees pour ce dossier.",
        )
