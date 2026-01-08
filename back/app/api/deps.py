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
    Dépendance pour récupérer l'utilisateur actuellement authentifié.
    Supporte à la fois les tokens Bearer (mobile) et les cookies HttpOnly (web).
    """
    token = None
    
    # 1. Vérifier d'abord le header Authorization pour les tokens Bearer (mobile)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    # 2. Sinon, vérifier le cookie (web)
    else:
        token = request.cookies.get("access_token")
    
    if not token:
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
