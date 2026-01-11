"""add_installation_recommendations

Revision ID: m3n4o5p6q7r8
Revises: efadc171562e
Create Date: 2026-01-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'm3n4o5p6q7r8'
down_revision: Union[str, Sequence[str], None] = 'efadc171562e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create installation_recommendations table."""
    op.execute(sa.text("""
        CREATE TABLE installation_recommendations (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            folder_id UUID NOT NULL UNIQUE REFERENCES folders(id) ON DELETE CASCADE,
            access_recommendations TEXT,
            indoor_unit_recommendations TEXT,
            outdoor_unit_recommendations TEXT,
            safety_recommendations TEXT,
            photo_urls VARCHAR(512)[],
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """))

    # Create indexes
    op.execute(sa.text("CREATE INDEX idx_installation_recommendations_tenant_id ON installation_recommendations(tenant_id);"))
    op.execute(sa.text("CREATE INDEX idx_installation_recommendations_folder_id ON installation_recommendations(folder_id);"))


def downgrade() -> None:
    """Drop installation_recommendations table."""
    op.drop_index('idx_installation_recommendations_folder_id', table_name='installation_recommendations')
    op.drop_index('idx_installation_recommendations_tenant_id', table_name='installation_recommendations')
    op.drop_table('installation_recommendations')
