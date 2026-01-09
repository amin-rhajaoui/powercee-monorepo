"""load_climate_data

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-01-09 12:04:00.000000

"""
from typing import Sequence, Union
import json
from pathlib import Path
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k1l2m3n4o5p6'
down_revision: Union[str, Sequence[str], None] = 'j0k1l2m3n4o5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Load climate zones and base temperatures data from JSON files."""
    
    # Charger les fichiers JSON depuis le dossier data
    script_dir = Path(__file__).parent.parent.parent
    zone_climatique_path = script_dir / "data" / "zone_climatique.json"
    base_temperatures_path = script_dir / "data" / "base_temperatures.json"
    
    # Charger les données JSON
    if zone_climatique_path.exists():
        with open(zone_climatique_path, 'r', encoding='utf-8') as f:
            zone_climatique_data = json.load(f)
    else:
        raise FileNotFoundError(f"Fichier non trouvé : {zone_climatique_path}")
    
    if base_temperatures_path.exists():
        with open(base_temperatures_path, 'r', encoding='utf-8') as f:
            base_temperatures_data = json.load(f)
    else:
        raise FileNotFoundError(f"Fichier non trouvé : {base_temperatures_path}")
    
    # Insérer les zones climatiques
    connection = op.get_bind()
    for item in zone_climatique_data:
        # Parser la date depuis la chaîne JSON
        created_at_str = item.get("created_at")
        if created_at_str:
            # Format: "2025-10-03 18:25:59.253699+00"
            try:
                # Essayer de parser avec timezone
                created_at = datetime.fromisoformat(created_at_str.replace("+00", "+00:00"))
            except ValueError:
                # Fallback: parser sans timezone et ajouter UTC
                created_at = datetime.strptime(created_at_str.split("+")[0], "%Y-%m-%d %H:%M:%S.%f")
                from datetime import timezone
                created_at = created_at.replace(tzinfo=timezone.utc)
        else:
            from datetime import timezone
            created_at = datetime.now(timezone.utc)
        
        connection.execute(
            sa.text("""
                INSERT INTO climate_zones (id, departement, zone_climatique, zone_teb, created_at)
                VALUES (gen_random_uuid(), :departement, :zone_climatique, :zone_teb, :created_at)
                ON CONFLICT (departement) DO NOTHING
            """),
            {
                "departement": item["departement"],
                "zone_climatique": item["zone_climatique"],
                "zone_teb": item["zone_teb"],
                "created_at": created_at,
            }
        )
    
    # Insérer les températures de base
    for item in base_temperatures_data:
        connection.execute(
            sa.text("""
                INSERT INTO base_temperatures (id, zone, altitude_min, altitude_max, temp_base, created_at)
                VALUES (gen_random_uuid(), :zone, :altitude_min, :altitude_max, :temp_base, NOW())
            """),
            {
                "zone": item["zone"],
                "altitude_min": item["altitude_min"],
                "altitude_max": item["altitude_max"],
                "temp_base": item["temp_base"],
            }
        )


def downgrade() -> None:
    """Clear climate data."""
    op.execute(sa.text("TRUNCATE TABLE climate_zones CASCADE;"))
    op.execute(sa.text("TRUNCATE TABLE base_temperatures CASCADE;"))
