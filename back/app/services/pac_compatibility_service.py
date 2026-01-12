"""
Service de compatibilité des pompes à chaleur.
Filtre les PAC selon les critères de dimensionnement.
"""
import logging
from typing import List
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Product, ProductCategory
from app.models.product import ProductHeatPump, PowerSupply

logger = logging.getLogger(__name__)


async def get_compatible_pacs(
    db: AsyncSession,
    tenant_id: UUID,
    required_power: float,
    regime_temperature: str,
    solution_souhaitee: str,
    type_alimentation: str,
) -> List[Product]:
    """
    Récupère une liste de PAC compatibles avec une puissance requise.
    
    La compatibilité est définie comme étant entre 80% et 130% de la puissance requise.
    Filtre sur l'ETAS, l'usage (si 'Chauffage + ECS' est demandé, n'affiche que les PAC Chauffage + ECS) et l'alimentation.
    
    Args:
        db: Session de base de données
        tenant_id: ID du tenant
        required_power: Puissance requise en kW
        regime_temperature: "Basse température" ou "Moyenne/Haute température"
        solution_souhaitee: "Chauffage Seul" ou "Chauffage + ECS"
        type_alimentation: "Monophasé" ou "Triphasé"
    
    Returns:
        Liste des produits PAC compatibles
    """
    lower_bound = required_power * 0.8
    upper_bound = required_power * 1.3
    
    # Définir dynamiquement la colonne ETAS à interroger et le seuil minimum
    if regime_temperature == "Basse température":
        etas_min_threshold = 126  # Seuil plus exigeant pour la basse température
        etas_column = ProductHeatPump.etas_35
    else:  # Moyenne/Haute température
        etas_min_threshold = 111  # Seuil par défaut
        etas_column = ProductHeatPump.etas_55
    
    # Mapping de l'alimentation
    power_supply_map = {
        "Monophasé": PowerSupply.MONOPHASE,
        "Triphasé": PowerSupply.TRIPHASE,
    }
    power_supply_filter = power_supply_map.get(type_alimentation)
    
    # Construire la requête de base
    query = (
        select(Product)
        .join(ProductHeatPump, Product.id == ProductHeatPump.product_id)
        .where(
            and_(
                Product.tenant_id == tenant_id,
                Product.category == ProductCategory.HEAT_PUMP,
                Product.is_active == True,
                ProductHeatPump.power_minus_7 >= lower_bound,
                ProductHeatPump.power_minus_7 <= upper_bound,
                etas_column >= etas_min_threshold,
            )
        )
        .options(selectinload(Product.heat_pump_details))
    )
    
    # Filtre sur l'alimentation
    if power_supply_filter:
        query = query.where(ProductHeatPump.power_supply == power_supply_filter)
    
    # Filtre sur l'usage
    if solution_souhaitee == "Chauffage + ECS":
        # Si "Chauffage + ECS" est demandé, n'afficher que les PAC qui font Chauffage + ECS
        query = query.where(ProductHeatPump.is_duo == True)
    else:  # "Chauffage Seul"
        query = query.where(ProductHeatPump.is_duo == False)
    
    # Trier par puissance
    query = query.order_by(ProductHeatPump.power_minus_7)
    
    try:
        result = await db.execute(query)
        pacs = result.scalars().all()
        logger.info(
            f"{len(pacs)} PACs compatibles trouvées pour une puissance de {required_power:.2f} kW "
            f"(régime: {regime_temperature}, usage: {solution_souhaitee}, alimentation: {type_alimentation})."
        )
        return list(pacs)
    except Exception as e:
        logger.error(f"Erreur DB lors de la récupération des PAC compatibles: {e}")
        return []
