import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type InstallationRecommendation = {
  id: string;
  tenant_id: string;
  folder_id: string;
  access_recommendations: string | null;
  indoor_unit_recommendations: string | null;
  outdoor_unit_recommendations: string | null;
  safety_recommendations: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
};

export type InstallationRecommendationCreate = {
  access_recommendations?: string | null;
  indoor_unit_recommendations?: string | null;
  outdoor_unit_recommendations?: string | null;
  safety_recommendations?: string | null;
  photo_urls?: string[] | null;
};

export type InstallationRecommendationUpdate = InstallationRecommendationCreate;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Recuperer les preconisations d'installation pour un dossier.
 * Retourne null si aucune preconisation n'existe.
 */
export async function getRecommendation(
  folderId: string
): Promise<InstallationRecommendation | null> {
  const res = await api.get(`/recommendations/folder/${folderId}`);
  const data = await res.json();
  return data;
}

/**
 * Creer les preconisations d'installation pour un dossier.
 */
export async function createRecommendation(
  folderId: string,
  payload: InstallationRecommendationCreate
): Promise<InstallationRecommendation> {
  const res = await api.post(`/recommendations/folder/${folderId}`, payload as any);
  return res.json();
}

/**
 * Mettre a jour les preconisations d'installation pour un dossier.
 */
export async function updateRecommendation(
  folderId: string,
  payload: InstallationRecommendationUpdate
): Promise<InstallationRecommendation> {
  const res = await api.put(`/recommendations/folder/${folderId}`, payload as any);
  return res.json();
}

/**
 * Supprimer les preconisations d'installation pour un dossier.
 */
export async function deleteRecommendation(folderId: string): Promise<void> {
  await api.delete(`/recommendations/folder/${folderId}`);
}

/**
 * Creer ou mettre a jour les preconisations d'installation pour un dossier.
 * Fonction utilitaire qui utilise PUT (upsert pattern).
 */
export async function saveRecommendation(
  folderId: string,
  payload: InstallationRecommendationUpdate
): Promise<InstallationRecommendation> {
  const res = await api.put(`/recommendations/folder/${folderId}`, payload as any);
  return res.json();
}
