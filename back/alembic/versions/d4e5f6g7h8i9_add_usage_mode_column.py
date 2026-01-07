"""add_usage_mode_column

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-01-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add usage_mode column to module_drafts table for BAR-TH-171."""
    op.add_column('module_drafts', sa.Column('usage_mode', sa.String(length=30), nullable=True))


def downgrade() -> None:
    """Remove usage_mode column from module_drafts table."""
    op.drop_column('module_drafts', 'usage_mode')

