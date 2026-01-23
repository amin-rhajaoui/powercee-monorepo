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
    is_headquarters: bool = False
    siret: str | None = Field(None, min_length=14, max_length=14, pattern=r'^\d{14}$')
    vat_number: str | None = Field(None, max_length=50)
    phone: str | None = Field(None, max_length=20, description="Numéro de téléphone de l'agence")
    email: str | None = Field(None, max_length=255, description="Adresse email de l'agence")
    manager_first_name: str | None = Field(None, max_length=100, description="Prénom du gérant (siège social uniquement)")
    manager_last_name: str | None = Field(None, max_length=100, description="Nom du gérant (siège social uniquement)")

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
    is_headquarters: bool | None = None
    siret: str | None = Field(None, min_length=14, max_length=14, pattern=r'^\d{14}$')
    vat_number: str | None = Field(None, max_length=50)
    phone: str | None = Field(None, max_length=20, description="Numéro de téléphone de l'agence")
    email: str | None = Field(None, max_length=255, description="Adresse email de l'agence")
    manager_first_name: str | None = Field(None, max_length=100, description="Prénom du gérant (siège social uniquement)")
    manager_last_name: str | None = Field(None, max_length=100, description="Nom du gérant (siège social uniquement)")

class AgencyResponse(AgencyBase):
    """
    Schéma pour la réponse d'une agence.
    """
    id: UUID
    tenant_id: UUID

    model_config = ConfigDict(from_attributes=True)

