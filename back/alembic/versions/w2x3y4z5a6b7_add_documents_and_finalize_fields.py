"""add_documents_and_finalize_fields

Revision ID: w2x3y4z5a6b7
Revises: v1w2x3y4z5a6
Create Date: 2026-01-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "w2x3y4z5a6b7"
down_revision: Union[str, Sequence[str], None] = "v1w2x3y4z5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add documents table, COMPLETED status, quote_number, and agency fields."""
    
    # 1. Add COMPLETED to FolderStatus enum
    # Note: PostgreSQL doesn't support adding values to enum easily, we use ALTER TYPE
    op.execute("ALTER TYPE folderstatus ADD VALUE IF NOT EXISTS 'COMPLETED'")
    
    # 2. Add quote_number column to folders table
    op.add_column(
        "folders",
        sa.Column(
            "quote_number",
            sa.String(length=50),
            nullable=True,
            comment="Numéro de devis généré lors de la finalisation (ex: DEV-001)"
        )
    )
    op.create_index(op.f("ix_folders_quote_number"), "folders", ["quote_number"], unique=False)
    
    # 3. Create documents table
    # First, create the enum type if it doesn't exist
    # Check if enum exists, if not create it
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE documenttype AS ENUM ('sizing_note', 'quote', 'tva_attestation', 'cdc_cee');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("folder_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column(
            "document_type",
            postgresql.ENUM("sizing_note", "quote", "tva_attestation", "cdc_cee", name="documenttype", create_type=False),
            nullable=False
        ),
        sa.Column("file_url", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["folder_id"], ["folders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    
    # Create indexes for documents
    op.create_index(op.f("ix_documents_folder_id"), "documents", ["folder_id"], unique=False)
    op.create_index(op.f("ix_documents_tenant_id"), "documents", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_documents_document_type"), "documents", ["document_type"], unique=False)
    op.create_index("idx_documents_folder_type", "documents", ["folder_id", "document_type"], unique=False)
    
    # 4. Add new fields to agencies table
    op.add_column(
        "agencies",
        sa.Column("phone", sa.String(length=20), nullable=True, comment="Numéro de téléphone de l'agence")
    )
    op.add_column(
        "agencies",
        sa.Column("email", sa.String(length=255), nullable=True, comment="Adresse email de l'agence")
    )
    op.add_column(
        "agencies",
        sa.Column(
            "manager_first_name",
            sa.String(length=100),
            nullable=True,
            comment="Prénom du gérant (siège social uniquement)"
        )
    )
    op.add_column(
        "agencies",
        sa.Column(
            "manager_last_name",
            sa.String(length=100),
            nullable=True,
            comment="Nom du gérant (siège social uniquement)"
        )
    )


def downgrade() -> None:
    """Remove documents table, quote_number, and agency fields."""
    
    # Remove agency fields
    op.drop_column("agencies", "manager_last_name")
    op.drop_column("agencies", "manager_first_name")
    op.drop_column("agencies", "email")
    op.drop_column("agencies", "phone")
    
    # Remove documents table and indexes
    op.drop_index("idx_documents_folder_type", table_name="documents")
    op.drop_index(op.f("ix_documents_document_type"), table_name="documents")
    op.drop_index(op.f("ix_documents_tenant_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_folder_id"), table_name="documents")
    op.drop_table("documents")
    
    # Remove quote_number from folders
    op.drop_index(op.f("ix_folders_quote_number"), table_name="folders")
    op.drop_column("folders", "quote_number")
    
    # Note: We cannot easily remove COMPLETED from the enum in PostgreSQL
    # This would require recreating the enum type, which is complex
    # The value will remain but unused
