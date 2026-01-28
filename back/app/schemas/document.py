from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DocumentType(str, Enum):
    """Type de document."""
    SIZING_NOTE = "sizing_note"
    QUOTE = "quote"
    TVA_ATTESTATION = "tva_attestation"
    CDC_CEE = "cdc_cee"


class DocumentResponse(BaseModel):
    """Représentation API d'un document."""

    id: UUID
    folder_id: UUID
    tenant_id: UUID
    document_type: DocumentType
    file_url: str = Field(..., description="URL du fichier PDF stocké sur S3")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FinalizeFolderResponse(BaseModel):
    """Réponse de finalisation d'un dossier avec les documents générés."""

    folder_id: UUID
    quote_number: str
    documents: list[DocumentResponse] = Field(..., description="Liste des 4 documents générés")
