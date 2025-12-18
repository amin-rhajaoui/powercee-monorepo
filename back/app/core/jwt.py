from datetime import datetime, timedelta, timezone
from jose import jwt

from app.core.config import settings


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Crée un JSON Web Token (JWT) pour l'authentification.
    
    Args:
        data: Les données à inclure dans le payload du token (ex: sub, roles).
        expires_delta: Une durée d'expiration personnalisée. 
                       Si non fournie, utilise ACCESS_TOKEN_EXPIRE_MINUTES des paramètres.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Ajout du claim d'expiration
    to_encode.update({"exp": expire})
    
    # Encodage du token
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

