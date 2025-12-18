from typing import Generator, List, AsyncGenerator
from fastapi import Request, HTTPException, status, Depends
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import SessionLocal
from app.core.config import settings
from app.models import User, UserRole


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dépendance FastAPI pour obtenir une session de base de données asynchrone par requête.
    """
    async with SessionLocal() as session:
        yield session


async def get_current_user(
    request: Request, 
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dépendance pour récupérer l'utilisateur actuellement authentifié via un cookie JWT.
    """
    # #region agent log
    import json, time
    def _log_debug(msg, data=None, hypothesis_id=""):
        log_entry = {
            "location": "deps.py:get_current_user",
            "message": msg,
            "data": data or {},
            "timestamp": int(time.time() * 1000),
            "sessionId": "debug-auth",
            "hypothesisId": hypothesis_id
        }
        with open("/Users/aminrhajaoui/Documents/PowerCee/powercee-monorepo/.cursor/debug.log", "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    _log_debug("Checking authentication", {
        "cookies": list(request.cookies.keys()),
        "has_access_token": "access_token" in request.cookies
    }, "E,F,G")
    # #endregion

    # ... (les étapes 1 à 4 restent identiques car elles ne touchent pas à la DB)
    token = request.cookies.get("access_token")
    
    if not token:
        # #region agent log
        _log_debug("Authentication failed: Missing token", {}, "E,F")
        # #endregion
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié. Token manquant.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide : identifiant manquant.",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré.",
        )

    # 5. Chercher l'utilisateur en DB (Version Async)
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # 6. Si user introuvable
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable.",
        )

    # 7. Vérifier si le compte est actif
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compte utilisateur inactif.",
        )

    # 8. Retourner l'objet user
    return user


class RoleChecker:
    """
    Dépendance pour vérifier si l'utilisateur possède l'un des rôles autorisés.
    Usage: Depends(RoleChecker([UserRole.DIRECTION]))
    """

    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Opération non autorisée. Permissions insuffisantes.",
            )
        return user
