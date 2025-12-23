import uuid
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.agency import Agency
    from app.models.client import Client


class UserRole(str, Enum):
    """
    Rôles utilisateur disponibles dans l'application.
    Hérite de str pour une sérialisation facile.
    """
    DIRECTION = "DIRECTION"
    ADMIN_AGENCE = "ADMIN_AGENCE"
    COMMERCIAL = "COMMERCIAL"
    POSEUR = "POSEUR"
    AUDITEUR = "AUDITEUR"
    COMPTABLE = "COMPTABLE"


class User(Base):
    """
    Modèle représentant un utilisateur lié à un Tenant spécifique.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique de l'utilisateur"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        doc="Adresse email (identifiant de connexion)"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Mot de passe haché"
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
        doc="Nom complet de l'utilisateur"
    )
    role: Mapped[UserRole] = mapped_column(
        String(50),
        default=UserRole.COMMERCIAL,
        nullable=False,
        doc="Rôle de l'utilisateur pour les permissions"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        doc="Statut d'activation du compte"
    )
    
    # Isolation Multi-tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID du tenant auquel appartient l'utilisateur"
    )
    
    # Rattachement à une agence
    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="ID de l'agence à laquelle appartient l'utilisateur"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    agency: Mapped["Agency | None"] = relationship(back_populates="users")
    clients: Mapped[list["Client"]] = relationship(back_populates="owner")

