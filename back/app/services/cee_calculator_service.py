"""
Service de calcul des primes CEE BAR-TH-171.

Ce service implémente l'algorithme de calcul de la prime CEE pour les pompes à chaleur
selon les règles métier définies pour l'opération BAR-TH-171.
"""
import logging
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cee_valuation import CEEValuation
from app.core.exceptions import ValuationMissingError

logger = logging.getLogger(__name__)

# =============================================================================
# Constantes - Tables de correspondance
# =============================================================================

# Code opération CEE pour les PAC air/eau
OPERATION_CODE_PAC = "BAR-TH-171"

# Valeurs de base (kWh cumac) selon le type de logement et la plage ETAS
# Usage: Chauffage + ECS
BASE_VALUES_APPARTEMENT = {
    # (min_etas, max_etas): valeur
    (111, 139): 54_000,
    (140, 169): 44_300,
    (170, 199): 67_800,
    (200, 999): 70_300,
}

BASE_VALUES_MAISON = {
    (111, 139): 96_700,
    (140, 169): 111_500,
    (170, 199): 121_400,
    (200, 999): 125_800,
}

# Facteurs d'usage selon la surface chauffée (m²)
USAGE_FACTORS_APPARTEMENT = {
    # (min_surface, max_surface): facteur
    (0, 34): 0.5,
    (35, 59): 0.7,
    (60, 69): 1.0,
    (70, 89): 1.3,
    (90, 109): 1.5,
    (110, 129): 1.9,
    (130, 9999): 2.5,
}

USAGE_FACTORS_MAISON = {
    (0, 69): 0.5,
    (70, 89): 0.7,
    (90, 109): 1.0,
    (110, 129): 1.1,
    (130, 9999): 1.6,
}

# Facteurs zone climatique
ZONE_FACTORS = {
    "H1": 1.2,
    "h1": 1.2,
    "H2": 1.0,
    "h2": 1.0,
    "H3": 0.7,
    "h3": 0.7,
}

# Mapping couleur MPR vers colonne de valorisation
MPR_COLOR_TO_COLUMN = {
    "Bleu": "value_blue",
    "bleu": "value_blue",
    "Jaune": "value_yellow",
    "jaune": "value_yellow",
    "Violet": "value_violet",
    "violet": "value_violet",
    "Rose": "value_rose",
    "rose": "value_rose",
}


# =============================================================================
# Fonctions utilitaires
# =============================================================================

def select_etas(emitter_type: str | None, etas_35: int | None, etas_55: int | None) -> int | None:
    """
    Sélectionne la valeur ETAS appropriée selon le type d'émetteur.

    Règle métier:
    - Si l'émetteur contient "plancher" ou "basse" (basse température) → etas_35
    - Sinon (haute température, mixte, etc.) → etas_55

    Args:
        emitter_type: Type d'émetteur du dossier (ex: "BASSE_TEMPERATURE", "MOYENNE_HAUTE_TEMPERATURE")
        etas_35: ETAS à 35°C du produit
        etas_55: ETAS à 55°C du produit

    Returns:
        La valeur ETAS sélectionnée ou None si non disponible
    """
    if emitter_type is None:
        # Par défaut, utiliser etas_55 (haute température)
        return etas_55

    emitter_lower = emitter_type.lower()
    if "plancher" in emitter_lower or "basse" in emitter_lower:
        return etas_35 if etas_35 is not None else etas_55

    return etas_55 if etas_55 is not None else etas_35


def get_base_value(property_type: str | None, etas: int) -> int:
    """
    Récupère la valeur de base (kWh cumac) selon le type de logement et l'ETAS.

    Args:
        property_type: Type de logement ("MAISON", "APPARTEMENT", etc.)
        etas: Valeur ETAS sélectionnée

    Returns:
        Valeur de base en kWh cumac, ou 0 si ETAS hors plages valides
    """
    if etas < 111:
        return 0

    # Sélectionner la table selon le type de logement
    if property_type and property_type.upper() == "APPARTEMENT":
        lookup_table = BASE_VALUES_APPARTEMENT
    else:
        # Par défaut, considérer comme maison individuelle
        lookup_table = BASE_VALUES_MAISON

    # Recherche dans la table
    for (min_etas, max_etas), value in lookup_table.items():
        if min_etas <= etas <= max_etas:
            return value

    return 0


def get_usage_factor(property_type: str | None, surface: float) -> float:
    """
    Récupère le facteur d'usage selon le type de logement et la surface chauffée.

    Args:
        property_type: Type de logement ("MAISON", "APPARTEMENT", etc.)
        surface: Surface chauffée en m²

    Returns:
        Facteur d'usage (multiplicateur)
    """
    # Sélectionner la table selon le type de logement
    if property_type and property_type.upper() == "APPARTEMENT":
        lookup_table = USAGE_FACTORS_APPARTEMENT
    else:
        lookup_table = USAGE_FACTORS_MAISON

    # Recherche dans la table
    for (min_surface, max_surface), factor in lookup_table.items():
        if min_surface <= surface <= max_surface:
            return factor

    # Valeur par défaut pour surfaces très grandes
    return 1.6 if property_type and property_type.upper() != "APPARTEMENT" else 2.5


