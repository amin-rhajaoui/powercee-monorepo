"""add_climate_fields

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-01-09 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l2m3n4o5p6q7'
down_revision: Union[str, Sequence[str], None] = 'k1l2m3n4o5p6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add base_temperature and zone_climatique to properties, and zone_climatique to folders."""
    # Ajouter base_temperature à properties
    op.add_column('properties', sa.Column('base_temperature', sa.Float(), nullable=True))
    
    # Ajouter zone_climatique à properties
    op.add_column('properties', sa.Column('zone_climatique', sa.String(10), nullable=True))
    
    # Ajouter zone_climatique à folders
    op.add_column('folders', sa.Column('zone_climatique', sa.String(10), nullable=True))


def downgrade() -> None:
    """Remove climate fields from properties and folders."""
    op.drop_column('folders', 'zone_climatique')
    op.drop_column('properties', 'zone_climatique')
    op.drop_column('properties', 'base_temperature')
