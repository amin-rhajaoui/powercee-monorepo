"""
Service pour la gestion des projets de rénovation (BAR-TH-175).

Ce service gère les opérations CRUD sur les projets ainsi que les opérations
spécifiques comme la création en masse d'appartements et la propagation d'audits.
"""

from datetime import datetime, timezone
from typing import List, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.module_draft import ModuleDraft
from app.models.project import Project, ProjectStatus
from app.models.user import User
from app.schemas.project import (
    BulkDraftsCreate,
    ProjectCreate,
    ProjectUpdate,
    PropagateAuditRequest,
)
from app.services import module_draft_service


# ============================================================================
# CRUD Operations
# ============================================================================


async def create_project(
    db: AsyncSession,
    user: User,
    project_data: ProjectCreate,
) -> Project:
    """
    Créer un nouveau projet avec isolation multi-tenant.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_data: Données du projet à créer

    Returns:
        Project créé
    """
    project = Project(
        tenant_id=user.tenant_id,
        client_id=project_data.client_id,
        name=project_data.name,
        status=ProjectStatus.DRAFT,
        module_code=project_data.module_code,
        building_address=project_data.building_address,
        total_apartments=project_data.total_apartments,
        data=project_data.data,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def get_project(
    db: AsyncSession,
    user: User,
    project_id: UUID,
) -> Project | None:
    """
    Récupérer un projet par ID avec filtrage tenant_id.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet

    Returns:
        Project ou None si non trouvé
    """
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.tenant_id == user.tenant_id,
                Project.archived_at.is_(None),
            )
        )
    )
    return result.scalar_one_or_none()


async def update_project(
    db: AsyncSession,
    user: User,
    project_id: UUID,
    project_update: ProjectUpdate,
) -> Project | None:
    """
    Mettre à jour un projet avec filtrage tenant_id.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet
        project_update: Données de mise à jour

    Returns:
        Project mis à jour ou None si non trouvé
    """
    project = await get_project(db, user, project_id)
    if not project:
        return None

    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


