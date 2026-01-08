"""
Service de calcul de la couleur MPR (MaPrimeRénov).

Basé sur les barèmes officiels des revenus annuels maximums pour déterminer
le profil de revenu du foyer (Bleu, Jaune, Violet, Rose).
"""
import logging

logger = logging.getLogger(__name__)

# Barèmes de revenus annuels maximums.
# Les seuils sont (Très Modeste, Modeste, Intermédiaire, Classique)

BAREME_HORS_IDF = {
    # nb_personnes: (Bleu, Jaune, Violet, Rose)
    1: (17173, 22015, 30844, 30845),
    2: (25115, 32197, 45340, 45341),
    3: (30206, 38719, 54592, 54593),
    4: (35285, 45234, 63844, 63845),
    5: (40388, 51775, 73098, 73099),
}
PERSONNE_SUP_HORS_IDF = (5094, 6525, 9254, 9254)

BAREME_IDF = {
    # nb_personnes: (Bleu, Jaune, Violet, Rose)
    1: (23541, 28657, 38184, 38184),
    2: (34551, 42058, 56130, 56130),
    3: (41493, 50513, 67585, 67585),
    4: (48447, 58981, 79041, 79041),
    5: (55427, 67473, 90496, 90496),
}
PERSONNE_SUP_IDF = (6970, 8486, 11455, 11455)

DEPARTEMENTS_IDF = {'75', '77', '78', '91', '92', '93', '94', '95'}


def calculate_mpr_color(rfr: float, household_size: int, postal_code: str) -> str:
    """
    Calcule la couleur MPR (profil de revenu) du foyer.
    
    Args:
        rfr: Revenu fiscal de référence
        household_size: Nombre de personnes dans le foyer fiscal
        postal_code: Code postal du logement
    
    Returns:
        "Bleu", "Jaune", "Violet", "Rose" ou "Inconnu"
        
    Note:
        Si le RFR est 0, le profil sera automatiquement "Bleu" (Très Modeste).
    """
    # Vérifier que les données nécessaires sont présentes
    # RFR = 0 est valide et sera traité comme "Bleu"
    if rfr is None or household_size is None or household_size <= 0 or not postal_code:
        logger.warning("Données manquantes pour déterminer le profil de revenu.")
        return "Inconnu"

    departement = postal_code[:2]
    is_idf = departement in DEPARTEMENTS_IDF

    if is_idf:
        plafonds = BAREME_IDF
        personne_sup = PERSONNE_SUP_IDF
    else:
        plafonds = BAREME_HORS_IDF
        personne_sup = PERSONNE_SUP_HORS_IDF

    # Si le nombre de personnes dépasse le barème de base (5), on calcule les seuils ajustés
    if household_size > 5:
        personnes_supplementaires = household_size - 5
        seuil_bleu, seuil_jaune, seuil_violet, seuil_rose = plafonds[5]
        seuil_bleu += personnes_supplementaires * personne_sup[0]
        seuil_jaune += personnes_supplementaires * personne_sup[1]
        seuil_violet += personnes_supplementaires * personne_sup[2]
        seuil_rose += personnes_supplementaires * personne_sup[3]
    else:
        # Utiliser .get() pour gérer le cas où household_size serait 0 ou invalide
        seuil_bleu, seuil_jaune, seuil_violet, seuil_rose = plafonds.get(household_size, (0, 0, 0, 0))

    # Comparaison du RFR aux seuils
    if rfr <= seuil_bleu:
        return 'Bleu'  # Très Modeste
    elif rfr <= seuil_jaune:
        return 'Jaune'  # Modeste
    elif rfr <= seuil_violet:
        return 'Violet'  # Intermédiaire
    else:
        return 'Rose'  # Classique (et Supérieur)
