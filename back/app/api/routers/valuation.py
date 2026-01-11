"""
Router for CEE Valuations endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db
from app.models import User, UserRole
from app.schemas.cee_valuation import (
    CEEValuationResponse,
    CEEValuationsListResponse,
    CEEValuationsBulkUpdate,
    CEEValuationWithOperationResponse,
    CEEOperationSchema,
)
from app.services import valuation_service
from app.core.cee_operations import CEE_OPERATIONS

router = APIRouter(prefix="/valuation", tags=["CEE Valuation"])


@router.get("", response_model=CEEValuationsListResponse)
async def get_valuations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> CEEValuationsListResponse:
    """
    Recuperer toutes les valorisations CEE du tenant.
    Retourne la liste de toutes les operations avec leurs valeurs configurees.
    """
    items = await valuation_service.get_all_valuations(db, current_user)

    # Transformer en schema de reponse
    response_items = []
    for item in items:
        valuation_response = None
        if item["valuation"]:
            valuation_response = CEEValuationResponse.model_validate(item["valuation"])

        response_items.append(CEEValuationWithOperationResponse(
            operation=CEEOperationSchema(**item["operation"]),
            valuation=valuation_response,
        ))

    return CEEValuationsListResponse(items=response_items)


@router.post("", response_model=list[CEEValuationResponse])
async def save_valuations(
    data: CEEValuationsBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> list[CEEValuationResponse]:
    """
    Sauvegarder ou mettre a jour plusieurs valorisations CEE.
    Utilise un pattern upsert (create if not exists, update if exists).
    """
    try:
        valuations = await valuation_service.bulk_upsert_valuations(
            db, current_user, data.valuations
        )
        return [CEEValuationResponse.model_validate(v) for v in valuations]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/operations", response_model=list[CEEOperationSchema])
async def get_operations(
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> list[CEEOperationSchema]:
    """
    Recuperer la liste des operations CEE supportees.
    """
    return [
        CEEOperationSchema(
            code=op.code,
            name=op.name,
            description=op.description,
            category=op.category.value,
        )
        for op in CEE_OPERATIONS
    ]
