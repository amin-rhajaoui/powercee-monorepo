"""
CEE Valuation model.
Stores CEE buyback prices per operation per tenant.
"""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class CEEValuation(Base):
    """
    Modele pour les valorisations CEE.
    Stocke les prix de rachat CEE par operation et par tenant.
    """

    __tablename__ = "cee_valuations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique de la valorisation.",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant proprietaire (isolation multi-tenant).",
    )
    operation_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Code de l'operation CEE (ex: BAR-TH-171).",
    )
    is_residential: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        doc="Si True, utilise les 4 couleurs MPR. Sinon, prix standard.",
    )

    # Prix standard (pour operations professionnelles/tertiaire)
    value_standard: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Prix standard en EUR/MWh cumac (tertiaire/collectif).",
    )

    # Prix par couleur MPR (pour operations residentielles/particuliers)
    value_blue: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Prix pour menages tres modestes (Bleu) en EUR/MWh cumac.",
    )
    value_yellow: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Prix pour menages modestes (Jaune) en EUR/MWh cumac.",
    )
    value_violet: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Prix pour menages intermediaires (Violet) en EUR/MWh cumac.",
    )
    value_rose: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Prix pour menages classiques (Rose) en EUR/MWh cumac.",
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
    tenant: Mapped["Tenant"] = relationship(back_populates="cee_valuations")

    __table_args__ = (
        UniqueConstraint("tenant_id", "operation_code", name="uq_tenant_operation"),
    )
