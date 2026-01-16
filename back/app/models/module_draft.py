import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.client import Client
    from app.models.property import Property


class ModuleDraft(Base):
    """Modèle ModuleDraft (brouillon de module) multi-tenant avec soft delete."""

    __tablename__ = "module_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du brouillon",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire du brouillon (isolation multi-tenant).",
    )
    module_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Code du module (ex: BAR-TH-171).",
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Client associé au brouillon (peut être null si pas encore sélectionné).",
    )
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("properties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Logement associé au brouillon (peut être null si pas encore sélectionné).",
    )
    current_step: Mapped[int] = mapped_column(
        default=1,
        nullable=False,
        doc="Étape actuelle du wizard (1-6).",
    )
    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Données du brouillon stockées en JSON (flexible pour toutes les étapes).",
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

    tenant: Mapped["Tenant"] = relationship(back_populates="module_drafts")
    client: Mapped["Client | None"] = relationship(back_populates="module_drafts")
    property: Mapped["Property | None"] = relationship(back_populates="module_drafts")

    __table_args__ = (
        Index("idx_module_drafts_tenant_module", "tenant_id", "module_code"),
    )

