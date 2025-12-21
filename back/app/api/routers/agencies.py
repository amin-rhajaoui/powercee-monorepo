from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from app.api.deps import get_db, RoleChecker, get_current_user
from app.models import User, Agency, UserRole
from app.schemas.agency import AgencyCreate, AgencyUpdate, AgencyResponse
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/agencies", tags=["Agencies"])

@router.get("", response_model=List[AgencyResponse])
async def list_agencies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Liste les agences du tenant.
    DIRECTION : voit toutes les agences du tenant.
    ADMIN_AGENCE : voit uniquement son agence.
    """
    query = select(Agency).where(Agency.tenant_id == current_user.tenant_id)
    
    if current_user.role == UserRole.ADMIN_AGENCE:
        if not current_user.agency_id:
            return []
        query = query.where(Agency.id == current_user.agency_id)
    elif current_user.role != UserRole.DIRECTION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé aux agences."
        )

    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=AgencyResponse, status_code=status.HTTP_201_CREATED)
async def create_agency(
    agency_in: AgencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION]))
):
    """
    Crée une nouvelle agence. Réservé au rôle DIRECTION.
    """
    agency = Agency(
        **agency_in.model_dump(),
        tenant_id=current_user.tenant_id
    )
    db.add(agency)
    await db.commit()
    await db.refresh(agency)
    return agency

@router.get("/{agency_id}", response_model=AgencyResponse)
async def get_agency(
    agency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère une agence spécifique.
    Vérifie l'appartenance au tenant et le rôle ADMIN_AGENCE.
    """
    # Isolation ADMIN_AGENCE
    if current_user.role == UserRole.ADMIN_AGENCE and current_user.agency_id != agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit à cette agence.")

    query = select(Agency).where(Agency.id == agency_id, Agency.tenant_id == current_user.tenant_id)
    result = await db.execute(query)
    agency = result.scalar_one_or_none()

    if not agency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agence non trouvée.")
    
    return agency

@router.get("/{agency_id}/users", response_model=List[UserResponse])
async def list_agency_users(
    agency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Liste les utilisateurs d'une agence spécifique.
    
    Contraintes de sécurité :
    - ADMIN_AGENCE : peut uniquement voir les utilisateurs de sa propre agence.
    - DIRECTION : peut voir les utilisateurs de toutes les agences de son tenant.
    """
    # Vérification de sécurité pour ADMIN_AGENCE
    if current_user.role == UserRole.ADMIN_AGENCE:
        if current_user.agency_id != agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit : vous ne pouvez voir que les utilisateurs de votre agence."
            )
    
    # Pour DIRECTION, vérifier que l'agence appartient au même tenant
    # (cela sera fait via la requête qui filtre par tenant_id)
    
    # Requête pour récupérer les utilisateurs de l'agence dans le même tenant
    query = select(User).where(
        User.agency_id == agency_id,
        User.tenant_id == current_user.tenant_id
    )
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users

@router.put("/{agency_id}", response_model=AgencyResponse)
async def update_agency(
    agency_id: UUID,
    agency_in: AgencyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Met à jour une agence.
    DIRECTION ou ADMIN_AGENCE (si c'est son agence).
    """
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissions insuffisantes.")
    
    if current_user.role == UserRole.ADMIN_AGENCE and current_user.agency_id != agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit à cette agence.")

    query = select(Agency).where(Agency.id == agency_id, Agency.tenant_id == current_user.tenant_id)
    result = await db.execute(query)
    agency = result.scalar_one_or_none()

    if not agency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agence non trouvée.")

    update_data = agency_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agency, field, value)

    await db.commit()
    await db.refresh(agency)
    return agency

@router.delete("/{agency_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agency(
    agency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION]))
):
    """
    Supprime (ou désactive) une agence. Réservé au rôle DIRECTION.
    """
    query = select(Agency).where(Agency.id == agency_id, Agency.tenant_id == current_user.tenant_id)
    result = await db.execute(query)
    agency = result.scalar_one_or_none()

    if not agency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agence non trouvée.")

    await db.delete(agency)
    await db.commit()
    return None

