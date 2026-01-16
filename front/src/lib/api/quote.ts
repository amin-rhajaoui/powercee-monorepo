import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export interface QuoteLine {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
  total_ht: number;
  total_ttc: number;
  is_editable: boolean;
}

export interface QuotePreview {
  lines: QuoteLine[];
  total_ht: number;
  total_ttc: number;
  cee_prime: number;
  rac_ttc: number;
  margin_ht: number;
  margin_percent: number;
  strategy_used: "LEGACY_GRID" | "COST_PLUS";
  warnings: string[];
}

export interface SimulateQuoteRequest {
  folder_id: string;
  product_ids: string[];
  target_rac?: number;
}

// ============================================================================
// API Functions
// ============================================================================

export async function simulateQuote(
  moduleCode: string,
  request: SimulateQuoteRequest
): Promise<QuotePreview> {
  const res = await api.post(`/quote/modules/${moduleCode}/simulate`, request);
  return res.json();
}
