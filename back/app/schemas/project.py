"""Schémas Pydantic pour les projets de rénovation (BAR-TH-175)."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectStatus(str, Enum):
    """Statut d'un projet de rénovation."""

    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    AUDIT_PENDING = "AUDIT_PENDING"
    VALIDATED = "VALIDATED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


# ============================================================================
# Schémas de base
# ============================================================================


class ProjectBase(BaseModel):
    """Champs communs pour un projet."""

    name: str = Field(..., min_length=1, max_length=255, description="Nom du projet")
    client_id: UUID | None = Field(None, description="ID du client (bailleur) associé")
    building_address: str | None = Field(
        None, max_length=500, description="Adresse de l'immeuble"
    )
    total_apartments: int | None = Field(
        None, ge=1, description="Nombre total d'appartements"
    )
    module_code: str = Field(
        default="BAR-TH-175",
        max_length=50,
        description="Code du module CEE",
    )
    data: Dict[str, Any] = Field(
        default_factory=dict, description="Données flexibles du projet"
    )


class ProjectCreate(ProjectBase):
    """Payload de création d'un projet."""

    pass


class ProjectUpdate(BaseModel):
    """Payload de mise à jour partielle d'un projet."""

    name: str | None = Field(None, min_length=1, max_length=255)
    client_id: UUID | None = None
    building_address: str | None = None
    total_apartments: int | None = Field(None, ge=1)
    status: ProjectStatus | None = None
    data: Dict[str, Any] | None = None


class ProjectResponse(ProjectBase):
    """Représentation API d'un projet."""

    id: UUID
    tenant_id: UUID
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PaginatedProjectsResponse(BaseModel):
    """Réponse paginée pour la liste des projets."""

    items: List[ProjectResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Schémas pour les opérations sur les projets
# ============================================================================


class BulkDraftsCreate(BaseModel):
    """Payload pour créer des appartements (ModuleDrafts) en masse."""

    quantity: int = Field(
        ...,
        ge=1,
        le=500,
        description="Nombre d'appartements à créer",
    )
    apartment_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Type d'appartement (T1, T2, T3, T4, T5, Studio, etc.)",
    )
    common_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Données communes à appliquer à tous les appartements créés",
    )


class BulkDraftsResponse(BaseModel):
    """Réponse après création en masse."""

    created_count: int
    project_id: UUID
    draft_ids: List[UUID]


class PropagateAuditRequest(BaseModel):
    """Payload pour propager les données d'audit d'un appartement vers d'autres."""

    source_draft_id: UUID = Field(
        ..., description="ID du draft source contenant les données à propager"
    )
    target_draft_ids: List[UUID] = Field(
        ...,
        min_length=1,
        description="Liste des IDs de drafts cibles",
    )
    fields_to_propagate: List[str] | None = Field(
        None,
        description="Liste des champs à propager. Si None, propage toutes les données.",
    )


class PropagateAuditResponse(BaseModel):
    """Réponse après propagation d'audit."""

    updated_count: int
    updated_draft_ids: List[UUID]
    skipped_draft_ids: List[UUID] = Field(
        default_factory=list,
        description="IDs des drafts non mis à jour (introuvables ou hors projet)",
    )
