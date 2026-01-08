import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, Index, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.client import Client
    from app.models.property import Property


class FolderStatus(str, Enum):
    """Statut d'un dossier."""
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class Folder(Base):
    """Modèle Folder (dossier validé) multi-tenant."""

    __tablename__ = "folders"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du dossier",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire du dossier (isolation multi-tenant).",
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Client associé au dossier.",
    )
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("properties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Logement associé au dossier (peut être null pour dossier libre).",
    )
    module_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        doc="Code du module (ex: BAR-TH-171). Null pour dossier libre.",
    )
    status: Mapped[FolderStatus] = mapped_column(
        SAEnum(FolderStatus),
        default=FolderStatus.IN_PROGRESS,
        nullable=False,
        doc="Statut du dossier (IN_PROGRESS, CLOSED, ARCHIVED).",
    )
    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Données complètes du dossier copiées depuis le draft.",
    )
    source_draft_id: Mapped[uuid.UUID | None] = mapped_column(
        nullable=True,
        index=True,
        doc="ID du draft source (pour traçabilité).",
    )
    mpr_color: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Couleur MPR calculée (Bleu, Jaune, Violet, Rose, Inconnu).",
    )
    emitter_type: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        doc="Type d'émetteur (BASSE_TEMPERATURE, MOYENNE_HAUTE_TEMPERATURE).",
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

    tenant: Mapped["Tenant"] = relationship(back_populates="folders")
    client: Mapped["Client"] = relationship(back_populates="folders")
    property: Mapped["Property | None"] = relationship(back_populates="folders")

    __table_args__ = (
        Index("idx_folders_tenant_module", "tenant_id", "module_code"),
        Index("idx_folders_tenant_client", "tenant_id", "client_id"),
    )
