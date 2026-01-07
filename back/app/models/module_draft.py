import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Text, func, Index, Boolean, Float, Integer
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

    # =========================================================================
    # Champs spécifiques BAR-TH-171 (nullable car pas utilisés par tous les modules)
    # =========================================================================
    is_principal_residence: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
        doc="Le logement est-il la résidence principale ?",
    )
    occupation_status: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Statut d'occupation (PROPRIETAIRE, LOCATAIRE).",
    )
    heating_system: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Système de chauffage actuel (FIOUL, GAZ, CHARBON, BOIS, ELECTRIQUE).",
    )
    old_boiler_brand: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="Marque de l'ancienne chaudière.",
    )
    is_water_heating_linked: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
        doc="L'eau chaude est-elle liée au système de chauffage ?",
    )
    water_heating_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="Type de production d'eau chaude actuel.",
    )
    electrical_phase: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Type de compteur électrique (MONOPHASE, TRIPHASE).",
    )
    power_kva: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Puissance du compteur électrique en kVA.",
    )
    usage_mode: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        doc="Mode d'usage souhaité : HEATING_ONLY ou HEATING_AND_HOT_WATER.",
    )

    # =========================================================================
    # Champs spécifiques BAR-TH-171 - Étape 3 : Documents administratifs
    # =========================================================================
    tax_notice_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        doc="URL S3 de l'avis d'imposition.",
    )
    address_proof_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        doc="URL S3 du justificatif de domicile (si changement d'adresse).",
    )
    property_proof_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        doc="URL S3 de la taxe foncière ou acte notarié.",
    )
    energy_bill_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        doc="URL S3 de la facture d'énergie.",
    )
    reference_tax_income: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="Revenu fiscal de référence.",
    )
    household_size: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="Nombre de personnes dans le foyer fiscal.",
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

