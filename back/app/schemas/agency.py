from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID

class AgencyBase(BaseModel):
    """
    Champs de base pour une agence.
    """
    name: str = Field(..., min_length=2, max_length=255)
    address: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool = True

class AgencyCreate(AgencyBase):
    """
    Schéma pour la création d'une agence.
    """
    pass

class AgencyUpdate(BaseModel):
    """
    Schéma pour la mise à jour d'une agence.
    """
    name: str | None = Field(None, min_length=2, max_length=255)
    address: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool | None = None

class AgencyResponse(AgencyBase):
    """
    Schéma pour la réponse d'une agence.
    """
    id: UUID
    tenant_id: UUID

    model_config = ConfigDict(from_attributes=True)

