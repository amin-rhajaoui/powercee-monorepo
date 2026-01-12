import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type TechnicalSurvey = {
  folder_id: string;
  tenant_id: string;
  photo_house: string | null;
  photo_facade: string | null;
  photo_old_system: string | null;
  photo_electric_panel: string | null;
  has_linky: boolean | null;
  photo_linky: string | null;
  photo_breaker: string | null;
  created_at: string;
  updated_at: string;
};

export type TechnicalSurveyUpdate = {
  photo_house?: string | null;
  photo_facade?: string | null;
  photo_old_system?: string | null;
  photo_electric_panel?: string | null;
  has_linky?: boolean | null;
  photo_linky?: string | null;
  photo_breaker?: string | null;
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Récupérer ou créer un technical survey pour un dossier.
 * Le backend crée un survey vide s'il n'existe pas.
 */
export async function getTechnicalSurvey(
  folderId: string
): Promise<TechnicalSurvey> {
  const res = await api.get(`/folders/${folderId}/technical-survey`);
  return res.json();
}

/**
 * Créer ou mettre à jour le technical survey pour un dossier.
 */
export async function updateTechnicalSurvey(
  folderId: string,
  payload: TechnicalSurveyUpdate
): Promise<TechnicalSurvey> {
  const res = await api.put(`/folders/${folderId}/technical-survey`, payload);
  return res.json();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Vérifie si tous les champs requis du technical survey sont présents.
 * - Les 4 photos standard sont toujours requises
 * - Si has_linky === true, photo_linky est requis
 * - Si has_linky === false, photo_breaker est requis
 */
export function isTechnicalSurveyComplete(
  survey: TechnicalSurvey | null | undefined
): boolean {
  if (!survey) return false;

  // Vérifier les 4 photos standard
  if (
    !survey.photo_house ||
    !survey.photo_facade ||
    !survey.photo_old_system ||
    !survey.photo_electric_panel
  ) {
    return false;
  }

  // Vérifier la logique conditionnelle Linky
  if (survey.has_linky === true) {
    return !!survey.photo_linky;
  } else if (survey.has_linky === false) {
    return !!survey.photo_breaker;
  }

  // Si has_linky n'est pas défini, le survey n'est pas complet
  return false;
}
