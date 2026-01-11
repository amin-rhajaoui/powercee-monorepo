import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import String, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.agency import Agency
    from app.models.client import Client
    from app.models.property import Property
    from app.models.module_draft import ModuleDraft
    from app.models.folder import Folder
    from app.models.product import Product
    from app.models.installation_recommendation import InstallationRecommendation
    from app.models.cee_valuation import CEEValuation


class Tenant(Base):
    """
    Modèle représentant un client (Tenant) dans le système SaaS Multi-tenant.
    """
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du tenant (UUID v4)"
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        doc="Nom de l'entreprise ou de l'organisation"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        doc="Date de création du tenant"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        doc="Statut d'activation du tenant"
    )

    # Branding
    logo_url: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        doc="URL du logo stocké sur S3"
    )
    primary_color: Mapped[str] = mapped_column(
        String(7),
        nullable=True,
        default="#000000",
        doc="Couleur principale (hex)"
    )
    secondary_color: Mapped[str] = mapped_column(
        String(7),
        nullable=True,
        default="#FFFFFF",
        doc="Couleur secondaire (hex)"
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    agencies: Mapped[List["Agency"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    clients: Mapped[List["Client"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    properties: Mapped[List["Property"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    module_drafts: Mapped[list["ModuleDraft"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    folders: Mapped[list["Folder"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    installation_recommendations: Mapped[List["InstallationRecommendation"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    cee_valuations: Mapped[List["CEEValuation"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")

