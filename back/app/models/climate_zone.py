"""
Modèle pour les zones climatiques par département.
Table de référence (non multi-tenant).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ClimateZone(Base):
    """Modèle ClimateZone - Zone climatique par département (table de référence)."""

    __tablename__ = "climate_zones"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique",
    )
    departement: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        unique=True,
        index=True,
        doc="Code département (2 chiffres, ex: '01', '75').",
    )
    zone_climatique: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        doc="Zone climatique (h1, h2, h3).",
    )
    zone_teb: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
        doc="Zone TEB pour température extérieure de base (A à I).",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Date de création.",
    )
