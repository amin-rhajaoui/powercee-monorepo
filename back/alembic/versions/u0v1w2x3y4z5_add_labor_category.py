"""Add LABOR category and make brand/reference nullable.

Revision ID: u0v1w2x3y4z5
Revises: t9u0v1w2x3y4
Create Date: 2026-01-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "u0v1w2x3y4z5"
down_revision: Union[str, Sequence[str], None] = "t9u0v1w2x3y4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add LABOR to product_category enum and make brand/reference nullable."""

    # Step 1: Add LABOR value to the product_category enum
    op.execute(sa.text("ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'LABOR';"))

    # Step 2: Make brand column nullable
    op.alter_column(
        "products",
        "brand",
        existing_type=sa.String(255),
        nullable=True,
    )

    # Step 3: Make reference column nullable
    op.alter_column(
        "products",
        "reference",
        existing_type=sa.String(255),
        nullable=True,
    )


def downgrade() -> None:
    """Revert changes - make brand/reference non-nullable.

    Note: Removing an enum value in PostgreSQL is complex and not recommended.
    We only revert the nullable changes.
    """
    # First, ensure no NULL values exist (set to empty string if needed)
    op.execute(
        sa.text("""
        UPDATE products SET brand = '' WHERE brand IS NULL;
        UPDATE products SET reference = '' WHERE reference IS NULL;
    """)
    )

    # Make columns non-nullable again
    op.alter_column(
        "products",
        "brand",
        existing_type=sa.String(255),
        nullable=False,
    )

    op.alter_column(
        "products",
        "reference",
        existing_type=sa.String(255),
        nullable=False,
    )
