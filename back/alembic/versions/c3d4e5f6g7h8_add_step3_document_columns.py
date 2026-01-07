"""add_step3_document_columns

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6a7
Create Date: 2026-01-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add BAR-TH-171 Step 3 document columns to module_drafts table."""
    op.add_column('module_drafts', sa.Column('tax_notice_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('address_proof_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('property_proof_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('energy_bill_url', sa.String(length=500), nullable=True))
    op.add_column('module_drafts', sa.Column('reference_tax_income', sa.Integer(), nullable=True))
    op.add_column('module_drafts', sa.Column('household_size', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Remove BAR-TH-171 Step 3 document columns from module_drafts table."""
    op.drop_column('module_drafts', 'household_size')
    op.drop_column('module_drafts', 'reference_tax_income')
    op.drop_column('module_drafts', 'energy_bill_url')
    op.drop_column('module_drafts', 'property_proof_url')
    op.drop_column('module_drafts', 'address_proof_url')
    op.drop_column('module_drafts', 'tax_notice_url')
