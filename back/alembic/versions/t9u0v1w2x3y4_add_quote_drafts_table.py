"""add_quote_drafts_table

Revision ID: t9u0v1w2x3y4
Revises: s9t0u1v2w3x4
Create Date: 2026-01-18 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 't9u0v1w2x3y4'
down_revision: Union[str, Sequence[str], None] = 's9t0u1v2w3x4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add quote_drafts table for storing draft quotes."""
    op.create_table(
        'quote_drafts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('folder_id', sa.Uuid(), nullable=False),
        sa.Column('module_code', sa.String(length=50), nullable=False),
        sa.Column('product_ids', sa.JSON(), nullable=False),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('total_ht', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total_ttc', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('rac_ttc', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('cee_prime', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('margin_ht', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('margin_percent', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('strategy_used', sa.String(length=50), nullable=False),
        sa.Column('warnings', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['folder_id'], ['folders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index(op.f('ix_quote_drafts_folder_id'), 'quote_drafts', ['folder_id'], unique=False)
    op.create_index(op.f('ix_quote_drafts_tenant_id'), 'quote_drafts', ['tenant_id'], unique=False)


def downgrade() -> None:
    """Remove quote_drafts table."""
    op.drop_index(op.f('ix_quote_drafts_tenant_id'), table_name='quote_drafts')
    op.drop_index(op.f('ix_quote_drafts_folder_id'), table_name='quote_drafts')
    op.drop_table('quote_drafts')
