"""
Service for CEE Valuations CRUD operations.
"""
import logging
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cee_valuation import CEEValuation
from app.models.user import User
from app.schemas.cee_valuation import CEEValuationCreate
from app.core.cee_operations import (
    CEE_OPERATIONS,
    OperationCategory,
    get_operation_by_code,
)

logger = logging.getLogger(__name__)


async def get_all_valuations(
    db: AsyncSession,
    user: User,
) -> list[dict]:
    """
    Recuperer toutes les valorisations du tenant avec les infos des operations.
    Retourne une liste enrichie avec les operations meme si pas de valuation en base.
    """
    # Recuperer les valuations existantes
    result = await db.execute(
        select(CEEValuation).where(
            CEEValuation.tenant_id == user.tenant_id
        )
    )
    existing_valuations = {v.operation_code: v for v in result.scalars().all()}

    # Construire la reponse avec toutes les operations
    items = []
    for operation in CEE_OPERATIONS:
        valuation = existing_valuations.get(operation.code)
        items.append({
            "operation": {
                "code": operation.code,
                "name": operation.name,
                "description": operation.description,
                "category": operation.category.value,
            },
            "valuation": valuation,
        })

    return items


async def get_valuation_by_operation(
    db: AsyncSession,
    user: User,
    operation_code: str,
) -> CEEValuation | None:
    """Recuperer une valorisation par code operation."""
    result = await db.execute(
        select(CEEValuation).where(
            and_(
                CEEValuation.tenant_id == user.tenant_id,
                CEEValuation.operation_code == operation_code,
            )
        )
    )
    return result.scalar_one_or_none()


async def upsert_valuation(
    db: AsyncSession,
    user: User,
    data: CEEValuationCreate,
) -> CEEValuation:
    """
    Creer ou mettre a jour une valorisation (upsert).
    """
    # Verifier que l'operation existe
    operation = get_operation_by_code(data.operation_code)
    if not operation:
        raise ValueError(f"Operation inconnue: {data.operation_code}")

    # Chercher si existe deja
    existing = await get_valuation_by_operation(db, user, data.operation_code)

    if existing:
        # Update
        existing.is_residential = operation.category == OperationCategory.RESIDENTIAL
        existing.value_standard = data.value_standard
        existing.value_blue = data.value_blue
        existing.value_yellow = data.value_yellow
        existing.value_violet = data.value_violet
        existing.value_rose = data.value_rose
        await db.commit()
        await db.refresh(existing)
        logger.info(f"Updated valuation for {data.operation_code}")
        return existing
    else:
        # Create
        valuation = CEEValuation(
            tenant_id=user.tenant_id,
            operation_code=data.operation_code,
            is_residential=operation.category == OperationCategory.RESIDENTIAL,
            value_standard=data.value_standard,
            value_blue=data.value_blue,
            value_yellow=data.value_yellow,
            value_violet=data.value_violet,
            value_rose=data.value_rose,
        )
        db.add(valuation)
        await db.commit()
        await db.refresh(valuation)
        logger.info(f"Created valuation for {data.operation_code}")
        return valuation


async def bulk_upsert_valuations(
    db: AsyncSession,
    user: User,
    valuations: list[CEEValuationCreate],
) -> list[CEEValuation]:
    """
    Mettre a jour plusieurs valorisations en une seule transaction.
    """
    results = []
    for data in valuations:
        try:
            valuation = await upsert_valuation(db, user, data)
            results.append(valuation)
        except ValueError as e:
            logger.warning(f"Skipping invalid valuation: {e}")
            continue
    return results


async def delete_valuation(
    db: AsyncSession,
    user: User,
    operation_code: str,
) -> bool:
    """Supprimer une valorisation."""
    valuation = await get_valuation_by_operation(db, user, operation_code)
    if not valuation:
        return False

    await db.delete(valuation)
    await db.commit()
    logger.info(f"Deleted valuation for {operation_code}")
    return True
