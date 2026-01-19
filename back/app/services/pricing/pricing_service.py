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

from .base import PricingContext, QuotePreview
from .strategy_legacy import LegacyGridPricingStrategy
from .strategy_margin import MarginBasedPricingStrategy

logger = logging.getLogger(__name__)


class PricingError(Exception):
    """Erreur de calcul de pricing."""
    pass


class PricingService:
    """
    Service de pricing utilisant le pattern Strategy.

    Ordre de priorite des strategies:
    1. LegacyGridPricingStrategy (si activee et regle correspondante)
    2. MarginBasedPricingStrategy (fallback)
    """

    def __init__(self):
        self.strategies = [
            LegacyGridPricingStrategy(),
            MarginBasedPricingStrategy(),
        ]

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

        # 6. Essayer les strategies dans l'ordre
        for strategy in self.strategies:
            if await strategy.can_apply(context, settings):
                result = await strategy.calculate(context, settings, cee_prime)
                if result is not None:
                    logger.info(f"Strategie {result.strategy_used} appliquee")
                    return result

        raise PricingError("Aucune strategie de pricing applicable")

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
        """Recupere les produits avec leurs details."""
        result = await db.execute(
            select(Product)
            .options(
                selectinload(Product.heat_pump_details),
                selectinload(Product.thermostat_details),
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


# Instance singleton pour import facile
pricing_service = PricingService()
