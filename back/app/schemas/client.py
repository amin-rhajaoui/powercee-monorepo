from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.client import ClientType, ClientStatus


class ClientBase(BaseModel):
    """Champs communs pour un client."""

    type: ClientType
    first_name: str | None = Field(None, min_length=1, max_length=255)
    last_name: str | None = Field(None, min_length=1, max_length=255)
    company_name: str | None = Field(None, min_length=1, max_length=255)
    contact_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(None, min_length=5, max_length=50)
    agency_id: UUID | None = None

    @model_validator(mode="after")
    def validate_by_type(self) -> "ClientBase":
        """Vérifie les champs obligatoires selon le type."""
        if self.type == ClientType.PARTICULIER:
            if not self.first_name or not self.last_name:
                raise ValueError("Prénom et nom sont requis pour un client particulier.")
            self.company_name = None
            self.contact_name = None
        elif self.type == ClientType.PROFESSIONNEL:
            if not self.company_name:
                raise ValueError("La raison sociale est requise pour un client professionnel.")
            if not self.contact_name:
                raise ValueError("Le contact principal est requis pour un client professionnel.")
            self.first_name = None
            self.last_name = None
        return self

    @model_validator(mode="after")
    def normalize_email(self) -> "ClientBase":
        """Normalise l'email pour éviter les doublons par casse."""
        if self.email:
            self.email = self.email.lower()
        return self


class ClientCreate(ClientBase):
    """Payload de création."""

    pass


class ClientUpdate(BaseModel):
    """Payload de mise à jour partielle."""

    type: ClientType | None = None
    first_name: str | None = Field(None, min_length=1, max_length=255)
    last_name: str | None = Field(None, min_length=1, max_length=255)
    company_name: str | None = Field(None, min_length=1, max_length=255)
    contact_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, min_length=5, max_length=50)
    agency_id: UUID | None = None

    @model_validator(mode="after")
    def validate_consistency(self) -> "ClientUpdate":
        """S'assure de la cohérence entre type et champs envoyés."""
        if self.type == ClientType.PARTICULIER:
            if self.company_name or self.contact_name:
                # Nettoyage pour éviter des restes incohérents
                self.company_name = None
                self.contact_name = None
        if self.type == ClientType.PROFESSIONNEL:
            if self.first_name or self.last_name:
                self.first_name = None
                self.last_name = None
        if self.email:
            self.email = self.email.lower()
        return self


class ClientResponse(ClientBase):
    """Représentation API d'un client."""

    id: UUID
    tenant_id: UUID
    owner_id: UUID
    status: ClientStatus
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedClientsResponse(BaseModel):
    """Réponse paginée pour la liste des clients."""

    items: List[ClientResponse]
    total: int
    page: int
    page_size: int


