"""
Schémas Pydantic pour le dimensionnement de PAC.
"""
from typing import Any, Literal
from pydantic import BaseModel, Field


class SizingRequest(BaseModel):
    """Requête de calcul de dimensionnement avec possibilité d'override des valeurs."""

    # Paramètres principaux (optionnels pour override)
    surface_chauffee: float | None = Field(None, description="Surface chauffée en m²", gt=0)
    hauteur_plafond: float | None = Field(None, description="Hauteur sous plafond en mètres", gt=0)
    temperature_consigne: float | None = Field(None, description="Température intérieure souhaitée en °C", ge=15, le=25)
    type_emetteur_override: Literal["BT", "MT_HT"] | None = Field(
        None, description="Override du type d'émetteur (BT ou MT_HT)"
    )
    type_isolation_override: Literal["faible", "bonne", "tres_bonne"] | None = Field(
        None, description="Override direct du type d'isolation"
    )

    # Paramètres d'isolation pour calcul automatique (optionnels)
    combles_isole: bool | None = Field(None, description="True si les combles sont isolés")
    combles_annee: int | None = Field(None, description="Année d'isolation des combles", ge=1900, le=2030)
    plancher_isole: bool | None = Field(None, description="True si le plancher est isolé")
    plancher_annee: int | None = Field(None, description="Année d'isolation du plancher", ge=1900, le=2030)
    murs_type: Literal["AUCUNE", "INTERIEUR", "EXTERIEUR", "DOUBLE"] | None = Field(
        None, description="Type d'isolation des murs"
    )
    murs_annee_interieur: int | None = Field(
        None, description="Année d'isolation intérieure des murs", ge=1900, le=2030
    )
    murs_annee_exterieur: int | None = Field(
        None, description="Année d'isolation extérieure des murs", ge=1900, le=2030
    )
    menuiserie_type: Literal["SIMPLE", "DOUBLE_OLD", "DOUBLE_RECENT"] | None = Field(
        None, description="Type de menuiserie"
    )


class SizingResponse(BaseModel):
    """Réponse avec les résultats du calcul de dimensionnement."""

    Puissance_Estimee_kW: float = Field(..., description="Puissance estimée en kW")
    Besoins_Chaleur_Annuel_kWh: float = Field(..., description="Besoins annuels de chaleur en kWh")
    Taux_Couverture: int = Field(..., description="Taux de couverture (%)")
    Regime_Temperature: str = Field(..., description="Régime de température")
    Intermediate_Calculations: dict[str, Any] = Field(..., description="Calculs intermédiaires")
    Details_Calcul: dict[str, Any] = Field(..., description="Détails du calcul")
    Parametres_Entree: dict[str, Any] = Field(..., description="Paramètres d'entrée utilisés")


class SizingPdfRequest(BaseModel):
    """Requête de génération de PDF avec les mêmes paramètres que le calcul."""

    # Utiliser les mêmes paramètres que SizingRequest pour régénérer si nécessaire
    sizing_params: SizingRequest | None = Field(
        None, description="Paramètres de dimensionnement (si None, utilise les derniers calculés)"
    )
    # Équipements optionnels pour affichage dans le PDF
    selected_pump: dict[str, Any] | None = Field(None, description="PAC sélectionnée pour le devis")
    selected_heater: dict[str, Any] | None = Field(None, description="Ballon thermodynamique associé")
    thermostat_details: dict[str, Any] | None = Field(None, description="Détails du thermostat")
