"""add_climate_zones_table

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-01-09 12:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'i9j0k1l2m3n4'
down_revision: Union[str, Sequence[str], None] = 'h8i9j0k1l2m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create climate_zones table."""
    op.execute(sa.text("""
        CREATE TABLE climate_zones (
            id UUID PRIMARY KEY,
            departement VARCHAR(2) NOT NULL UNIQUE,
            zone_climatique VARCHAR(10) NOT NULL,
            zone_teb VARCHAR(1) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """))
    
    op.execute(sa.text("CREATE INDEX idx_climate_zones_departement ON climate_zones(departement);"))


def downgrade() -> None:
    """Drop climate_zones table."""
    op.drop_table('climate_zones')
