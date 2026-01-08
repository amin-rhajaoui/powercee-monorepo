import { api } from "@/lib/api";

// ============================================================================
// Enums pour les champs BAR-TH-171
// ============================================================================

export type OccupationStatus = "PROPRIETAIRE" | "LOCATAIRE";

export type HeatingSystem = "FIOUL" | "GAZ" | "CHARBON" | "BOIS" | "ELECTRIQUE";

export type WaterHeatingType =
  | "BALLON_ELECTRIQUE"
  | "CHAUFFE_EAU_GAZ"
  | "CHAUFFE_EAU_THERMODYNAMIQUE"
  | "AUTRE";

export type ElectricalPhase = "MONOPHASE" | "TRIPHASE";

export type UsageMode = "HEATING_ONLY" | "HEATING_AND_HOT_WATER";

// ============================================================================
// Enums pour BAR-TH-171 - Étape 4 : Visite Technique
// ============================================================================

export type AtticType = "PERDUS" | "HABITES";

export type FloorType = "CAVE" | "VIDE_SANITAIRE" | "TERRE_PLEIN";

export type WallIsolationType = "AUCUNE" | "INTERIEUR" | "EXTERIEUR" | "DOUBLE";

export type JoineryType = "SIMPLE" | "DOUBLE_OLD" | "DOUBLE_RECENT";

export type EmitterType = "FONTE" | "RADIATEURS" | "PLANCHER_CHAUFFANT";

export type LevelEmitters = {
  level: number;
  emitters: EmitterType[];
};

// ============================================================================
// Types
// ============================================================================

export type ModuleDraft = {
  id: string;
  tenant_id: string;
  module_code: string;
  client_id: string | null;
  property_id: string | null;
  current_step: number;
  data: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Champs spécifiques BAR-TH-171 - Étape 2
  is_principal_residence: boolean | null;
  occupation_status: OccupationStatus | null;
  heating_system: HeatingSystem | null;
  old_boiler_brand: string | null;
  is_water_heating_linked: boolean | null;
  water_heating_type: WaterHeatingType | null;
  usage_mode: UsageMode | null;
  electrical_phase: ElectricalPhase | null;
  power_kva: number | null;
  // Champs spécifiques BAR-TH-171 - Étape 3 : Documents administratifs
  tax_notice_url: string | null;
  address_proof_url: string | null;
  property_proof_url: string | null;
  energy_bill_url: string | null;
  reference_tax_income: number | null;
  household_size: number | null;
  // Champs spécifiques BAR-TH-171 - Étape 4 : Visite Technique
  nb_levels: number | null;
  avg_ceiling_height: number | null;
  target_temperature: number | null;
  attic_type: AtticType | null;
  is_attic_isolated: boolean | null;
  attic_isolation_year: number | null;
  floor_type: FloorType | null;
  is_floor_isolated: boolean | null;
  floor_isolation_year: number | null;
  wall_isolation_type: WallIsolationType | null;
  wall_isolation_year_interior: number | null;
  wall_isolation_year_exterior: number | null;
  joinery_type: JoineryType | null;
  emitters_configuration: LevelEmitters[] | null;
};

export type ModuleDraftCreate = {
  module_code: string;
  client_id?: string | null;
  property_id?: string | null;
  current_step?: number;
  data?: Record<string, unknown>;
};

export type ModuleDraftUpdate = {
  client_id?: string | null;
  property_id?: string | null;
  current_step?: number;
  data?: Record<string, unknown>;
  // Champs spécifiques BAR-TH-171 - Étape 2
  is_principal_residence?: boolean | null;
  occupation_status?: OccupationStatus | null;
  heating_system?: HeatingSystem | null;
  old_boiler_brand?: string | null;
  is_water_heating_linked?: boolean | null;
  water_heating_type?: WaterHeatingType | null;
  usage_mode?: UsageMode | null;
  electrical_phase?: ElectricalPhase | null;
  power_kva?: number | null;
  // Champs spécifiques BAR-TH-171 - Étape 3 : Documents administratifs
  tax_notice_url?: string | null;
  address_proof_url?: string | null;
  property_proof_url?: string | null;
  energy_bill_url?: string | null;
  reference_tax_income?: number | null;
  household_size?: number | null;
  // Champs spécifiques BAR-TH-171 - Étape 4 : Visite Technique
  nb_levels?: number | null;
  avg_ceiling_height?: number | null;
  target_temperature?: number | null;
  attic_type?: AtticType | null;
  is_attic_isolated?: boolean | null;
  attic_isolation_year?: number | null;
  floor_type?: FloorType | null;
  is_floor_isolated?: boolean | null;
  floor_isolation_year?: number | null;
  wall_isolation_type?: WallIsolationType | null;
  wall_isolation_year_interior?: number | null;
  wall_isolation_year_exterior?: number | null;
  joinery_type?: JoineryType | null;
  emitters_configuration?: LevelEmitters[] | null;
};

export type PaginatedModuleDrafts = {
  items: ModuleDraft[];
  total: number;
  page: number;
  page_size: number;
};

export async function createModuleDraft(payload: ModuleDraftCreate): Promise<ModuleDraft> {
  const res = await api.post("/module-drafts", payload);
  return res.json();
}

export async function getModuleDraft(draftId: string): Promise<ModuleDraft> {
  const res = await api.get(`/module-drafts/${draftId}`);
  return res.json();
}

export async function updateModuleDraft(draftId: string, payload: ModuleDraftUpdate): Promise<ModuleDraft> {
  const res = await api.put(`/module-drafts/${draftId}`, payload);
  return res.json();
}

export async function listModuleDrafts(params: {
  page?: number;
  pageSize?: number;
  module_code?: string;
  client_id?: string;
}): Promise<PaginatedModuleDrafts> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.module_code) searchParams.set("module_code", params.module_code);
  if (params.client_id) searchParams.set("client_id", params.client_id);

  const res = await api.get(`/module-drafts?${searchParams.toString()}`);
  return res.json();
}

export async function deleteModuleDraft(draftId: string): Promise<void> {
  await api.delete(`/module-drafts/${draftId}`);
}

