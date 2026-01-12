"""
Pydantic schemas for Technical Survey.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TechnicalSurveyBase(BaseModel):
    """Champs communs pour les photos de visite technique."""

    photo_house: str | None = Field(
        None,
        max_length=512,
        description="Photo du logement.",
    )
    photo_facade: str | None = Field(
        None,
        max_length=512,
        description="Photo de la façade.",
    )
    photo_old_system: str | None = Field(
        None,
        max_length=512,
        description="Photo de l'ancien système (chaudière).",
    )
    photo_electric_panel: str | None = Field(
        None,
        max_length=512,
        description="Photo du tableau électrique.",
    )
    has_linky: bool | None = Field(
        None,
        description="Le logement a-t-il un compteur Linky ?",
    )
    photo_linky: str | None = Field(
        None,
        max_length=512,
        description="Photo du compteur Linky (si has_linky=True).",
    )
    photo_breaker: str | None = Field(
        None,
        max_length=512,
        description="Photo du disjoncteur (si has_linky=False).",
    )


class TechnicalSurveyCreate(TechnicalSurveyBase):
    """Payload de création des photos de visite technique."""

    pass


class TechnicalSurveyUpdate(BaseModel):
    """Payload de mise à jour partielle des photos de visite technique."""

    photo_house: str | None = Field(
        None,
        max_length=512,
        description="Photo du logement.",
    )
    photo_facade: str | None = Field(
        None,
        max_length=512,
        description="Photo de la façade.",
    )
    photo_old_system: str | None = Field(
        None,
        max_length=512,
        description="Photo de l'ancien système (chaudière).",
    )
    photo_electric_panel: str | None = Field(
        None,
        max_length=512,
        description="Photo du tableau électrique.",
    )
    has_linky: bool | None = Field(
        None,
        description="Le logement a-t-il un compteur Linky ?",
    )
    photo_linky: str | None = Field(
        None,
        max_length=512,
        description="Photo du compteur Linky (si has_linky=True).",
    )
    photo_breaker: str | None = Field(
        None,
        max_length=512,
        description="Photo du disjoncteur (si has_linky=False).",
    )


class TechnicalSurveyResponse(TechnicalSurveyBase):
    """Représentation API des photos de visite technique."""

    folder_id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
