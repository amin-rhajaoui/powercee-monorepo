"""add_integrations_table

Revision ID: x3y4z5a6b7c8
Revises: w2x3y4z5a6b7
Create Date: 2026-01-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "x3y4z5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "w2x3y4z5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add integrations table for storing API keys."""

    # Create the integrations table
    op.create_table(
        "integrations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column(
            "integration_type",
            sa.String(length=50),
            nullable=False,
            comment="Type d'intégration (yousign, etc.)"
        ),
        sa.Column(
            "api_key",
            sa.Text(),
            nullable=False,
            comment="Clé API (stockée de manière sécurisée)"
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            default=True,
            comment="Statut d'activation de l'intégration"
        ),
        sa.Column(
            "config",
            sa.Text(),
            nullable=True,
            comment="Configuration additionnelle en JSON"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )

    # Create indexes
    op.create_index(
        op.f("ix_integrations_tenant_id"),
        "integrations",
        ["tenant_id"],
        unique=False
    )
    op.create_index(
        "idx_integrations_tenant_type",
        "integrations",
        ["tenant_id", "integration_type"],
        unique=True
    )


def downgrade() -> None:
    """Remove integrations table."""

    op.drop_index("idx_integrations_tenant_type", table_name="integrations")
    op.drop_index(op.f("ix_integrations_tenant_id"), table_name="integrations")
    op.drop_table("integrations")
