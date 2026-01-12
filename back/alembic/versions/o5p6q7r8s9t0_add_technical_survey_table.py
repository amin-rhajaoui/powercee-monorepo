"""add_technical_survey_table

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-01-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'o5p6q7r8s9t0'
down_revision: Union[str, Sequence[str], None] = 'n4o5p6q7r8s9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create technical_surveys table with One-to-One relationship to folders."""
    op.create_table(
        'technical_surveys',
        sa.Column('folder_id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('photo_house', sa.String(length=512), nullable=True),
        sa.Column('photo_facade', sa.String(length=512), nullable=True),
        sa.Column('photo_old_system', sa.String(length=512), nullable=True),
        sa.Column('photo_electric_panel', sa.String(length=512), nullable=True),
        sa.Column('has_linky', sa.Boolean(), nullable=True),
        sa.Column('photo_linky', sa.String(length=512), nullable=True),
        sa.Column('photo_breaker', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['folder_id'], ['folders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('folder_id'),
    )
    op.create_index(op.f('ix_technical_surveys_tenant_id'), 'technical_surveys', ['tenant_id'], unique=False)


def downgrade() -> None:
    """Drop technical_surveys table."""
    op.drop_index(op.f('ix_technical_surveys_tenant_id'), table_name='technical_surveys')
    op.drop_table('technical_surveys')
