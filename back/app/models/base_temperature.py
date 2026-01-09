"""
Modèle pour les températures extérieures de base par zone et altitude.
Table de référence (non multi-tenant).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Float, Integer, func, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BaseTemperature(Base):
    """Modèle BaseTemperature - Température extérieure de base (table de référence)."""

    __tablename__ = "base_temperatures"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique",
    )
    zone: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
        index=True,
        doc="Zone TEB (A à I).",
    )
    altitude_min: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Altitude minimale en mètres (inclusive).",
    )
    altitude_max: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Altitude maximale en mètres (inclusive).",
    )
    temp_base: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Température extérieure de base en °C.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Date de création.",
    )

    __table_args__ = (
        Index("idx_base_temps_zone_altitude", "zone", "altitude_min", "altitude_max"),
    )
