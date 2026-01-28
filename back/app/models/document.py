import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, Index, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.folder import Folder


class DocumentType(str, Enum):
    """Type de document."""
    SIZING_NOTE = "sizing_note"
    QUOTE = "quote"
    TVA_ATTESTATION = "tva_attestation"
    CDC_CEE = "cdc_cee"


class Document(Base):
    """Modèle Document pour stocker les fichiers générés associés à un dossier."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        doc="Identifiant unique du document",
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Dossier associé au document.",
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Tenant propriétaire du document (isolation multi-tenant).",
    )
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType, values_callable=lambda x: [e.value for e in x], native_enum=True, create_constraint=True),
        nullable=False,
        index=True,
        doc="Type de document (sizing_note, quote, tva_attestation, cdc_cee).",
    )
    file_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        doc="URL du fichier PDF stocké sur S3.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Date de création.",
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="documents")
    folder: Mapped["Folder"] = relationship(back_populates="documents")

    __table_args__ = (
        Index("idx_documents_folder_type", "folder_id", "document_type"),
        Index("idx_documents_tenant", "tenant_id"),
    )
