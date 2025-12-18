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

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Inscrit un nouveau tenant (entreprise) et son utilisateur administrateur.
    """
    # #region agent log
    import json, time
    def _log_debug(msg, data=None, hypothesis_id=""):
        log_entry = {
            "location": "auth.py:register",
            "message": msg,
            "data": data or {},
            "timestamp": int(time.time() * 1000),
            "sessionId": "debug-auth",
            "hypothesisId": hypothesis_id
        }
        with open("/Users/aminrhajaoui/Documents/PowerCee/powercee-monorepo/.cursor/debug.log", "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    _log_debug("Registration attempt started", {"email": data.email}, "A,B")
    # #endregion

    user = await auth_service.register_new_tenant(db=db, data=data)

    # #region agent log
    _log_debug("Registration successful", {
        "user_id": str(user.id),
        "email_stored": user.email,
        "hash_stored_start": user.hashed_password[:10]
    }, "A,B")
    # #endregion

    return user


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Authentifie un utilisateur et définit un cookie HTTPOnly contenant le JWT.
    """
    # #region agent log
    import json, time
    def _log_debug(msg, data=None, hypothesis_id=""):
        log_entry = {
            "location": "auth.py:login",
            "message": msg,
            "data": data or {},
            "timestamp": int(time.time() * 1000),
            "sessionId": "debug-auth",
            "hypothesisId": hypothesis_id
        }
        with open("/Users/aminrhajaoui/Documents/PowerCee/powercee-monorepo/.cursor/debug.log", "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    _log_debug("Login attempt started", {"username": form_data.username}, "B,D")
    # #endregion

    # a. Chercher User par email
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # #region agent log
    _log_debug("Database query result", {
        "user_found": user is not None,
        "email_in_db": user.email if user else None,
        "stored_hash_start": user.hashed_password[:10] if user else None
    }, "B,C")
    # #endregion

    # b. Vérifier mdp
    if not user:
        # #region agent log
        _log_debug("Login failed: User not found", {"username": form_data.username}, "B")
        # #endregion
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_password_valid = security.verify_password(form_data.password, user.hashed_password)
    
    # #region agent log
    _log_debug("Password verification check", {
        "is_valid": is_password_valid,
        "input_password_len": len(form_data.password)
    }, "A")
    # #endregion

    if not is_password_valid:
        # #region agent log
        _log_debug("Login failed: Invalid password", {"username": user.email}, "A")
        # #endregion
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
    # Secure=True en prod, SameSite=Lax pour la protection CSRF
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Devrait être True en prod (HTTPS)
        samesite="lax",
        max_age=1800  # 30 minutes
    )

    return response


@router.post("/logout")
def logout(response: Response):
    """
    Déconnecte l'utilisateur en supprimant le cookie d'authentification.
    """
    response.delete_cookie("access_token")
    return {"message": "Déconnexion réussie"}

