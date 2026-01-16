from datetime import datetime
from enum import Enum
from typing import Any, Dict, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# Enums pour les champs BAR-TH-171
# ============================================================================

class OccupationStatus(str, Enum):
    PROPRIETAIRE = "PROPRIETAIRE"
    LOCATAIRE = "LOCATAIRE"


class HeatingSystem(str, Enum):
    FIOUL = "FIOUL"
    GAZ = "GAZ"
    CHARBON = "CHARBON"
    BOIS = "BOIS"
    ELECTRIQUE = "ELECTRIQUE"


class WaterHeatingType(str, Enum):
    BALLON_ELECTRIQUE = "BALLON_ELECTRIQUE"
    CHAUFFE_EAU_GAZ = "CHAUFFE_EAU_GAZ"
    CHAUFFE_EAU_THERMODYNAMIQUE = "CHAUFFE_EAU_THERMODYNAMIQUE"
    AUTRE = "AUTRE"


class ElectricalPhase(str, Enum):
    MONOPHASE = "MONOPHASE"
    TRIPHASE = "TRIPHASE"


class UsageMode(str, Enum):
    HEATING_ONLY = "HEATING_ONLY"
    HEATING_AND_HOT_WATER = "HEATING_AND_HOT_WATER"


# ============================================================================
# Enums pour BAR-TH-171 - Étape 4 : Visite Technique
# ============================================================================


class AtticType(str, Enum):
    PERDUS = "PERDUS"
    HABITES = "HABITES"


class FloorType(str, Enum):
    CAVE = "CAVE"
    VIDE_SANITAIRE = "VIDE_SANITAIRE"
    TERRE_PLEIN = "TERRE_PLEIN"


class WallIsolationType(str, Enum):
    AUCUNE = "AUCUNE"
    INTERIEUR = "INTERIEUR"
    EXTERIEUR = "EXTERIEUR"
    DOUBLE = "DOUBLE"


class JoineryType(str, Enum):
    SIMPLE = "SIMPLE"
    DOUBLE_OLD = "DOUBLE_OLD"
    DOUBLE_RECENT = "DOUBLE_RECENT"


class EmitterType(str, Enum):
    FONTE = "FONTE"
    RADIATEURS = "RADIATEURS"
    PLANCHER_CHAUFFANT = "PLANCHER_CHAUFFANT"


# ============================================================================
# Schémas Pydantic
# ============================================================================

class ModuleDraftBase(BaseModel):
    """Champs communs pour un brouillon de module."""

    module_code: str = Field(..., min_length=1, max_length=50, description="Code du module (ex: BAR-TH-171)")
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

