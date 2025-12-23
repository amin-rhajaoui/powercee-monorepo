"""merge_clients_and_invitations

Revision ID: 1ef395f5a660
Revises: 0f2f0d8c2a6c, 2e4c6719c5ce
Create Date: 2025-12-23 15:51:57.841503

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ef395f5a660'
down_revision: Union[str, Sequence[str], None] = ('0f2f0d8c2a6c', '2e4c6719c5ce')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
