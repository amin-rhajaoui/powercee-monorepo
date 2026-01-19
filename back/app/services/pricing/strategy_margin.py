"""
Strategie de pricing basee sur le cout + marge minimale.
"""
import logging
from typing import TYPE_CHECKING

from .base import PricingStrategy, PricingContext, QuoteLine, QuotePreview
from .rounding import round_to_x90

if TYPE_CHECKING:
    from app.models.module_settings import ModuleSettings

logger = logging.getLogger(__name__)


class MarginBasedPricingStrategy(PricingStrategy):
    """
    Strategie 2: Calcul dynamique cost-plus avec marge minimale.

    Algorithme:
    1. Cout de revient = Prix achat materiels + Main d'oeuvre + Forfaits
    2. Prix plancher HT = Cout + Marge minimale
    3. Prix plancher TTC = Prix plancher HT * 1.055
    4. RAC minimum = Prix plancher TTC - Prime CEE

    Si target_rac fourni et >= RAC minimum, utiliser target_rac.
    """

    async def can_apply(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> bool:
        """Cette strategie est toujours applicable (fallback)."""
        return True

    async def calculate(
        self,
        context: PricingContext,
        settings: "ModuleSettings",
        cee_prime: float
    ) -> QuotePreview | None:
        """Calcule le devis avec la logique cost-plus."""
        warnings = []

        # 1. Calculer le cout de revient
        total_cost_ht = self._calculate_total_cost(context, settings)

        # 2. Appliquer la marge minimale
        min_margin = settings.min_margin_amount or 0
        price_floor_ht = total_cost_ht + min_margin

        # 3. Convertir en TTC (TVA 5.5%)
        price_floor_ttc = price_floor_ht * 1.055

        # 4. Calculer le RAC minimum
        rac_minimum = price_floor_ttc - cee_prime

        # 5. Determiner le RAC final
        if context.target_rac is not None:
            if context.target_rac < rac_minimum:
                warnings.append(
                    f"RAC cible ({context.target_rac}€) inferieur au minimum ({rac_minimum:.2f}€). "
                    f"Le minimum sera applique."
                )
                target_rac = rac_minimum
            else:
                target_rac = context.target_rac
        else:
            target_rac = rac_minimum

        # 6. Appliquer le plafond RAC addon si configure
        if settings.max_rac_addon is not None:
            max_rac = rac_minimum + settings.max_rac_addon
            if target_rac > max_rac:
                warnings.append(
                    f"RAC cible ({target_rac}€) depasse le plafond ({max_rac:.2f}€). "
                    f"Le plafond sera applique."
                )
                target_rac = max_rac

        # 7. Appliquer l'arrondi si configure
        if settings.rounding_mode == "X90":
            target_rac = round_to_x90(target_rac)

        # 8. Calculer le total TTC final
        total_ttc = cee_prime + target_rac
        total_ht = total_ttc / 1.055

        # 9. Construire les lignes du devis
        lines = self._build_quote_lines(context, settings, total_ht)

        # 10. Calculer la marge reelle
        actual_total_ht = sum(line.total_ht for line in lines)
        actual_total_ttc = sum(line.total_ttc for line in lines)
        margin_ht = actual_total_ht - total_cost_ht
        margin_percent = (margin_ht / total_cost_ht * 100) if total_cost_ht > 0 else 0

        logger.info(
            f"MarginBased: Cout={total_cost_ht:.2f}, Marge min={min_margin}, "
            f"RAC={target_rac:.2f}, Total TTC={actual_total_ttc:.2f}, "
            f"Marge reelle={margin_ht:.2f} ({margin_percent:.1f}%)"
        )

        return QuotePreview(
            lines=lines,
            total_ht=actual_total_ht,
            total_ttc=actual_total_ttc,
            cee_prime=cee_prime,
            rac_ttc=target_rac,
            margin_ht=margin_ht,
            margin_percent=margin_percent,
            strategy_used="COST_PLUS",
            warnings=warnings
        )

    def _calculate_total_cost(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> float:
        """Calcule le cout total de revient."""
        total = 0

        # Cout des produits selectionnes
        for product in context.products:
            # Utiliser buying_price_ht si disponible, sinon estimer a 70%
            cost = product.buying_price_ht if product.buying_price_ht else product.price_ht * 0.7
            total += cost

        # Cout des lignes fixes (cout = prix)
        for item in (settings.fixed_line_items or []):
            total += item.get("unit_price_ht", 0) * item.get("quantity", 1)

        return total

    def _build_quote_lines(
        self,
        context: PricingContext,
        settings: "ModuleSettings",
        target_total_ht: float
    ) -> list[QuoteLine]:
        """Construit les lignes du devis."""
        lines = []

        # 1. Ajouter les produits selectionnes
        products_ht = 0
        for product in context.products:
            line = QuoteLine(
                product_id=product.id,
                title=f"{product.brand} {product.name}",
                description=product.description or "",
                quantity=1,
                unit_price_ht=product.price_ht,
                tva_rate=5.5,
                is_editable=True
            )
            lines.append(line)
            products_ht += line.total_ht

        # 2. Ajouter les lignes fixes
        fixed_ht = 0
        for item in (settings.fixed_line_items or []):
            line = QuoteLine(
                product_id=None,
                title=item.get("title", item.get("description", "Forfait")),
                description=item.get("description", ""),
                quantity=item.get("quantity", 1),
                unit_price_ht=item.get("unit_price_ht", 0),
                tva_rate=item.get("tva_rate", 5.5),
                is_editable=False
            )
            lines.append(line)
            fixed_ht += line.total_ht

        # 3. Ajuster pour atteindre le total cible
        current_total_ht = products_ht + fixed_ht
        diff_ht = target_total_ht - current_total_ht

        if diff_ht != 0 and lines:
            # Repartir la difference sur les lignes editables
            editable_lines = [l for l in lines if l.is_editable]
            if editable_lines:
                # Ajouter la difference au premier produit editable
                editable_lines[0].unit_price_ht += diff_ht

        return lines
