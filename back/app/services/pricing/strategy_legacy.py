"""
Strategie de pricing basee sur les regles de grille heritees.
"""
import logging
from typing import TYPE_CHECKING

from .base import PricingStrategy, PricingContext, QuoteLine, QuotePreview
from .rounding import round_to_x90

if TYPE_CHECKING:
    from app.models.module_settings import ModuleSettings

logger = logging.getLogger(__name__)


class LegacyGridPricingStrategy(PricingStrategy):
    """
    Strategie 1: RAC fixe base sur les regles de grille.

    Conditions d'application:
    - enable_legacy_grid_rules = True
    - Une regle correspondant au contexte existe

    Criteres de matching:
    - Marque du produit
    - Plage ETAS
    - Plage surface
    - Profil MPR
    """

    async def can_apply(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> bool:
        """Verifie si une regle de grille correspond au contexte."""
        if not settings.enable_legacy_grid_rules:
            return False

        if not settings.legacy_grid_rules:
            return False

        # Trouver le produit PAC pour obtenir la marque
        pac_product = self._get_pac_product(context)
        if pac_product is None:
            return False

        # Obtenir l'ETAS
        etas = self._get_etas(context)
        if etas is None:
            return False

        # Chercher une regle correspondante
        rule = self._find_matching_rule(
            settings.legacy_grid_rules,
            brand=pac_product.brand,
            etas=etas,
            surface=context.surface,
            mpr_color=context.mpr_color
        )

        return rule is not None

    async def calculate(
        self,
        context: PricingContext,
        settings: "ModuleSettings",
        cee_prime: float
    ) -> QuotePreview | None:
        """Calcule le devis en appliquant le RAC fixe de la grille."""
        pac_product = self._get_pac_product(context)
        if pac_product is None:
            return None

        etas = self._get_etas(context)
        if etas is None:
            return None

        rule = self._find_matching_rule(
            settings.legacy_grid_rules,
            brand=pac_product.brand,
            etas=etas,
            surface=context.surface,
            mpr_color=context.mpr_color
        )

        if rule is None:
            return None

        # RAC cible depuis la grille
        target_rac = rule.get("rac_amount", 0)

        # Appliquer l'arrondi si configure
        if settings.rounding_mode == "X90":
            target_rac = round_to_x90(target_rac)

        # Calculer le total TTC necessaire pour atteindre ce RAC
        total_ttc = cee_prime + target_rac

        # Construire les lignes du devis
        lines = self._build_quote_lines(context, settings, total_ttc, cee_prime)

        # Calculer les totaux
        total_ht = sum(line.total_ht for line in lines)
        actual_total_ttc = sum(line.total_ttc for line in lines)

        # Calculer la marge
        total_cost = self._calculate_total_cost(context, settings)
        margin_ht = total_ht - total_cost
        margin_percent = (margin_ht / total_cost * 100) if total_cost > 0 else 0

        logger.info(
            f"LegacyGrid: RAC={target_rac}, Total TTC={actual_total_ttc}, "
            f"Marge={margin_ht:.2f} ({margin_percent:.1f}%)"
        )

        return QuotePreview(
            lines=lines,
            total_ht=total_ht,
            total_ttc=actual_total_ttc,
            cee_prime=cee_prime,
            rac_ttc=target_rac,
            margin_ht=margin_ht,
            margin_percent=margin_percent,
            strategy_used="LEGACY_GRID",
            warnings=[]
        )

    def _get_pac_product(self, context: PricingContext):
        """Trouve le produit PAC dans la liste des produits."""
        for product in context.products:
            if product.category.value == "HEAT_PUMP":
                return product
        return None

    def _get_etas(self, context: PricingContext) -> int | None:
        """Obtient la valeur ETAS appropriee selon le type d'emetteur."""
        pac = self._get_pac_product(context)
        if pac is None or pac.heat_pump_details is None:
            return context.etas_55 or context.etas_35

        etas_35 = pac.heat_pump_details.etas_35
        etas_55 = pac.heat_pump_details.etas_55

        # Selectionner selon le type d'emetteur
        if context.emitter_type:
            emitter_lower = context.emitter_type.lower()
            if "plancher" in emitter_lower or "basse" in emitter_lower:
                return etas_35 if etas_35 else etas_55

        return etas_55 if etas_55 else etas_35

    def _find_matching_rule(
        self,
        rules: list[dict],
        brand: str,
        etas: int,
        surface: float,
        mpr_color: str | None
    ) -> dict | None:
        """Trouve une regle correspondant aux criteres."""
        for rule in rules:
            # Verifier la marque (case insensitive)
            if rule.get("brand", "").lower() != brand.lower():
                continue

            # Verifier la plage ETAS
            etas_min = rule.get("etas_min", 0)
            etas_max = rule.get("etas_max", 999)
            if not (etas_min <= etas < etas_max):
                continue

            # Verifier la plage surface
            surface_min = rule.get("surface_min", 0)
            surface_max = rule.get("surface_max", 9999)
            if not (surface_min <= surface < surface_max):
                continue

            # Verifier le profil MPR
            rule_mpr = rule.get("mpr_profile", "").lower()
            ctx_mpr = (mpr_color or "").lower()

            # "non-bleu" matche tout sauf bleu
            if rule_mpr == "non-bleu":
                if ctx_mpr == "bleu":
                    continue
            elif rule_mpr and rule_mpr != ctx_mpr:
                continue

            return rule

        return None

    def _build_quote_lines(
        self,
        context: PricingContext,
        settings: "ModuleSettings",
        total_ttc: float,
        cee_prime: float
    ) -> list[QuoteLine]:
        """Construit les lignes du devis pour atteindre le total TTC cible."""
        lines = []

        # 1. Ajouter les produits selectionnes
        products_ttc = 0
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
            products_ttc += line.total_ttc

        # 2. Ajouter les lignes fixes
        fixed_ttc = 0
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
            fixed_ttc += line.total_ttc

        # 3. Ajuster le prix du premier produit pour atteindre le total cible
        if lines and total_ttc > 0:
            current_ttc = products_ttc + fixed_ttc
            diff_ttc = total_ttc - current_ttc

            if diff_ttc != 0 and lines[0].is_editable:
                # Convertir la difference TTC en HT
                diff_ht = diff_ttc / (1 + lines[0].tva_rate / 100)
                lines[0].unit_price_ht += diff_ht

        return lines

    def _calculate_total_cost(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> float:
        """Calcule le cout total (prix d'achat)."""
        total = 0
        for product in context.products:
            # Utiliser buying_price_ht si disponible, sinon 70% du prix de vente
            cost = product.buying_price_ht if product.buying_price_ht else product.price_ht * 0.7
            total += cost

        # Ajouter les lignes fixes (consideres comme cout)
        for item in (settings.fixed_line_items or []):
            total += item.get("unit_price_ht", 0) * item.get("quantity", 1)

        return total
