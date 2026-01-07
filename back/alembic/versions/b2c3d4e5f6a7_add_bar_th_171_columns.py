"""add_bar_th_171_columns

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add BAR-TH-171 specific columns to module_drafts table."""
    op.add_column('module_drafts', sa.Column('is_principal_residence', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('occupation_status', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('heating_system', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('old_boiler_brand', sa.String(length=100), nullable=True))
    op.add_column('module_drafts', sa.Column('is_water_heating_linked', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('water_heating_type', sa.String(length=50), nullable=True))
    op.add_column('module_drafts', sa.Column('electrical_phase', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('power_kva', sa.Float(), nullable=True))


def downgrade() -> None:
    """Remove BAR-TH-171 specific columns from module_drafts table."""
    op.drop_column('module_drafts', 'power_kva')
    op.drop_column('module_drafts', 'electrical_phase')
    op.drop_column('module_drafts', 'water_heating_type')
    op.drop_column('module_drafts', 'is_water_heating_linked')
    op.drop_column('module_drafts', 'old_boiler_brand')
    op.drop_column('module_drafts', 'heating_system')
    op.drop_column('module_drafts', 'occupation_status')
    op.drop_column('module_drafts', 'is_principal_residence')
