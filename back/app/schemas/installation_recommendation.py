"""
Pydantic schemas for Installation Recommendations.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InstallationRecommendationBase(BaseModel):
    """Champs communs pour les preconisations d'installation."""

    access_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Preconisations d'acces (digicode, etage, stationnement, etc.).",
    )
    indoor_unit_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Preconisations pour l'installation de l'unite interieure.",
    )
    outdoor_unit_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Preconisations pour l'installation de l'unite exterieure.",
    )
    safety_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Precautions generales et consignes de securite.",
    )
    photo_urls: list[str] | None = Field(
        None,
        max_length=20,
        description="Liste des URLs des photos associees (max 20).",
    )


class InstallationRecommendationCreate(InstallationRecommendationBase):
    """Payload de creation des preconisations d'installation."""

    pass


class InstallationRecommendationUpdate(BaseModel):
    """Payload de mise a jour partielle des preconisations d'installation."""

    access_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Preconisations d'acces (digicode, etage, stationnement, etc.).",
    )
    indoor_unit_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Preconisations pour l'installation de l'unite interieure.",
    )
    outdoor_unit_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Preconisations pour l'installation de l'unite exterieure.",
    )
    safety_recommendations: str | None = Field(
        None,
        max_length=5000,
        description="Precautions generales et consignes de securite.",
    )
    photo_urls: list[str] | None = Field(
        None,
        max_length=20,
        description="Liste des URLs des photos associees (max 20).",
    )


class InstallationRecommendationResponse(InstallationRecommendationBase):
    """Representation API des preconisations d'installation."""

    id: UUID
    tenant_id: UUID
    folder_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
