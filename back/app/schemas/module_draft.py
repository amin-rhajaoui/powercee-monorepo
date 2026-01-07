from datetime import datetime
from typing import Any, Dict
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModuleDraftBase(BaseModel):
    """Champs communs pour un brouillon de module."""

    module_code: str = Field(..., min_length=1, max_length=50, description="Code du module (ex: BAT-TH-113)")
    client_id: UUID | None = Field(None, description="ID du client associé (peut être null)")
    property_id: UUID | None = Field(None, description="ID du logement associé (peut être null)")
    current_step: int = Field(default=1, ge=1, le=6, description="Étape actuelle du wizard (1-6)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Données du brouillon en JSON")


class ModuleDraftCreate(ModuleDraftBase):
    """Payload de création d'un brouillon."""

    pass


class ModuleDraftUpdate(BaseModel):
    """Payload de mise à jour partielle d'un brouillon."""

    client_id: UUID | None = None
    property_id: UUID | None = None
    current_step: int | None = Field(None, ge=1, le=6)
    data: Dict[str, Any] | None = None


class ModuleDraftResponse(ModuleDraftBase):
    """Représentation API d'un brouillon."""

    id: UUID
    tenant_id: UUID
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedModuleDraftsResponse(BaseModel):
    """Réponse paginée pour la liste des brouillons."""

    items: list[ModuleDraftResponse]
    total: int
    page: int
    page_size: int

