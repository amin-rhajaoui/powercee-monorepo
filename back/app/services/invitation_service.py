import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invitation import Invitation
from app.models.user import User
from app.schemas.invitation import InvitationCreate


async def create_invitation(
    db: AsyncSession,
    invitation_in: InvitationCreate,
    current_user: User
) -> tuple[Invitation, str]:
    """
    Crée une nouvelle invitation avec un token sécurisé.
    
    Args:
        db: Session de base de données asynchrone
        invitation_in: Données de l'invitation à créer
        current_user: Utilisateur créant l'invitation
        
    Returns:
        Tuple contenant l'objet Invitation créé et le token brut (non hashé)
    """
    # Générer un token sécurisé
    raw_token = secrets.token_urlsafe(32)
    
    # Hasher le token
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    # Définir l'expiration à maintenant + 48 heures (UTC)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    # Créer l'objet Invitation
    invitation = Invitation(
        email=invitation_in.email,
        role=invitation_in.role,
        agency_id=invitation_in.agency_id,
        tenant_id=current_user.tenant_id,  # Force depuis current_user (sécurité)
        created_by=current_user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    
    # Ajouter à la base de données
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    # Retourner l'invitation et le token brut
    return invitation, raw_token

