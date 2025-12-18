from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    """
    Schéma d'entrée pour l'inscription d'un nouvel utilisateur et son entreprise.
    """
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str = Field(..., min_length=2)
    company_name: str = Field(..., min_length=2)


class UserResponse(BaseModel):
    """
    Schéma de sortie pour renvoyer les données utilisateur après création ou récupération.
    """
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    tenant_id: UUID
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

