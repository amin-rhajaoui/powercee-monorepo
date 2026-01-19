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
    total_ht: float
    total_ttc: float
    cee_prime: float
    rac_ttc: float
    margin_ht: float
    margin_percent: float
    strategy_used: str
    warnings: list[str] = field(default_factory=list)


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
