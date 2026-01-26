import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, func, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.core.encryption import EncryptionService

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class IntegrationType(str, Enum):
    """Types d'intégrations disponibles."""
    YOUSIGN = "yousign"


class Integration(Base):
    """
    Modèle pour stocker les intégrations (clés API) des tenants.
    """
    __tablename__ = "integrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique de l'intégration"
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Référence au tenant"
    )
    integration_type: Mapped[IntegrationType] = mapped_column(
        SQLEnum(IntegrationType, native_enum=False),
        nullable=False,
        doc="Type d'intégration (yousign, etc.)"
    )
    _api_key_encrypted: Mapped[str] = mapped_column(
        "api_key",  # Nom de la colonne en BDD (pour rétrocompatibilité)
        Text,
        nullable=False,
        doc="Clé API chiffrée (stockée de manière sécurisée)"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        doc="Statut d'activation de l'intégration"
    )
    config: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        doc="Configuration additionnelle en JSON"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        doc="Date de création"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        default=lambda: datetime.now(timezone.utc),
        doc="Date de dernière mise à jour"
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="integrations")

    @property
    def api_key(self) -> str:
        """
        Propriété pour accéder à la clé API en clair.
        Déchiffre automatiquement la valeur stockée dans _api_key_encrypted.
        """
        try:
            return EncryptionService.decrypt(self._api_key_encrypted)
        except ValueError:
            # Si le déchiffrement échoue, peut-être que c'est une ancienne clé non chiffrée
            # (pour la migration). On retourne la valeur telle quelle.
            return self._api_key_encrypted

    @api_key.setter
    def api_key(self, value: str) -> None:
        """
        Setter pour définir la clé API.
        Chiffre automatiquement la valeur avant de la stocker dans _api_key_encrypted.
        """
        if not value:
            raise ValueError("La clé API ne peut pas être vide")
        self._api_key_encrypted = EncryptionService.encrypt(value)

    def get_masked_api_key(self) -> str:
        """
        Retourne la clé API masquée pour l'affichage.
        Déchiffre d'abord la clé pour obtenir les premiers et derniers caractères.
        """
        try:
            decrypted_key = self.api_key
            if not decrypted_key or len(decrypted_key) < 8:
                return "****"
            return f"{decrypted_key[:4]}...{decrypted_key[-4:]}"
        except Exception:
            # En cas d'erreur de déchiffrement, retourner un masque générique
            return "****"
