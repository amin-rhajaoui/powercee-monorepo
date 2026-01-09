import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Boolean, Float, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.client import Client
    from app.models.module_draft import ModuleDraft
    from app.models.folder import Folder


class PropertyType(str, Enum):
    """Type de logement/établissement."""

    MAISON = "MAISON"
    APPARTEMENT = "APPARTEMENT"
    BATIMENT_PRO = "BATIMENT_PRO"
    AUTRE = "AUTRE"


class Property(Base):
    """Modèle Property (logement/établissement) multi-tenant avec soft delete."""

    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du logement",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire du logement (isolation multi-tenant).",
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Client propriétaire du logement.",
    )
    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Label/nom du logement (ex: 'Maison principale', 'Site Troyes').",
    )
    type: Mapped[PropertyType] = mapped_column(
        SQLEnum(PropertyType, name="property_type"),
        default=PropertyType.AUTRE,
        nullable=False,
        doc="Type de logement.",
    )
    address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Adresse complète du logement.",
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Latitude (obligatoire après géocodage).",
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Longitude (obligatoire après géocodage).",
    )
    postal_code: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        doc="Code postal.",
    )
    city: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Ville.",
    )
    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        default="France",
        doc="Pays (défaut: France).",
    )
    surface_m2: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Surface en m².",
    )
    construction_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="Année de construction.",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Notes libres.",
    )
    altitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Altitude en mètres (récupérée depuis une API externe).",
    )
    base_temperature: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Température extérieure de base en °C (calculée selon zone TEB et altitude).",
    )
    zone_climatique: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        doc="Zone climatique (h1, h2, h3) déterminée selon le département.",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Statut d'activation du logement.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Date de création.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        onupdate=func.now(),
        nullable=False,
        doc="Date de dernière mise à jour.",
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Date d'archivage (soft delete).",
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="properties")
    client: Mapped["Client"] = relationship(back_populates="properties")
    module_drafts: Mapped[list["ModuleDraft"]] = relationship(back_populates="property")
    folders: Mapped[list["Folder"]] = relationship(back_populates="property")

