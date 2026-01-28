"""
Router for Quote simulation endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_current_user, get_db
from app.models import User, UserRole
from app.schemas.quote import (
    QuoteSimulationRequest,
    QuotePreviewResponse,
    QuoteLine as QuoteLineSchema,
)
from app.services.pricing import PricingService, PricingError
from app.core.exceptions import ValuationMissingError

router = APIRouter(prefix="/quote", tags=["Quote"])


@router.post("/modules/{module_code}/simulate", response_model=QuotePreviewResponse)
async def simulate_quote(
    module_code: str,
    data: QuoteSimulationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotePreviewResponse:
    """
    Simuler un devis pour le mode CEE uniquement.

    Algorithme:
    1. Essaie d'appliquer les regles de grille (si activees)
    2. Sinon, applique la strategie cost-plus avec marge minimale
    3. Retourne les lignes du devis, totaux, et marge

    Args:
        module_code: Code du module CEE (ex: BAR-TH-171)
        data: Donnees de simulation (folder_id, product_ids, target_rac optionnel)

    Returns:
        QuotePreviewResponse avec lignes editables et calculs
    """
    pricing_service = PricingService()

    try:
        result = await pricing_service.simulate_quote(
            db=db,
            tenant_id=current_user.tenant_id,
            folder_id=data.folder_id,
            product_ids=data.product_ids,
            target_rac=data.target_rac,
            module_code=module_code,
        )

        # Convertir en schema de reponse
        lines = [
            QuoteLineSchema(
                product_id=line.product_id,
                title=line.title,
                description=line.description,
                quantity=line.quantity,
                unit_price_ht=round(line.unit_price_ht, 2),
                tva_rate=line.tva_rate,
                total_ht=round(line.total_ht, 2),
                total_ttc=round(line.total_ttc, 2),
                is_editable=line.is_editable,
            )
            for line in result.lines
        ]

        return QuotePreviewResponse(
            lines=lines,
            total_ht=round(result.total_ht, 2),
            total_ttc=round(result.total_ttc, 2),
            cee_prime=round(result.cee_prime, 2),
            rac_ttc=round(result.rac_ttc, 2),
            margin_ht=round(result.margin_ht, 2),
            margin_percent=round(result.margin_percent, 2),
            strategy_used=result.strategy_used,
            warnings=result.warnings,
            has_percentage_distribution=result.has_percentage_distribution,
        )

    except ValuationMissingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Valorisation CEE non configuree pour l'operation {e.operation_code}. "
                   f"Veuillez configurer les prix de valorisation dans les parametres.",
        )
    except PricingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la simulation: {str(e)}",
        )
