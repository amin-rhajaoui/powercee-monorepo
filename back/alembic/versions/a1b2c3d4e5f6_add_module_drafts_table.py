"""add_module_drafts_table

Revision ID: a1b2c3d4e5f6
Revises: db9f1d5b40e2
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '883ed30a2153'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create module_drafts table with tenant isolation and soft delete."""
    op.create_table(
        'module_drafts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('module_code', sa.String(length=50), nullable=False),
        sa.Column('client_id', sa.Uuid(), nullable=True),
        sa.Column('property_id', sa.Uuid(), nullable=True),
        sa.Column('current_step', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('data', JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_module_drafts_tenant_id'), 'module_drafts', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_module_drafts_module_code'), 'module_drafts', ['module_code'], unique=False)
    op.create_index(op.f('ix_module_drafts_client_id'), 'module_drafts', ['client_id'], unique=False)
    op.create_index(op.f('ix_module_drafts_property_id'), 'module_drafts', ['property_id'], unique=False)
    # Index composite pour performance sur requêtes fréquentes
    op.create_index('idx_module_drafts_tenant_module', 'module_drafts', ['tenant_id', 'module_code'], unique=False)


def downgrade() -> None:
    """Drop module_drafts table."""
    op.drop_index('idx_module_drafts_tenant_module', table_name='module_drafts')
    op.drop_index(op.f('ix_module_drafts_property_id'), table_name='module_drafts')
    op.drop_index(op.f('ix_module_drafts_client_id'), table_name='module_drafts')
    op.drop_index(op.f('ix_module_drafts_module_code'), table_name='module_drafts')
    op.drop_index(op.f('ix_module_drafts_tenant_id'), table_name='module_drafts')
    op.drop_table('module_drafts')

