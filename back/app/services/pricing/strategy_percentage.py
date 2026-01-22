"""
Strategie de pricing basee sur la repartition par pourcentages.
"""
import logging
from typing import TYPE_CHECKING

from .base import PricingStrategy, PricingContext, QuoteLine, QuotePreview
from .helpers import generate_product_description

if TYPE_CHECKING:
    from app.models.module_settings import ModuleSettings

logger = logging.getLogger(__name__)


class PercentageBasedPricingStrategy(PricingStrategy):
    """
    Strategie 1: Repartition par pourcentages du total TTC.

    Algorithme:
    1. Calculer total_ttc = cee_prime + rac_ttc (utiliser target_rac si fourni, sinon minimum 1€)
    2. Repartir le total_ttc selon les pourcentages configures par categorie
    3. Creer les lignes avec montants calcules (TTC → HT avec TVA 5.5%)
    4. Calculer la marge basee sur les prix d'achat (informatifs)
    """

    async def can_apply(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> bool:
        """Verifie si line_percentages est defini et non vide."""
        return (
            settings.line_percentages is not None
            and len(settings.line_percentages) > 0
        )

    async def calculate(
        self,
        context: PricingContext,
        settings: "ModuleSettings",
        cee_prime: float
    ) -> QuotePreview | None:
        """Calcule le devis avec la repartition par pourcentages."""
        warnings = []
        percentages = settings.line_percentages or {}

        # 1. Determiner le RAC cible
        if context.target_rac is not None:
            target_rac = context.target_rac
        else:
            # RAC minimum de 1€ si la prime CEE depasse le total TTC
            target_rac = 1.0
            if cee_prime > 0:
                warnings.append(
                    f"RAC minimum applique: 1€ (prime CEE: {cee_prime:.2f}€)"
                )

        # 2. Calculer le total TTC
        total_ttc = cee_prime + target_rac

        # 3. Repartir le total TTC selon les pourcentages
        lines = self._distribute_by_percentages(
            total_ttc=total_ttc,
            percentages=percentages,
            context=context,
            settings=settings
        )

        # 4. Calculer la marge
        total_cost_ht = self._calculate_total_cost(context, settings)
        actual_total_ht = sum(line.total_ht for line in lines)
        margin_ht = actual_total_ht - total_cost_ht
        margin_percent = (margin_ht / total_cost_ht * 100) if total_cost_ht > 0 else 0

        logger.info(
            f"PercentageBased: Total TTC={total_ttc:.2f}, RAC={target_rac:.2f}, "
            f"Marge={margin_ht:.2f} ({margin_percent:.1f}%)"
        )

        return QuotePreview(
            lines=lines,
            cee_prime=cee_prime,
            rac_ttc=target_rac,
            margin_ht=margin_ht,
            margin_percent=margin_percent,
            strategy_used="PERCENTAGE_BASED",
            warnings=warnings
        )

    def _distribute_by_percentages(
        self,
        total_ttc: float,
        percentages: dict[str, float],
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> list[QuoteLine]:
        """Repartit le total TTC selon les pourcentages configures."""
        lines = []
        tva_rate = 5.5

        # Calculer les montants TTC par categorie
        category_amounts_ttc: dict[str, float] = {}
        for category, percentage in percentages.items():
            category_amounts_ttc[category] = total_ttc * (percentage / 100.0)

        # 1. HEAT_PUMP : produits de categorie HEAT_PUMP
        if "HEAT_PUMP" in category_amounts_ttc:
            heat_pump_amount_ttc = category_amounts_ttc["HEAT_PUMP"]
            heat_pump_products = [
                p for p in context.products
                if p.category.value == "HEAT_PUMP"
            ]
            
            if heat_pump_products:
                # Repartir le montant entre les produits HEAT_PUMP
                amount_per_product_ttc = heat_pump_amount_ttc / len(heat_pump_products)
                for product in heat_pump_products:
                    # Convertir TTC → HT
                    unit_price_ht = amount_per_product_ttc / (1 + tva_rate / 100)
                    line = QuoteLine(
                        product_id=product.id,
                        title=f"{product.brand or ''} {product.name}".strip(),
                        description=generate_product_description(product, context),
                        quantity=1,
                        unit_price_ht=unit_price_ht,
                        tva_rate=tva_rate,
                        is_editable=True
                    )
                    lines.append(line)

        # 2. LABOR : produits de categorie LABOR
        if "LABOR" in category_amounts_ttc:
            labor_amount_ttc = category_amounts_ttc["LABOR"]
            labor_products = context.labor_products
            
            if labor_products:
                # Repartir le montant entre les produits LABOR
                amount_per_product_ttc = labor_amount_ttc / len(labor_products)
                for product in labor_products:
                    # Convertir TTC → HT
                    unit_price_ht = amount_per_product_ttc / (1 + tva_rate / 100)
                    line = QuoteLine(
                        product_id=product.id,
                        title=f"{product.brand or ''} {product.name}".strip(),
                        description=generate_product_description(product, context),
                        quantity=1,
                        unit_price_ht=unit_price_ht,
                        tva_rate=tva_rate,
                        is_editable=False  # Non editable comme les lignes fixes
                    )
                    lines.append(line)

        # 3. THERMOSTAT : produits de categorie THERMOSTAT
        if "THERMOSTAT" in category_amounts_ttc:
            thermostat_amount_ttc = category_amounts_ttc["THERMOSTAT"]
            # Chercher les thermostats dans context.products ou dans les produits compatibles des PAC
            thermostat_products = [
                p for p in context.products
                if p.category.value == "THERMOSTAT"
            ]
            
            # Si pas de thermostats dans context.products, chercher dans les produits compatibles des PAC
            if not thermostat_products:
                for product in context.products:
                    if (product.category.value == "HEAT_PUMP" and 
                        product.compatible_products):
                        for compatible_product in product.compatible_products:
                            if compatible_product.category.value == "THERMOSTAT":
                                thermostat_products.append(compatible_product)
                                break  # Un seul thermostat par PAC
            
            if thermostat_products:
                # Repartir le montant entre les produits THERMOSTAT
                amount_per_product_ttc = thermostat_amount_ttc / len(thermostat_products)
                for product in thermostat_products:
                    # Convertir TTC → HT
                    unit_price_ht = amount_per_product_ttc / (1 + tva_rate / 100)
                    line = QuoteLine(
                        product_id=product.id,
                        title=f"Thermostat {product.brand or ''} {product.name}".strip(),
                        description=product.description or "",
                        quantity=1,
                        unit_price_ht=unit_price_ht,
                        tva_rate=tva_rate,
                        is_editable=False  # Non editable comme specifie
                    )
                    lines.append(line)

        # 4. FIXED : lignes fixes depuis settings.fixed_line_items
        if "FIXED" in category_amounts_ttc:
            fixed_amount_ttc = category_amounts_ttc["FIXED"]
            fixed_items = settings.fixed_line_items or []
            
            if fixed_items:
                # Repartir le montant entre les lignes fixes
                amount_per_item_ttc = fixed_amount_ttc / len(fixed_items)
                for item in fixed_items:
                    # Convertir TTC → HT (utiliser le taux TVA de l'item ou 5.5% par defaut)
                    item_tva_rate = item.get("tva_rate", tva_rate)
                    unit_price_ht = amount_per_item_ttc / (1 + item_tva_rate / 100)
                    quantity = item.get("quantity", 1)
                    # Ajuster le prix unitaire pour que le total corresponde
                    unit_price_ht = unit_price_ht / quantity
                    
                    line = QuoteLine(
                        product_id=None,
                        title=item.get("title", item.get("description", "Forfait")),
                        description=item.get("description", ""),
                        quantity=quantity,
                        unit_price_ht=unit_price_ht,
                        tva_rate=item_tva_rate,
                        is_editable=False
                    )
                    lines.append(line)

        return lines

    def _calculate_total_cost(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> float:
        """Calcule le cout total de revient (pour le calcul de marge)."""
        total = 0

        # Cout des produits selectionnes
        for product in context.products:
            # Utiliser buying_price_ht si disponible, sinon estimer a 70%
            cost = product.buying_price_ht if product.buying_price_ht else product.price_ht * 0.7
            total += cost

        # Cout des produits de main d'oeuvre
        for labor_product in context.labor_products:
            # Utiliser buying_price_ht si disponible, sinon estimer a 70%
            cost = labor_product.buying_price_ht if labor_product.buying_price_ht else labor_product.price_ht * 0.7
            total += cost

        # Cout des lignes fixes (cout = prix)
        for item in (settings.fixed_line_items or []):
            total += item.get("unit_price_ht", 0) * item.get("quantity", 1)

        return total
