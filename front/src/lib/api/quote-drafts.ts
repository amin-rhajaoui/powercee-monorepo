import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export interface QuoteLine {
  product_id: string | null;
  title: string;
  description: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
  total_ht: number;
  total_ttc: number;
  is_editable: boolean;
}

export interface QuoteDraft {
  id: string;
  name: string;
  folder_id: string;
  module_code: string;
  product_ids: string[];
  lines: QuoteLine[];
  total_ht: number;
  total_ttc: number;
  rac_ttc: number;
  cee_prime: number;
  margin_ht: number;
  margin_percent: number;
  strategy_used: string;
  warnings: string[];
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteDraftCreate {
  name: string;
  folder_id: string;
  module_code: string;
  product_ids: string[];
  lines: QuoteLine[];
  total_ht: number;
  total_ttc: number;
  rac_ttc: number;
  cee_prime: number;
  margin_ht: number;
  margin_percent: number;
  strategy_used: string;
  warnings: string[];
}

export interface QuoteDraftUpdate {
  name?: string;
  product_ids?: string[];
  lines?: QuoteLine[];
  total_ht?: number;
  total_ttc?: number;
  rac_ttc?: number;
  cee_prime?: number;
  margin_ht?: number;
  margin_percent?: number;
  strategy_used?: string;
  warnings?: string[];
}

export interface QuoteDraftListResponse {
  drafts: QuoteDraft[];
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Liste les brouillons de devis d'un dossier
 */
export async function listQuoteDrafts(folderId: string): Promise<QuoteDraftListResponse> {
  const response = await api.get(`quote-drafts?folder_id=${folderId}`);
  return response.json();
}

/**
 * Récupère un brouillon de devis spécifique
 */
export async function getQuoteDraft(draftId: string): Promise<QuoteDraft> {
  const response = await api.get(`quote-drafts/${draftId}`);
  return response.json();
}

/**
 * Crée un nouveau brouillon de devis
 */
export async function createQuoteDraft(draft: QuoteDraftCreate): Promise<QuoteDraft> {
  const response = await api.post("quote-drafts", draft as any);
  return response.json();
}

/**
 * Met à jour un brouillon de devis
 */
export async function updateQuoteDraft(
  draftId: string,
  draft: QuoteDraftUpdate
): Promise<QuoteDraft> {
  const response = await api.put(`quote-drafts/${draftId}`, draft as any);
  return response.json();
}

/**
 * Supprime un brouillon de devis
 */
export async function deleteQuoteDraft(draftId: string): Promise<void> {
  await api.delete(`quote-drafts/${draftId}`);
}

/**
 * Génère automatiquement un nom de brouillon basé sur la date
 */
export function generateDraftName(): string {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Brouillon du ${date} ${time}`;
}
