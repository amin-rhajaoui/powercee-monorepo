"""
Mecanisme de repartition par pourcentages du total TTC.
"""
import logging
from typing import TYPE_CHECKING

from .base import QuoteLine
from .helpers import generate_product_description

if TYPE_CHECKING:
    from .base import PricingContext
    from app.models.module_settings import ModuleSettings

logger = logging.getLogger(__name__)


class PercentageDistributor:
    """
    Mecanisme de repartition du total TTC selon des pourcentages par categorie.
    
    Categories supportees:
    - HEAT_PUMP: Produits de categorie HEAT_PUMP
    - LABOR: Produits de categorie LABOR
    - THERMOSTAT: Produits de categorie THERMOSTAT
    - FIXED: Lignes fixes depuis settings.fixed_line_items
    """

    def distribute(
        self,
        total_ttc: float,
        percentages: dict[str, float],
        context: "PricingContext",
        settings: "ModuleSettings"
    ) -> list[QuoteLine]:
        """
        Repartit le total TTC selon les pourcentages configures.
        
        Args:
            total_ttc: Total TTC a repartir (cee_prime + rac)
            percentages: Dictionnaire {categorie: pourcentage}
            context: Contexte de pricing
            settings: Parametres du module
            
        Returns:
            Liste de lignes de devis avec prix ajustes selon les pourcentages
        """
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

        logger.debug(
            f"Repartition par pourcentages: {len(lines)} lignes creees "
            f"pour total TTC={total_ttc:.2f}"
        )
        
        return lines
