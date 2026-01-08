"""add_folder_mpr_fields

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2026-01-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g7h8i9j0k1l2'
down_revision: Union[str, Sequence[str], None] = 'f6g7h8i9j0k1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add mpr_color and emitter_type columns to folders table."""
    op.add_column('folders', sa.Column('mpr_color', sa.String(20), nullable=True))
    op.add_column('folders', sa.Column('emitter_type', sa.String(30), nullable=True))


def downgrade() -> None:
    """Remove mpr_color and emitter_type columns from folders table."""
    op.drop_column('folders', 'emitter_type')
    op.drop_column('folders', 'mpr_color')
