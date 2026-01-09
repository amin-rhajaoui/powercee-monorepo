import math
import httpx
import logging

logger = logging.getLogger(__name__)

async def dimensionner_pac_simplifie(
    surface_chauffee: float,
    hauteur_plafond: float,
    type_emetteur: str,
    annee_construction: int,
    type_isolation: str,
    zone_climatique: str,
    temp_de_base: int | None,
    temperature_consigne: float = 19.0,
) -> dict:
    """
    Calcule une estimation simplifiée de la puissance théorique d'une PAC air/eau.

    ATTENTION : Ce modèle est pédagogique et ne remplace pas une étude thermique
    professionnelle pour le dimensionnement réel.

    :param surface_chauffee: Surface chauffée en m².
    :param hauteur_plafond: Hauteur sous plafond en mètres.
    :param type_emetteur: 'BT' (Basse Température) ou 'MT_HT' (Moyenne/Haute Température).
    :param annee_construction: Année de construction de la maison (ex: 1985).
    :param type_isolation: 'faible', 'bonne', ou 'tres_bonne'.
    :param zone_climatique: 'H1', 'H2', ou 'H3' (selon la classification française DPE).
    :param temp_de_base: Température extérieure de base en °C (récupérée depuis la table logements).
    :param temperature_consigne: Température intérieure souhaitée en °C.
    :return: Un dictionnaire avec la puissance estimée et les paramètres utilisés.
    """

    # --- 1. Détermination du Coefficient de Déperdition Volumique (G) ---
    # G (W/m³.K) agrège l'isolation et l'âge de la maison.
    # Plus G est élevé, plus la maison est énergivore (mal isolée).
    
    # Valeurs indicatives basées sur l'âge (pré-RT, RT2005, RT2012...)
    if annee_construction < 1975:
        g_base = 1.3
    elif 1975 <= annee_construction < 1989:
        g_base = 1.2
    elif 1989 <= annee_construction < 2000:
        g_base = 1.0
    elif 2000 <= annee_construction < 2012: # RT 2005
        g_base = 0.85
    elif annee_construction >= 2012: # RT 2012 ou RE 2020 (très faible)
        g_base = 0.7
    else:
        g_base = 1.1 # Valeur par défaut si l'année est incohérente

    # Facteur d'ajustement selon l'état de l'isolation (simplifié)
    if type_isolation == 'faible':
        facteur_isolation = 1.2 # Dépassement de la base
    elif type_isolation == 'bonne':
        facteur_isolation = 1.0 # Correspond à la base
    elif type_isolation == 'tres_bonne':
        facteur_isolation = 0.8 # Meilleur que la base
    else:
        facteur_isolation = 1.0
        
    G_coefficient = g_base * facteur_isolation

    # --- 2. Détermination du Delta T (Écart de Température) ---
    # T_interieure fixe à 19°C. T_exterieure_base (temp_de_base) est récupérée depuis la base de données.
    
    # Si zone_climatique n'est pas None, on la convertit en minuscules.
    zone_lower = zone_climatique.lower() if zone_climatique else ""

    # Utilisation de la température de base stockée dans la base de données
    # Si temp_de_base n'est pas disponible, on utilise une valeur par défaut selon la zone
    if temp_de_base is not None:
        teb = float(temp_de_base)
    else:
        # Valeur par défaut si temp_de_base n'est pas disponible (fallback)
        logger.warning(f"temp_de_base non disponible, utilisation d'une valeur par défaut pour la zone {zone_climatique}")
        if zone_lower == 'h1': # Montagne, Est, Nord-Est
            teb = -9.0
        elif zone_lower == 'h2': # Région Parisienne, Centre, Ouest
            teb = -7.0
        elif zone_lower == 'h3': # Sud, Côte Atlantique, Méditerranée
            teb = -5.0
        else:
            teb = -7.0 # Valeur par défaut pour H2
        
    temperature_interieure = temperature_consigne
    delta_t = temperature_interieure - teb # Le résultat est positif

    # --- 3. Facteur de Correction Émetteur (FCE) ---
    # Une PAC perd en puissance quand l'eau est plus chaude.
    # Les émetteurs haute T° (radiateurs anciens) nécessitent souvent une puissance
    # PAC supérieure pour compenser les limites de performance à haute T°.
    
    # Ce coefficient augmente la puissance théorique pour garantir la T° de consigne
    # même avec des radiateurs qui ne sont pas idéalement dimensionnés pour la PAC.
    if type_emetteur == 'BT': # Plancher chauffant, radiateurs basse T° (eau max 45°C)
        facteur_correction_emetteur = 1.0
    elif type_emetteur == 'MT_HT': # Radiateurs haute T° (eau 55°C à 65°C)
        # On augmente la puissance requise pour s'assurer d'atteindre la consigne
        # dans les conditions les plus froides (surestimation pour sécurité)
        facteur_correction_emetteur = 1.2 
    else:
        facteur_correction_emetteur = 1.0

    # --- 4. Calcul de la Puissance Théorique (P) ---
    # P (kW) = Volume (m³) * G (W/m³.K) * Delta T (K) * FCE
    
    volume_chauffe = surface_chauffee * hauteur_plafond
    
    # Puissance en Watts
    puissance_watts = (
        volume_chauffe * G_coefficient * delta_t * facteur_correction_emetteur
    )
    
    # Puissance en KiloWatts (arrondie au dixième supérieur)
    puissance_kw = math.ceil(puissance_watts / 1000 * 10) / 10

    # --- 5. Calcul des Besoins Annuels de Chaleur (Q) ---
    # Q (kWh/an) = G * Volume * DJU * 24h / 1000 * FCE * Rendement_Regulation
    
    # Degrés-Jours Unifiés (DJU) moyens par zone climatique
    if zone_lower == 'h1':
        dju = 3200
    elif zone_lower == 'h2':
        dju = 2700
    elif zone_lower == 'h3':
        dju = 1800
    else:
        dju = 2700 # Valeur par défaut pour H2

    rendement_regulation = 0.9 # Facteur simplifié

    besoins_annuels_kwh = (
        G_coefficient * volume_chauffe * dju * 24 / 1000 * facteur_correction_emetteur * rendement_regulation
    )

    # Calcul du taux de couverture (simplifié)
    taux_couverture = 100 if puissance_kw > 0 else 0

    # --- 6. Résultat ---
    
    puissance_kw_brut = puissance_watts / 1000.0

    resultat = {
        "Puissance_Estimee_kW": puissance_kw,
        "Besoins_Chaleur_Annuel_kWh": round(besoins_annuels_kwh, 2),
        "Taux_Couverture": taux_couverture,
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
            "temperature_interieure": temperature_interieure
        },
        "Details_Calcul": {
            "Volume_Chauffe_m3": round(volume_chauffe, 2),
            "G_Coefficient_Wm3K": round(G_coefficient, 3),
            "Delta_T_K": round(delta_t, 1),
            "Facteur_Correction_Emetteur": facteur_correction_emetteur,
            "Puissance_Watts_Brute": round(puissance_watts, 0),
            "Puissance_kW_Brute": round(puissance_kw_brut, 2),
            "Teb_Ajustee": teb
        },
        "Parametres_Entree": {
            "Surface": surface_chauffee, "Hauteur": hauteur_plafond,
            "Annee": annee_construction, "Isolation": type_isolation,
            "Zone_Climatique": zone_climatique, "Emetteur": type_emetteur, "Temperature_Consigne": temperature_consigne, "Temp_De_Base": temp_de_base
        }
    }
    
    return resultat

async def main_example():
    # --- EXEMPLE D'UTILISATION ---
    # Maison de 120m², 2.5m de hauteur, construite en 1995, bonne isolation,
    # dans une zone H2 (Centre), à 300m d'altitude, avec des radiateurs haute température.
    
    resultat_estimation = await dimensionner_pac_simplifie(
       surface_chauffee=120,
       hauteur_plafond=2.5,
       type_emetteur='MT_HT', 
       annee_construction=1995,
       type_isolation='bonne',
       zone_climatique='H2',
       temp_de_base=-9,
       temperature_consigne=19
    )
    
    # Affichage du résultat
    import json
    print(json.dumps(resultat_estimation, indent=2))