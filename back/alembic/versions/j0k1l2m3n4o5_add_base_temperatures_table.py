"""add_base_temperatures_table

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-01-09 12:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'j0k1l2m3n4o5'
down_revision: Union[str, Sequence[str], None] = 'i9j0k1l2m3n4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create base_temperatures table."""
    op.execute(sa.text("""
        CREATE TABLE base_temperatures (
            id UUID PRIMARY KEY,
            zone VARCHAR(1) NOT NULL,
            altitude_min INTEGER NOT NULL,
            altitude_max INTEGER NOT NULL,
            temp_base FLOAT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """))
    
    op.execute(sa.text("CREATE INDEX idx_base_temps_zone ON base_temperatures(zone);"))
    op.execute(sa.text("CREATE INDEX idx_base_temps_zone_altitude ON base_temperatures(zone, altitude_min, altitude_max);"))


def downgrade() -> None:
    """Drop base_temperatures table."""
    op.drop_table('base_temperatures')
