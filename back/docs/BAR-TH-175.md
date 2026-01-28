# Module BAR-TH-175 - Rénovation d'ampleur appartement

Documentation technique du module BAR-TH-175 pour la gestion des projets de rénovation multi-appartements (bailleurs sociaux).

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Modèles de données](#modèles-de-données)
3. [API Endpoints](#api-endpoints)
4. [Règles de validation](#règles-de-validation)
5. [Exemples d'utilisation](#exemples-dutilisation)

---

## Vue d'ensemble

Le module BAR-TH-175 permet de gérer des projets de rénovation énergétique pour des immeubles contenant plusieurs appartements. Il est conçu pour les bailleurs sociaux qui rénovent des bâtiments entiers.

### Architecture

```
Project (Immeuble)
    └── ModuleDraft[] (Appartements)
            └── data: BarTh175AuditData (Données d'audit)
```

### Flux de travail typique

1. Créer un `Project` pour l'immeuble
2. Créer les `ModuleDraft` (appartements) en masse via `bulk-drafts`
3. Renseigner l'audit d'un appartement de référence
4. Propager l'audit vers les appartements similaires via `propagate-audit`
5. Valider l'éligibilité de chaque appartement

---

## Modèles de données

### Project

Représente un projet de rénovation (immeuble).

```typescript
interface Project {
  id: UUID;
  tenant_id: UUID;                    // Multi-tenant isolation
  client_id: UUID | null;             // Bailleur (client professionnel)
  name: string;                       // Ex: "Les Balcons de la Brévenne"
  status: ProjectStatus;              // Statut du projet
  module_code: string;                // "BAR-TH-175"
  building_address: string | null;    // Adresse de l'immeuble
  total_apartments: number | null;    // Nombre total d'appartements
  data: Record<string, any>;          // Données flexibles JSONB
  created_at: DateTime;
  updated_at: DateTime;
  archived_at: DateTime | null;       // Soft delete
}
```

#### ProjectStatus (enum)

| Valeur | Description |
|--------|-------------|
| `DRAFT` | Projet en cours de création |
| `IN_PROGRESS` | Travaux en cours |
| `AUDIT_PENDING` | En attente d'audit énergétique |
| `VALIDATED` | Projet validé |
| `COMPLETED` | Projet terminé |
| `ARCHIVED` | Projet archivé (soft delete) |

---

### ModuleDraft (Appartement)

Chaque appartement est un `ModuleDraft` avec `project_id` pointant vers le projet parent.

```typescript
interface ModuleDraft {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID | null;            // FK vers Project (nullable pour BAR-TH-171)
  client_id: UUID | null;
  module_code: string;                // "BAR-TH-175"
  current_step: number;               // 1-6
  data: BarTh175AuditData;            // Données d'audit en JSONB
  created_at: DateTime;
  updated_at: DateTime;
  archived_at: DateTime | null;
}
```

---

### BarTh175AuditData

Structure des données d'audit stockées dans `ModuleDraft.data`.

```typescript
interface BarTh175AuditData {
  // === État initial (avant travaux) ===
  initial_energy_class: EnergyClass;        // Classe DPE initiale (A-G)
  initial_ghg: number;                      // Émissions GES (kgCO2/m²/an)
  initial_consumption_kwh_m2?: number;      // Consommation (kWh/m²/an)

  // === État projeté (après travaux) ===
  projected_energy_class: EnergyClass;      // Classe DPE projetée
  projected_ghg: number;                    // Émissions GES projetées
  projected_consumption_kwh_m2?: number;

  // === Isolation ===
  insulation_items: InsulationData[];       // Postes d'isolation

  // === Chauffage ===
  heating?: HeatingData;                    // Système de chauffage

  // === Eau chaude sanitaire ===
  hot_water_type?: string;
  hot_water_emission_gco2_kwh?: number;

  // === Ventilation ===
  ventilation_type?: string;                // VMC simple/double flux

  // === Métadonnées logement ===
  living_area: number;                      // Surface habitable (m²)
  apartment_type?: string;                  // T1, T2, T3, etc.
  apartment_number?: number;                // Numéro dans le projet
  floor_level?: number;                     // Étage
  construction_year?: number;
  nb_rooms?: number;

  // === Scénario de travaux ===
  scenario_number?: number;                 // 1, 2 ou 3
  scenario_type?: ScenarioType;
  estimated_cost?: number;                  // Coût TTC
  estimated_savings_per_year?: number;      // Économies annuelles

  // === Occupant (optionnel pour bailleurs) ===
  occupant?: OccupantData;

  // === OCR (préparation future) ===
  audit_document_url?: string;
  audit_ocr_data?: Record<string, any>;
  audit_date?: string;
  auditor_name?: string;
  auditor_certification?: string;
}
```

#### EnergyClass (enum)

Classes énergétiques DPE : `A`, `B`, `C`, `D`, `E`, `F`, `G`

#### InsulationData

```typescript
interface InsulationData {
  item: InsulationItem;           // WALLS, FLOOR, ROOF, WINDOWS
  total_surface: number;          // Surface totale (m²) - requis > 0
  isolated_surface: number;       // Surface isolée (m²) - requis >= 0
  r_value?: number;               // Résistance thermique R (m².K/W)
  isolation_type?: string;        // Type d'isolant
  thickness_cm?: number;          // Épaisseur (cm)

  // Propriété calculée
  coverage_ratio: number;         // isolated_surface / total_surface
}
```

#### InsulationItem (enum)

| Valeur | Description |
|--------|-------------|
| `WALLS` | Murs |
| `FLOOR` | Plancher bas |
| `ROOF` | Toiture / Combles |
| `WINDOWS` | Fenêtres / Menuiseries |

#### HeatingData

```typescript
interface HeatingData {
  status: HeatingStatus;          // NEW, KEPT, REPLACED
  emission_gco2_kwh: number;      // Émissions (gCO2eq/kWh) - requis >= 0
  heating_type?: string;          // PAC, chaudière gaz, etc.
  brand?: string;
  model?: string;
  power_kw?: number;
  cop?: number;                   // Pour PAC
  scop?: number;                  // Pour PAC
}
```

#### HeatingStatus (enum)

| Valeur | Description |
|--------|-------------|
| `NEW` | Nouveau chauffage installé |
| `KEPT` | Chauffage conservé |
| `REPLACED` | Chauffage remplacé |

#### OccupantData

```typescript
interface OccupantData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  is_tenant: boolean;             // Défaut: true
  has_provided_consent: boolean;  // Défaut: false
  move_in_date?: string;
}
```

---

## API Endpoints

Base URL: `/projects`

### CRUD Project

#### POST /projects

Créer un nouveau projet.

**Request Body:**
```json
{
  "name": "Les Balcons de la Brévenne",
  "client_id": "uuid-bailleur",
  "building_address": "Rue du Stade, 69610 Sainte-Foy-l'Argentière",
  "total_apartments": 50,
  "module_code": "BAR-TH-175",
  "data": {}
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-project",
  "tenant_id": "uuid-tenant",
  "client_id": "uuid-bailleur",
  "name": "Les Balcons de la Brévenne",
  "status": "DRAFT",
  "module_code": "BAR-TH-175",
  "building_address": "Rue du Stade, 69610 Sainte-Foy-l'Argentière",
  "total_apartments": 50,
  "data": {},
  "created_at": "2026-01-26T18:00:00Z",
  "updated_at": "2026-01-26T18:00:00Z",
  "archived_at": null
}
```

---

#### GET /projects

Lister les projets avec pagination et filtres.

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `client_id` | UUID | Filtrer par client (bailleur) |
| `status` | ProjectStatus | Filtrer par statut |
| `module_code` | string | Filtrer par code module |
| `page` | int | Numéro de page (défaut: 1) |
| `page_size` | int | Taille de page (défaut: 10, max: 100) |

**Response:** `200 OK`
```json
{
  "items": [ProjectResponse],
  "total": 42,
  "page": 1,
  "page_size": 10
}
```

---

#### GET /projects/{project_id}

Récupérer un projet par ID.

**Response:** `200 OK` → `ProjectResponse`

**Erreurs:**
- `404 Not Found` - Projet introuvable

---

#### PUT /projects/{project_id}

Mettre à jour un projet.

**Request Body:**
```json
{
  "name": "Nouveau nom",
  "status": "IN_PROGRESS",
  "building_address": "Nouvelle adresse",
  "total_apartments": 55,
  "data": {"key": "value"}
}
```

Tous les champs sont optionnels.

**Response:** `200 OK` → `ProjectResponse`

---

#### DELETE /projects/{project_id}

Supprimer un projet (soft delete).

Les `ModuleDraft` associés sont également archivés.

**Response:** `204 No Content`

---

### Opérations sur les appartements

#### POST /projects/{project_id}/bulk-drafts

Créer plusieurs appartements en masse.

**Request Body:**
```json
{
  "quantity": 35,
  "apartment_type": "T3",
  "common_data": {
    "living_area": 60,
    "initial_energy_class": "G",
    "floor_level": 2
  }
}
```

| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| `quantity` | int | 1-500 | Nombre d'appartements à créer |
| `apartment_type` | string | 1-50 chars | Type (T1, T2, T3, etc.) |
| `common_data` | object | - | Données communes à tous |

**Response:** `201 Created`
```json
{
  "created_count": 35,
  "project_id": "uuid-project",
  "draft_ids": ["uuid-1", "uuid-2", "..."]
}
```

---

#### GET /projects/{project_id}/drafts

Lister les appartements d'un projet.

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `apartment_type` | string | Filtrer par type (T1, T2, etc.) |
| `page` | int | Numéro de page (défaut: 1) |
| `page_size` | int | Taille de page (défaut: 50, max: 200) |

**Response:** `200 OK`
```json
{
  "items": [ModuleDraftResponse],
  "total": 50,
  "page": 1,
  "page_size": 50
}
```

---

#### GET /projects/{project_id}/stats

Récupérer les statistiques d'un projet.

**Response:** `200 OK`
```json
{
  "project_id": "uuid-project",
  "project_name": "Les Balcons de la Brévenne",
  "status": "IN_PROGRESS",
  "total_apartments": 50,
  "drafts_count": 50,
  "client_id": "uuid-bailleur",
  "building_address": "Rue du Stade, 69610"
}
```

---

### Propagation d'audit

#### PATCH /projects/{project_id}/propagate-audit

Propager les données d'audit d'un appartement de référence vers d'autres.

**Request Body:**
```json
{
  "source_draft_id": "uuid-draft-reference",
  "target_draft_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "fields_to_propagate": [
    "projected_energy_class",
    "insulation_items",
    "heating",
    "scenario_number"
  ]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `source_draft_id` | UUID | Draft contenant les données source |
| `target_draft_ids` | UUID[] | Drafts à mettre à jour |
| `fields_to_propagate` | string[] \| null | Champs à copier. Si `null`, copie tout sauf `apartment_number` |

**Response:** `200 OK`
```json
{
  "updated_count": 3,
  "updated_draft_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "skipped_draft_ids": []
}
```

**Notes:**
- Le draft source n'est jamais modifié
- Les drafts n'appartenant pas au projet sont ignorés
- `apartment_number` n'est jamais propagé (garde l'unicité)

---

### Validation d'éligibilité

#### POST /projects/{project_id}/drafts/{draft_id}/validate

Valider l'éligibilité BAR-TH-175 d'un appartement.

**Response:** `200 OK`
```json
{
  "is_eligible": true,
  "errors": [],
  "warnings": [
    "Le chauffage conservé émet 200 gCO2eq/kWh, ce qui dépasse le seuil pour un nouveau chauffage (150 gCO2eq/kWh)."
  ],
  "class_jump": 3,
  "class_jump_valid": true,
  "insulation_count": 3,
  "insulation_valid": true,
  "ghg_reduction_valid": true,
  "heating_valid": true
}
```

**Erreurs:**
- `404 Not Found` - Projet ou draft introuvable
- `400 Bad Request` - Draft n'appartient pas au projet ou données invalides

---

## Règles de validation

Le service `bar_th_175_service.validate_eligibility()` vérifie 4 règles d'éligibilité.

### Règle 1 : Saut de classe énergétique

**Condition :** `class_jump >= 2`

Le projet doit permettre un gain d'au moins 2 classes énergétiques.

| Initial | Cibles valides |
|---------|----------------|
| G | A, B, C, D, E |
| F | A, B, C, D |
| E | A, B, C |
| D | A, B |
| C | A |

**Erreur exemple:**
> Le saut de classe énergétique est insuffisant: G → F (gain de 1 classe). Minimum requis: 2 classes.

---

### Règle 2 : Postes d'isolation

**Conditions :**
- Au moins **2 postes d'isolation** parmi : Murs, Plancher bas, Toiture, Fenêtres
- Chaque poste doit avoir **>= 25% de couverture** (surface isolée / surface totale)

**Erreur exemple:**
> Nombre insuffisant de postes d'isolation qualifiés: 1. Minimum requis: 2 postes avec >= 25% de couverture chacun.

**Warning exemple:**
> Poste 'WALLS': couverture insuffisante (20.0% < 25% requis). Surface isolée: 40m² / Surface totale: 200m²

---

### Règle 3 : Réduction des émissions GES

**Condition :** `projected_ghg <= initial_ghg`

Les émissions après travaux ne peuvent pas dépasser les émissions initiales.

**Erreur exemple:**
> Les émissions GES après travaux (55.0 kgCO2/m²/an) ne peuvent pas dépasser les émissions initiales (50.0 kgCO2/m²/an). Augmentation constatée: +10.0%.

---

### Règle 4 : Système de chauffage

| Statut | Seuil max |
|--------|-----------|
| `NEW` (nouveau) | 150 gCO2eq/kWh |
| `REPLACED` (remplacé) | 150 gCO2eq/kWh |
| `KEPT` (conservé) | 300 gCO2eq/kWh |

**Erreur exemple (nouveau chauffage):**
> Le nouveau système de chauffage émet 200 gCO2eq/kWh. Maximum autorisé pour un nouveau chauffage: 150 gCO2eq/kWh.

**Warning exemple (chauffage conservé entre 150-300):**
> Le chauffage conservé émet 200 gCO2eq/kWh, ce qui dépasse le seuil pour un nouveau chauffage (150 gCO2eq/kWh). Envisager un remplacement pour une meilleure performance.

---

## Exemples d'utilisation

### Workflow complet

```bash
# 1. Créer un projet
curl -X POST /projects \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Résidence Les Lilas",
    "client_id": "uuid-bailleur",
    "building_address": "12 rue des Lilas, 69000 Lyon",
    "total_apartments": 24
  }'

# 2. Créer les appartements T2 (12 appartements)
curl -X POST /projects/{project_id}/bulk-drafts \
  -d '{
    "quantity": 12,
    "apartment_type": "T2",
    "common_data": {
      "living_area": 45,
      "initial_energy_class": "F",
      "initial_ghg": 65
    }
  }'

# 3. Créer les appartements T3 (12 appartements)
curl -X POST /projects/{project_id}/bulk-drafts \
  -d '{
    "quantity": 12,
    "apartment_type": "T3",
    "common_data": {
      "living_area": 65,
      "initial_energy_class": "F",
      "initial_ghg": 65
    }
  }'

# 4. Renseigner l'audit complet sur un T2 de référence
curl -X PUT /module-drafts/{draft_id_reference} \
  -d '{
    "data": {
      "initial_energy_class": "F",
      "initial_ghg": 65,
      "projected_energy_class": "C",
      "projected_ghg": 25,
      "living_area": 45,
      "apartment_type": "T2",
      "insulation_items": [
        {"item": "WALLS", "total_surface": 80, "isolated_surface": 80},
        {"item": "WINDOWS", "total_surface": 12, "isolated_surface": 12},
        {"item": "ROOF", "total_surface": 45, "isolated_surface": 45}
      ],
      "heating": {
        "status": "REPLACED",
        "emission_gco2_kwh": 50,
        "heating_type": "PAC air/eau"
      },
      "scenario_number": 1
    }
  }'

