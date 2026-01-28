import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type IntegrationType = "yousign";

export type Integration = {
  id: string;
  tenant_id: string;
  integration_type: IntegrationType;
  api_key_masked: string;
  is_active: boolean;
  config: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationTypeInfo = {
  type: IntegrationType;
  name: string;
  description: string;
  configured: boolean;
  is_active: boolean | null;
};

export type IntegrationCreate = {
  integration_type: IntegrationType;
  api_key: string;
  config?: string | null;
};

export type IntegrationUpdate = {
  api_key?: string;
  is_active?: boolean;
  config?: string | null;
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Recuperer tous les types d'integrations disponibles avec leur statut.
 */
export async function getIntegrationTypes(): Promise<IntegrationTypeInfo[]> {
  const res = await api.get("/integrations/types");
  return res.json();
}

/**
 * Recuperer toutes les integrations configurees.
 */
export async function getIntegrations(): Promise<Integration[]> {
  const res = await api.get("/integrations");
  return res.json();
}

/**
 * Recuperer une integration par son type.
 */
export async function getIntegration(
  type: IntegrationType
): Promise<Integration> {
  const res = await api.get(`/integrations/${type}`);
  return res.json();
}

/**
 * Creer ou mettre a jour une integration.
 */
export async function createIntegration(
  data: IntegrationCreate
): Promise<Integration> {
  const res = await api.post("/integrations", data);
  return res.json();
}

/**
 * Mettre a jour une integration existante.
 */
export async function updateIntegration(
  type: IntegrationType,
  data: IntegrationUpdate
): Promise<Integration> {
  const res = await api.patch(`/integrations/${type}`, data);
  return res.json();
}

/**
 * Supprimer une integration.
 */
export async function deleteIntegration(type: IntegrationType): Promise<void> {
  await api.delete(`/integrations/${type}`);
}
