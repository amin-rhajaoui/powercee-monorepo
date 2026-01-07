from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.property import PropertyType


class PropertyBase(BaseModel):
    """Champs communs pour un logement."""

    client_id: UUID = Field(..., description="ID du client propriétaire")
    label: str = Field(..., min_length=1, max_length=255, description="Label/nom du logement")
    type: PropertyType = Field(default=PropertyType.AUTRE, description="Type de logement")
    address: str = Field(..., min_length=1, max_length=500, description="Adresse complète")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    postal_code: str | None = Field(None, max_length=10, description="Code postal")
    city: str | None = Field(None, max_length=255, description="Ville")
    country: str | None = Field(default="France", max_length=100, description="Pays")
    surface_m2: float | None = Field(None, gt=0, description="Surface en m²")
    construction_year: int | None = Field(None, ge=1000, le=2100, description="Année de construction")
    notes: str | None = Field(None, description="Notes libres")

    @model_validator(mode="after")
    def validate_coordinates(self) -> "PropertyBase":
        """Valide que les coordonnées sont présentes si l'adresse est fournie."""
        if self.address and (self.latitude is None or self.longitude is None):
            raise ValueError("Latitude et longitude sont requises après géocodage de l'adresse.")
        return self


class PropertyCreate(PropertyBase):
    """Payload de création d'un logement."""

    pass


class PropertyUpdate(BaseModel):
    """Payload de mise à jour partielle d'un logement."""

    client_id: UUID | None = None
    label: str | None = Field(None, min_length=1, max_length=255)
    type: PropertyType | None = None
    address: str | None = Field(None, min_length=1, max_length=500)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    postal_code: str | None = Field(None, max_length=10)
    city: str | None = Field(None, max_length=255)
    country: str | None = Field(None, max_length=100)
    surface_m2: float | None = Field(None, gt=0)
    construction_year: int | None = Field(None, ge=1000, le=2100)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_coordinates_if_address(self) -> "PropertyUpdate":
        """Valide que si l'adresse est modifiée, les coordonnées doivent être présentes."""
        if self.address and (self.latitude is None or self.longitude is None):
            raise ValueError("Latitude et longitude sont requises si l'adresse est modifiée.")
        return self


class PropertyResponse(PropertyBase):
    """Représentation API d'un logement."""

    id: UUID
    tenant_id: UUID
    is_active: bool
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedPropertiesResponse(BaseModel):
    """Réponse paginée pour la liste des logements."""

    items: List[PropertyResponse]
    total: int
    page: int
    page_size: int

