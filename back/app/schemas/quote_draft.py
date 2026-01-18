from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuoteLine(BaseModel):
    """Représente une ligne de devis."""
    description: str = Field(..., description="Description de la ligne")
    quantity: int = Field(..., ge=1, description="Quantité")
    unit_price_ht: float = Field(..., ge=0, description="Prix unitaire HT")
    total_ht: float = Field(..., ge=0, description="Total HT de la ligne")
    total_ttc: float = Field(..., ge=0, description="Total TTC de la ligne")
    tva_rate: float = Field(..., ge=0, le=100, description="Taux de TVA en %")
    is_editable: bool = Field(default=True, description="Si la ligne est éditable")


class QuoteDraftBase(BaseModel):
    """Champs de base pour un brouillon de devis."""
    name: str = Field(..., min_length=1, max_length=255, description="Nom du brouillon")
    folder_id: UUID = Field(..., description="ID du dossier associé")
    module_code: str = Field(..., max_length=50, description="Code du module CEE")
    product_ids: List[str] = Field(..., description="Liste des IDs des produits")
    lines: List[QuoteLine] = Field(..., description="Lignes du devis")
    total_ht: float = Field(..., ge=0, description="Total HT")
    total_ttc: float = Field(..., ge=0, description="Total TTC")
    rac_ttc: float = Field(..., description="Reste à charge TTC")
    cee_prime: float = Field(default=0, ge=0, description="Montant de la prime CEE")
    margin_ht: float = Field(default=0, description="Marge HT")
    margin_percent: float = Field(default=0, description="Pourcentage de marge")
    strategy_used: str = Field(..., max_length=50, description="Stratégie de calcul utilisée")
    warnings: List[str] = Field(default_factory=list, description="Liste des avertissements")


class QuoteDraftCreate(QuoteDraftBase):
    """Schéma pour la création d'un brouillon de devis."""
    pass


class QuoteDraftUpdate(BaseModel):
    """Schéma pour la mise à jour d'un brouillon de devis."""
    name: str | None = Field(None, min_length=1, max_length=255, description="Nom du brouillon")
    product_ids: List[str] | None = Field(None, description="Liste des IDs des produits")
    lines: List[QuoteLine] | None = Field(None, description="Lignes du devis")
    total_ht: float | None = Field(None, ge=0, description="Total HT")
    total_ttc: float | None = Field(None, ge=0, description="Total TTC")
    rac_ttc: float | None = Field(None, description="Reste à charge TTC")
    cee_prime: float | None = Field(None, ge=0, description="Montant de la prime CEE")
    margin_ht: float | None = Field(None, description="Marge HT")
    margin_percent: float | None = Field(None, description="Pourcentage de marge")
    strategy_used: str | None = Field(None, max_length=50, description="Stratégie de calcul")
    warnings: List[str] | None = Field(None, description="Liste des avertissements")


class QuoteDraftResponse(QuoteDraftBase):
    """Schéma pour la réponse d'un brouillon de devis."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuoteDraftListResponse(BaseModel):
    """Schéma pour la liste paginée de brouillons."""
    drafts: List[QuoteDraftResponse]
    total: int
