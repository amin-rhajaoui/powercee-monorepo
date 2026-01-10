import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type SizingRequest = {
  surface_chauffee?: number | null;
  hauteur_plafond?: number | null;
  temperature_consigne?: number | null;
  type_emetteur_override?: "BT" | "MT_HT" | null;
  type_isolation_override?: "faible" | "bonne" | "tres_bonne" | null;
  combles_isole?: boolean | null;
  combles_annee?: number | null;
  plancher_isole?: boolean | null;
  plancher_annee?: number | null;
  murs_type?: "AUCUNE" | "INTERIEUR" | "EXTERIEUR" | "DOUBLE" | null;
  murs_annee_interieur?: number | null;
  murs_annee_exterieur?: number | null;
  menuiserie_type?: "SIMPLE" | "DOUBLE_OLD" | "DOUBLE_RECENT" | null;
};

export type SizingResponse = {
  Puissance_Estimee_kW: number;
  Besoins_Chaleur_Annuel_kWh: number;
  Taux_Couverture: number;
  Regime_Temperature: string;
  Intermediate_Calculations: {
    g_base: number;
    facteur_isolation: number;
    teb: number;
    delta_t: number;
    volume_chauffe_m3: number;
    facteur_correction_emetteur: number;
    puissance_watts: number;
    puissance_kw_brut: number;
    dju: number;
    besoins_annuels_kwh_brut: number;
    temperature_interieure: number;
    isolation_details?: Record<string, unknown>;
  };
  Details_Calcul: {
    Volume_Chauffe_m3: number;
    G_Coefficient_Wm3K: number;
    Delta_T_K: number;
    Facteur_Correction_Emetteur: number;
    Puissance_Watts_Brute: number;
    Puissance_kW_Brute: number;
    Teb_Ajustee: number;
  };
  Parametres_Entree: {
    Surface: number;
    Hauteur: number;
    Annee: number;
    Isolation: string;
    Zone_Climatique: string;
    Emetteur: string;
    Temperature_Consigne: number;
    Temp_De_Base: number | null;
  };
};

export type SizingPdfRequest = {
  sizing_params?: SizingRequest | null;
  selected_pump?: Record<string, unknown> | null;
  selected_heater?: Record<string, unknown> | null;
  thermostat_details?: Record<string, unknown> | null;
};

// ============================================================================
// API Functions
// ============================================================================

export async function calculateSizing(
  folderId: string,
  params: SizingRequest
): Promise<SizingResponse> {
  const res = await api.post(`/folders/${folderId}/sizing/calculate`, params);
  return res.json();
}

export async function generateSizingPdf(
  folderId: string,
  params: SizingPdfRequest
): Promise<Blob> {
  const res = await api.post(`/folders/${folderId}/sizing/generate-pdf`, params, {
    // Important: pour recevoir un blob (PDF)
    headers: {
      Accept: "application/pdf",
    },
  });

  // Récupérer le blob depuis la réponse
  const blob = await res.blob();
  return blob;
}

export type SaveSizingPdfResponse = {
  pdf_url: string;
  message: string;
};

export async function saveSizingPdf(
  folderId: string,
  params: SizingPdfRequest
): Promise<SaveSizingPdfResponse> {
  const res = await api.post(`/folders/${folderId}/sizing/save-pdf`, params);
  return res.json();
}

// ============================================================================
// Compatible PACs Types
// ============================================================================

export type CompatiblePac = {
  id: string;
  name: string;
  brand: string;
  reference: string;
  price_ht: number;
  image_url: string | null;
  puissance_moins_7: number | null;
  etas_35: number | null;
  etas_55: number | null;
  usage: string;
  alimentation: string;
  class_regulator: string | null;
  refrigerant_type: string | null;
  noise_level: number | null;
};

export type CompatiblePacsResponse = {
  pacs: CompatiblePac[];
  total: number;
};

// ============================================================================
// Compatible PACs API
// ============================================================================

export async function getCompatiblePacs(
  folderId: string
): Promise<CompatiblePacsResponse> {
  const res = await api.get(`/folders/${folderId}/compatible-pacs`);
  return res.json();
}
