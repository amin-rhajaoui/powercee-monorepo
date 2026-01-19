import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Product, ProductCategory, User, UserRole
from app.models.product import ProductHeatPump, ProductThermostat, ProductCompatibility
from app.schemas.product import ProductCreate, ProductUpdate

logger = logging.getLogger(__name__)


def _base_scoped_query(current_user: User):
    """Construit une requete de base filtree par tenant."""
    return select(Product).where(Product.tenant_id == current_user.tenant_id)


async def list_products(
    db: AsyncSession,
    current_user: User,
    *,
    search: str | None = None,
    brand: str | None = None,
    category: ProductCategory | None = None,
    module_code: str | None = None,
    is_active: bool | None = None,
    page: int,
    page_size: int,
    sort_by: str | None = None,
    sort_dir: str | None = None,
):
    """Retourne une liste paginee de produits selon les filtres."""
    query = _base_scoped_query(current_user)

    # Filtre par recherche (nom, marque, reference)
    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            func.lower(Product.name).ilike(pattern)
            | func.coalesce(func.lower(Product.brand), "").ilike(pattern)
            | func.coalesce(func.lower(Product.reference), "").ilike(pattern)
        )

    # Filtre par marque
    if brand:
        query = query.where(func.lower(Product.brand) == brand.lower())

    # Filtre par categorie
    if category:
        query = query.where(Product.category == category)

    # Filtre par module CEE
    if module_code:
        query = query.where(Product.module_codes.contains([module_code]))

    # Filtre par statut actif
    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    # Tri securise sur whitelist
    sort_column_map = {
        "name": Product.name,
        "brand": Product.brand,
        "price_ht": Product.price_ht,
        "category": Product.category,
        "reference": Product.reference,
        "created_at": Product.created_at,
    }
    order_expr = Product.name.asc()
    if sort_by and sort_by in sort_column_map:
        col = sort_column_map[sort_by]
        order_expr = col.desc() if sort_dir == "desc" else col.asc()
    query = query.order_by(order_expr)

    # Compter le total
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return items, total


async def get_product(
    db: AsyncSession,
    current_user: User,
    product_id: UUID,
) -> Product:
    """Recupere un produit avec ses details imbriques."""
    query = (
        _base_scoped_query(current_user)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.heat_pump_details),
            selectinload(Product.thermostat_details),
            selectinload(Product.compatible_products),
        )
    )
    product = (await db.execute(query)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable.")
    return product


async def get_product_by_reference(
    db: AsyncSession,
    tenant_id: UUID,
    reference: str,
) -> Product | None:
    """Recupere un produit par sa reference (pour le seed)."""
    query = select(Product).where(
        Product.tenant_id == tenant_id,
        Product.reference == reference,
    )
    return (await db.execute(query)).scalar_one_or_none()


async def create_product(
    db: AsyncSession,
    current_user: User,
    product_in: ProductCreate,
) -> Product:
    """Cree un nouveau produit avec ses details optionnels."""
    # Verifier que seuls les roles autorises peuvent creer
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes pour creer un produit.",
        )

    # Creer le produit principal
    product_data = product_in.model_dump(
        exclude={"heat_pump_details", "thermostat_details", "compatible_product_ids"}
    )
    product = Product(
        **product_data,
        tenant_id=current_user.tenant_id,
    )
    db.add(product)
    await db.flush()

    # Creer les details PAC si fournis et categorie correspondante
    if product_in.heat_pump_details and product_in.category == ProductCategory.HEAT_PUMP:
        hp_details = ProductHeatPump(
            product_id=product.id,
            **product_in.heat_pump_details.model_dump(),
        )
        db.add(hp_details)

    # Creer les details thermostat si fournis et categorie correspondante
    if product_in.thermostat_details and product_in.category == ProductCategory.THERMOSTAT:
        thermo_details = ProductThermostat(
            product_id=product.id,
            **product_in.thermostat_details.model_dump(),
        )
        db.add(thermo_details)

    # Ajouter les compatibilites
    if product_in.compatible_product_ids:
        for target_id in product_in.compatible_product_ids:
            # Verifier que le produit cible existe et appartient au meme tenant
            target = await db.get(Product, target_id)
            if target and target.tenant_id == current_user.tenant_id:
                compatibility = ProductCompatibility(
                    source_product_id=product.id,
                    target_product_id=target_id,
                )
                db.add(compatibility)

    await db.commit()
    await db.refresh(product)

    # Recharger avec les relations
    return await get_product(db, current_user, product.id)


