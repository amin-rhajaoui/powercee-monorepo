from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Tenant, User, UserRole
from app.schemas.auth import UserRegister
from app.core.security import get_password_hash


async def register_new_tenant(db: AsyncSession, data: UserRegister) -> User:
    """
    Logique métier pour l'inscription d'un nouveau tenant et de son premier utilisateur (DIRECTION).
    Effectue toutes les opérations dans une seule transaction asynchrone.
    """
    
    # 1. Vérifier si l'email existe déjà
    query = select(User).where(User.email == data.email)
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà."
        )

    try:
        # 2. Instancier le Tenant
        new_tenant = Tenant(name=data.company_name)
        
        # 3. Ajouter le tenant et flush pour récupérer l'ID
        db.add(new_tenant)
        await db.flush()  # Récupère l'ID sans commiter la transaction complète

        # 4. Hasher le mot de passe
        hashed_password = get_password_hash(data.password)

        # 5. Instancier l'Utilisateur (Rôle DIRECTION par défaut pour le créateur)
        new_user = User(
            email=data.email,
            hashed_password=hashed_password,
            full_name=data.full_name,
            role=UserRole.DIRECTION,
            tenant_id=new_tenant.id,
            is_active=True
        )

        # 6. Ajouter l'utilisateur
        db.add(new_user)

        # 7. Commit la transaction complète (Tenant + User)
        await db.commit()

        # 8. Refresh pour charger les données à jour
        await db.refresh(new_user)

        # 9. Retourner l'objet User
        return new_user

    except Exception as e:
        # En cas d'erreur, on rollback
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur est survenue lors de l'inscription : {str(e)}"
        )

