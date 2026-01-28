"""
Service de validation pour le module BAR-TH-175 (Rénovation d'ampleur appartement).

Ce service implémente les règles d'éligibilité définies par la fiche CEE BAR-TH-175.
"""

from typing import Any, Dict

from app.schemas.bar_th_175 import (
    BarTh175AuditData,
    BarTh175ValidationResult,
    EnergyClass,
    HeatingStatus,
)


# ============================================================================
# Constantes de validation BAR-TH-175
# ============================================================================

# Ordre des classes énergétiques (A=1 meilleur, G=7 pire)
ENERGY_CLASS_ORDER: Dict[EnergyClass, int] = {
    EnergyClass.A: 1,
    EnergyClass.B: 2,
    EnergyClass.C: 3,
    EnergyClass.D: 4,
    EnergyClass.E: 5,
    EnergyClass.F: 6,
    EnergyClass.G: 7,
}

# Règle 1: Saut de classe minimum requis
MIN_CLASS_JUMP = 2

# Règle 2: Isolation
MIN_INSULATION_ITEMS = 2  # Au moins 2 postes d'isolation requis
MIN_INSULATION_COVERAGE = 0.25  # 25% minimum de surface isolée par poste

# Règle 4: Seuils d'émission chauffage (gCO2eq/kWh)
MAX_NEW_HEATING_EMISSION = 150  # Nouveau chauffage
MAX_KEPT_HEATING_EMISSION = 300  # Chauffage conservé


# ============================================================================
# Fonction principale de validation
# ============================================================================


def validate_eligibility(data: BarTh175AuditData) -> BarTh175ValidationResult:
    """
    Valide l'éligibilité d'un dossier au module BAR-TH-175.

    Règles de validation (fiche BAR-TH-175):
    1. Saut de classe énergétique >= 2 classes (ex: G→E ou F→D)
    2. Au moins 2 postes d'isolation parmi (Murs, Plancher bas, Toiture, Fenêtres)
       avec >= 25% de la surface totale de l'élément isolée
    3. Émissions GES après travaux <= émissions GES initiales
    4. Interdictions chauffage:
       - Nouveau chauffage: <= 150 gCO2eq/kWh
       - Chauffage conservé: <= 300 gCO2eq/kWh

    Args:
        data: Données d'audit BAR-TH-175 à valider

    Returns:
        BarTh175ValidationResult avec le résultat détaillé de la validation
    """
    errors: list[str] = []
    warnings: list[str] = []

    # ========================================================================
    # Règle 1: Saut de classe énergétique
    # ========================================================================
    initial_rank = ENERGY_CLASS_ORDER[data.initial_energy_class]
    projected_rank = ENERGY_CLASS_ORDER[data.projected_energy_class]
    class_jump = initial_rank - projected_rank
    class_jump_valid = class_jump >= MIN_CLASS_JUMP

    if not class_jump_valid:
        if class_jump <= 0:
            errors.append(
                f"Le projet ne permet pas d'améliorer la classe énergétique. "
                f"Classe initiale: {data.initial_energy_class.value}, "
                f"Classe projetée: {data.projected_energy_class.value}."
            )
        else:
            errors.append(
                f"Le saut de classe énergétique est insuffisant: "
                f"{data.initial_energy_class.value} → {data.projected_energy_class.value} "
                f"(gain de {class_jump} classe(s)). "
                f"Minimum requis: {MIN_CLASS_JUMP} classes."
            )

    # ========================================================================
    # Règle 2: Postes d'isolation qualifiés
    # ========================================================================
    valid_insulation_items = []
    insufficient_coverage_items = []

    for item in data.insulation_items:
        coverage = item.coverage_ratio
        if coverage >= MIN_INSULATION_COVERAGE:
            valid_insulation_items.append(item)
        else:
            insufficient_coverage_items.append((item, coverage))

    insulation_count = len(valid_insulation_items)
    insulation_valid = insulation_count >= MIN_INSULATION_ITEMS

    if not insulation_valid:
        missing = MIN_INSULATION_ITEMS - insulation_count
        errors.append(
            f"Nombre insuffisant de postes d'isolation qualifiés: {insulation_count}. "
            f"Minimum requis: {MIN_INSULATION_ITEMS} postes avec >= 25% de couverture chacun. "
            f"Il manque {missing} poste(s) qualifié(s)."
        )

    # Ajouter des warnings pour les postes avec couverture insuffisante
    for item, coverage in insufficient_coverage_items:
        warnings.append(
            f"Poste '{item.item.value}': couverture insuffisante "
            f"({coverage * 100:.1f}% < 25% requis). "
            f"Surface isolée: {item.isolated_surface:.1f}m² / Surface totale: {item.total_surface:.1f}m²"
        )

    # ========================================================================
    # Règle 3: Réduction des émissions GES
    # ========================================================================
    ghg_reduction_valid = data.projected_ghg <= data.initial_ghg

    if not ghg_reduction_valid:
        increase_percent = (
            ((data.projected_ghg - data.initial_ghg) / data.initial_ghg * 100)
            if data.initial_ghg > 0
            else 0
        )
        errors.append(
            f"Les émissions GES après travaux ({data.projected_ghg:.1f} kgCO2/m²/an) "
            f"ne peuvent pas dépasser les émissions initiales ({data.initial_ghg:.1f} kgCO2/m²/an). "
            f"Augmentation constatée: +{increase_percent:.1f}%."
        )

    # ========================================================================
    # Règle 4: Contraintes sur le système de chauffage
    # ========================================================================
    heating_valid = True

    if data.heating:
        emission = data.heating.emission_gco2_kwh

        if data.heating.status == HeatingStatus.NEW:
            # Nouveau chauffage installé: max 150 gCO2eq/kWh
            if emission > MAX_NEW_HEATING_EMISSION:
                heating_valid = False
                errors.append(
                    f"Le nouveau système de chauffage émet {emission:.0f} gCO2eq/kWh. "
                    f"Maximum autorisé pour un nouveau chauffage: {MAX_NEW_HEATING_EMISSION} gCO2eq/kWh. "
                    f"Il est interdit d'installer un chauffage émettant plus de {MAX_NEW_HEATING_EMISSION} gCO2eq/kWh."
                )

        elif data.heating.status == HeatingStatus.KEPT:
            # Chauffage conservé: max 300 gCO2eq/kWh
            if emission > MAX_KEPT_HEATING_EMISSION:
                heating_valid = False
                errors.append(
                    f"Le système de chauffage conservé émet {emission:.0f} gCO2eq/kWh. "
                    f"Maximum autorisé pour un chauffage conservé: {MAX_KEPT_HEATING_EMISSION} gCO2eq/kWh. "
                    f"Il est interdit de conserver un chauffage émettant plus de {MAX_KEPT_HEATING_EMISSION} gCO2eq/kWh."
                )
            elif emission > MAX_NEW_HEATING_EMISSION:
                # Warning si le chauffage conservé dépasse le seuil pour un nouveau chauffage
                warnings.append(
                    f"Le chauffage conservé émet {emission:.0f} gCO2eq/kWh, "
                    f"ce qui dépasse le seuil pour un nouveau chauffage ({MAX_NEW_HEATING_EMISSION} gCO2eq/kWh). "
                    f"Envisager un remplacement pour une meilleure performance."
                )

        elif data.heating.status == HeatingStatus.REPLACED:
            # Chauffage remplacé: traité comme un nouveau chauffage
            if emission > MAX_NEW_HEATING_EMISSION:
                heating_valid = False
                errors.append(
                    f"Le nouveau système de chauffage (remplacement) émet {emission:.0f} gCO2eq/kWh. "
                    f"Maximum autorisé: {MAX_NEW_HEATING_EMISSION} gCO2eq/kWh."
                )

    # ========================================================================
    # Résultat final
    # ========================================================================
    is_eligible = all([
        class_jump_valid,
        insulation_valid,
        ghg_reduction_valid,
        heating_valid,
    ])

    return BarTh175ValidationResult(
        is_eligible=is_eligible,
        errors=errors,
        warnings=warnings,
        class_jump=max(0, class_jump),  # Ne pas retourner de valeur négative
        class_jump_valid=class_jump_valid,
        insulation_count=insulation_count,
        insulation_valid=insulation_valid,
        ghg_reduction_valid=ghg_reduction_valid,
        heating_valid=heating_valid,
    )


