from typing import TYPE_CHECKING
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import UserRole

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.agency import Agency
    from app.models.user import User


class Invitation(Base):
    """
    Modèle représentant une invitation à rejoindre un tenant ou une agence.
    """
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique de l'invitation"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
        doc="Adresse email du destinataire de l'invitation"
    )
    role: Mapped[UserRole] = mapped_column(
        String(50),
        nullable=False,
        doc="Rôle attribué à l'utilisateur lors de l'acceptation"
    )
    token_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Hash du token d'invitation"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Date d'expiration de l'invitation"
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Date d'utilisation de l'invitation (null si non utilisée)"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        doc="Date de création de l'invitation"
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="ID du tenant pour lequel l'invitation est créée"
    )
    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="ID de l'agence pour laquelle l'invitation est créée (optionnel)"
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        doc="ID de l'utilisateur ayant créé l'invitation"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship()
    agency: Mapped["Agency | None"] = relationship()
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])

