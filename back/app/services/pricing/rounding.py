"""
Utilitaires d'arrondi pour la tarification.
"""


def round_to_x90(amount: float) -> float:
    """
    Arrondit au X90 inferieur le plus proche (490, 990, 1490, 1990...).

    Algorithme:
    - Si montant < 490: retourne 0
    - Sinon, trouve le palier X90 inferieur ou egal

    Exemples:
        round_to_x90(2100) -> 1990
        round_to_x90(1500) -> 1490
        round_to_x90(550)  -> 490
        round_to_x90(990)  -> 990
        round_to_x90(2000) -> 1990
        round_to_x90(2490) -> 2490
        round_to_x90(400)  -> 0

    Args:
        amount: Montant a arrondir

    Returns:
        Montant arrondi au X90 inferieur
    """
    if amount < 490:
        return 0

    # Calculer le millier de base et le reste
    base_thousand = int(amount // 1000) * 1000
    remainder = amount % 1000

    # Determiner le palier X90 appropriate
    if remainder >= 990:
        # Entre 990 et 999 -> 990
        return base_thousand + 990
    elif remainder >= 490:
        # Entre 490 et 989 -> 490
        return base_thousand + 490
    else:
        # Reste < 490 -> revenir au 990 du millier precedent
        if base_thousand > 0:
            return base_thousand - 10  # ex: 2400 -> 1990
        else:
            # Si on est entre 0 et 489, retourner 0
            return 0
