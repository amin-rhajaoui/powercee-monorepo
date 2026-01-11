"""
CEE Operations Constants.
Liste des operations CEE supportees par l'application.
"""
from enum import Enum
from dataclasses import dataclass


class OperationCategory(str, Enum):
    """Categorie d'operation CEE."""
    RESIDENTIAL = "RESIDENTIAL"  # Particuliers - 4 couleurs MPR
    PROFESSIONAL = "PROFESSIONAL"  # Tertiaire/Collectif - Prix standard


@dataclass
class CEEOperation:
    """Definition d'une operation CEE."""
    code: str
    name: str
    description: str
    category: OperationCategory


# Liste des operations CEE supportees
CEE_OPERATIONS: list[CEEOperation] = [
    # Pompes a chaleur - Particuliers
    CEEOperation(
        code="BAR-TH-171",
        name="PAC Air/Eau ou Eau/Eau",
        description="Pompe a chaleur de type air/eau ou eau/eau",
        category=OperationCategory.RESIDENTIAL,
    ),
    CEEOperation(
        code="BAR-TH-164",
        name="PAC Air/Air",
        description="Pompe a chaleur de type air/air",
        category=OperationCategory.RESIDENTIAL,
    ),
    CEEOperation(
        code="BAR-TH-159",
        name="PAC Hybride",
        description="Pompe a chaleur hybride individuelle",
        category=OperationCategory.RESIDENTIAL,
    ),
    # Chaudieres - Particuliers
    CEEOperation(
        code="BAR-TH-106",
        name="Chaudiere individuelle haute performance",
        description="Chaudiere individuelle a haute performance energetique",
        category=OperationCategory.RESIDENTIAL,
    ),
    CEEOperation(
        code="BAR-TH-113",
        name="Chaudiere biomasse",
        description="Chaudiere biomasse individuelle",
        category=OperationCategory.RESIDENTIAL,
    ),
    # Isolation - Particuliers
    CEEOperation(
        code="BAR-EN-101",
        name="Isolation combles ou toiture",
        description="Isolation de combles ou de toitures",
        category=OperationCategory.RESIDENTIAL,
    ),
    CEEOperation(
        code="BAR-EN-102",
        name="Isolation des murs",
        description="Isolation des murs",
        category=OperationCategory.RESIDENTIAL,
    ),
    CEEOperation(
        code="BAR-EN-103",
        name="Isolation plancher bas",
        description="Isolation d'un plancher",
        category=OperationCategory.RESIDENTIAL,
    ),
    # Fenetres - Particuliers
    CEEOperation(
        code="BAR-EN-104",
        name="Fenetres ou portes-fenetres",
        description="Fenetre ou porte-fenetre complete avec vitrage isolant",
        category=OperationCategory.RESIDENTIAL,
    ),
    # Eau chaude - Particuliers
    CEEOperation(
        code="BAR-TH-148",
        name="Chauffe-eau thermodynamique",
        description="Chauffe-eau thermodynamique a accumulation",
        category=OperationCategory.RESIDENTIAL,
    ),
    # Ventilation - Particuliers
    CEEOperation(
        code="BAR-TH-127",
        name="VMC simple flux",
        description="Ventilation mecanique controlee simple flux",
        category=OperationCategory.RESIDENTIAL,
    ),
    CEEOperation(
        code="BAR-TH-125",
        name="VMC double flux",
        description="Ventilation mecanique controlee double flux",
        category=OperationCategory.RESIDENTIAL,
    ),
    # Tertiaire / Collectif
    CEEOperation(
        code="BAT-TH-102",
        name="Chaufferie collective",
        description="Installation d'une chaufferie collective",
        category=OperationCategory.PROFESSIONAL,
    ),
    CEEOperation(
        code="BAT-TH-116",
        name="Systeme GTB",
        description="Systeme de gestion technique du batiment",
        category=OperationCategory.PROFESSIONAL,
    ),
    CEEOperation(
        code="BAT-EN-101",
        name="Isolation tertiaire",
        description="Isolation thermique en tertiaire",
        category=OperationCategory.PROFESSIONAL,
    ),
]


def get_operation_by_code(code: str) -> CEEOperation | None:
    """Recuperer une operation par son code."""
    for op in CEE_OPERATIONS:
        if op.code == code:
            return op
    return None


def get_operations_by_category(category: OperationCategory) -> list[CEEOperation]:
    """Recuperer les operations d'une categorie."""
    return [op for op in CEE_OPERATIONS if op.category == category]


def get_all_operation_codes() -> list[str]:
    """Recuperer tous les codes d'operations."""
    return [op.code for op in CEE_OPERATIONS]