async def update_product(
    db: AsyncSession,
    current_user: User,
    product_id: UUID,
    product_in: ProductUpdate,
) -> Product:
    """Met a jour un produit existant."""
    # Verifier que seuls les roles autorises peuvent modifier
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes pour modifier un produit.",
        )

    product = await get_product(db, current_user, product_id)

    # Mettre a jour les champs principaux
    update_data = product_in.model_dump(
        exclude={"heat_pump_details", "thermostat_details", "compatible_product_ids"},
        exclude_unset=True,
    )
    for field, value in update_data.items():
        setattr(product, field, value)

    # Gerer les details PAC
    if product_in.heat_pump_details is not None:
        category = product_in.category or product.category
        if category == ProductCategory.HEAT_PUMP:
            if product.heat_pump_details:
                # Mettre a jour
                for field, value in product_in.heat_pump_details.model_dump().items():
                    setattr(product.heat_pump_details, field, value)
            else:
                # Creer
                hp_details = ProductHeatPump(
                    product_id=product.id,
                    **product_in.heat_pump_details.model_dump(),
                )
                db.add(hp_details)

    # Gerer les details thermostat
    if product_in.thermostat_details is not None:
        category = product_in.category or product.category
        if category == ProductCategory.THERMOSTAT:
            if product.thermostat_details:
                # Mettre a jour
                for field, value in product_in.thermostat_details.model_dump().items():
                    setattr(product.thermostat_details, field, value)
            else:
                # Creer
                thermo_details = ProductThermostat(
                    product_id=product.id,
                    **product_in.thermostat_details.model_dump(),
                )
                db.add(thermo_details)

    # Gerer les compatibilites
    if product_in.compatible_product_ids is not None:
        # Supprimer les anciennes compatibilites
        await db.execute(
            ProductCompatibility.__table__.delete().where(
                ProductCompatibility.source_product_id == product.id
            )
        )
        # Ajouter les nouvelles
        for target_id in product_in.compatible_product_ids:
            target = await db.get(Product, target_id)
            if target and target.tenant_id == current_user.tenant_id:
                compatibility = ProductCompatibility(
                    source_product_id=product.id,
                    target_product_id=target_id,
                )
                db.add(compatibility)

    product.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(product)

    return await get_product(db, current_user, product.id)


async def delete_product(
    db: AsyncSession,
    current_user: User,
    product_id: UUID,
) -> Product:
    """Desactive un produit (soft delete)."""
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes pour desactiver un produit.",
        )

    product = await get_product(db, current_user, product_id)
    product.is_active = False
    product.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(product)
    return product


async def restore_product(
    db: AsyncSession,
    current_user: User,
    product_id: UUID,
) -> Product:
    """Reactive un produit desactive."""
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes pour reactiver un produit.",
        )

    product = await get_product(db, current_user, product_id)
    product.is_active = True
    product.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(product)
    return product


async def get_unique_brands(
    db: AsyncSession,
    current_user: User,
) -> list[str]:
    """Retourne la liste des marques uniques pour ce tenant."""
    query = (
        select(distinct(Product.brand))
        .where(Product.tenant_id == current_user.tenant_id)
        .where(Product.is_active == True)
        .where(Product.brand.isnot(None))
        .order_by(Product.brand)
    )
    result = await db.execute(query)
    return [row[0] for row in result.all()]


async def add_compatibility(
    db: AsyncSession,
    current_user: User,
    source_product_id: UUID,
    target_product_id: UUID,
) -> None:
    """Ajoute une compatibilite entre deux produits."""
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes.",
        )

    # Verifier que les deux produits existent et appartiennent au tenant
    source = await get_product(db, current_user, source_product_id)
    target = await get_product(db, current_user, target_product_id)

    if source.tenant_id != target.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les produits doivent appartenir au meme tenant.",
        )

    # Verifier si la compatibilite existe deja
    existing = await db.execute(
        select(ProductCompatibility).where(
            ProductCompatibility.source_product_id == source_product_id,
            ProductCompatibility.target_product_id == target_product_id,
        )
    )
    if existing.scalar_one_or_none():
        return  # Deja existante

    compatibility = ProductCompatibility(
        source_product_id=source_product_id,
        target_product_id=target_product_id,
    )
    db.add(compatibility)
    await db.commit()


async def remove_compatibility(
    db: AsyncSession,
    current_user: User,
    source_product_id: UUID,
    target_product_id: UUID,
) -> None:
    """Supprime une compatibilite entre deux produits."""
    if current_user.role not in [UserRole.DIRECTION, UserRole.ADMIN_AGENCE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes.",
        )

    await db.execute(
        ProductCompatibility.__table__.delete().where(
            ProductCompatibility.source_product_id == source_product_id,
            ProductCompatibility.target_product_id == target_product_id,
        )
    )
    await db.commit()
