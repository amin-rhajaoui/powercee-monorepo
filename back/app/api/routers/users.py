from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user, get_db, RoleChecker
from app.models import User, UserRole
from app.schemas.auth import UserResponse
from app.schemas.users import UserCreate
from app.core.security import get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE]))
):
    """
    Crée un nouvel utilisateur au sein du tenant.
    Contraintes :
    - ADMIN_AGENCE ne peut pas créer de DIRECTION.
    - ADMIN_AGENCE force l'agency_id au sien.
    - DIRECTION peut choisir l'agence (ou aucune).
    """
    # 1. Vérifications de rôles
    if current_user.role == UserRole.ADMIN_AGENCE:
        if user_in.role == UserRole.DIRECTION:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Un ADMIN_AGENCE ne peut pas créer un utilisateur DIRECTION."
            )
        # Forcer l'agence de l'admin
        user_in.agency_id = current_user.agency_id

    # 2. Vérifier si l'email existe déjà
    query = select(User).where(User.email == user_in.email)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé."
        )

    # 3. Création
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        tenant_id=current_user.tenant_id,
        agency_id=user_in.agency_id
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Récupère les informations de l'utilisateur actuellement connecté.
    Utilise la dépendance get_current_user pour l'authentification.
    """
    return current_user

