"""
Technical Survey model.
Stores technical survey photos for a folder.
"""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.folder import Folder


class TechnicalSurvey(Base):
    """
    Modèle pour les photos de visite technique.
    Relation One-to-One avec Folder.
    """

    __tablename__ = "technical_surveys"

    folder_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        primary_key=True,
        doc="Identifiant du dossier (PK et FK).",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire (isolation multi-tenant).",
    )

    # Photos standard (toujours requises)
    photo_house: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        doc="Photo du logement.",
    )
    photo_facade: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        doc="Photo de la façade.",
    )
    photo_old_system: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        doc="Photo de l'ancien système (chaudière).",
    )
    photo_electric_panel: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        doc="Photo du tableau électrique.",
    )

    # Logique conditionnelle Linky
    has_linky: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
        doc="Le logement a-t-il un compteur Linky ?",
    )
    photo_linky: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        doc="Photo du compteur Linky (si has_linky=True).",
    )
    photo_breaker: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        doc="Photo du disjoncteur (si has_linky=False).",
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

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="technical_surveys")
    folder: Mapped["Folder"] = relationship(back_populates="technical_survey")
