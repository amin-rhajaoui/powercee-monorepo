import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Any

from sqlalchemy import String, DateTime, ForeignKey, Boolean, Float, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class RoundingMode(str, Enum):
    """Mode d'arrondi pour le RAC."""
    NONE = "NONE"
    X90 = "X90"


class ModuleSettings(Base):
    """Configuration specifique a un module pour un tenant."""

    __tablename__ = "module_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique des parametres.",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant proprietaire (isolation multi-tenant).",
    )
    module_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Code du module (ex: BAR-TH-171).",
    )

    # Pricing Strategy Configuration
    enable_legacy_grid_rules: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Active les regles de grille heritees (priorite sur cost-plus).",
    )
    rounding_mode: Mapped[str] = mapped_column(
        String(20),
        default=RoundingMode.NONE.value,
        nullable=False,
        doc="Mode d'arrondi: NONE ou X90 (490, 990, etc.).",
    )
    min_margin_amount: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
        doc="Marge minimale en EUR HT.",
    )
    max_rac_addon: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        doc="Plafond RAC additionnel en EUR.",
    )

    # Default Products
    default_labor_product_ids: Mapped[List[str]] = mapped_column(
        JSONB,
        default=list,
        nullable=False,
        doc="IDs des produits main d'oeuvre par defaut.",
    )

    # Fixed Line Items
    fixed_line_items: Mapped[List[dict[str, Any]]] = mapped_column(
        JSONB,
        default=list,
        nullable=False,
        doc="Lignes fixes du devis (ex: desembouage).",
    )

    # Legacy Grid Rules
    legacy_grid_rules: Mapped[List[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        doc="Regles de grille RAC configurables par l'utilisateur.",
    )

    # Timestamps
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

    # Relations
    tenant: Mapped["Tenant"] = relationship(back_populates="module_settings")
