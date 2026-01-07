"""add_properties_table

Revision ID: 883ed30a2153
Revises: 1ef395f5a660
Create Date: 2025-12-23 18:32:41.844234

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '883ed30a2153'
down_revision: Union[str, Sequence[str], None] = '1ef395f5a660'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create properties table with tenant isolation and soft delete."""
    # Créer le type ENUM seulement s'il n'existe pas
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE property_type AS ENUM ('MAISON', 'APPARTEMENT', 'BATIMENT_PRO', 'AUTRE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Utiliser directement le type PostgreSQL sans passer par SQLAlchemy Enum
    from sqlalchemy.dialects.postgresql import ENUM
    
    property_type_enum = ENUM('MAISON', 'APPARTEMENT', 'BATIMENT_PRO', 'AUTRE', name='property_type', create_type=False)

    op.create_table(
        'properties',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('client_id', sa.Uuid(), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('type', property_type_enum, nullable=False, server_default='AUTRE'),
        sa.Column('address', sa.String(length=500), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('postal_code', sa.String(length=10), nullable=True),
        sa.Column('city', sa.String(length=255), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('surface_m2', sa.Float(), nullable=True),
        sa.Column('construction_year', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_properties_tenant_id'), 'properties', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_properties_client_id'), 'properties', ['client_id'], unique=False)
    op.create_index(op.f('ix_properties_is_active'), 'properties', ['is_active'], unique=False)
    # Index composite pour performance sur requêtes fréquentes
    op.create_index('ix_properties_tenant_client', 'properties', ['tenant_id', 'client_id'], unique=False)


def downgrade() -> None:
    """Drop properties table and enum."""
    op.drop_index('ix_properties_tenant_client', table_name='properties')
    op.drop_index(op.f('ix_properties_is_active'), table_name='properties')
    op.drop_index(op.f('ix_properties_client_id'), table_name='properties')
    op.drop_index(op.f('ix_properties_tenant_id'), table_name='properties')
    op.drop_table('properties')

    property_type = sa.Enum('MAISON', 'APPARTEMENT', 'BATIMENT_PRO', 'AUTRE', name='property_type')
    property_type.drop(op.get_bind(), checkfirst=True)
