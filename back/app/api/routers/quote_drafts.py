from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import List

from app.api.deps import get_db, get_current_user
from app.models import User, QuoteDraft
from app.schemas.quote_draft import (
    QuoteDraftCreate,
    QuoteDraftUpdate,
    QuoteDraftResponse,
    QuoteDraftListResponse,
)

router = APIRouter(prefix="/quote-drafts", tags=["Quote Drafts"])


@router.get("", response_model=QuoteDraftListResponse)
async def list_quote_drafts(
    folder_id: UUID = Query(..., description="ID du dossier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Liste les brouillons de devis d'un dossier.
    Filtré automatiquement par tenant.
    """
    # Requête pour récupérer les brouillons avec pagination
    query = select(QuoteDraft).where(
        QuoteDraft.folder_id == folder_id,
        QuoteDraft.tenant_id == current_user.tenant_id
    ).order_by(QuoteDraft.updated_at.desc())
    
    # Compte total
    count_query = select(func.count()).select_from(QuoteDraft).where(
        QuoteDraft.folder_id == folder_id,
        QuoteDraft.tenant_id == current_user.tenant_id
    )
    
    result = await db.execute(query)
    count_result = await db.execute(count_query)
    
    drafts = result.scalars().all()
    total = count_result.scalar_one()
    
    return QuoteDraftListResponse(drafts=drafts, total=total)


@router.post("", response_model=QuoteDraftResponse, status_code=status.HTTP_201_CREATED)
async def create_quote_draft(
    draft_in: QuoteDraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crée un nouveau brouillon de devis.
    """
    # Convertir les lignes en dict pour JSONB
    lines_dict = [line.model_dump() for line in draft_in.lines]
    
    draft = QuoteDraft(
        name=draft_in.name,
        folder_id=draft_in.folder_id,
        module_code=draft_in.module_code,
        product_ids=draft_in.product_ids,
        lines=lines_dict,
        total_ht=draft_in.total_ht,
        total_ttc=draft_in.total_ttc,
        rac_ttc=draft_in.rac_ttc,
        cee_prime=draft_in.cee_prime,
        margin_ht=draft_in.margin_ht,
        margin_percent=draft_in.margin_percent,
        strategy_used=draft_in.strategy_used,
        warnings=draft_in.warnings,
        tenant_id=current_user.tenant_id,
    )
    
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


@router.get("/{draft_id}", response_model=QuoteDraftResponse)
async def get_quote_draft(
    draft_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Récupère un brouillon de devis spécifique.
    Vérifie l'appartenance au tenant.
    """
    query = select(QuoteDraft).where(
        QuoteDraft.id == draft_id,
        QuoteDraft.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon de devis non trouvé."
        )

    return draft


@router.put("/{draft_id}", response_model=QuoteDraftResponse)
async def update_quote_draft(
    draft_id: UUID,
    draft_in: QuoteDraftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Met à jour un brouillon de devis.
    """
    query = select(QuoteDraft).where(
        QuoteDraft.id == draft_id,
        QuoteDraft.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon de devis non trouvé."
        )

    update_data = draft_in.model_dump(exclude_unset=True)
    
    # Convertir les lignes en dict si présentes
    if "lines" in update_data and update_data["lines"] is not None:
        update_data["lines"] = [line.model_dump() for line in draft_in.lines]
    
    for field, value in update_data.items():
        setattr(draft, field, value)

    await db.commit()
    await db.refresh(draft)
    return draft


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote_draft(
    draft_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Supprime un brouillon de devis.
    """
    query = select(QuoteDraft).where(
        QuoteDraft.id == draft_id,
        QuoteDraft.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon de devis non trouvé."
        )

    await db.delete(draft)
    await db.commit()
    return None
