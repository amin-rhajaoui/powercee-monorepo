from datetime import datetime, timezone
import hashlib
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, RoleChecker
from app.models import User, UserRole, Invitation
from app.schemas.invitation import InvitationCreate, InvitationResponse, InvitationAccept
from app.schemas.auth import UserResponse
from app.core.security import get_password_hash
from app.core.jwt import create_access_token
from app.core.config import settings
from app.services.invitation_service import create_invitation
from app.services.email_service import send_invitation_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invitations", tags=["Invitations"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_invitation_endpoint(
    invitation_in: InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE]))
):
    """
    Crée une nouvelle invitation pour rejoindre le tenant ou une agence.
    
    Contraintes :
    - ADMIN_AGENCE ne peut pas inviter avec le rôle DIRECTION.
    - ADMIN_AGENCE force l'agency_id au sien.
    - DIRECTION peut choisir l'agence (ou aucune).
    """
    # Vérifications pour ADMIN_AGENCE
    if current_user.role == UserRole.ADMIN_AGENCE:
        # Vérifier que l'admin ne peut pas inviter un DIRECTION
        if invitation_in.role == UserRole.DIRECTION:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Un ADMIN_AGENCE ne peut pas inviter un utilisateur avec le rôle DIRECTION."
            )
        # Forcer l'agence de l'admin
        invitation_in.agency_id = current_user.agency_id
    
    # Créer l'invitation via le service
    invitation, raw_token = await create_invitation(db, invitation_in, current_user)
    
    # Recharger l'invitation avec les relations (agency, creator)
    result = await db.execute(
        select(Invitation)
        .options(selectinload(Invitation.agency), selectinload(Invitation.creator))
        .where(Invitation.id == invitation.id)
    )
    invitation_with_relations = result.scalar_one()
    
    # Préparer les informations pour l'email
    inviter_name = invitation_with_relations.creator.full_name or invitation_with_relations.creator.email
    agency_name = invitation_with_relations.agency.name if invitation_with_relations.agency else None
    role_value = str(invitation_with_relations.role)
    
    # Envoyer l'email d'invitation
    try:
        send_invitation_email(
            email_to=invitation_in.email,
            token=raw_token,
            inviter_name=inviter_name,
            role=role_value,
            agency_name=agency_name
        )
        logger.info(f"Email d'invitation envoyé avec succès à {invitation_in.email}")
    except Exception as e:
        # Logger l'erreur mais ne pas faire échouer la création de l'invitation
        logger.error(f"Erreur lors de l'envoi de l'email à {invitation_in.email}: {str(e)}")
        # L'invitation a déjà été créée, on continue même si l'email échoue
    
    # Retourner la réponse JSON
    return {
        "message": "Invitation envoyée",
        "email": invitation_in.email
    }


@router.get("/validate/{token}", response_model=InvitationResponse)
async def validate_invitation(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Valide un token d'invitation.
    
    Vérifie que l'invitation existe, n'est pas utilisée et n'est pas expirée.
    """
    # Hasher le token
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Chercher l'invitation dans la base de données
    result = await db.execute(
        select(Invitation).where(Invitation.token_hash == token_hash)
    )
    invitation = result.scalar_one_or_none()
    
    # Vérifications de sécurité
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation introuvable"
        )
    
    if invitation.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation déjà utilisée"
        )
    
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation expirée"
        )
    
    # Retourner l'invitation valide
    return invitation


@router.post("/accept", response_model=UserResponse)
async def accept_invitation(
    data: InvitationAccept,
    db: AsyncSession = Depends(get_db)
):
    """
    Accepte une invitation et crée un nouvel utilisateur.
    
    Valide le token, crée l'utilisateur, marque l'invitation comme utilisée,
    et connecte automatiquement l'utilisateur en définissant un cookie JWT.
    """
    # Hasher le token
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    
    # Chercher l'invitation dans la base de données
    result = await db.execute(
        select(Invitation).where(Invitation.token_hash == token_hash)
    )
    invitation = result.scalar_one_or_none()
    
    # Vérifications de sécurité
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation introuvable"
        )
    
    if invitation.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation déjà utilisée"
        )
    
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation expirée"
        )
    
    # Transaction atomique : créer l'utilisateur et marquer l'invitation comme utilisée
    try:
        # Créer l'utilisateur
        hashed_password = get_password_hash(data.password)
        new_user = User(
            email=invitation.email,
            hashed_password=hashed_password,
            full_name=data.full_name,
            role=invitation.role,
            tenant_id=invitation.tenant_id,
            agency_id=invitation.agency_id,
            is_active=True
        )
        db.add(new_user)
        
        # Marquer l'invitation comme utilisée
        invitation.used_at = datetime.now(timezone.utc)
        
        # Commit de la transaction
        await db.commit()
        await db.refresh(new_user)
        
        # Générer le JWT pour l'auto-login
        access_token = create_access_token(
            data={"sub": new_user.email, "tenant_id": str(new_user.tenant_id)}
        )
        
        # Sérialiser l'utilisateur en dictionnaire pour éviter les problèmes de sérialisation
        try:
            # Utiliser mode='json' pour convertir automatiquement les UUIDs en strings
            user_data = UserResponse.model_validate(new_user).model_dump(mode='json')
        except Exception as validation_error:
            logger.error(f"Erreur lors de la validation/sérialisation de l'utilisateur: {str(validation_error)}")
            # Fallback: créer manuellement le dictionnaire avec conversion des UUIDs en strings
            user_data = {
                "id": str(new_user.id),
                "email": new_user.email,
                "full_name": new_user.full_name or "",
                "role": str(new_user.role),
                "tenant_id": str(new_user.tenant_id),
                "is_active": new_user.is_active
            }
        
        # Créer une JSONResponse avec le cookie
        json_response = JSONResponse(content=user_data)
        
        # Définir le cookie HTTPOnly
        json_response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=not settings.is_local,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        logger.info(f"Utilisateur créé avec succès: {new_user.email}, rôle: {new_user.role}")
        return json_response
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la création de l'utilisateur: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création de l'utilisateur: {str(e)}"
        )