def validate_eligibility_from_dict(data: Dict[str, Any]) -> BarTh175ValidationResult:
    """
    Wrapper pour valider l'éligibilité depuis un dictionnaire.

    Utile pour valider directement depuis ModuleDraft.data.

    Args:
        data: Dictionnaire contenant les données d'audit

    Returns:
        BarTh175ValidationResult avec le résultat de la validation

    Raises:
        pydantic.ValidationError: Si les données ne correspondent pas au schéma
    """
    audit_data = BarTh175AuditData.model_validate(data)
    return validate_eligibility(audit_data)


# ============================================================================
# Fonctions utilitaires
# ============================================================================


def get_energy_class_description(energy_class: EnergyClass) -> str:
    """Retourne une description de la classe énergétique."""
    descriptions = {
        EnergyClass.A: "Logement extrêmement performant (< 70 kWh/m²/an)",
        EnergyClass.B: "Logement très performant (70-110 kWh/m²/an)",
        EnergyClass.C: "Logement assez performant (110-180 kWh/m²/an)",
        EnergyClass.D: "Logement moyennement performant (180-250 kWh/m²/an)",
        EnergyClass.E: "Logement peu performant (250-330 kWh/m²/an)",
        EnergyClass.F: "Logement très peu performant (330-420 kWh/m²/an)",
        EnergyClass.G: "Logement extrêmement peu performant (> 420 kWh/m²/an)",
    }
    return descriptions.get(energy_class, "Classe inconnue")


def calculate_required_target_class(initial_class: EnergyClass) -> list[EnergyClass]:
    """
    Calcule les classes cibles possibles pour atteindre le saut de 2 classes.

    Args:
        initial_class: Classe énergétique initiale

    Returns:
        Liste des classes cibles valides (gain >= 2 classes)
    """
    initial_rank = ENERGY_CLASS_ORDER[initial_class]
    valid_targets = []

    for target_class, target_rank in ENERGY_CLASS_ORDER.items():
        if initial_rank - target_rank >= MIN_CLASS_JUMP:
            valid_targets.append(target_class)

    # Trier du meilleur au moins bon (A, B, C, ...)
    valid_targets.sort(key=lambda c: ENERGY_CLASS_ORDER[c])
    return valid_targets
