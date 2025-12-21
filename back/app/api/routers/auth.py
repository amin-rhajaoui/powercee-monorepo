from fastapi import APIRouter, Depends, HTTPException, status, Response
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
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Authentifie un utilisateur et définit un cookie HTTPOnly contenant le JWT.
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

    # d. & e. Créer une JSONResponse et définir le cookie
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

