"""add_line_percentages_to_module_settings

Revision ID: v1w2x3y4z5a6
Revises: u0v1w2x3y4z5
Create Date: 2026-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "v1w2x3y4z5a6"
down_revision: Union[str, Sequence[str], None] = "u0v1w2x3y4z5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add line_percentages column to module_settings table."""
    op.add_column(
        "module_settings",
        sa.Column(
            "line_percentages",
            JSONB,
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
            comment="Repartition par pourcentages des lignes du devis (ex: {'HEAT_PUMP': 40.0, 'LABOR': 30.0})"
        )
    )


def downgrade() -> None:
    """Remove line_percentages column from module_settings table."""
    op.drop_column("module_settings", "line_percentages")
