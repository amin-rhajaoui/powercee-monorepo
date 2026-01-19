import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List

from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Boolean, Float, Text, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class ProductCategory(str, Enum):
    """Categorie de produit."""
    HEAT_PUMP = "HEAT_PUMP"
    THERMOSTAT = "THERMOSTAT"
    LABOR = "LABOR"
    OTHER = "OTHER"


class ProductType(str, Enum):
    """Type de produit pour la tarification."""
    MATERIAL = "MATERIAL"
    LABOR = "LABOR"
    SERVICE = "SERVICE"


class PowerSupply(str, Enum):
    """Type d'alimentation pour les PAC."""
    MONOPHASE = "MONOPHASE"
    TRIPHASE = "TRIPHASE"


class Product(Base):
    """Modele produit principal avec support multi-tenant."""

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du produit",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant proprietaire du produit (isolation multi-tenant).",
    )

    # Informations de base
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Nom/modele du produit (ex: 'AEROLIA 8').",
    )
    brand: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Marque (ex: 'Thermor', 'CLIVET'). Optionnel pour LABOR/OTHER.",
    )
    reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Reference produit. Optionnel pour LABOR/OTHER.",
    )
    price_ht: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Prix HT en euros.",
    )

    # Categorie et classification
    category: Mapped[ProductCategory] = mapped_column(
        SQLEnum(ProductCategory, name="product_category"),
        nullable=False,
        doc="Categorie du produit.",
    )
    product_type: Mapped[ProductType] = mapped_column(
        SQLEnum(ProductType, name="product_type_enum", create_type=False),
        default=ProductType.MATERIAL,
        nullable=False,
        doc="Type de produit pour la tarification (MATERIAL, LABOR, SERVICE).",
    )

    # Prix d'achat (pour calcul de marge)
    buying_price_ht: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Prix d'achat HT en euros (pour calcul de marge).",
    )
    module_codes: Mapped[List[str] | None] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
        doc="Codes modules CEE (ex: ['BAR-TH-171', 'BAR-TH-159']).",
    )

    # Media
    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        doc="URL S3 de l'image produit.",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Description du produit.",
    )

    # Statut
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Indique si le produit est actif dans le catalogue.",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Date de creation.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        onupdate=func.now(),
        nullable=False,
        doc="Date de derniere mise a jour.",
    )

    # Relations
    tenant: Mapped["Tenant"] = relationship(back_populates="products")
    heat_pump_details: Mapped["ProductHeatPump | None"] = relationship(
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
    )
    thermostat_details: Mapped["ProductThermostat | None"] = relationship(
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Compatibilite (self-referential many-to-many)
    compatible_products: Mapped[List["Product"]] = relationship(
        secondary="product_compatibility",
        primaryjoin="Product.id == ProductCompatibility.source_product_id",
        secondaryjoin="Product.id == ProductCompatibility.target_product_id",
        back_populates="compatible_with",
    )
    compatible_with: Mapped[List["Product"]] = relationship(
        secondary="product_compatibility",
        primaryjoin="Product.id == ProductCompatibility.target_product_id",
        secondaryjoin="Product.id == ProductCompatibility.source_product_id",
        back_populates="compatible_products",
    )


class ProductHeatPump(Base):
    """Details techniques specifiques aux pompes a chaleur."""

    __tablename__ = "product_heat_pumps"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique.",
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        doc="Lien vers le produit parent.",
    )

    # Rendements ETAS
    etas_35: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="ETAS a 35C (rendement saisonnier en %).",
    )
    etas_55: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="ETAS a 55C (rendement saisonnier en %).",
    )

    # Specifications de puissance
    power_minus_7: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Puissance de chauffage a -7C en kW.",
    )
    power_minus_15: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Puissance de chauffage a -15C en kW.",
    )

    # Specifications techniques
    power_supply: Mapped[PowerSupply | None] = mapped_column(
        SQLEnum(PowerSupply, name="power_supply_type"),
        nullable=True,
        doc="Type d'alimentation (Monophase/Triphase).",
    )
    refrigerant_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="Type de refrigerant (ex: R32, R410A).",
    )
    noise_level: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Niveau sonore en dB.",
    )

    # Type d'usage
    is_duo: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="True si Chauffage + ECS.",
    )

    # Classe regulateur
    class_regulator: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        doc="Classe regulateur (ex: 'IV', 'V').",
    )

    # Relation
    product: Mapped["Product"] = relationship(back_populates="heat_pump_details")


class ProductThermostat(Base):
    """Details techniques specifiques aux thermostats."""

    __tablename__ = "product_thermostats"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique.",
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        doc="Lien vers le produit parent.",
    )

    class_rank: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        doc="Classe regulateur (ex: 'IV', 'V', 'VI').",
    )

    # Relation
    product: Mapped["Product"] = relationship(back_populates="thermostat_details")


class ProductCompatibility(Base):
    """Liens de compatibilite entre produits (ex: PAC-Thermostat)."""

    __tablename__ = "product_compatibility"

    source_product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
        doc="Produit source.",
    )
    target_product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
        doc="Produit cible compatible.",
    )
