"""
Pydantic schemas for Quote simulation.
"""
from typing import List
from uuid import UUID

from pydantic import BaseModel, Field


class QuoteLine(BaseModel):
    """Ligne de devis."""
    product_id: UUID | None = Field(None, description="ID du produit (null si ligne fixe)")
    title: str = Field(..., description="Titre de la ligne")
    description: str = Field("", description="Description enrichie de la ligne")
    quantity: int = Field(1, ge=1, description="Quantite")
    unit_price_ht: float = Field(..., ge=0, description="Prix unitaire HT")
    tva_rate: float = Field(5.5, ge=0, le=100, description="Taux TVA (%)")
    total_ht: float = Field(..., ge=0, description="Total HT")
    total_ttc: float = Field(..., ge=0, description="Total TTC")
    is_editable: bool = Field(True, description="Ligne modifiable par l'utilisateur")


class QuoteSimulationRequest(BaseModel):
    """Requete de simulation de devis."""
    folder_id: UUID = Field(..., description="ID du dossier")
    product_ids: List[UUID] = Field(..., description="IDs des produits selectionnes")
    target_rac: float | None = Field(None, ge=0, description="RAC cible souhaite (optionnel)")


class QuotePreviewResponse(BaseModel):
    """Reponse de simulation de devis."""
    lines: List[QuoteLine] = Field(..., description="Lignes du devis")
    total_ht: float = Field(..., ge=0, description="Total HT")
    total_ttc: float = Field(..., ge=0, description="Total TTC")
    cee_prime: float = Field(..., ge=0, description="Montant de la prime CEE")
    rac_ttc: float = Field(..., ge=0, description="Reste a charge TTC")
    margin_ht: float = Field(..., description="Marge HT")
    margin_percent: float = Field(..., description="Marge en pourcentage")
    strategy_used: str = Field(..., description="Strategie utilisee (LEGACY_GRID ou COST_PLUS)")
    warnings: List[str] = Field(default_factory=list, description="Avertissements")


class QuoteLineUpdate(BaseModel):
    """Mise a jour d'une ligne de devis (edition par l'utilisateur)."""
    title: str | None = Field(None, description="Nouveau titre")
    description: str | None = Field(None, description="Nouvelle description")
    unit_price_ht: float | None = Field(None, ge=0, description="Nouveau prix unitaire HT")
    quantity: int | None = Field(None, ge=1, description="Nouvelle quantite")


class QuoteConfirmRequest(BaseModel):
    """Requete de confirmation du devis (avec modifications)."""
    folder_id: UUID = Field(..., description="ID du dossier")
    lines: List[QuoteLine] = Field(..., description="Lignes du devis (potentiellement modifiees)")
