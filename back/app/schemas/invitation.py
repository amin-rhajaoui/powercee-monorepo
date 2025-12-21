from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole


class InvitationBase(BaseModel):
    """
    Schéma de base pour une invitation.
    """
    email: EmailStr
    role: UserRole = UserRole.COMMERCIAL
    agency_id: UUID | None = None


class InvitationCreate(InvitationBase):
    """
    Schéma pour la création d'une invitation.
    """
    pass


class InvitationResponse(InvitationBase):
    """
    Schéma de réponse pour une invitation.
    """
    id: UUID
    tenant_id: UUID
    created_by: UUID
    expires_at: datetime
    used_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvitationAccept(BaseModel):
    """
    Schéma pour accepter une invitation.
    """
    token: str
    password: str
    full_name: str

