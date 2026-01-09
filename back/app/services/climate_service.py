"""
Service pour la récupération des données climatiques (zones et températures de base).
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.climate_zone import ClimateZone
from app.models.base_temperature import BaseTemperature

logger = logging.getLogger(__name__)


async def get_climate_zone(
    db: AsyncSession,
    departement: str,
) -> Optional[ClimateZone]:
    """
    Récupère la zone climatique pour un département donné.
    
    Args:
        db: Session de base de données
        departement: Code département (2 chiffres, ex: "01", "75")
    
    Returns:
        ClimateZone si trouvé, None sinon
    """
    if not departement or len(departement) < 2:
        logger.warning(f"Code département invalide : {departement}")
        return None
    
    # Extraire les 2 premiers caractères (pour gérer les cas comme "971", "2A", etc.)
    dept_code = departement[:2]
    
    result = await db.execute(
        select(ClimateZone).where(ClimateZone.departement == dept_code)
    )
    climate_zone = result.scalar_one_or_none()
    
    if not climate_zone:
        logger.warning(f"Zone climatique non trouvée pour le département {dept_code}")
    
    return climate_zone


async def get_base_temperature(
    db: AsyncSession,
    zone_teb: str,
    altitude: float,
) -> Optional[float]:
    """
    Récupère la température extérieure de base pour une zone TEB et une altitude données.
    
    Args:
        db: Session de base de données
        zone_teb: Zone TEB (A à I)
        altitude: Altitude en mètres
    
    Returns:
        Température de base en °C si trouvée, None sinon
    """
    if not zone_teb or altitude is None:
        logger.warning(f"Paramètres invalides : zone_teb={zone_teb}, altitude={altitude}")
        return None
    
    # Chercher la température de base pour la zone et l'altitude
    result = await db.execute(
        select(BaseTemperature).where(
            BaseTemperature.zone == zone_teb,
            BaseTemperature.altitude_min <= altitude,
            BaseTemperature.altitude_max >= altitude,
        ).order_by(BaseTemperature.altitude_min)
    )
    base_temp = result.scalar_one_or_none()
    
    if not base_temp:
        logger.warning(
            f"Température de base non trouvée pour zone={zone_teb}, altitude={altitude}m"
        )
        return None
    
    return base_temp.temp_base
