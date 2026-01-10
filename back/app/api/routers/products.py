from uuid import UUID

from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_db, get_current_user
from app.models import ProductCategory, User, UserRole
from app.schemas.product import (
    PaginatedProductsResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductListItem,
    BrandsResponse,
)
from app.services import product_service
from app.services.s3_service import upload_file_to_s3

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedProductsResponse)
async def list_products(
    search: str | None = Query(None, description="Recherche nom/marque/reference"),
    brand: str | None = Query(None, description="Filtre par marque"),
    category: ProductCategory | None = Query(None, description="Filtre par categorie"),
    module_code: str | None = Query(None, description="Filtre par code module CEE"),
    is_active: bool | None = Query(None, description="Filtre par statut actif"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str | None = Query("name", pattern="^(name|brand|price_ht|category|reference|created_at)$"),
    sort_dir: str | None = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedProductsResponse:
    """Liste paginee des produits du tenant."""
    items, total = await product_service.list_products(
        db,
        current_user,
        search=search,
        brand=brand,
        category=category,
        module_code=module_code,
        is_active=is_active,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return PaginatedProductsResponse(
        items=[ProductListItem.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/brands", response_model=BrandsResponse)
async def get_brands(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BrandsResponse:
    """Liste des marques uniques pour le tenant."""
    brands = await product_service.get_unique_brands(db, current_user)
    return BrandsResponse(brands=brands)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    """Recupere un produit par ID avec ses details."""
    product = await product_service.get_product(db, current_user, product_id)
    return _product_to_response(product)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ProductResponse:
    """Cree un nouveau produit. Roles autorises: DIRECTION, ADMIN_AGENCE."""
    product = await product_service.create_product(db, current_user, product_in)
    return _product_to_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ProductResponse:
    """Met a jour un produit existant."""
    product = await product_service.update_product(db, current_user, product_id, product_in)
    return _product_to_response(product)


@router.delete("/{product_id}", response_model=ProductResponse)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ProductResponse:
    """Desactive un produit (soft delete)."""
    product = await product_service.delete_product(db, current_user, product_id)
    return _product_to_response(product)


@router.post("/{product_id}/restore", response_model=ProductResponse)
async def restore_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ProductResponse:
    """Reactive un produit desactive."""
    product = await product_service.restore_product(db, current_user, product_id)
    return _product_to_response(product)


@router.post("/{product_id}/image", response_model=ProductResponse)
async def upload_product_image(
    product_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> ProductResponse:
    """Upload une image pour un produit."""
    product = await product_service.get_product(db, current_user, product_id)

    # Upload vers S3
    folder = f"tenants/{current_user.tenant_id}/products"
    image_url = upload_file_to_s3(file, folder)

    # Mettre a jour le produit
    from app.schemas.product import ProductUpdate
    product = await product_service.update_product(
        db, current_user, product_id, ProductUpdate(image_url=image_url)
    )
    return _product_to_response(product)


@router.post("/{product_id}/compatibility/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_compatibility(
    product_id: UUID,
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> None:
    """Ajoute une compatibilite entre deux produits."""
    await product_service.add_compatibility(db, current_user, product_id, target_id)


@router.delete("/{product_id}/compatibility/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_compatibility(
    product_id: UUID,
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.DIRECTION, UserRole.ADMIN_AGENCE])),
) -> None:
    """Supprime une compatibilite entre deux produits."""
    await product_service.remove_compatibility(db, current_user, product_id, target_id)


def _product_to_response(product) -> ProductResponse:
    """Convertit un produit SQLAlchemy en reponse Pydantic."""
    compatible_ids = [p.id for p in (product.compatible_products or [])]

    return ProductResponse(
        id=product.id,
        tenant_id=product.tenant_id,
        name=product.name,
        brand=product.brand,
        reference=product.reference,
        price_ht=product.price_ht,
        category=product.category,
        module_codes=product.module_codes,
        image_url=product.image_url,
        description=product.description,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
        heat_pump_details=product.heat_pump_details,
        thermostat_details=product.thermostat_details,
        compatible_product_ids=compatible_ids,
    )
