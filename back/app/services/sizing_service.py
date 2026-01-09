"""
Service de dimensionnement de pompe à chaleur.

Basé sur l'algorithme décrit dans ressourcedimensionnement.md.
"""
import logging
import math
from typing import Literal

from app.services.isolation_service import infer_type_isolation

logger = logging.getLogger(__name__)


async def dimensionner_pac_simplifie(
    surface_chauffee: float,
    hauteur_plafond: float,
    type_emetteur: Literal["BT", "MT_HT"],
    annee_construction: int,
    zone_climatique: str,
    temp_de_base: float | None,
    temperature_consigne: float = 19.0,
    # Paramètres optionnels pour calcul d'isolation automatique
    combles_isole: bool | None = None,
    combles_annee: int | None = None,
    plancher_isole: bool | None = None,
    plancher_annee: int | None = None,
    murs_type: str | None = None,
    murs_annee_interieur: int | None = None,
    murs_annee_exterieur: int | None = None,
    menuiserie_type: str | None = None,
    # Override direct du type_isolation si fourni
    type_isolation_override: str | None = None,
) -> dict:
    """
    Calcule une estimation simplifiée de la puissance théorique d'une PAC air/eau.

    ATTENTION : Ce modèle est pédagogique et ne remplace pas une étude thermique
    professionnelle pour le dimensionnement réel.

    :param surface_chauffee: Surface chauffée en m².
    :param hauteur_plafond: Hauteur sous plafond en mètres.
    :param type_emetteur: 'BT' (Basse Température) ou 'MT_HT' (Moyenne/Haute Température).
    :param annee_construction: Année de construction de la maison (ex: 1985).
    :param zone_climatique: 'H1', 'H2', ou 'H3' (selon la classification française DPE).
    :param temp_de_base: Température extérieure de base en °C.
    :param temperature_consigne: Température intérieure souhaitée en °C.
    :param combles_isole: True si les combles sont isolés (pour calcul auto isolation).
    :param combles_annee: Année d'isolation des combles.
    :param plancher_isole: True si le plancher est isolé.
    :param plancher_annee: Année d'isolation du plancher.
    :param murs_type: Type d'isolation des murs.
    :param murs_annee_interieur: Année d'isolation intérieure des murs.
    :param murs_annee_exterieur: Année d'isolation extérieure des murs.
    :param menuiserie_type: Type de menuiserie.
    :param type_isolation_override: Override direct du type_isolation si fourni.
    :return: Un dictionnaire avec la puissance estimée et les paramètres utilisés.
    """
    
    # --- Détermination du type_isolation ---
    type_isolation: str
    facteur_isolation: float
    isolation_details: dict = {}
    
    if type_isolation_override:
        # Utiliser l'override si fourni
        type_isolation = type_isolation_override
        # Facteur classique basé sur le type
        if type_isolation == 'faible':
            facteur_isolation = 1.2
        elif type_isolation == 'bonne':
            facteur_isolation = 1.0
        elif type_isolation == 'tres_bonne':
            facteur_isolation = 0.8
        else:
            facteur_isolation = 1.0
    elif any([combles_isole is not None, plancher_isole is not None, murs_type, menuiserie_type]):
        # Calcul automatique depuis les données détaillées
        isolation_result = infer_type_isolation(
            annee_construction=annee_construction,
            combles_isole=combles_isole,
            combles_annee=combles_annee,
            plancher_isole=plancher_isole,
            plancher_annee=plancher_annee,
            murs_type=murs_type,
            murs_annee_interieur=murs_annee_interieur,
            murs_annee_exterieur=murs_annee_exterieur,
            menuiserie_type=menuiserie_type,
        )
        type_isolation = isolation_result["type_isolation"]
        facteur_isolation = isolation_result["facteur_isolation"]
        isolation_details = isolation_result.get("details", {})
    else:
        # Valeur par défaut si aucune donnée
        type_isolation = "bonne"
        facteur_isolation = 1.0
        logger.warning("Aucune donnée d'isolation fournie, utilisation de la valeur par défaut 'bonne'")

    # --- 1. Détermination du Coefficient de Déperdition Volumique (G) ---
    # Valeurs indicatives basées sur l'âge (pré-RT, RT2005, RT2012...)
    if annee_construction < 1975:
        g_base = 1.3
    elif 1975 <= annee_construction < 1989:
        g_base = 1.2
    elif 1989 <= annee_construction < 2000:
        g_base = 1.0
    elif 2000 <= annee_construction < 2012:  # RT 2005
        g_base = 0.85
    elif annee_construction >= 2012:  # RT 2012 ou RE 2020 (très faible)
        g_base = 0.7
    else:
        g_base = 1.1  # Valeur par défaut si l'année est incohérente
        
    G_coefficient = g_base * facteur_isolation

    # --- 2. Détermination du Delta T (Écart de Température) ---
    zone_lower = zone_climatique.lower() if zone_climatique else ""

    # Utilisation de la température de base stockée dans la base de données
    if temp_de_base is not None:
        teb = float(temp_de_base)
    else:
        # Valeur par défaut si temp_de_base n'est pas disponible (fallback)
        logger.warning(f"temp_de_base non disponible, utilisation d'une valeur par défaut pour la zone {zone_climatique}")
        if zone_lower == 'h1':  # Montagne, Est, Nord-Est
            teb = -9.0
        elif zone_lower == 'h2':  # Région Parisienne, Centre, Ouest
            teb = -7.0
        elif zone_lower == 'h3':  # Sud, Côte Atlantique, Méditerranée
            teb = -5.0
        else:
            teb = -7.0  # Valeur par défaut pour H2
        
    temperature_interieure = temperature_consigne
    delta_t = temperature_interieure - teb  # Le résultat est positif

    # --- 3. Facteur de Correction Émetteur (FCE) ---
    if type_emetteur == 'BT':  # Plancher chauffant, radiateurs basse T° (eau max 45°C)
        facteur_correction_emetteur = 1.0
    elif type_emetteur == 'MT_HT':  # Radiateurs haute T° (eau 55°C à 65°C)
        facteur_correction_emetteur = 1.2 
    else:
        facteur_correction_emetteur = 1.0

    # --- 4. Calcul de la Puissance Théorique (P) ---
    volume_chauffe = surface_chauffee * hauteur_plafond
    
    # Puissance en Watts
    puissance_watts = (
        volume_chauffe * G_coefficient * delta_t * facteur_correction_emetteur
    )
    
    # Puissance en KiloWatts (arrondie au dixième supérieur)
    puissance_kw = math.ceil(puissance_watts / 1000 * 10) / 10

    # --- 5. Calcul des Besoins Annuels de Chaleur (Q) ---
    # Degrés-Jours Unifiés (DJU) moyens par zone climatique
    if zone_lower == 'h1':
        dju = 3200
    elif zone_lower == 'h2':
        dju = 2700
    elif zone_lower == 'h3':
        dju = 1800
    else:
        dju = 2700  # Valeur par défaut pour H2

    rendement_regulation = 0.9  # Facteur simplifié

    besoins_annuels_kwh = (
        G_coefficient * volume_chauffe * dju * 24 / 1000 * facteur_correction_emetteur * rendement_regulation
    )

    # Calcul du taux de couverture (simplifié)
    taux_couverture = 100 if puissance_kw > 0 else 0

    # --- 6. Résultat ---
    puissance_kw_brut = puissance_watts / 1000.0
    
    # Déterminer le régime de température pour le PDF
    regime_temperature = "Basse température" if type_emetteur == "BT" else "Moyenne/Haute température"

    resultat = {
        "Puissance_Estimee_kW": puissance_kw,
        "Besoins_Chaleur_Annuel_kWh": round(besoins_annuels_kwh, 2),
        "Taux_Couverture": taux_couverture,
        "Regime_Temperature": regime_temperature,
        "Intermediate_Calculations": {
            "g_base": g_base,
            "facteur_isolation": facteur_isolation,
            "teb": teb,
            "delta_t": delta_t,
            "volume_chauffe_m3": volume_chauffe,
            "facteur_correction_emetteur": facteur_correction_emetteur,
            "puissance_watts": puissance_watts,
            "puissance_kw_brut": puissance_kw_brut,
            "dju": dju,
            "besoins_annuels_kwh_brut": besoins_annuels_kwh,
            "temperature_interieure": temperature_interieure,
            "isolation_details": isolation_details,
        },
        "Details_Calcul": {
            "Volume_Chauffe_m3": round(volume_chauffe, 2),
            "G_Coefficient_Wm3K": round(G_coefficient, 3),
            "Delta_T_K": round(delta_t, 1),
            "Facteur_Correction_Emetteur": facteur_correction_emetteur,
            "Puissance_Watts_Brute": round(puissance_watts, 0),
            "Puissance_kW_Brute": round(puissance_kw_brut, 2),
            "Teb_Ajustee": teb,
        },
        "Parametres_Entree": {
            "Surface": surface_chauffee,
            "Hauteur": hauteur_plafond,
            "Annee": annee_construction,
            "Isolation": type_isolation,
            "Zone_Climatique": zone_climatique,
            "Emetteur": type_emetteur,
            "Temperature_Consigne": temperature_consigne,
            "Temp_De_Base": temp_de_base,
        },
    }
    
    return resultat
