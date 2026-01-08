from datetime import datetime
from enum import Enum
from typing import Any, Dict
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FolderStatus(str, Enum):
    """Statut d'un dossier."""
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class FolderBase(BaseModel):
    """Champs communs pour un dossier."""

    client_id: UUID = Field(..., description="ID du client associé")
    property_id: UUID | None = Field(None, description="ID du logement associé (peut être null)")
    module_code: str | None = Field(None, max_length=50, description="Code du module (ex: BAR-TH-171). Null pour dossier libre.")
    status: FolderStatus = Field(default=FolderStatus.IN_PROGRESS, description="Statut du dossier")
    data: Dict[str, Any] = Field(default_factory=dict, description="Données complètes du dossier")


class FolderCreate(BaseModel):
    """Payload de création d'un dossier (utilisé pour création manuelle)."""

    client_id: UUID = Field(..., description="ID du client associé")
    property_id: UUID | None = Field(None, description="ID du logement associé")
    module_code: str | None = Field(None, max_length=50, description="Code du module")
    data: Dict[str, Any] = Field(default_factory=dict, description="Données du dossier")


class FolderFromDraftCreate(BaseModel):
    """Payload minimal pour créer un dossier depuis un draft (les données viennent du draft)."""
    pass


class FolderUpdate(BaseModel):
    """Payload de mise à jour partielle d'un dossier."""

    status: FolderStatus | None = None
    data: Dict[str, Any] | None = None


class FolderResponse(FolderBase):
    """Représentation API d'un dossier."""

    id: UUID
    tenant_id: UUID
    source_draft_id: UUID | None
    mpr_color: str | None = Field(None, description="Couleur MPR calculée (Bleu, Jaune, Violet, Rose, Inconnu)")
    emitter_type: str | None = Field(None, description="Type d'émetteur (BASSE_TEMPERATURE, MOYENNE_HAUTE_TEMPERATURE)")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedFoldersResponse(BaseModel):
    """Réponse paginée pour la liste des dossiers."""

    items: list[FolderResponse]
    total: int
    page: int
    page_size: int
