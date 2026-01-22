"""
Base classes for pricing strategies.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from app.models.module_settings import ModuleSettings
    from app.models.product import Product


@dataclass
class QuoteLine:
    """Ligne de devis."""
    product_id: UUID | None
    title: str
    description: str
    quantity: int
    unit_price_ht: float
    tva_rate: float = 5.5
    is_editable: bool = True

    @property
    def total_ht(self) -> float:
        return self.quantity * self.unit_price_ht

    @property
    def total_ttc(self) -> float:
        return self.total_ht * (1 + self.tva_rate / 100)


@dataclass
class QuotePreview:
    """Resultat d'un calcul de devis."""
    lines: list[QuoteLine]
    cee_prime: float
    margin_ht: float
    margin_percent: float
    strategy_used: str
    warnings: list[str] = field(default_factory=list)
    rac_ttc: float = 0.0  # RAC peut être ajusté (arrondi, plafonné), donc champ normal
    
    # Champs calculés automatiquement (ne pas initialiser manuellement)
    total_ht: float = field(init=False)
    total_ttc: float = field(init=False)
    
    def __post_init__(self):
        """Recalcule automatiquement les totaux à partir des lignes."""
        self._recalculate_totals()
    
    def _recalculate_totals(self):
        """Recalcule les totaux HT et TTC à partir des lignes.
        
        Note: Le RAC n'est pas recalculé automatiquement ici car il peut être
        ajusté par les stratégies (arrondi, plafonné). Il doit être recalculé
        manuellement si nécessaire après modification des lignes.
        """
        self.total_ht = sum(line.total_ht for line in self.lines)
        self.total_ttc = sum(line.total_ttc for line in self.lines)


@dataclass
class PricingContext:
    """Contexte de calcul pour les strategies de pricing."""
    tenant_id: UUID
    module_code: str
    folder_id: UUID
    product_ids: list[UUID]
    target_rac: float | None

    # Donnees du dossier/propriete
    surface: float
    mpr_color: str | None
    zone_climatique: str | None
    property_type: str | None
    emitter_type: str | None

    # Produits charges (avec details PAC)
    products: list["Product"] = field(default_factory=list)
    
    # Produits de main d'oeuvre depuis les reglages du module
    labor_products: list["Product"] = field(default_factory=list)

    # Donnees techniques (Step 2)
    old_heating_system: str | None = None
    old_boiler_brand: str | None = None
    electrical_phase: str | None = None
    usage_mode: str | None = None
    power_kva: int | None = None

    # Donnees calculees
    etas_35: int | None = None
    etas_55: int | None = None


class PricingStrategy(ABC):
    """Strategie de pricing abstraite."""

    @abstractmethod
    async def can_apply(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> bool:
        """Verifie si cette strategie peut etre appliquee."""
        pass

    @abstractmethod
    async def calculate(
        self,
        context: PricingContext,
        settings: "ModuleSettings",
        cee_prime: float
    ) -> QuotePreview | None:
        """Calcule le devis avec cette strategie."""
        pass
