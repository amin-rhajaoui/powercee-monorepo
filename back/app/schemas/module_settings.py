"""
Pydantic schemas for Module Settings.
"""
from datetime import datetime
from typing import List, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoundingMode(str, Enum):
    """Mode d'arrondi pour le RAC."""
    NONE = "NONE"
    X90 = "X90"


class FixedLineItem(BaseModel):
    """Ligne fixe de devis (ex: desembouage)."""
    description: str = Field(..., min_length=1, description="Description de la ligne")
    quantity: int = Field(1, ge=1, description="Quantite")
    unit_price_ht: float = Field(..., ge=0, description="Prix unitaire HT")
    tva_rate: float = Field(5.5, ge=0, le=100, description="Taux TVA (%)")


class LegacyGridRule(BaseModel):
    """Regle de grille RAC (tarification fixe)."""
    brand: str = Field(..., min_length=1, description="Marque du produit")
    etas_min: int = Field(..., ge=100, le=300, description="ETAS minimum (%)")
    etas_max: int = Field(..., ge=100, le=300, description="ETAS maximum (%)")
    surface_min: int = Field(..., ge=0, description="Surface minimum (m2)")
    surface_max: int | None = Field(None, ge=0, description="Surface maximum (m2) - None pour illimite")
    mpr_profile: str = Field(..., description="Profil MPR (Bleu, Jaune, Violet, Rose)")
    rac_amount: float = Field(..., ge=0, description="Montant RAC fixe (EUR TTC)")


class ModuleSettingsBase(BaseModel):
    """Base schema pour les parametres de module."""
    enable_legacy_grid_rules: bool = Field(
        False,
        description="Active les regles de grille heritees"
    )
    rounding_mode: RoundingMode = Field(
        RoundingMode.NONE,
        description="Mode d'arrondi: NONE ou X90"
    )
    min_margin_amount: float = Field(
        0,
        ge=0,
        description="Marge minimale en EUR HT"
    )
    max_rac_addon: float | None = Field(
        None,
        ge=0,
        description="Plafond RAC additionnel en EUR"
    )
    default_labor_product_ids: List[UUID] = Field(
        default_factory=list,
        description="IDs des produits main d'oeuvre par defaut"
    )
    fixed_line_items: List[FixedLineItem] = Field(
        default_factory=list,
        description="Lignes fixes du devis"
    )
    line_percentages: dict[str, float] | None = Field(
        None,
        description="Repartition par pourcentages des lignes du devis (ex: {'HEAT_PUMP': 40.0, 'LABOR': 30.0})"
    )
    legacy_grid_rules: List[LegacyGridRule] | None = Field(
        None,
        description="Regles de grille RAC"
    )

    @field_validator('line_percentages')
    @classmethod
    def validate_line_percentages(cls, v: dict[str, float] | None) -> dict[str, float] | None:
        """Valide que la somme des pourcentages est <= 100%."""
        if v is None or len(v) == 0:
            return v
        
        total = sum(v.values())
        if total > 100:
            raise ValueError(f"La somme des pourcentages ({total:.1f}%) ne peut pas depasser 100%")
        
        # Verifier que tous les pourcentages sont >= 0
        for category, percentage in v.items():
            if percentage < 0:
                raise ValueError(f"Le pourcentage pour {category} ({percentage}%) ne peut pas etre negatif")
        
        return v


class ModuleSettingsCreate(ModuleSettingsBase):
    """Schema pour creer/mettre a jour les parametres de module."""
    pass


class ModuleSettingsUpdate(BaseModel):
    """Schema pour mise a jour partielle des parametres."""
    enable_legacy_grid_rules: bool | None = None
    rounding_mode: RoundingMode | None = None
    min_margin_amount: float | None = Field(None, ge=0)
    max_rac_addon: float | None = Field(None, ge=0)
    default_labor_product_ids: List[UUID] | None = None
    fixed_line_items: List[FixedLineItem] | None = None
    line_percentages: dict[str, float] | None = Field(None, description="Repartition par pourcentages")
    legacy_grid_rules: List[LegacyGridRule] | None = None


class ModuleSettingsResponse(ModuleSettingsBase):
    """Schema de reponse pour les parametres de module."""
    id: UUID
    tenant_id: UUID
    module_code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
