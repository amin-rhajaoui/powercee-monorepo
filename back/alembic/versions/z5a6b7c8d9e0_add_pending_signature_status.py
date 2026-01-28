"""add_pending_signature_status

Revision ID: z5a6b7c8d9e0
Revises: y4z5a6b7c8d9
Create Date: 2026-01-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "z5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "y4z5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add PENDING_SIGNATURE to FolderStatus enum."""
    # PostgreSQL doesn't support adding values to enum easily, we use ALTER TYPE
    op.execute("ALTER TYPE folderstatus ADD VALUE IF NOT EXISTS 'PENDING_SIGNATURE'")


def downgrade() -> None:
    """
    Note: PostgreSQL doesn't support removing enum values easily.
    This migration cannot be fully reversed without recreating the enum.
    In production, this should be handled manually if needed.
    """
    # Cannot easily remove enum values in PostgreSQL
    pass
