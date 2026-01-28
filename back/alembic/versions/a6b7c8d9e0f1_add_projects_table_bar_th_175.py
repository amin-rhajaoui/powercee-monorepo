"""add_projects_table_bar_th_175

Revision ID: a6b7c8d9e0f1
Revises: z5a6b7c8d9e0
Create Date: 2026-01-26 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, Sequence[str], None] = "z5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add projects table for BAR-TH-175 module (multi-apartment renovation projects).
    Add project_id column to module_drafts table.
    """
    # Create the projectstatus enum type if it doesn't exist
    # Use raw SQL to avoid duplicate type errors
    op.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE projectstatus AS ENUM ('DRAFT', 'IN_PROGRESS', 'AUDIT_PENDING', 'VALIDATED', 'COMPLETED', 'ARCHIVED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))

    # Create the projects table using raw SQL to avoid SQLAlchemy trying to create the enum
    op.execute(sa.text("""
        CREATE TABLE projects (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            status projectstatus NOT NULL DEFAULT 'DRAFT',
            module_code VARCHAR(50) NOT NULL DEFAULT 'BAR-TH-175',
            building_address VARCHAR(500),
            total_apartments INTEGER,
            data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            archived_at TIMESTAMP WITH TIME ZONE
        );
    """))

    # Create indexes for projects table
    op.execute(sa.text("CREATE INDEX ix_projects_tenant_id ON projects(tenant_id);"))
    op.execute(sa.text("CREATE INDEX ix_projects_client_id ON projects(client_id);"))
    op.execute(sa.text("CREATE INDEX ix_projects_status ON projects(status);"))
    op.execute(sa.text("CREATE INDEX ix_projects_module_code ON projects(module_code);"))
    op.execute(sa.text("CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);"))

    # Add project_id column to module_drafts table
    op.add_column(
        "module_drafts",
        sa.Column("project_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_module_drafts_project",
        "module_drafts",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_module_drafts_project_id"),
        "module_drafts",
        ["project_id"],
        unique=False,
    )


def downgrade() -> None:
    """
    Remove projects table and project_id from module_drafts.
    """
    # Remove project_id column from module_drafts
    op.drop_index(op.f("ix_module_drafts_project_id"), table_name="module_drafts")
    op.drop_constraint("fk_module_drafts_project", "module_drafts", type_="foreignkey")
    op.drop_column("module_drafts", "project_id")

    # Drop projects table indexes
    op.drop_index("idx_projects_tenant_status", table_name="projects")
    op.drop_index("ix_projects_module_code", table_name="projects")
    op.drop_index("ix_projects_status", table_name="projects")
    op.drop_index("ix_projects_client_id", table_name="projects")
    op.drop_index("ix_projects_tenant_id", table_name="projects")

    # Drop projects table
    op.drop_table("projects")

    # Drop the enum type if it exists
    op.execute(sa.text("""
        DO $$ BEGIN
            DROP TYPE projectstatus;
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;
    """))
