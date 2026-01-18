import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import String, ForeignKey, DateTime, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.folder import Folder


class QuoteDraft(Base):
    """
    Modèle représentant un brouillon de devis.
    Permet de sauvegarder temporairement des simulations de devis
    avant validation finale.
    """
    __tablename__ = "quote_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du brouillon"
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Nom du brouillon (ex: 'Brouillon du 18/01/2026 14h30')"
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID du dossier associé"
    )
    module_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Code du module CEE (ex: BAR-TH-171)"
    )
    product_ids: Mapped[List] = mapped_column(
        JSON,
        nullable=False,
        doc="Liste des IDs des produits inclus dans le devis"
    )
    lines: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        doc="Lignes du devis avec quantités et prix"
    )
    total_ht: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Total HT du devis"
    )
    total_ttc: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Total TTC du devis"
    )
    rac_ttc: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Reste à charge TTC après déduction des primes"
    )
    cee_prime: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        doc="Montant de la prime CEE"
    )
    margin_ht: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        doc="Marge HT estimée"
    )
    margin_percent: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        doc="Pourcentage de marge"
    )
    strategy_used: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Stratégie de calcul utilisée (COST_PLUS_MARGIN, LEGACY_GRID, etc.)"
    )
    warnings: Mapped[List] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        doc="Liste des avertissements de la simulation"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        doc="Date de création du brouillon"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        doc="Date de dernière modification"
    )

    # Isolation Multi-tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID du tenant auquel appartient le brouillon"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="quote_drafts")
    folder: Mapped["Folder"] = relationship(back_populates="quote_drafts")
