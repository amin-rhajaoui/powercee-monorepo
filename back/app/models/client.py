import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List

from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Boolean, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.agency import Agency
    from app.models.user import User
    from app.models.property import Property
    from app.models.module_draft import ModuleDraft


class ClientType(str, Enum):
    """Type de client (particulier ou professionnel)."""

    PARTICULIER = "PARTICULIER"
    PROFESSIONNEL = "PROFESSIONNEL"


class ClientStatus(str, Enum):
    """Statut fonctionnel d'un client."""

    ACTIF = "ACTIF"
    ARCHIVE = "ARCHIVE"


class Client(Base):
    """Modèle Client multi-tenant avec soft delete."""

    __tablename__ = "clients"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_client_email_tenant"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du client",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire du client (isolation multi-tenant).",
    )
    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Agence associée (pour restreindre ADMIN_AGENCE).",
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Utilisateur créateur/commercial propriétaire du client.",
    )
    type: Mapped[ClientType] = mapped_column(
        SQLEnum(ClientType, name="client_type"),
        nullable=False,
        doc="Type du client.",
    )
    first_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Prénom (clients particuliers).",
    )
    last_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Nom (clients particuliers).",
    )
    company_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Raison sociale (clients professionnels).",
    )
    contact_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Nom du contact principal (clients professionnels).",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Email principal (unique par tenant).",
    )
    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="Téléphone de contact.",
    )
    status: Mapped[ClientStatus] = mapped_column(
        SQLEnum(ClientStatus, name="client_status"),
        default=ClientStatus.ACTIF,
        nullable=False,
        doc="Statut fonctionnel (actif ou archivé).",
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

    tenant: Mapped["Tenant"] = relationship(back_populates="clients")
    agency: Mapped["Agency | None"] = relationship(back_populates="clients")
    owner: Mapped["User"] = relationship(back_populates="clients")
    properties: Mapped[List["Property"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    module_drafts: Mapped[list["ModuleDraft"]] = relationship(back_populates="client")


