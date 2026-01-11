"""
Pydantic schemas for CEE Valuations.
"""
from datetime import datetime
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class OperationCategory(str, Enum):
    """Categorie d'operation CEE."""
    RESIDENTIAL = "RESIDENTIAL"
    PROFESSIONAL = "PROFESSIONAL"


class CEEOperationSchema(BaseModel):
    """Schema pour une operation CEE."""
    code: str = Field(..., description="Code de l'operation (ex: BAR-TH-171)")
    name: str = Field(..., description="Nom de l'operation")
    description: str = Field(..., description="Description de l'operation")
    category: OperationCategory = Field(..., description="Categorie (RESIDENTIAL ou PROFESSIONAL)")


class CEEValuationBase(BaseModel):
    """Base schema pour une valorisation CEE."""
    operation_code: str = Field(..., max_length=50, description="Code de l'operation CEE")
    is_residential: bool = Field(True, description="Si True, utilise les 4 couleurs MPR")
    value_standard: float | None = Field(None, ge=0, description="Prix standard en EUR/MWh cumac")
    value_blue: float | None = Field(None, ge=0, description="Prix Bleu (tres modeste) en EUR/MWh cumac")
    value_yellow: float | None = Field(None, ge=0, description="Prix Jaune (modeste) en EUR/MWh cumac")
    value_violet: float | None = Field(None, ge=0, description="Prix Violet (intermediaire) en EUR/MWh cumac")
    value_rose: float | None = Field(None, ge=0, description="Prix Rose (classique) en EUR/MWh cumac")


class CEEValuationCreate(CEEValuationBase):
    """Schema pour creer/mettre a jour une valorisation CEE."""
    pass


class CEEValuationResponse(CEEValuationBase):
    """Schema de reponse pour une valorisation CEE."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CEEValuationWithOperationResponse(BaseModel):
    """Schema de reponse enrichi avec les infos de l'operation."""
    operation: CEEOperationSchema
    valuation: CEEValuationResponse | None = None


class CEEValuationsListResponse(BaseModel):
    """Schema de reponse pour la liste des valorisations."""
    items: list[CEEValuationWithOperationResponse]


class CEEValuationsBulkUpdate(BaseModel):
    """Schema pour mise a jour en masse des valorisations."""
    valuations: list[CEEValuationCreate]
