from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime

class TenantBrandingUpdate(BaseModel):
    """
    Schéma pour la mise à jour des informations de branding d'un tenant.
    """
    logo_url: str | None = Field(None, max_length=500, description="URL du logo stocké sur S3")
    primary_color: str | None = Field(None, pattern="^#(?:[0-9a-fA-F]{3}){1,2}$", description="Couleur principale (hex)")
    secondary_color: str | None = Field(None, pattern="^#(?:[0-9a-fA-F]{3}){1,2}$", description="Couleur secondaire (hex)")

class TenantResponse(BaseModel):
    """
    Schéma pour la réponse contenant les informations d'un tenant.
    """
    id: UUID
    name: str
    logo_url: str | None
    primary_color: str | None
    secondary_color: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

