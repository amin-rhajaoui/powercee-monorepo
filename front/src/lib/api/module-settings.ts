import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type RoundingMode = "NONE" | "X90";

export interface FixedLineItem {
  description: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
}

export interface LegacyGridRule {
  brand: string;
  etas_min: number;
  etas_max: number;
  surface_min: number;
  surface_max: number | null;
  mpr_profile: string;
  rac_amount: number;
}

export interface ModuleSettings {
  id: string;
  tenant_id: string;
  module_code: string;
  enable_legacy_grid_rules: boolean;
  rounding_mode: RoundingMode;
  min_margin_amount: number;
  max_rac_addon: number | null;
  default_labor_product_ids: string[];
  fixed_line_items: FixedLineItem[];
  legacy_grid_rules: LegacyGridRule[] | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleSettingsUpdate {
  enable_legacy_grid_rules?: boolean;
  rounding_mode?: RoundingMode;
  min_margin_amount?: number;
  max_rac_addon?: number | null;
  default_labor_product_ids?: string[];
  fixed_line_items?: FixedLineItem[];
  legacy_grid_rules?: LegacyGridRule[] | null;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getModuleSettings(moduleCode: string): Promise<ModuleSettings> {
  const res = await api.get(`/module-settings/${moduleCode}`);
  return res.json();
}

export async function updateModuleSettings(
  moduleCode: string,
  data: ModuleSettingsUpdate
): Promise<ModuleSettings> {
  const res = await api.put(`/module-settings/${moduleCode}`, data as any);
  return res.json();
}

export async function patchModuleSettings(
  moduleCode: string,
  data: Partial<ModuleSettingsUpdate>
): Promise<ModuleSettings> {
  const res = await api.patch(`/module-settings/${moduleCode}`, data as any);
  return res.json();
}
