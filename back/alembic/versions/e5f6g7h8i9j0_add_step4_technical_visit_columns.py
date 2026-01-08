"""add_step4_technical_visit_columns

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-01-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Step 4 Visite Technique columns to module_drafts table for BAR-TH-171."""
    # Chauffage
    op.add_column('module_drafts', sa.Column('nb_levels', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('avg_ceiling_height', sa.Float(), nullable=True))
    op.add_column('module_drafts', sa.Column('target_temperature', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('emitters_configuration', JSONB(), nullable=True))

    # Enveloppe - Combles
    op.add_column('module_drafts', sa.Column('attic_type', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('is_attic_isolated', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('attic_isolation_year', sa.Integer(), nullable=True))

    # Enveloppe - Plancher bas
    op.add_column('module_drafts', sa.Column('floor_type', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('is_floor_isolated', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('floor_isolation_year', sa.Integer(), nullable=True))

    # Enveloppe - Murs
    op.add_column('module_drafts', sa.Column('wall_isolation_type', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('wall_isolation_year_interior', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('wall_isolation_year_exterior', sa.Integer(), nullable=True))

    # Menuiseries
    op.add_column('module_drafts', sa.Column('joinery_type', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove Step 4 Visite Technique columns from module_drafts table."""
    op.drop_column('module_drafts', 'joinery_type')
    op.drop_column('module_drafts', 'wall_isolation_year_exterior')
    op.drop_column('module_drafts', 'wall_isolation_year_interior')
    op.drop_column('module_drafts', 'wall_isolation_type')
    op.drop_column('module_drafts', 'floor_isolation_year')
    op.drop_column('module_drafts', 'is_floor_isolated')
    op.drop_column('module_drafts', 'floor_type')
    op.drop_column('module_drafts', 'attic_isolation_year')
    op.drop_column('module_drafts', 'is_attic_isolated')
    op.drop_column('module_drafts', 'attic_type')
    op.drop_column('module_drafts', 'emitters_configuration')
    op.drop_column('module_drafts', 'target_temperature')
    op.drop_column('module_drafts', 'avg_ceiling_height')
    op.drop_column('module_drafts', 'nb_levels')
