"""add_cee_valuations

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-01-11 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n4o5p6q7r8s9'
down_revision: Union[str, Sequence[str], None] = 'm3n4o5p6q7r8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create cee_valuations table."""
    op.execute(sa.text("""
        CREATE TABLE cee_valuations (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            operation_code VARCHAR(50) NOT NULL,
            is_residential BOOLEAN NOT NULL DEFAULT TRUE,
            value_standard FLOAT,
            value_blue FLOAT,
            value_yellow FLOAT,
            value_violet FLOAT,
            value_rose FLOAT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_operation UNIQUE (tenant_id, operation_code)
        );
    """))

    # Create indexes
    op.execute(sa.text("CREATE INDEX idx_cee_valuations_tenant_id ON cee_valuations(tenant_id);"))
    op.execute(sa.text("CREATE INDEX idx_cee_valuations_operation_code ON cee_valuations(operation_code);"))


def downgrade() -> None:
    """Drop cee_valuations table."""
    op.drop_index('idx_cee_valuations_operation_code', table_name='cee_valuations')
    op.drop_index('idx_cee_valuations_tenant_id', table_name='cee_valuations')
    op.drop_table('cee_valuations')
