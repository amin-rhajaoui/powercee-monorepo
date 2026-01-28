// ============================================================================
// Enums
// ============================================================================

export type ProjectStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "AUDIT_PENDING"
  | "VALIDATED"
  | "COMPLETED"
  | "ARCHIVED";

export type EnergyClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type InsulationItem = "WALLS" | "FLOOR" | "ROOF" | "WINDOWS";

export type HeatingStatus = "NEW" | "KEPT" | "REPLACED";

export type ScenarioType = "SCENARIO_1" | "SCENARIO_2" | "SCENARIO_3";

// ============================================================================
// Types de base - Project
// ============================================================================

export type Project = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  name: string;
  status: ProjectStatus;
  module_code: string;
  building_address: string | null;
  total_apartments: number | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ProjectCreate = {
  name: string;
  client_id?: string | null;
  building_address?: string | null;
  total_apartments?: number | null;
  module_code?: string;
  data?: Record<string, unknown>;
};

export type ProjectUpdate = {
  name?: string | null;
  client_id?: string | null;
  building_address?: string | null;
  total_apartments?: number | null;
  status?: ProjectStatus | null;
  data?: Record<string, unknown> | null;
};

export type ProjectResponse = Project;

export type PaginatedProjectsResponse = {
  items: ProjectResponse[];
  total: number;
  page: number;
  page_size: number;
};

// ============================================================================
// Types pour les opérations sur les projets
// ============================================================================

export type BulkDraftsCreate = {
  quantity: number;
  apartment_type: string;
  common_data?: Record<string, unknown>;
};

export type BulkDraftsResponse = {
  created_count: number;
  project_id: string;
  draft_ids: string[];
};

export type PropagateAuditRequest = {
  source_draft_id: string;
  target_draft_ids: string[];
  fields_to_propagate?: string[] | null;
};

export type PropagateAuditResponse = {
  updated_count: number;
  updated_draft_ids: string[];
  skipped_draft_ids: string[];
};

// ============================================================================
// Types BAR-TH-175 - Données d'audit
// ============================================================================

export type InsulationData = {
  item: InsulationItem;
  total_surface: number;
  isolated_surface: number;
  r_value?: number | null;
  isolation_type?: string | null;
  thickness_cm?: number | null;
  coverage_ratio?: number; // Propriété calculée côté backend
};

export type HeatingData = {
  status: HeatingStatus;
  emission_gco2_kwh: number;
  heating_type?: string | null;
  brand?: string | null;
  model?: string | null;
  power_kw?: number | null;
  cop?: number | null;
  scop?: number | null;
};

export type OccupantData = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_tenant?: boolean;
  has_provided_consent?: boolean;
  move_in_date?: string | null;
};

export type BarTh175AuditData = {
  // === État initial ===
  initial_energy_class: EnergyClass;
  initial_ghg: number;
  initial_consumption_kwh_m2?: number | null;

  // === État projeté après travaux ===
  projected_energy_class: EnergyClass;
  projected_ghg: number;
  projected_consumption_kwh_m2?: number | null;

  // === Isolation ===
  insulation_items?: InsulationData[];

  // === Chauffage ===
  heating?: HeatingData | null;

  // === Eau chaude sanitaire ===
  hot_water_type?: string | null;
  hot_water_emission_gco2_kwh?: number | null;

  // === Ventilation ===
  ventilation_type?: string | null;

  // === Métadonnées logement ===
  living_area: number;
  apartment_type?: string | null;
  apartment_number?: number | null;
  floor_level?: number | null;
  construction_year?: number | null;
  nb_rooms?: number | null;

  // === Scénario de travaux ===
  scenario_number?: number | null;
  scenario_type?: ScenarioType | null;
  estimated_cost?: number | null;
  estimated_savings_per_year?: number | null;

  // === Occupant (optionnel pour bailleurs) ===
  occupant?: OccupantData | null;

  // === Champs pour OCR (préparation future) ===
  audit_document_url?: string | null;
  audit_ocr_data?: Record<string, unknown> | null;
  audit_date?: string | null;
  auditor_name?: string | null;
  auditor_certification?: string | null;
};

// ============================================================================
// Types de validation BAR-TH-175
// ============================================================================

export type BarTh175ValidationResult = {
  is_eligible: boolean;
  errors: string[];
  warnings: string[];
  class_jump: number;
  class_jump_valid: boolean;
  insulation_count: number;
  insulation_valid: boolean;
  ghg_reduction_valid: boolean;
  heating_valid: boolean;
};

// ============================================================================
// Types pour les statistiques
// ============================================================================

export type ProjectStats = {
  project_id: string;
  project_name: string;
  status: ProjectStatus;
  total_apartments: number | null;
  drafts_count: number;
  client_id: string | null;
  building_address: string | null;
};
