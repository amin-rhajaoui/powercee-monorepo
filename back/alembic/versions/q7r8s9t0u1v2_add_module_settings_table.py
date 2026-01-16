"""add_module_settings_table

Revision ID: q7r8s9t0u1v2
Revises: p6q7r8s9t0u1
Create Date: 2026-01-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'q7r8s9t0u1v2'
down_revision: Union[str, Sequence[str], None] = 'p6q7r8s9t0u1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create module_settings table for per-tenant module configuration."""
    op.execute(sa.text("""
        CREATE TABLE module_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            module_code VARCHAR(50) NOT NULL,

            -- Pricing Strategy Configuration
            enable_legacy_grid_rules BOOLEAN NOT NULL DEFAULT FALSE,
            rounding_mode VARCHAR(20) NOT NULL DEFAULT 'NONE',
            min_margin_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
            max_rac_addon NUMERIC(10,2),

            -- Default Products for Quote Generation
            default_labor_product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,

            -- Fixed Line Items (always included in quotes)
            fixed_line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

            -- Legacy Grid Rules (user-configurable pricing rules)
            legacy_grid_rules JSONB,

            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

            -- Unique constraint per tenant/module
            CONSTRAINT uq_module_settings_tenant_module UNIQUE (tenant_id, module_code)
        );
    """))

    # Create indexes
    op.execute(sa.text("CREATE INDEX idx_module_settings_tenant_id ON module_settings(tenant_id);"))
    op.execute(sa.text("CREATE INDEX idx_module_settings_module_code ON module_settings(module_code);"))


def downgrade() -> None:
    """Drop module_settings table."""
    op.drop_index('idx_module_settings_module_code', table_name='module_settings')
    op.drop_index('idx_module_settings_tenant_id', table_name='module_settings')
    op.drop_table('module_settings')
