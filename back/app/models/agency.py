import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import String, Boolean, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User
    from app.models.client import Client


class Agency(Base):
    """
    Modèle représentant une agence physique liée à un Tenant.
    """
    __tablename__ = "agencies"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique de l'agence"
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Nom de l'agence"
    )
    address: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        doc="Adresse postale complète"
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=True,
        doc="Latitude pour la géolocalisation"
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=True,
        doc="Longitude pour la géolocalisation"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        doc="Statut d'activité de l'agence"
    )

    # Isolation Multi-tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID du tenant auquel appartient l'agence"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="agencies")
    users: Mapped[List["User"]] = relationship(back_populates="agency")
    clients: Mapped[List["Client"]] = relationship(back_populates="agency")