# 5. Valider l'éligibilité du draft de référence
curl -X POST /projects/{project_id}/drafts/{draft_id_reference}/validate

# 6. Propager l'audit vers tous les autres T2
curl -X PATCH /projects/{project_id}/propagate-audit \
  -d '{
    "source_draft_id": "{draft_id_reference}",
    "target_draft_ids": ["{uuid-t2-1}", "{uuid-t2-2}", "..."],
    "fields_to_propagate": [
      "projected_energy_class",
      "projected_ghg",
      "insulation_items",
      "heating",
      "scenario_number"
    ]
  }'

# 7. Valider tous les appartements
for draft_id in $ALL_DRAFT_IDS; do
  curl -X POST /projects/{project_id}/drafts/$draft_id/validate
done
```

---

## Fichiers sources

| Fichier | Description |
|---------|-------------|
| `app/models/project.py` | Modèle SQLAlchemy Project |
| `app/schemas/project.py` | Schémas Pydantic Project |
| `app/schemas/bar_th_175.py` | Schémas validation BAR-TH-175 |
| `app/services/project_service.py` | Service CRUD + bulk + propagate |
| `app/services/bar_th_175_service.py` | Service validation éligibilité |
| `app/api/routers/projects.py` | Endpoints API |
| `alembic/versions/a6b7c8d9e0f1_*.py` | Migration base de données |
