"""add_product_type_and_buying_price

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-01-16 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'r8s9t0u1v2w3'
down_revision: Union[str, Sequence[str], None] = 'q7r8s9t0u1v2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add product_type enum and buying_price_ht to products table."""
    # Create enum type for product_type
    op.execute(sa.text("""
        CREATE TYPE product_type_enum AS ENUM ('MATERIAL', 'LABOR', 'SERVICE');
    """))

    # Add product_type column with default 'MATERIAL'
    op.execute(sa.text("""
        ALTER TABLE products
        ADD COLUMN product_type product_type_enum NOT NULL DEFAULT 'MATERIAL';
    """))

    # Add buying_price_ht column (cost price for margin calculation)
    op.execute(sa.text("""
        ALTER TABLE products
        ADD COLUMN buying_price_ht NUMERIC(10,2);
    """))

    # Create index on product_type for filtering
    op.execute(sa.text("CREATE INDEX idx_products_product_type ON products(product_type);"))


def downgrade() -> None:
    """Remove product_type and buying_price_ht from products table."""
    op.drop_index('idx_products_product_type', table_name='products')
    op.drop_column('products', 'buying_price_ht')
    op.drop_column('products', 'product_type')
    op.execute(sa.text("DROP TYPE product_type_enum;"))
