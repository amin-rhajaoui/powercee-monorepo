"""add_folders_table

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2026-01-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'f6g7h8i9j0k1'
down_revision: Union[str, Sequence[str], None] = 'e5f6g7h8i9j0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create folders table for validated dossiers."""
    # Create the FolderStatus enum type if it doesn't exist
    # Use raw SQL to avoid duplicate type errors
    op.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE folderstatus AS ENUM ('IN_PROGRESS', 'CLOSED', 'ARCHIVED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))

    # Create the table using raw SQL to avoid SQLAlchemy trying to create the enum
    op.execute(sa.text("""
        CREATE TABLE folders (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
            module_code VARCHAR(50),
            status folderstatus NOT NULL DEFAULT 'IN_PROGRESS',
            data JSONB NOT NULL DEFAULT '{}',
            source_draft_id UUID,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """))

    # Create indexes
    op.execute(sa.text("CREATE INDEX idx_folders_tenant_id ON folders(tenant_id);"))
    op.execute(sa.text("CREATE INDEX idx_folders_client_id ON folders(client_id);"))
    op.execute(sa.text("CREATE INDEX idx_folders_property_id ON folders(property_id);"))
    op.execute(sa.text("CREATE INDEX idx_folders_module_code ON folders(module_code);"))
    op.execute(sa.text("CREATE INDEX idx_folders_source_draft_id ON folders(source_draft_id);"))
    op.execute(sa.text("CREATE INDEX idx_folders_tenant_module ON folders(tenant_id, module_code);"))
    op.execute(sa.text("CREATE INDEX idx_folders_tenant_client ON folders(tenant_id, client_id);"))


def downgrade() -> None:
    """Drop folders table."""
    op.drop_index('idx_folders_tenant_client', table_name='folders')
    op.drop_index('idx_folders_tenant_module', table_name='folders')
    op.drop_table('folders')

    # Drop the enum type if it exists
    # Use raw SQL to avoid errors if type doesn't exist
    op.execute(sa.text("""
        DO $$ BEGIN
            DROP TYPE folderstatus;
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;
    """))
