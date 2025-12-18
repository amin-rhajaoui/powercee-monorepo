from pydantic import BaseModel, EmailStr, Field, ConfigDict
from uuid import UUID
from app.models.user import UserRole

class UserCreate(BaseModel):
    """
    Schéma pour la création d'un utilisateur par un administrateur.
    """
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.COMMERCIAL
    agency_id: UUID | None = None

class UserUpdate(BaseModel):
    """
    Schéma pour la mise à jour d'un utilisateur.
    """
    full_name: str | None = Field(None, min_length=2, max_length=255)
    role: UserRole | None = None
    agency_id: UUID | None = None
    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)

