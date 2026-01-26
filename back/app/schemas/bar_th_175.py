"""Schémas Pydantic pour le module BAR-TH-175 (Rénovation d'ampleur appartement)."""

from enum import Enum
from typing import Any, Dict, List

from pydantic import BaseModel, Field, computed_field


# ============================================================================
# Enums pour BAR-TH-175
# ============================================================================


class EnergyClass(str, Enum):
    """Classes énergétiques DPE (de A à G)."""

    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"


class InsulationItem(str, Enum):
    """Postes d'isolation pour BAR-TH-175."""

    WALLS = "WALLS"  # Murs
    FLOOR = "FLOOR"  # Plancher bas
    ROOF = "ROOF"  # Toiture / Combles
    WINDOWS = "WINDOWS"  # Fenêtres / Menuiseries


class HeatingStatus(str, Enum):
    """Statut du système de chauffage."""

    NEW = "NEW"  # Nouveau chauffage installé
    KEPT = "KEPT"  # Chauffage conservé
    REPLACED = "REPLACED"  # Chauffage remplacé


class ScenarioType(str, Enum):
    """Types de scénarios de rénovation."""

    SCENARIO_1 = "SCENARIO_1"  # Rénovation en une fois - global
    SCENARIO_2 = "SCENARIO_2"  # Rénovation par étapes
    SCENARIO_3 = "SCENARIO_3"  # Rénovation en une fois - alternatif


# ============================================================================
# Schémas de données d'audit
# ============================================================================


class InsulationData(BaseModel):
    """Données d'isolation pour un poste spécifique."""

    item: InsulationItem = Field(..., description="Type de poste d'isolation")
    total_surface: float = Field(
        ..., gt=0, description="Surface totale de l'élément (m²)"
    )
    isolated_surface: float = Field(
        ..., ge=0, description="Surface isolée par les travaux (m²)"
    )
    r_value: float | None = Field(
        None, ge=0, description="Résistance thermique R (m².K/W)"
    )
    isolation_type: str | None = Field(
        None, description="Type d'isolant (laine minérale, polyuréthane, etc.)"
    )
    thickness_cm: float | None = Field(None, ge=0, description="Épaisseur de l'isolant (cm)")

    @computed_field
    @property
    def coverage_ratio(self) -> float:
        """Calcule le ratio de couverture (surface isolée / surface totale)."""
        if self.total_surface <= 0:
            return 0.0
        return self.isolated_surface / self.total_surface


class HeatingData(BaseModel):
    """Données du système de chauffage."""

    status: HeatingStatus = Field(..., description="Statut du chauffage")
    emission_gco2_kwh: float = Field(
        ..., ge=0, description="Émissions en gCO2eq/kWh"
    )
    heating_type: str | None = Field(
        None, description="Type de chauffage (PAC, chaudière gaz, électrique, etc.)"
    )
    brand: str | None = Field(None, description="Marque de l'équipement")
    model: str | None = Field(None, description="Modèle de l'équipement")
    power_kw: float | None = Field(None, ge=0, description="Puissance (kW)")
    cop: float | None = Field(None, ge=0, description="COP pour PAC")
    scop: float | None = Field(None, ge=0, description="SCOP pour PAC")


class OccupantData(BaseModel):
    """Données de l'occupant de l'appartement (optionnel pour bailleurs)."""

    first_name: str | None = Field(None, description="Prénom de l'occupant")
    last_name: str | None = Field(None, description="Nom de l'occupant")
    email: str | None = Field(None, description="Email de l'occupant")
    phone: str | None = Field(None, description="Téléphone de l'occupant")
    is_tenant: bool = Field(True, description="Est-ce un locataire ?")
    has_provided_consent: bool = Field(
        False, description="L'occupant a-t-il donné son consentement ?"
    )
    move_in_date: str | None = Field(None, description="Date d'entrée dans le logement")