def get_zone_factor(zone_climatique: str | None) -> float:
    """
    Récupère le facteur de zone climatique.

    Args:
        zone_climatique: Zone climatique (H1, H2, H3)

    Returns:
        Facteur de zone (1.2, 1.0 ou 0.7)
    """
    if zone_climatique is None:
        return 1.0  # Valeur par défaut

    return ZONE_FACTORS.get(zone_climatique, 1.0)


async def get_valuation_price(
    db: AsyncSession,
    tenant_id: UUID,
    mpr_color: str | None,
    operation_code: str = OPERATION_CODE_PAC,
) -> float:
    """
    Récupère le prix de valorisation CEE pour un tenant et une couleur MPR.

    Args:
        db: Session de base de données
        tenant_id: ID du tenant
        mpr_color: Couleur MPR du bénéficiaire (Bleu, Jaune, Violet, Rose)
        operation_code: Code de l'opération CEE (défaut: BAR-TH-171)

    Returns:
        Prix de valorisation en EUR/MWh cumac

    Raises:
        ValuationMissingError: Si la valorisation n'est pas configurée
    """
    # Récupérer la valorisation pour ce tenant et opération
    result = await db.execute(
        select(CEEValuation).where(
            and_(
                CEEValuation.tenant_id == tenant_id,
                CEEValuation.operation_code == operation_code,
            )
        )
    )
    valuation = result.scalar_one_or_none()

    if valuation is None:
        logger.warning(
            f"Valorisation non trouvée pour tenant={tenant_id}, operation={operation_code}"
        )
        raise ValuationMissingError(operation_code)

    # Sélectionner la colonne selon la couleur MPR
    column_name = MPR_COLOR_TO_COLUMN.get(mpr_color or "", "value_standard")
    price = getattr(valuation, column_name, None)

    if price is None:
        # Si pas de prix pour cette couleur, essayer value_standard
        price = valuation.value_standard

    # Si toujours None, essayer de trouver une valeur disponible parmi les couleurs MPR
    if price is None:
        # Essayer dans l'ordre : bleu, jaune, violet, rose
        for color_value in [valuation.value_blue, valuation.value_yellow, 
                           valuation.value_violet, valuation.value_rose]:
            if color_value is not None:
                price = color_value
                logger.info(
                    f"Utilisation du prix par défaut ({price} EUR/MWh) pour tenant={tenant_id}, "
                    f"operation={operation_code}, color={mpr_color}"
                )
                break

    if price is None:
        logger.warning(
            f"Prix non défini pour tenant={tenant_id}, operation={operation_code}, color={mpr_color}"
        )
        raise ValuationMissingError(operation_code)

    return float(price)


async def calculate_prime(
    db: AsyncSession,
    tenant_id: UUID,
    property_type: str | None,
    surface: float,
    zone_climatique: str | None,
    mpr_color: str | None,
    emitter_type: str | None,
    etas_35: int | None,
    etas_55: int | None,
) -> float:
    """
    Calcule la prime CEE BAR-TH-171 pour une pompe à chaleur.

    Formule: Prime (€) = (Base × Facteur_Usage × Facteur_Zone × Prix_Valorisation × 5) / 1000

    Args:
        db: Session de base de données
        tenant_id: ID du tenant
        property_type: Type de logement ("MAISON", "APPARTEMENT")
        surface: Surface chauffée en m²
        zone_climatique: Zone climatique (H1, H2, H3)
        mpr_color: Couleur MPR du bénéficiaire
        emitter_type: Type d'émetteur pour la sélection ETAS
        etas_35: ETAS à 35°C du produit
        etas_55: ETAS à 55°C du produit

    Returns:
        Montant de la prime CEE en euros, arrondi à 2 décimales

    Raises:
        ValuationMissingError: Si la valorisation n'est pas configurée
    """
    # 1. Sélectionner l'ETAS approprié
    etas = select_etas(emitter_type, etas_35, etas_55)
    if etas is None:
        logger.warning("Aucune valeur ETAS disponible pour le calcul de prime")
        return 0.0

    # 2. Récupérer la valeur de base
    base_value = get_base_value(property_type, etas)
    if base_value == 0:
        logger.warning(f"ETAS {etas} hors plages valides (< 111)")
        return 0.0

    # 3. Récupérer les facteurs
    usage_factor = get_usage_factor(property_type, surface)
    zone_factor = get_zone_factor(zone_climatique)

    # 4. Récupérer le prix de valorisation (peut lever ValuationMissingError)
    valuation_price = await get_valuation_price(db, tenant_id, mpr_color)

    # 5. Appliquer la formule
    # Le coefficient 5 est une règle métier ("Coup de Pouce" / précarité boostée)
    prime = (base_value * usage_factor * zone_factor * valuation_price * 5) / 1000

    logger.info(
        f"Calcul prime CEE: base={base_value}, usage={usage_factor}, "
        f"zone={zone_factor}, valuation={valuation_price}, prime={prime:.2f}€"
    )

    return round(prime, 2)
