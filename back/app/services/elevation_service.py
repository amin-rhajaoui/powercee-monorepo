"""
Service de récupération de l'altitude à partir de coordonnées GPS.

Utilise l'API Open-Elevation (https://api.open-elevation.com/api/v1/lookup)
pour obtenir l'altitude en mètres à partir de latitude et longitude.
"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# URL de l'API Open-Elevation
ELEVATION_API_URL = "https://api.open-elevation.com/api/v1/lookup"
TIMEOUT_SECONDS = 10.0


async def get_elevation(latitude: float, longitude: float) -> Optional[float]:
    """
    Récupère l'altitude en mètres pour des coordonnées GPS données.
    
    Args:
        latitude: Latitude (entre -90 et 90)
        longitude: Longitude (entre -180 et 180)
    
    Returns:
        Altitude en mètres, ou None si l'appel échoue
    """
    # Valider les coordonnées
    if not (-90 <= latitude <= 90):
        logger.warning(f"Latitude invalide: {latitude}")
        return None
    
    if not (-180 <= longitude <= 180):
        logger.warning(f"Longitude invalide: {longitude}")
        return None

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            # Format attendu par l'API Open-Elevation
            payload = {
                "locations": [
                    {
                        "latitude": latitude,
                        "longitude": longitude
                    }
                ]
            }
            
            response = await client.post(ELEVATION_API_URL, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            # L'API retourne un tableau "results" avec les résultats
            if "results" in data and len(data["results"]) > 0:
                elevation = data["results"][0].get("elevation")
                if elevation is not None:
                    logger.info(f"Altitude récupérée: {elevation}m pour ({latitude}, {longitude})")
                    return float(elevation)
                else:
                    logger.warning(f"Altitude non trouvée dans la réponse API pour ({latitude}, {longitude})")
                    return None
            else:
                logger.warning(f"Réponse API invalide pour ({latitude}, {longitude}): {data}")
                return None
                
    except httpx.TimeoutException:
        logger.warning(f"Timeout lors de la récupération de l'altitude pour ({latitude}, {longitude})")
        return None
    except httpx.HTTPStatusError as e:
        logger.warning(f"Erreur HTTP {e.response.status_code} lors de la récupération de l'altitude: {e}")
        return None
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la récupération de l'altitude pour ({latitude}, {longitude}): {e}")
        return None