class BarTh175AuditData(BaseModel):
    """Données complètes d'audit pour validation BAR-TH-175."""

    # === État initial ===
    initial_energy_class: EnergyClass = Field(
        ..., description="Classe énergétique initiale (DPE avant travaux)"
    )
    initial_ghg: float = Field(
        ..., ge=0, description="Émissions GES initiales (kgCO2/m²/an)"
    )
    initial_consumption_kwh_m2: float | None = Field(
        None, ge=0, description="Consommation initiale (kWh/m²/an)"
    )

    # === État projeté après travaux ===
    projected_energy_class: EnergyClass = Field(
        ..., description="Classe énergétique projetée (DPE après travaux)"
    )
    projected_ghg: float = Field(
        ..., ge=0, description="Émissions GES projetées (kgCO2/m²/an)"
    )
    projected_consumption_kwh_m2: float | None = Field(
        None, ge=0, description="Consommation projetée (kWh/m²/an)"
    )

    # === Isolation ===
    insulation_items: List[InsulationData] = Field(
        default_factory=list, description="Liste des postes d'isolation"
    )

    # === Chauffage ===
    heating: HeatingData | None = Field(None, description="Données du système de chauffage")

    # === Eau chaude sanitaire ===
    hot_water_type: str | None = Field(
        None, description="Type de production d'eau chaude"
    )
    hot_water_emission_gco2_kwh: float | None = Field(
        None, ge=0, description="Émissions ECS (gCO2eq/kWh)"
    )

    # === Ventilation ===
    ventilation_type: str | None = Field(
        None, description="Type de ventilation (VMC simple/double flux, etc.)"
    )

    # === Métadonnées logement ===
    living_area: float = Field(..., gt=0, description="Surface habitable (m²)")
    apartment_type: str | None = Field(
        None, description="Type d'appartement (T1, T2, T3, etc.)"
    )
    apartment_number: int | None = Field(
        None, description="Numéro de l'appartement dans le projet"
    )
    floor_level: int | None = Field(None, description="Étage")
    construction_year: int | None = Field(None, description="Année de construction")
    nb_rooms: int | None = Field(None, ge=1, description="Nombre de pièces")

    # === Scénario de travaux ===
    scenario_number: int | None = Field(
        None, ge=1, le=3, description="Numéro du scénario retenu (1, 2, ou 3)"
    )
    scenario_type: ScenarioType | None = Field(None, description="Type de scénario")
    estimated_cost: float | None = Field(
        None, ge=0, description="Coût estimé des travaux (TTC)"
    )
    estimated_savings_per_year: float | None = Field(
        None, ge=0, description="Économies annuelles estimées (euros)"
    )

    # === Occupant (optionnel pour bailleurs) ===
    occupant: OccupantData | None = Field(
        None, description="Données de l'occupant (optionnel)"
    )

    # === Champs pour OCR (préparation future) ===
    audit_document_url: str | None = Field(
        None, description="URL du document d'audit uploadé"
    )
    audit_ocr_data: Dict[str, Any] | None = Field(
        None, description="Données extraites par OCR (réservé pour usage futur)"
    )
    audit_date: str | None = Field(None, description="Date de l'audit énergétique")
    auditor_name: str | None = Field(None, description="Nom de l'auditeur")
    auditor_certification: str | None = Field(
        None, description="Numéro de certification de l'auditeur"
    )


# ============================================================================
# Schémas de validation
# ============================================================================


class BarTh175ValidationResult(BaseModel):
    """Résultat de la validation d'éligibilité BAR-TH-175."""

    is_eligible: bool = Field(..., description="Le dossier est-il éligible ?")
    errors: List[str] = Field(
        default_factory=list, description="Liste des erreurs bloquantes"
    )
    warnings: List[str] = Field(
        default_factory=list, description="Liste des avertissements non bloquants"
    )

    # === Détails de validation ===
    class_jump: int = Field(..., description="Nombre de classes énergétiques gagnées")
    class_jump_valid: bool = Field(
        ..., description="Le saut de classe est-il suffisant (>= 2) ?"
    )
    insulation_count: int = Field(
        ..., description="Nombre de postes d'isolation qualifiés (>= 25% couverture)"
    )
    insulation_valid: bool = Field(
        ..., description="Y a-t-il au moins 2 postes d'isolation qualifiés ?"
    )
    ghg_reduction_valid: bool = Field(
        ..., description="Les émissions GES sont-elles réduites ?"
    )
    heating_valid: bool = Field(
        ..., description="Le système de chauffage respecte-t-il les seuils d'émission ?"
    )


class BarTh175ValidationRequest(BaseModel):
    """Requête de validation d'éligibilité (si données passées directement)."""

    audit_data: BarTh175AuditData
