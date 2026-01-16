"""
Module de pricing pour la generation de devis.

Ce module implemente le pattern Strategy pour la tarification hybride:
- LegacyGridPricingStrategy: Regles de grille RAC fixes
- MarginBasedPricingStrategy: Calcul cost-plus avec marge minimale
"""
from .base import PricingContext, QuoteLine, QuotePreview, PricingStrategy
from .rounding import round_to_x90
from .strategy_legacy import LegacyGridPricingStrategy
from .strategy_margin import MarginBasedPricingStrategy
from .pricing_service import PricingService, PricingError

__all__ = [
    "PricingContext",
    "QuoteLine",
    "QuotePreview",
    "PricingStrategy",
    "round_to_x90",
    "LegacyGridPricingStrategy",
    "MarginBasedPricingStrategy",
    "PricingService",
    "PricingError",
]
