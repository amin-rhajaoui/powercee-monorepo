#!/usr/bin/env python3
"""
Script de seed pour importer les produits depuis les fichiers JSON.
Usage: python -m scripts.seed_products <tenant_id>

Le script doit etre execute depuis le repertoire back/
"""

import asyncio
import json
import sys
from pathlib import Path
from uuid import UUID

# Ajouter le repertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.product import (
    Product,
    ProductCategory,
    PowerSupply,
    ProductHeatPump,
    ProductThermostat,
    ProductCompatibility,
)


# Chemins vers les fichiers JSON
BASE_DIR = Path(__file__).parent.parent.parent
HEAT_PUMPS_FILE = BASE_DIR / "pompes_a_chaleur.json"
THERMOSTATS_FILE = BASE_DIR / "thermostats.json"


async def get_product_by_reference(db, tenant_id: UUID, reference: str) -> Product | None:
    """Recupere un produit par sa reference."""
    query = select(Product).where(
        Product.tenant_id == tenant_id,
        Product.reference == reference,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def seed_thermostats(db, tenant_id: UUID) -> dict[int, UUID]:
    """Seed les thermostats et retourne un mapping old_id -> new_uuid."""
    print("\n=== Seeding Thermostats ===")

    thermostat_id_map: dict[int, UUID] = {}

    if not THERMOSTATS_FILE.exists():
        print(f"Fichier non trouve: {THERMOSTATS_FILE}")
        return thermostat_id_map

    with open(THERMOSTATS_FILE, "r", encoding="utf-8") as f:
        thermostats = json.load(f)

    for t in thermostats:
        old_id = t["id"]
        reference = t["modele"]  # Utiliser le modele comme reference

        # Verifier si le produit existe deja
        existing = await get_product_by_reference(db, tenant_id, reference)
        if existing:
            print(f"  [SKIP] Thermostat deja existant: {reference}")
            thermostat_id_map[old_id] = existing.id
            continue

        # Creer le produit thermostat
        product = Product(
            tenant_id=tenant_id,
            name=t["modele"],
            brand=t["marque"],
            reference=reference,
            price_ht=float(t["prix_ht"]),
            category=ProductCategory.THERMOSTAT,
            module_codes=[],  # Les thermostats n'ont pas de modules CEE
            is_active=True,
        )
        db.add(product)
        await db.flush()

        # Extraire la classe du regulateur (ex: "Classe V" -> "V")
        class_rank = t.get("reference", "").replace("Classe", "").strip()

        # Creer les details thermostat
        thermostat_details = ProductThermostat(
            product_id=product.id,
            class_rank=class_rank if class_rank else None,
        )
        db.add(thermostat_details)

        thermostat_id_map[old_id] = product.id
        print(f"  [OK] Thermostat cree: {t['marque']} - {t['modele']}")

    await db.commit()
    print(f"  Total thermostats: {len(thermostat_id_map)}")

    return thermostat_id_map


async def seed_heat_pumps(db, tenant_id: UUID, thermostat_id_map: dict[int, UUID]) -> int:
    """Seed les pompes a chaleur avec leurs compatibilites."""
    print("\n=== Seeding Heat Pumps ===")

    if not HEAT_PUMPS_FILE.exists():
        print(f"Fichier non trouve: {HEAT_PUMPS_FILE}")
        return 0

    with open(HEAT_PUMPS_FILE, "r", encoding="utf-8") as f:
        heat_pumps = json.load(f)

    count = 0
    for hp in heat_pumps:
        reference = hp["reference"]

        # Verifier si le produit existe deja
        existing = await get_product_by_reference(db, tenant_id, reference)
        if existing:
            print(f"  [SKIP] PAC deja existante: {reference}")
            continue

        # Determiner si c'est un modele DUO (Chauffage + ECS)
        is_duo = hp.get("usage") == "Chauffage + ECS"

        # Determiner le type d'alimentation
        alimentation = hp.get("alimentation", "")
        power_supply = None
        if "Triphasé" in alimentation or "TRI" in alimentation.upper():
            power_supply = PowerSupply.TRIPHASE
        elif "Monophasé" in alimentation:
            power_supply = PowerSupply.MONOPHASE

        # Creer le produit PAC
        product = Product(
            tenant_id=tenant_id,
            name=hp["modele"],
            brand=hp["marque"],
            reference=reference,
            price_ht=float(hp["prix"]),
            category=ProductCategory.HEAT_PUMP,
            module_codes=["BAR-TH-171"],  # Module par defaut pour les PAC
            is_active=True,
        )
        db.add(product)
        await db.flush()

        # Parser les valeurs numeriques
        power_minus_7 = None
        if hp.get("puissance_moins_7"):
            try:
                power_minus_7 = float(hp["puissance_moins_7"])
            except (ValueError, TypeError):
                pass

        power_minus_15 = None
        if hp.get("puissance_moins_15"):
            try:
                power_minus_15 = float(hp["puissance_moins_15"])
            except (ValueError, TypeError):
                pass

        noise_level = None
        if hp.get("niveau_sonore_db"):
            try:
                noise_level = float(hp["niveau_sonore_db"])
            except (ValueError, TypeError):
                pass

        # Creer les details PAC
        hp_details = ProductHeatPump(
            product_id=product.id,
            etas_35=hp.get("etas_35"),
            etas_55=hp.get("etas_55"),
            power_minus_7=power_minus_7,
            power_minus_15=power_minus_15,
            power_supply=power_supply,
            refrigerant_type=hp.get("type_refrigerant"),
            noise_level=noise_level,
            is_duo=is_duo,
            class_regulator=hp.get("classe_regulateur"),
        )
        db.add(hp_details)

        # Ajouter la compatibilite avec le thermostat
        thermostat_old_id = hp.get("thermostat_id")
        if thermostat_old_id and thermostat_old_id in thermostat_id_map:
            compatibility = ProductCompatibility(
                source_product_id=product.id,
                target_product_id=thermostat_id_map[thermostat_old_id],
            )
            db.add(compatibility)

        count += 1
        print(f"  [OK] PAC creee: {hp['marque']} - {hp['modele']} ({reference})")

    await db.commit()
    print(f"  Total PAC creees: {count}")

    return count


async def main(tenant_id: str):
    """Point d'entree principal du script de seed."""
    print("=" * 60)
    print("PowerCEE - Seed Products Script")
    print("=" * 60)

    try:
        tenant_uuid = UUID(tenant_id)
    except ValueError:
        print(f"Erreur: tenant_id invalide: {tenant_id}")
        print("Le tenant_id doit etre un UUID valide.")
        sys.exit(1)

    print(f"Tenant ID: {tenant_uuid}")

    async with SessionLocal() as db:
        # 1. Seeder les thermostats d'abord (pour avoir les IDs)
        thermostat_id_map = await seed_thermostats(db, tenant_uuid)

        # 2. Seeder les PAC avec les compatibilites
        hp_count = await seed_heat_pumps(db, tenant_uuid, thermostat_id_map)

        print("\n" + "=" * 60)
        print("Seed termine avec succes!")
        print(f"  - Thermostats: {len(thermostat_id_map)}")
        print(f"  - Pompes a chaleur: {hp_count}")
        print("=" * 60)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.seed_products <tenant_id>")
        print("Exemple: python -m scripts.seed_products 123e4567-e89b-12d3-a456-426614174000")
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
