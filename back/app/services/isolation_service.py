"""
Service de calcul du type d'isolation à partir des données détaillées.

Basé sur l'algorithme décrit dans ressourceicolation.md.
"""
import logging
from typing import Literal

logger = logging.getLogger(__name__)


def score_year(year: int | None, thresholds: tuple[int, int] = (2000, 2012)) -> float:
    """
    Convertit une année d'isolation en score (0-3).
    
    Args:
        year: Année d'isolation, None si inconnue
        thresholds: Seuils (année ancienne, année récente)
    
    Returns:
        Score entre 0 et 3
    """
    if year is None:
        return 1.0  # inconnu => moyen
    if year < thresholds[0]:
        return 1.0
    if year < thresholds[1]:
        return 2.0
    return 3.0


def infer_type_isolation(
    annee_construction: int | None,
    combles_isole: bool | None,
    combles_annee: int | None,
    plancher_isole: bool | None,
    plancher_annee: int | None,
    murs_type: str | None,
    murs_annee_interieur: int | None = None,
    murs_annee_exterieur: int | None = None,
    menuiserie_type: str | None = None,
) -> dict[str, str | float]:
    """
    Calcule le type d'isolation global à partir des données détaillées.
    
    Args:
        annee_construction: Année de construction du logement
        combles_isole: True si les combles sont isolés
        combles_annee: Année d'isolation des combles
        plancher_isole: True si le plancher est isolé
        plancher_annee: Année d'isolation du plancher
        murs_type: Type d'isolation des murs ("AUCUNE", "INTERIEUR", "EXTERIEUR", "DOUBLE")
        murs_annee_interieur: Année d'isolation intérieure des murs
        murs_annee_exterieur: Année d'isolation extérieure des murs
        menuiserie_type: Type de menuiserie ("SIMPLE", "DOUBLE_OLD", "DOUBLE_RECENT")
    
    Returns:
        Dictionnaire avec:
        - type_isolation: "faible", "bonne", ou "tres_bonne"
        - score: Score calculé (0-3)
        - facteur_isolation: Facteur d'isolation continu (0.75-1.3)
        - details: Détails par poste
    """
    # Normalisation des valeurs None
    annee_construction = annee_construction or 1980  # Default pour calculs
    combles_isole = combles_isole or False
    plancher_isole = plancher_isole or False
    
    # --- Scores par poste ---
    
    # Combles
    combles_score = 0.0 if not combles_isole else score_year(combles_annee)
    
    # Plancher
    plancher_score = 0.0 if not plancher_isole else score_year(plancher_annee)
    
    # Murs - Mapping depuis les valeurs du système
    murs_map = {
        "AUCUNE": 0,
        "INTERIEUR": 1,
        "EXTERIEUR": 2,
        "DOUBLE": 3,
    }
    murs_score = murs_map.get(murs_type or "AUCUNE", 0)
    
    # Ajustement selon l'année pour les murs
    if murs_score > 0:
        # Pour DOUBLE, on prend la moyenne des années ou la plus récente
        if murs_type == "DOUBLE":
            annees_murs = [a for a in [murs_annee_interieur, murs_annee_exterieur] if a is not None]
            murs_annee = max(annees_murs) if annees_murs else None
        elif murs_type == "INTERIEUR":
            murs_annee = murs_annee_interieur
        elif murs_type == "EXTERIEUR":
            murs_annee = murs_annee_exterieur
        else:
            murs_annee = None
        
        if murs_annee is not None:
            if murs_annee >= 2012:
                murs_score = min(3.0, murs_score + 0.5)
            elif murs_annee < 2000:
                murs_score = max(0.0, murs_score - 0.5)
    
    # Menuiseries - Mapping depuis les valeurs du système
    menuis_map = {
        "SIMPLE": 0,
        "DOUBLE_OLD": 1,
        "DOUBLE_RECENT": 2,
    }
    menuis_score = menuis_map.get(menuiserie_type or "SIMPLE", 0)
    
    # --- Calcul du score pondéré ---
    score = (
        combles_score * 0.35 +
        murs_score * 0.35 +
        menuis_score * 0.15 +
        plancher_score * 0.15
    )
    
    # --- Pénalités critiques ---
    if combles_score == 0:
        score = min(score, 1.5)
    if menuis_score == 0:
        score = min(score, 1.8)
    if murs_score == 0 and annee_construction < 1989:
        score = min(score, 0.9)
    
    # --- Conversion en type_isolation ---
    if score < 1.0:
        type_isolation: Literal["faible", "bonne", "tres_bonne"] = "faible"
    elif score < 2.0:
        type_isolation = "bonne"
    else:
        type_isolation = "tres_bonne"
    
    # --- Calcul du facteur_isolation continu ---
    # Interpolation : score 0 → facteur 1.3, score 3 → facteur 0.75
    facteur_isolation = 1.3 - (score / 3.0) * (1.3 - 0.75)
    
    # --- Détails pour UI ---
    details = {
        "combles": {
            "score": combles_score,
            "etat": "isole" if combles_isole else "non_isole",
            "annee": combles_annee,
        },
        "plancher": {
            "score": plancher_score,
            "etat": "isole" if plancher_isole else "non_isole",
            "annee": plancher_annee,
        },
        "murs": {
            "score": murs_score,
            "type": murs_type or "AUCUNE",
            "annee_interieur": murs_annee_interieur,
            "annee_exterieur": murs_annee_exterieur,
        },
        "menuiseries": {
            "score": menuis_score,
            "type": menuiserie_type or "SIMPLE",
        },
    }
    
    return {
        "type_isolation": type_isolation,
        "score": round(score, 2),
        "facteur_isolation": round(facteur_isolation, 3),
        "details": details,
    }
