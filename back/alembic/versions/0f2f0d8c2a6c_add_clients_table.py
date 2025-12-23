"""add_clients_table

Revision ID: 0f2f0d8c2a6c
Revises: db9f1d5b40e2
Create Date: 2025-12-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f2f0d8c2a6c'
down_revision: Union[str, Sequence[str], None] = 'db9f1d5b40e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create clients table with tenant isolation and soft delete."""
    # Créer les types ENUM seulement s'ils n'existent pas (utilise DO $$ pour éviter les erreurs)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE client_type AS ENUM ('PARTICULIER', 'PROFESSIONNEL');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE client_status AS ENUM ('ACTIF', 'ARCHIVE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Utiliser directement le type PostgreSQL sans passer par SQLAlchemy Enum
    # pour éviter que SQLAlchemy essaie de créer le type
    from sqlalchemy.dialects.postgresql import ENUM
    
    client_type_enum = ENUM('PARTICULIER', 'PROFESSIONNEL', name='client_type', create_type=False)
    client_status_enum = ENUM('ACTIF', 'ARCHIVE', name='client_status', create_type=False)

    op.create_table(
        'clients',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('agency_id', sa.Uuid(), nullable=True),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('type', client_type_enum, nullable=False),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('contact_name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('status', client_status_enum, nullable=False, server_default='ACTIF'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'email', name='uq_client_email_tenant'),
    )
    op.create_index(op.f('ix_clients_tenant_id'), 'clients', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_clients_agency_id'), 'clients', ['agency_id'], unique=False)
    op.create_index(op.f('ix_clients_owner_id'), 'clients', ['owner_id'], unique=False)
    op.create_index(op.f('ix_clients_status'), 'clients', ['status'], unique=False)


def downgrade() -> None:
    """Drop clients table and enums."""
    op.drop_index(op.f('ix_clients_status'), table_name='clients')
    op.drop_index(op.f('ix_clients_owner_id'), table_name='clients')
    op.drop_index(op.f('ix_clients_agency_id'), table_name='clients')
    op.drop_index(op.f('ix_clients_tenant_id'), table_name='clients')
    op.drop_table('clients')

    client_status = sa.Enum('ACTIF', 'ARCHIVE', name='client_status')
    client_type = sa.Enum('PARTICULIER', 'PROFESSIONNEL', name='client_type')

    client_status.drop(op.get_bind(), checkfirst=True)
    client_type.drop(op.get_bind(), checkfirst=True)

