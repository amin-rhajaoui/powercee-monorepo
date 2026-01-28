from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IntegrationType(str, Enum):
    """Type d'intégration."""
    YOUSIGN = "yousign"


class IntegrationCreate(BaseModel):
    """Schéma pour créer une intégration."""
    integration_type: IntegrationType = Field(..., description="Type d'intégration")
    api_key: str = Field(..., min_length=1, description="Clé API")
    config: str | None = Field(None, description="Configuration additionnelle en JSON")


class IntegrationUpdate(BaseModel):
    """Schéma pour mettre à jour une intégration."""
    api_key: str | None = Field(None, min_length=1, description="Nouvelle clé API")
    is_active: bool | None = Field(None, description="Statut d'activation")
    config: str | None = Field(None, description="Configuration additionnelle en JSON")


class IntegrationResponse(BaseModel):
    """Représentation API d'une intégration (clé API masquée)."""

    id: UUID
    tenant_id: UUID
    integration_type: IntegrationType
    api_key_masked: str = Field(..., description="Clé API masquée pour l'affichage")
    is_active: bool
    config: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntegrationListResponse(BaseModel):
    """Liste des intégrations."""
    integrations: list[IntegrationResponse]


class IntegrationTypeInfo(BaseModel):
    """Informations sur un type d'intégration."""
    type: IntegrationType
    name: str
    description: str
    configured: bool
    is_active: bool | None = None
