from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db
from app.schemas.auth import UserRegister, UserResponse
from app.services import auth_service
from app.models import User
from app.core import security, jwt
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Inscrit un nouveau tenant (entreprise) et son utilisateur administrateur.
    """
    user = await auth_service.register_new_tenant(db=db, data=data)

    return user


@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Authentifie un utilisateur.
    - Pour le web : définit un cookie HTTPOnly contenant le JWT.
    - Pour mobile : retourne le token dans le body JSON (si header Accept: application/json).
    """
    # a. Chercher User par email
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # b. Vérifier mdp
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_password_valid = security.verify_password(form_data.password, user.hashed_password)
    
    if not is_password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compte inactif."
        )

    # c. Créer token
    access_token = jwt.create_access_token(
        data={"sub": user.email, "tenant_id": str(user.tenant_id)}
    )

    # d. Détecter si c'est une requête mobile (via header Accept ou paramètre format)
    accept_header = request.headers.get("Accept", "")
    format_param = request.query_params.get("format")
    is_mobile_request = (
        "application/json" in accept_header or 
        format_param == "json"
    )

    if is_mobile_request:
        # Pour mobile : retourner le token dans le body JSON
        return JSONResponse(content={
            "access_token": access_token,
            "token_type": "bearer",
            "message": "Connexion réussie"
        })
    else:
        # Pour web : définir le cookie HTTPOnly
        response = JSONResponse(content={"message": "Connexion réussie"})
        
        # SECURITY: Utilisation de HttpOnly pour empêcher l'accès via JS
        # Secure=True en prod, False en local pour permettre les tests
        # SameSite=Lax pour la protection CSRF
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=not settings.is_local,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return response


@router.post("/logout")
def logout(response: Response):
    """
    Déconnecte l'utilisateur en supprimant le cookie d'authentification.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=not settings.is_local,
        samesite="lax",
    )
    return {"message": "Déconnexion réussie"}

