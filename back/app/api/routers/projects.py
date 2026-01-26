"""
Routeur API pour la gestion des projets de rénovation (BAR-TH-175).

Ce routeur expose les endpoints pour :
- CRUD sur les projets
- Création en masse d'appartements
- Propagation d'audit entre appartements
- Validation d'éligibilité BAR-TH-175
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.models.project import ProjectStatus
from app.schemas.bar_th_175 import BarTh175ValidationResult
from app.schemas.module_draft import ModuleDraftResponse, PaginatedModuleDraftsResponse
from app.schemas.project import (
    BulkDraftsCreate,
    BulkDraftsResponse,
    PaginatedProjectsResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    PropagateAuditRequest,
    PropagateAuditResponse,
)
from app.services import bar_th_175_service, module_draft_service, project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


# ============================================================================
# CRUD Endpoints
# ============================================================================


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> ProjectResponse:
    """
    Créer un nouveau projet de rénovation.

    Un projet regroupe plusieurs appartements (ModuleDrafts) pour un même immeuble.
    Typiquement utilisé pour les bailleurs sociaux (BAR-TH-175).
    """
    project = await project_service.create_project(db, current_user, project_data)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> ProjectResponse:
    """Récupérer un projet par son ID."""
    project = await project_service.get_project(db, current_user, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )
    return ProjectResponse.model_validate(project)


@router.get("", response_model=PaginatedProjectsResponse)
async def list_projects(
    client_id: UUID | None = Query(None, description="Filtre par client (bailleur)"),
    status_filter: ProjectStatus | None = Query(None, alias="status", description="Filtre par statut"),
    module_code: str | None = Query(None, description="Filtre par code module"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> PaginatedProjectsResponse:
    """Lister les projets avec pagination et filtres."""
    items, total = await project_service.list_projects(
        db,
        current_user,
        client_id=client_id,
        status_filter=status_filter,
        module_code=module_code,
        page=page,
        page_size=page_size,
    )
    return PaginatedProjectsResponse(
        items=[ProjectResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> ProjectResponse:
    """Mettre à jour un projet."""
    project = await project_service.update_project(
        db, current_user, project_id, project_update
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> None:
    """
    Supprimer un projet (soft delete).

    Les ModuleDrafts associés seront également archivés.
    """
    success = await project_service.delete_project(db, current_user, project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )


# ============================================================================
# Opérations sur les appartements (ModuleDrafts)
# ============================================================================


@router.post(
    "/{project_id}/bulk-drafts",
    response_model=BulkDraftsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def bulk_create_drafts(
    project_id: UUID,
    bulk_data: BulkDraftsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> BulkDraftsResponse:
    """
    Créer plusieurs appartements (ModuleDrafts) en masse pour un projet.

    Idéal pour initialiser rapidement un projet avec de nombreux appartements
    du même type (ex: 35 T3, 15 T2, etc.).
    """
    drafts = await project_service.bulk_create_drafts(
        db, current_user, project_id, bulk_data
    )
    return BulkDraftsResponse(
        created_count=len(drafts),
        project_id=project_id,
        draft_ids=[draft.id for draft in drafts],
    )


@router.get("/{project_id}/drafts", response_model=PaginatedModuleDraftsResponse)
async def get_project_drafts(
    project_id: UUID,
    apartment_type: str | None = Query(None, description="Filtre par type (T1, T2, etc.)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> PaginatedModuleDraftsResponse:
    """
    Récupérer tous les appartements (ModuleDrafts) d'un projet.

    Permet de lister tous les appartements d'un immeuble avec pagination.
    """
    items, total = await project_service.get_project_drafts(
        db,
        current_user,
        project_id,
        apartment_type=apartment_type,
        page=page,
        page_size=page_size,
    )
    return PaginatedModuleDraftsResponse(
        items=[ModuleDraftResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> dict:
    """
    Récupérer les statistiques d'un projet.

    Retourne des informations agrégées sur le projet : nombre d'appartements,
    statut, adresse, etc.
    """
    return await project_service.get_project_stats(db, current_user, project_id)


# ============================================================================
# Propagation d'audit
# ============================================================================


@router.patch("/{project_id}/propagate-audit", response_model=PropagateAuditResponse)
async def propagate_audit(
    project_id: UUID,
    request: PropagateAuditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> PropagateAuditResponse:
    """
    Propager les données d'audit d'un appartement vers d'autres.

    Permet de copier les résultats d'audit (classe énergétique, scénario de travaux,
    isolation, etc.) d'un appartement de référence vers plusieurs appartements similaires.

    Utile pour les immeubles avec des appartements identiques où un seul audit
    suffit pour tous les logements du même type.
    """
    updated_drafts, skipped_ids = await project_service.propagate_audit(
        db, current_user, project_id, request
    )
    return PropagateAuditResponse(
        updated_count=len(updated_drafts),
        updated_draft_ids=[draft.id for draft in updated_drafts],
        skipped_draft_ids=skipped_ids,
    )


# ============================================================================
# Validation d'éligibilité BAR-TH-175
# ============================================================================


@router.post(
    "/{project_id}/drafts/{draft_id}/validate",
    response_model=BarTh175ValidationResult,
)
async def validate_draft_eligibility(
    project_id: UUID,
    draft_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE, UserRole.COMMERCIAL])
    ),
) -> BarTh175ValidationResult:
    """
    Valider l'éligibilité BAR-TH-175 d'un appartement.

    Vérifie les 4 règles d'éligibilité :
    1. Saut de classe énergétique >= 2 classes
    2. Au moins 2 postes d'isolation avec >= 25% de couverture chacun
    3. Émissions GES après travaux <= émissions initiales
    4. Chauffage : nouveau <= 150 gCO2eq/kWh, conservé <= 300 gCO2eq/kWh

    Retourne un résultat détaillé avec les erreurs et avertissements.
    """
    # Vérifier que le projet existe
    project = await project_service.get_project(db, current_user, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    # Récupérer le draft
    draft = await module_draft_service.get_draft(db, current_user, draft_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appartement (draft) introuvable.",
        )

    # Vérifier que le draft appartient au projet
    if draft.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet appartement n'appartient pas au projet spécifié.",
        )

    # Valider l'éligibilité
    try:
        result = bar_th_175_service.validate_eligibility_from_dict(draft.data or {})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Données d'audit invalides ou incomplètes : {str(e)}",
        )

    return result
