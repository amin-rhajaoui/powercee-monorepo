"""
Installation Recommendations model.
Stores installer-specific recommendations for a folder.
"""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.folder import Folder


class InstallationRecommendation(Base):
    """
    Modele pour les preconisations d'installation.
    Relation One-to-One avec Folder.
    """

    __tablename__ = "installation_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique de la preconisation.",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant proprietaire (isolation multi-tenant).",
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One-to-One relationship
        index=True,
        doc="Dossier associe.",
    )

    # Section 1: Acces
    access_recommendations: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Preconisations d'acces (digicode, etage, stationnement, etc.).",
    )

    # Section 2: Unite Interieure
    indoor_unit_recommendations: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Preconisations pour l'installation de l'unite interieure.",
    )

    # Section 3: Unite Exterieure
    outdoor_unit_recommendations: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Preconisations pour l'installation de l'unite exterieure.",
    )

    # Section 4: Precautions generales / Securite
    safety_recommendations: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Precautions generales et consignes de securite.",
    )

    # Photos (URLs stockees dans S3)
    photo_urls: Mapped[list[str] | None] = mapped_column(
        ARRAY(String(512)),
        nullable=True,
        default=list,
        doc="Liste des URLs des photos associees.",
    )

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

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="installation_recommendations")
    folder: Mapped["Folder"] = relationship(back_populates="installation_recommendation")
