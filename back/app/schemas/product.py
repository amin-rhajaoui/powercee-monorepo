from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.product import ProductCategory, ProductType, PowerSupply


# ========== Heat Pump Details ==========
class HeatPumpDetailsBase(BaseModel):
    """Champs communs pour les details PAC."""
    etas_35: int | None = Field(None, ge=0, le=300, description="ETAS a 35C (%)")
    etas_55: int | None = Field(None, ge=0, le=300, description="ETAS a 55C (%)")
    power_minus_7: float | None = Field(None, ge=0, description="Puissance a -7C (kW)")
    power_minus_15: float | None = Field(None, ge=0, description="Puissance a -15C (kW)")
    power_supply: PowerSupply | None = Field(None, description="Type d'alimentation")
    refrigerant_type: str | None = Field(None, max_length=50, description="Type de refrigerant")
    noise_level: float | None = Field(None, ge=0, description="Niveau sonore (dB)")
    is_duo: bool = Field(False, description="Chauffage + ECS")
    class_regulator: str | None = Field(None, max_length=10, description="Classe regulateur")


class HeatPumpDetailsCreate(HeatPumpDetailsBase):
    """Payload de creation des details PAC."""
    pass


class HeatPumpDetailsResponse(HeatPumpDetailsBase):
    """Reponse API des details PAC."""
    id: UUID

    model_config = ConfigDict(from_attributes=True)


# ========== Thermostat Details ==========
class ThermostatDetailsBase(BaseModel):
    """Champs communs pour les details thermostat."""
    class_rank: str | None = Field(None, max_length=10, description="Classe regulateur")


class ThermostatDetailsCreate(ThermostatDetailsBase):
    """Payload de creation des details thermostat."""
    pass


class ThermostatDetailsResponse(ThermostatDetailsBase):
    """Reponse API des details thermostat."""
    id: UUID

    model_config = ConfigDict(from_attributes=True)


# ========== Product ==========
class ProductBase(BaseModel):
    """Champs communs pour un produit."""
    name: str = Field(..., min_length=1, max_length=255, description="Nom/modele du produit")
    brand: str | None = Field(None, max_length=255, description="Marque (requis pour HEAT_PUMP/THERMOSTAT)")
    reference: str | None = Field(None, max_length=255, description="Reference (requis pour HEAT_PUMP/THERMOSTAT)")
    price_ht: float = Field(..., ge=0, description="Prix HT en euros")
    buying_price_ht: float | None = Field(None, ge=0, description="Prix d'achat HT (pour marge)")
    category: ProductCategory = Field(..., description="Categorie du produit")
    product_type: ProductType = Field(ProductType.MATERIAL, description="Type de produit")
    module_codes: List[str] | None = Field(None, description="Codes modules CEE")
    image_url: str | None = Field(None, max_length=500, description="URL S3 de l'image")
    description: str | None = Field(None, description="Description du produit")
    is_active: bool = Field(True, description="Produit actif dans le catalogue")


class ProductCreate(ProductBase):
    """Payload de creation d'un produit."""
    heat_pump_details: HeatPumpDetailsCreate | None = Field(None, description="Details PAC")
    thermostat_details: ThermostatDetailsCreate | None = Field(None, description="Details thermostat")
    compatible_product_ids: List[UUID] | None = Field(None, description="IDs des produits compatibles")

    @model_validator(mode="after")
    def validate_by_category(self) -> "ProductCreate":
        """Valide les champs requis selon la categorie."""
        category = self.category

        # HEAT_PUMP: brand, reference, heat_pump_details required
        if category == ProductCategory.HEAT_PUMP:
            if not self.brand or not self.brand.strip():
                raise ValueError("La marque est requise pour les pompes a chaleur")
            if not self.reference or not self.reference.strip():
                raise ValueError("La reference est requise pour les pompes a chaleur")
            if not self.heat_pump_details:
                raise ValueError("Les details techniques PAC sont requis")

        # THERMOSTAT: brand, reference required
        elif category == ProductCategory.THERMOSTAT:
            if not self.brand or not self.brand.strip():
                raise ValueError("La marque est requise pour les thermostats")
            if not self.reference or not self.reference.strip():
                raise ValueError("La reference est requise pour les thermostats")

        # LABOR and OTHER: brand, reference optional (no validation needed)

        return self


class ProductUpdate(BaseModel):
    """Payload de mise a jour partielle d'un produit."""
    name: str | None = Field(None, min_length=1, max_length=255)
    brand: str | None = Field(None, min_length=1, max_length=255)
    reference: str | None = Field(None, min_length=1, max_length=255)
    price_ht: float | None = Field(None, ge=0)
    buying_price_ht: float | None = Field(None, ge=0)
    category: ProductCategory | None = None
    product_type: ProductType | None = None
    module_codes: List[str] | None = None
    image_url: str | None = Field(None, max_length=500)
    description: str | None = None
    is_active: bool | None = None
    heat_pump_details: HeatPumpDetailsCreate | None = None
    thermostat_details: ThermostatDetailsCreate | None = None
    compatible_product_ids: List[UUID] | None = None


class ProductResponse(ProductBase):
    """Representation API d'un produit."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    heat_pump_details: HeatPumpDetailsResponse | None = None
    thermostat_details: ThermostatDetailsResponse | None = None
    compatible_product_ids: List[UUID] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProductListItem(BaseModel):
    """Version allegee d'un produit pour les listes."""
    id: UUID
    tenant_id: UUID
    name: str
    brand: str | None = None
    reference: str | None = None
    price_ht: float
    buying_price_ht: float | None = None
    category: ProductCategory
    product_type: ProductType
    module_codes: List[str] | None = None
    image_url: str | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedProductsResponse(BaseModel):
    """Reponse paginee pour la liste des produits."""
    items: List[ProductListItem]
    total: int
    page: int
    page_size: int


class BrandsResponse(BaseModel):
    """Liste des marques uniques."""
    brands: List[str]
