"""
Service principal de pricing orchestrant les strategies.
"""
import logging
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.module_settings import ModuleSettings
from app.models.folder import Folder
from app.models.property import Property
from app.models.product import Product
from app.services.cee_calculator_service import calculate_prime, select_etas

from .base import PricingContext, QuotePreview, QuoteLine
from .strategy_legacy import LegacyGridPricingStrategy
from .strategy_margin import MarginBasedPricingStrategy
from .percentage_distributor import PercentageDistributor
from .helpers import generate_product_description

logger = logging.getLogger(__name__)


class PricingError(Exception):
    """Erreur de calcul de pricing."""
    pass


class PricingService:
    """
    Service de pricing utilisant le pattern Strategy.

    Architecture en deux phases:
    1. Phase 1 - Determination du RAC (strategies de pricing):
       - LegacyGridPricingStrategy: si une regle de grille matche → RAC = valeur de la grille
       - MarginBasedPricingStrategy: sinon → RAC = calcule selon la marge minimale
    
    2. Phase 2 - Repartition des lignes (mecanisme de repartition):
       - Si line_percentages est configure → repartir total_ttc = cee_prime + rac selon les pourcentages
       - Sinon → repartir proportionnellement selon les prix initiaux des produits
    """

    def __init__(self):
        # Ordre de priorite: LegacyGrid en premier, puis Margin
        self.strategies = [
            LegacyGridPricingStrategy(),
            MarginBasedPricingStrategy(),
        ]
        self.percentage_distributor = PercentageDistributor()

    async def simulate_quote(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        folder_id: UUID,
        product_ids: list[UUID],
        target_rac: float | None = None,
        module_code: str = "BAR-TH-171",
    ) -> QuotePreview:
        """
        Simule un devis pour un dossier et des produits donnes.

        Args:
            db: Session de base de donnees
            tenant_id: ID du tenant
            folder_id: ID du dossier
            product_ids: IDs des produits selectionnes
            target_rac: RAC cible souhaite (optionnel)
            module_code: Code du module CEE

        Returns:
            QuotePreview avec les lignes et calculs

        Raises:
            PricingError: Si aucune strategie ne peut etre appliquee
        """
        # 1. Charger les parametres du module
        settings = await self._get_module_settings(db, tenant_id, module_code)

        # 2. Charger le dossier avec la propriete
        folder = await self._get_folder(db, folder_id)
        if folder is None:
            raise PricingError(f"Dossier {folder_id} introuvable")

        # 3. Charger les produits
        products = await self._get_products(db, tenant_id, product_ids)
        if not products:
            raise PricingError("Aucun produit trouve")

        # 3.5. Charger les produits de main d'oeuvre depuis les reglages
        labor_products = []
        if settings.default_labor_product_ids:
            # Convertir les IDs de string en UUID
            labor_product_ids = [UUID(str_id) for str_id in settings.default_labor_product_ids]
            labor_products = await self._get_labor_products(db, tenant_id, labor_product_ids)

        # 4. Construire le contexte
        property_data = folder.property if hasattr(folder, 'property') else None
        context = PricingContext(
            tenant_id=tenant_id,
            module_code=module_code,
            folder_id=folder_id,
            product_ids=product_ids,
            target_rac=target_rac,
            surface=property_data.surface_m2 if property_data else 100,
            mpr_color=folder.mpr_color,
            zone_climatique=folder.zone_climatique,
            property_type=property_data.type.value if property_data and property_data.type else "MAISON",
            emitter_type=folder.emitter_type,
            products=products,
            labor_products=labor_products,
            # Extraire les infos de Step 2 qui sont dans folder.data['step2'] normalement
            old_heating_system=folder.data.get('step2', {}).get('heating_system'),
            old_boiler_brand=folder.data.get('step2', {}).get('old_boiler_brand'),
            electrical_phase=folder.data.get('step2', {}).get('electrical_phase'),
            usage_mode=folder.data.get('step2', {}).get('usage_mode'),
            power_kva=folder.data.get('step2', {}).get('power_kva'),
        )

        # Extraire les valeurs ETAS du produit PAC
        for product in products:
            if product.category.value == "HEAT_PUMP" and product.heat_pump_details:
                context.etas_35 = product.heat_pump_details.etas_35
                context.etas_55 = product.heat_pump_details.etas_55
                break

        # 5. Calculer la prime CEE
        etas = select_etas(
            context.emitter_type,
            context.etas_35,
            context.etas_55
        )
        cee_prime = await calculate_prime(
            db=db,
            tenant_id=tenant_id,
            property_type=context.property_type,
            surface=context.surface,
            zone_climatique=context.zone_climatique,
            mpr_color=context.mpr_color,
            emitter_type=context.emitter_type,
            etas_35=context.etas_35,
            etas_55=context.etas_55,
        )

        # 6. Phase 1: Determiner le RAC via une strategie de pricing
        rac_determined = None
        strategy_used = None
        initial_lines = None
        margin_ht = 0.0
        margin_percent = 0.0
        warnings = []
        
        for strategy in self.strategies:
            if await strategy.can_apply(context, settings):
                result = await strategy.calculate(context, settings, cee_prime)
                if result is not None:
                    rac_determined = result.rac_ttc
                    strategy_used = result.strategy_used
                    initial_lines = result.lines
                    margin_ht = result.margin_ht
                    margin_percent = result.margin_percent
                    warnings = result.warnings
                    logger.info(f"Strategie {strategy_used} appliquee, RAC={rac_determined}")
                    break
        
        if rac_determined is None:
            raise PricingError("Aucune strategie de pricing applicable")
        
        # 6.5. Utiliser target_rac si fourni (modification manuelle par l'utilisateur)
        # Sinon, utiliser le RAC determine par la strategie
        final_rac = context.target_rac if context.target_rac is not None else rac_determined
        
        # 7. Phase 2: Repartir les lignes selon line_percentages si configure
        has_percentage_distribution = (
            settings.line_percentages is not None
            and len(settings.line_percentages) > 0
        )
        
        if has_percentage_distribution:
            # Repartir selon les pourcentages avec le RAC final (target_rac ou rac_determined)
            total_ttc = cee_prime + final_rac
            lines = self.percentage_distributor.distribute(
                total_ttc=total_ttc,
                percentages=settings.line_percentages,
                context=context,
                settings=settings
            )
            logger.info(
                f"Repartition par pourcentages appliquee pour total TTC={total_ttc:.2f} "
                f"(RAC={final_rac:.2f}, {'utilisateur' if context.target_rac is not None else 'strategie'})"
            )
        else:
            # Repartir proportionnellement si pas de pourcentages
            total_ttc = cee_prime + final_rac
            lines = self._apply_proportional_distribution(
                total_ttc=total_ttc,
                initial_lines=initial_lines,
                context=context,
                settings=settings
            )
            logger.info(
                f"Repartition proportionnelle appliquee pour total TTC={total_ttc:.2f} "
                f"(RAC={final_rac:.2f}, {'utilisateur' if context.target_rac is not None else 'strategie'})"
            )
        
        # 8. Ajouter automatiquement les thermostats associes pour BAR-TH-171
        # (sauf si deja inclus via les pourcentages)
        if module_code == "BAR-TH-171":
            # Verifier si un thermostat est deja present
            has_thermostat = any(
                line.product_id and 
                any(p.id == line.product_id and p.category.value == "THERMOSTAT" 
                    for p in products)
                for line in lines
            )
            if not has_thermostat:
                lines = await self._add_associated_thermostats_to_lines(
                    db, lines, products, tenant_id, cee_prime
                )
        
        # 9. Calculer les totaux et la marge finale
        total_ht = sum(line.total_ht for line in lines)
        actual_total_ttc = sum(line.total_ttc for line in lines)
        
        # Toujours recalculer la marge a partir des lignes finales
        # La marge = Total HT vendu - Cout total de revient
        total_cost = self._calculate_total_cost(context, settings)
        margin_ht = total_ht - total_cost
        margin_percent = (margin_ht / total_cost * 100) if total_cost > 0 else 0
        
        logger.debug(
            f"Marge calculee: Total HT={total_ht:.2f}, Cout={total_cost:.2f}, "
            f"Marge HT={margin_ht:.2f}, Marge %={margin_percent:.2f}%"
        )
        
        # 10. Creer le resultat final
        # Utiliser final_rac (qui peut etre target_rac ou rac_determined)
        result = QuotePreview(
            lines=lines,
            cee_prime=cee_prime,
            rac_ttc=final_rac,  # Utiliser le RAC final (target_rac si fourni, sinon rac_determined)
            margin_ht=margin_ht,
            margin_percent=margin_percent,
            strategy_used=strategy_used,
            warnings=warnings,
            has_percentage_distribution=has_percentage_distribution
        )
        
        return result

    async def _get_module_settings(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        module_code: str
    ) -> ModuleSettings:
        """Recupere ou cree les parametres du module."""
        result = await db.execute(
            select(ModuleSettings).where(
                and_(
                    ModuleSettings.tenant_id == tenant_id,
                    ModuleSettings.module_code == module_code,
                )
            )
        )
        settings = result.scalar_one_or_none()

        if settings is None:
            # Creer des parametres par defaut
            settings = ModuleSettings(
                tenant_id=tenant_id,
                module_code=module_code,
                enable_legacy_grid_rules=False,
                rounding_mode="NONE",
                min_margin_amount=0,
                default_labor_product_ids=[],
                fixed_line_items=[],
            )
            db.add(settings)
            await db.flush()

        return settings

    async def _get_folder(
        self,
        db: AsyncSession,
        folder_id: UUID
    ) -> Folder | None:
        """Recupere un dossier avec sa propriete."""
        result = await db.execute(
            select(Folder)
            .options(selectinload(Folder.property))
            .where(Folder.id == folder_id)
        )
        return result.scalar_one_or_none()

    async def _get_products(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        product_ids: list[UUID]
    ) -> list[Product]:
        """Recupere les produits avec leurs details et produits compatibles."""
        result = await db.execute(
            select(Product)
            .options(
                selectinload(Product.heat_pump_details),
                selectinload(Product.thermostat_details),
                selectinload(Product.compatible_products).selectinload(Product.thermostat_details),
            )
            .where(
                and_(
                    Product.tenant_id == tenant_id,
                    Product.id.in_(product_ids),
                    Product.is_active == True,
                )
            )
        )
        return list(result.scalars().all())

    async def _get_labor_products(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        labor_product_ids: list[UUID]
    ) -> list[Product]:
        """Recupere les produits de main d'oeuvre."""
        if not labor_product_ids:
            return []
        
        result = await db.execute(
            select(Product).where(
                and_(
                    Product.tenant_id == tenant_id,
                    Product.id.in_(labor_product_ids),
                    Product.category == "LABOR",
                    Product.is_active == True,
                )
            )
        )
        return list(result.scalars().all())

    def _apply_proportional_distribution(
        self,
        total_ttc: float,
        initial_lines: list[QuoteLine],
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> list[QuoteLine]:
        """
        Repartit proportionnellement le total TTC selon les prix initiaux des produits.
        
        Algorithme:
        1. Calculer la somme des prix TTC initiaux
        2. Calculer le ratio = total_ttc_cible / somme_initiale
        3. Appliquer le ratio a chaque ligne
        """
        if not initial_lines:
            # Si pas de lignes initiales, construire les lignes de base
            lines = []
            for product in context.products:
                line = QuoteLine(
                    product_id=product.id,
                    title=f"{product.brand or ''} {product.name}",
                    description=generate_product_description(product, context),
                    quantity=1,
                    unit_price_ht=product.price_ht,
                    tva_rate=5.5,
                    is_editable=True
                )
                lines.append(line)
            
            # Ajouter les produits de main d'oeuvre
            for labor_product in context.labor_products:
                line = QuoteLine(
                    product_id=labor_product.id,
                    title=f"{labor_product.brand or ''} {labor_product.name}",
                    description=generate_product_description(labor_product, context),
                    quantity=1,
                    unit_price_ht=labor_product.price_ht,
                    tva_rate=5.5,
                    is_editable=False
                )
                lines.append(line)
            
            # Ajouter les lignes fixes
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
        else:
            lines = initial_lines.copy()
        
        # Calculer la somme des prix TTC initiaux
        initial_total_ttc = sum(line.total_ttc for line in lines)
        
        if initial_total_ttc == 0:
            logger.warning("Somme initiale TTC = 0, impossible de repartir proportionnellement")
            return lines
        
        # Calculer le ratio
        ratio = total_ttc / initial_total_ttc
        
        # Appliquer le ratio a chaque ligne
        for line in lines:
            if line.is_editable:
                # Ajuster le prix unitaire HT
                line.unit_price_ht = line.unit_price_ht * ratio
        
        logger.debug(
            f"Repartition proportionnelle: ratio={ratio:.4f}, "
            f"total_ttc_cible={total_ttc:.2f}, initial={initial_total_ttc:.2f}"
        )
        
        return lines

    async def _add_associated_thermostats_to_lines(
        self,
        db: AsyncSession,
        lines: list[QuoteLine],
        products: list[Product],
        tenant_id: UUID,
        cee_prime: float
    ) -> list[QuoteLine]:
        """
        Ajoute automatiquement les thermostats associes aux lignes de devis
        pour les PAC avec module BAR-TH-171.
        
        Returns:
            Liste de lignes avec les thermostats ajoutes
        """
        # Parcourir les produits pour trouver les PAC avec thermostats associes
        for product in products:
            # Verifier si c'est une PAC avec le module BAR-TH-171
            if (product.category.value == "HEAT_PUMP" and 
                product.module_codes and 
                "BAR-TH-171" in product.module_codes and
                product.compatible_products):
                
                # Chercher un thermostat dans les produits compatibles
                for compatible_product in product.compatible_products:
                    if compatible_product.category.value == "THERMOSTAT":
                        # Verifier si le thermostat n'est pas deja dans les lignes
                        if not any(
                            line.product_id == compatible_product.id 
                            for line in lines
                        ):
                            # Creer une ligne pour le thermostat
                            thermostat_line = QuoteLine(
                                product_id=compatible_product.id,
                                title=f"Thermostat {compatible_product.brand or ''} {compatible_product.name}".strip(),
                                description=compatible_product.description or "",
                                quantity=1,
                                unit_price_ht=compatible_product.price_ht,
                                tva_rate=5.5,
                                is_editable=False,
                            )
                            
                            # Ajouter la ligne
                            lines.append(thermostat_line)
                            
                            logger.info(f"Thermostat {compatible_product.name} ajoute automatiquement au devis")
                        break  # Un seul thermostat par PAC
        
        return lines

    def _calculate_total_cost(
        self,
        context: PricingContext,
        settings: "ModuleSettings"
    ) -> float:
        """Calcule le cout total de revient (prix d'achat)."""
        total = 0
        
        # Cout des produits selectionnes
        for product in context.products:
            # Utiliser buying_price_ht si disponible, sinon 70% du prix de vente
            cost = product.buying_price_ht if product.buying_price_ht else product.price_ht * 0.7
            total += cost
        
        # Cout des produits de main d'oeuvre
        for labor_product in context.labor_products:
            # Utiliser buying_price_ht si disponible, sinon 70% du prix de vente
            cost = labor_product.buying_price_ht if labor_product.buying_price_ht else labor_product.price_ht * 0.7
            total += cost
        
        # Ajouter les lignes fixes (consideres comme cout)
        for item in (settings.fixed_line_items or []):
            total += item.get("unit_price_ht", 0) * item.get("quantity", 1)
        
        return total


# Instance singleton pour import facile
pricing_service = PricingService()
