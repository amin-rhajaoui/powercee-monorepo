import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type OperationCategory = "RESIDENTIAL" | "PROFESSIONAL";

export type CEEOperation = {
  code: string;
  name: string;
  description: string;
  category: OperationCategory;
};

export type CEEValuation = {
  id: string;
  tenant_id: string;
  operation_code: string;
  is_residential: boolean;
  value_standard: number | null;
  value_blue: number | null;
  value_yellow: number | null;
  value_violet: number | null;
  value_rose: number | null;
  created_at: string;
  updated_at: string;
};

export type CEEValuationWithOperation = {
  operation: CEEOperation;
  valuation: CEEValuation | null;
};

export type CEEValuationsListResponse = {
  items: CEEValuationWithOperation[];
};

export type CEEValuationCreate = {
  operation_code: string;
  is_residential: boolean;
  value_standard?: number | null;
  value_blue?: number | null;
  value_yellow?: number | null;
  value_violet?: number | null;
  value_rose?: number | null;
};

export type CEEValuationsBulkUpdate = {
  valuations: CEEValuationCreate[];
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Recuperer toutes les valorisations CEE du tenant.
 */
export async function getValuations(): Promise<CEEValuationsListResponse> {
  const res = await api.get("/valuation");
  return res.json();
}

/**
 * Sauvegarder ou mettre a jour plusieurs valorisations CEE.
 */
export async function saveValuations(
  payload: CEEValuationsBulkUpdate
): Promise<CEEValuation[]> {
  const res = await api.post("/valuation", payload);
  return res.json();
}

/**
 * Recuperer la liste des operations CEE supportees.
 */
export async function getOperations(): Promise<CEEOperation[]> {
  const res = await api.get("/valuation/operations");
  return res.json();
}
