"""add_property_altitude

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-01-09 12:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h8i9j0k1l2m3'
down_revision: Union[str, Sequence[str], None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add altitude column to properties table."""
    op.add_column('properties', sa.Column('altitude', sa.Float(), nullable=True))


def downgrade() -> None:
    """Remove altitude column from properties table."""
    op.drop_column('properties', 'altitude')
