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
# Schémas Pydantic
# ============================================================================

class ModuleDraftBase(BaseModel):
    """Champs communs pour un brouillon de module."""

    module_code: str = Field(..., min_length=1, max_length=50, description="Code du module (ex: BAR-TH-171)")
    client_id: UUID | None = Field(None, description="ID du client associé (peut être null)")
    property_id: UUID | None = Field(None, description="ID du logement associé (peut être null)")
    current_step: int = Field(default=1, ge=1, le=6, description="Étape actuelle du wizard (1-6)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Données du brouillon en JSON")

    # Champs spécifiques BAR-TH-171 - Étape 2
    is_principal_residence: bool | None = Field(None, description="Le logement est-il la résidence principale ?")
    occupation_status: OccupationStatus | None = Field(None, description="Statut d'occupation")
    heating_system: HeatingSystem | None = Field(None, description="Système de chauffage actuel")
    old_boiler_brand: str | None = Field(None, max_length=100, description="Marque de l'ancienne chaudière")
    is_water_heating_linked: bool | None = Field(None, description="L'eau chaude est-elle liée au chauffage ?")
    water_heating_type: WaterHeatingType | None = Field(None, description="Type de production d'eau chaude")
    usage_mode: UsageMode | None = Field(None, description="Mode d'usage souhaité : Chauffage seul ou Chauffage et Eau chaude sanitaire")
    electrical_phase: ElectricalPhase | None = Field(None, description="Type de compteur électrique")
    power_kva: float | None = Field(None, ge=3, le=36, description="Puissance du compteur en kVA")

    # Champs spécifiques BAR-TH-171 - Étape 3 : Documents administratifs
    tax_notice_url: str | None = Field(None, max_length=500, description="URL S3 de l'avis d'imposition")
    address_proof_url: str | None = Field(None, max_length=500, description="URL S3 du justificatif de domicile")
    property_proof_url: str | None = Field(None, max_length=500, description="URL S3 de la taxe foncière ou acte notarié")
    energy_bill_url: str | None = Field(None, max_length=500, description="URL S3 de la facture d'énergie")
    reference_tax_income: int | None = Field(None, ge=0, description="Revenu fiscal de référence")
    household_size: int | None = Field(None, ge=1, le=20, description="Nombre de personnes dans le foyer fiscal")


class ModuleDraftCreate(ModuleDraftBase):
    """Payload de création d'un brouillon."""

    pass


class ModuleDraftUpdate(BaseModel):
    """Payload de mise à jour partielle d'un brouillon."""

    client_id: UUID | None = None
    property_id: UUID | None = None
    current_step: int | None = Field(None, ge=1, le=6)
    data: Dict[str, Any] | None = None

    # Champs spécifiques BAR-TH-171 - Étape 2
    is_principal_residence: bool | None = None
    occupation_status: OccupationStatus | None = None
    heating_system: HeatingSystem | None = None
    old_boiler_brand: str | None = Field(None, max_length=100)
    is_water_heating_linked: bool | None = None
    water_heating_type: WaterHeatingType | None = None
    usage_mode: UsageMode | None = None
    electrical_phase: ElectricalPhase | None = None
    power_kva: float | None = Field(None, ge=3, le=36)

    # Champs spécifiques BAR-TH-171 - Étape 3 : Documents administratifs
    tax_notice_url: str | None = Field(None, max_length=500)
    address_proof_url: str | None = Field(None, max_length=500)
    property_proof_url: str | None = Field(None, max_length=500)
    energy_bill_url: str | None = Field(None, max_length=500)
    reference_tax_income: int | None = Field(None, ge=0)
    household_size: int | None = Field(None, ge=1, le=20)


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

