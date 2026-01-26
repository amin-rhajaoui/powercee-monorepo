"""Modèle Project pour la gestion des projets de rénovation multi-appartements (BAR-TH-175)."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List

from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.client import Client
    from app.models.module_draft import ModuleDraft


class ProjectStatus(str, Enum):
    """Statut d'un projet de rénovation."""

    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    AUDIT_PENDING = "AUDIT_PENDING"
    VALIDATED = "VALIDATED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class Project(Base):
    """
    Modèle Project pour les projets de rénovation d'ampleur (BAR-TH-175).

    Un projet représente un immeuble ou un ensemble d'appartements à rénover,
    typiquement pour un bailleur social. Chaque appartement est représenté par
    un ModuleDraft lié au projet.
    """

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du projet.",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire du projet (isolation multi-tenant).",
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Client (bailleur) associé au projet.",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Nom du projet (ex: 'Les Balcons de la Brévenne').",
    )
    status: Mapped[ProjectStatus] = mapped_column(
        SQLEnum(ProjectStatus, name="projectstatus", create_type=False),
        nullable=False,
        default=ProjectStatus.DRAFT,
        index=True,
        doc="Statut actuel du projet.",
    )
    module_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="BAR-TH-175",
        index=True,
        doc="Code du module CEE (BAR-TH-175 pour rénovation d'ampleur).",
    )
    building_address: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        doc="Adresse de l'immeuble.",
    )
    total_apartments: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="Nombre total d'appartements dans le projet.",
    )
    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Données flexibles du projet en JSON (infos immeuble, audit global, etc.).",
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

    # Relations
    tenant: Mapped["Tenant"] = relationship(back_populates="projects")
    client: Mapped["Client | None"] = relationship(back_populates="projects")
    module_drafts: Mapped[List["ModuleDraft"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
