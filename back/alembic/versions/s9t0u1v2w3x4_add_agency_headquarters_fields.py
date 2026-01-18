"""add_agency_headquarters_fields

Revision ID: s9t0u1v2w3x4
Revises: r8s9t0u1v2w3
Create Date: 2026-01-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 's9t0u1v2w3x4'
down_revision: Union[str, Sequence[str], None] = 'r8s9t0u1v2w3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add headquarters-related fields to agencies table."""
    # Add is_headquarters column (boolean, default False)
    op.add_column('agencies', sa.Column('is_headquarters', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add siret column (14 characters for French SIRET, optional)
    op.add_column('agencies', sa.Column('siret', sa.String(length=14), nullable=True))
    
    # Add vat_number column (VAT identification number, optional)
    op.add_column('agencies', sa.Column('vat_number', sa.String(length=50), nullable=True))
    
    # Create index on is_headquarters for faster queries
    op.create_index(op.f('ix_agencies_is_headquarters'), 'agencies', ['is_headquarters'], unique=False)


def downgrade() -> None:
    """Remove headquarters-related fields from agencies table."""
    op.drop_index(op.f('ix_agencies_is_headquarters'), table_name='agencies')
    op.drop_column('agencies', 'vat_number')
    op.drop_column('agencies', 'siret')
    op.drop_column('agencies', 'is_headquarters')