async def list_projects(
    db: AsyncSession,
    user: User,
    client_id: UUID | None = None,
    status_filter: ProjectStatus | None = None,
    module_code: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> Tuple[List[Project], int]:
    """
    Lister les projets avec filtrage tenant_id et pagination.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        client_id: Filtre par client (optionnel)
        status_filter: Filtre par statut (optionnel)
        module_code: Filtre par code module (optionnel)
        page: Numéro de page
        page_size: Taille de page

    Returns:
        Tuple (liste de projets, total)
    """
    conditions = [
        Project.tenant_id == user.tenant_id,
        Project.archived_at.is_(None),
    ]

    if client_id:
        conditions.append(Project.client_id == client_id)
    if status_filter:
        conditions.append(Project.status == status_filter)
    if module_code:
        conditions.append(Project.module_code == module_code)

    # Compter le total
    count_result = await db.execute(
        select(func.count()).select_from(Project).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    # Récupérer les items paginés
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Project)
        .where(and_(*conditions))
        .order_by(Project.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return list(items), total


async def delete_project(
    db: AsyncSession,
    user: User,
    project_id: UUID,
) -> bool:
    """
    Supprimer un projet (soft delete) avec filtrage tenant_id.

    Note: Les ModuleDrafts liés seront également soft-deleted via CASCADE.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet

    Returns:
        True si supprimé, False si non trouvé
    """
    project = await get_project(db, user, project_id)
    if not project:
        return False

    project.archived_at = datetime.now(timezone.utc)
    project.status = ProjectStatus.ARCHIVED

    # Soft delete les ModuleDrafts associés
    result = await db.execute(
        select(ModuleDraft).where(
            and_(
                ModuleDraft.project_id == project_id,
                ModuleDraft.tenant_id == user.tenant_id,
                ModuleDraft.archived_at.is_(None),
            )
        )
    )
    drafts = result.scalars().all()
    for draft in drafts:
        draft.archived_at = datetime.now(timezone.utc)

    await db.commit()
    return True


# ============================================================================
# Opérations spécifiques BAR-TH-175
# ============================================================================


async def bulk_create_drafts(
    db: AsyncSession,
    user: User,
    project_id: UUID,
    bulk_data: BulkDraftsCreate,
) -> List[ModuleDraft]:
    """
    Créer plusieurs ModuleDrafts (appartements) en masse pour un projet.

    Cette opération est optimisée pour créer rapidement de nombreux
    appartements avec des données communes.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet parent
        bulk_data: Données de création en masse

    Returns:
        Liste des ModuleDrafts créés

    Raises:
        HTTPException: Si le projet n'existe pas
    """
    # Vérifier que le projet existe
    project = await get_project(db, user, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    drafts: List[ModuleDraft] = []

    for i in range(bulk_data.quantity):
        draft = ModuleDraft(
            tenant_id=user.tenant_id,
            project_id=project_id,
            module_code="BAR-TH-175",
            client_id=project.client_id,
            current_step=1,
            data={
                "apartment_type": bulk_data.apartment_type,
                "apartment_number": i + 1,
                **bulk_data.common_data,
            },
        )
        db.add(draft)
        drafts.append(draft)

    await db.commit()

    # Refresh tous les drafts pour avoir les IDs générés
    for draft in drafts:
        await db.refresh(draft)

    # Mettre à jour le nombre total d'appartements du projet si non défini
    if project.total_apartments is None:
        # Compter tous les drafts du projet
        count_result = await db.execute(
            select(func.count())
            .select_from(ModuleDraft)
            .where(
                and_(
                    ModuleDraft.project_id == project_id,
                    ModuleDraft.archived_at.is_(None),
                )
            )
        )
        project.total_apartments = count_result.scalar() or 0
        await db.commit()

    return drafts


async def propagate_audit(
    db: AsyncSession,
    user: User,
    project_id: UUID,
    request: PropagateAuditRequest,
) -> Tuple[List[ModuleDraft], List[UUID]]:
    """
    Propager les données d'audit d'un draft source vers plusieurs drafts cibles.

    Permet d'appliquer les mêmes données d'audit (ex: scénario de travaux,
    classes énergétiques) à plusieurs appartements similaires.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet
        request: Données de propagation (source, cibles, champs)

    Returns:
        Tuple (liste des drafts mis à jour, liste des IDs non trouvés/ignorés)

    Raises:
        HTTPException: Si le projet ou le draft source n'existe pas
    """
    # Vérifier que le projet existe
    project = await get_project(db, user, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    # Récupérer le draft source
    source = await module_draft_service.get_draft(db, user, request.source_draft_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft source introuvable.",
        )

    if source.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le draft source n'appartient pas à ce projet.",
        )

    # Déterminer les données à propager
    source_data = source.data or {}

    if request.fields_to_propagate:
        # Propager uniquement les champs spécifiés
        propagate_data = {
            k: source_data[k]
            for k in request.fields_to_propagate
            if k in source_data
        }
    else:
        # Propager toutes les données (sauf apartment_number pour garder l'unicité)
        propagate_data = {
            k: v for k, v in source_data.items() if k != "apartment_number"
        }

    updated_drafts: List[ModuleDraft] = []
    skipped_ids: List[UUID] = []

    for target_id in request.target_draft_ids:
        # Ne pas propager sur soi-même
        if target_id == request.source_draft_id:
            skipped_ids.append(target_id)
            continue

        target = await module_draft_service.get_draft(db, user, target_id)

        if not target:
            skipped_ids.append(target_id)
            continue

        if target.project_id != project_id:
            skipped_ids.append(target_id)
            continue

        # Fusionner les données (les nouvelles écrasent les anciennes)
        target.data = {**(target.data or {}), **propagate_data}
        updated_drafts.append(target)

    await db.commit()

    # Refresh les drafts mis à jour
    for draft in updated_drafts:
        await db.refresh(draft)

    return updated_drafts, skipped_ids


async def get_project_drafts(
    db: AsyncSession,
    user: User,
    project_id: UUID,
    apartment_type: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[ModuleDraft], int]:
    """
    Récupérer tous les drafts (appartements) d'un projet.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet
        apartment_type: Filtre par type d'appartement (optionnel)
        page: Numéro de page
        page_size: Taille de page

    Returns:
        Tuple (liste de drafts, total)
    """
    conditions = [
        ModuleDraft.project_id == project_id,
        ModuleDraft.tenant_id == user.tenant_id,
        ModuleDraft.archived_at.is_(None),
    ]

    # Compter le total
    count_result = await db.execute(
        select(func.count()).select_from(ModuleDraft).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    # Récupérer les items paginés
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ModuleDraft)
        .where(and_(*conditions))
        .order_by(ModuleDraft.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    # Filtrer par apartment_type si spécifié (filtrage en Python car c'est dans JSONB)
    if apartment_type:
        items = [
            item for item in items
            if item.data and item.data.get("apartment_type") == apartment_type
        ]

    return list(items), total


async def get_project_stats(
    db: AsyncSession,
    user: User,
    project_id: UUID,
) -> dict:
    """
    Récupérer les statistiques d'un projet.

    Args:
        db: Session de base de données
        user: Utilisateur authentifié
        project_id: ID du projet

    Returns:
        Dictionnaire avec les statistiques du projet

    Raises:
        HTTPException: Si le projet n'existe pas
    """
    project = await get_project(db, user, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    # Compter les drafts
    count_result = await db.execute(
        select(func.count())
        .select_from(ModuleDraft)
        .where(
            and_(
                ModuleDraft.project_id == project_id,
                ModuleDraft.tenant_id == user.tenant_id,
                ModuleDraft.archived_at.is_(None),
            )
        )
    )
    total_drafts = count_result.scalar() or 0

    return {
        "project_id": project_id,
        "project_name": project.name,
        "status": project.status.value,
        "total_apartments": project.total_apartments or total_drafts,
        "drafts_count": total_drafts,
        "client_id": project.client_id,
        "building_address": project.building_address,
    }
