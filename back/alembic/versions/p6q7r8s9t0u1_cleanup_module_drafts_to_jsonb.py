"""cleanup_module_drafts_to_jsonb

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-01-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p6q7r8s9t0u1'
down_revision: Union[str, Sequence[str], None] = 'o5p6q7r8s9t0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove all business-specific columns from module_drafts table.
    
    All business data is now stored in the JSONB 'data' column.
    Only infrastructure columns are kept: id, tenant_id, client_id, property_id,
    module_code, current_step, data, created_at, updated_at, archived_at.
    """
    # Step 4 columns (added in e5f6g7h8i9j0)
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
    
    # Step 3 columns (added in c3d4e5f6g7h8)
    op.drop_column('module_drafts', 'household_size')
    op.drop_column('module_drafts', 'reference_tax_income')
    op.drop_column('module_drafts', 'energy_bill_url')
    op.drop_column('module_drafts', 'property_proof_url')
    op.drop_column('module_drafts', 'address_proof_url')
    op.drop_column('module_drafts', 'tax_notice_url')
    
    # usage_mode column (added in d4e5f6g7h8i9)
    op.drop_column('module_drafts', 'usage_mode')
    
    # Step 2 columns (added in b2c3d4e5f6a7)
    op.drop_column('module_drafts', 'power_kva')
    op.drop_column('module_drafts', 'electrical_phase')
    op.drop_column('module_drafts', 'water_heating_type')
    op.drop_column('module_drafts', 'is_water_heating_linked')
    op.drop_column('module_drafts', 'old_boiler_brand')
    op.drop_column('module_drafts', 'heating_system')
    op.drop_column('module_drafts', 'occupation_status')
    op.drop_column('module_drafts', 'is_principal_residence')


def downgrade() -> None:
    """Restore all business-specific columns to module_drafts table."""
    # Step 2 columns
    op.add_column('module_drafts', sa.Column('is_principal_residence', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('occupation_status', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('heating_system', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('old_boiler_brand', sa.String(length=100), nullable=True))
    op.add_column('module_drafts', sa.Column('is_water_heating_linked', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('water_heating_type', sa.String(length=50), nullable=True))
    op.add_column('module_drafts', sa.Column('electrical_phase', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('power_kva', sa.Float(), nullable=True))
    
    # usage_mode column
    op.add_column('module_drafts', sa.Column('usage_mode', sa.String(length=30), nullable=True))
    
    # Step 3 columns
    op.add_column('module_drafts', sa.Column('tax_notice_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('address_proof_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('property_proof_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('energy_bill_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('reference_tax_income', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('household_size', sa.Integer(), nullable=True))
    
    # Step 4 columns
    op.add_column('module_drafts', sa.Column('nb_levels', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('avg_ceiling_height', sa.Float(), nullable=True))
    op.add_column('module_drafts', sa.Column('target_temperature', sa.Integer(), nullable=True))
    from sqlalchemy.dialects.postgresql import JSONB
    op.add_column('module_drafts', sa.Column('emitters_configuration', JSONB(), nullable=True))
    op.add_column('module_drafts', sa.Column('attic_type', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('is_attic_isolated', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('attic_isolation_year', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('floor_type', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('is_floor_isolated', sa.Boolean(), nullable=True))
    op.add_column('module_drafts', sa.Column('floor_isolation_year', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('wall_isolation_type', sa.String(length=20), nullable=True))
    op.add_column('module_drafts', sa.Column('wall_isolation_year_interior', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('wall_isolation_year_exterior', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('joinery_type', sa.String(length=20), nullable=True))
