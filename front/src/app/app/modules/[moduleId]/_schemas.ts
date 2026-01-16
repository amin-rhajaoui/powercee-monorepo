import { z } from "zod";

// Étape 1 : Informations du foyer
export const step1HouseholdSchema = z.object({
  client_id: z.string().uuid("Un client doit être sélectionné"),
});

export type Step1HouseholdValues = z.infer<typeof step1HouseholdSchema>;

// ============================================================================
// ÉTAPE 2 : Informations du logement (avec pattern registre par module)
// ============================================================================

// Schéma de base commun à tous les modules
export const baseStep2PropertySchema = z.object({
  property_id: z.string().uuid("Un logement doit être sélectionné"),
});

export type BaseStep2PropertyValues = z.infer<typeof baseStep2PropertySchema>;

// ============================================================================
// Enums pour BAR-TH-171
// ============================================================================

export const occupationStatusEnum = z.enum(["PROPRIETAIRE", "LOCATAIRE"]);
export type OccupationStatus = z.infer<typeof occupationStatusEnum>;

export const heatingSystemEnum = z.enum(["FIOUL", "GAZ", "CHARBON", "BOIS", "ELECTRIQUE"]);
export type HeatingSystem = z.infer<typeof heatingSystemEnum>;

export const waterHeatingTypeEnum = z.enum([
  "BALLON_ELECTRIQUE",
  "CHAUFFE_EAU_GAZ",
  "CHAUFFE_EAU_THERMODYNAMIQUE",
  "AUTRE",
]);
export type WaterHeatingType = z.infer<typeof waterHeatingTypeEnum>;

export const electricalPhaseEnum = z.enum(["MONOPHASE", "TRIPHASE"]);
export type ElectricalPhase = z.infer<typeof electricalPhaseEnum>;

export const usageModeEnum = z.enum(["HEATING_ONLY", "HEATING_AND_HOT_WATER"]);
export type UsageMode = z.infer<typeof usageModeEnum>;

// ============================================================================
// Schéma spécifique BAR-TH-171
// ============================================================================

export const barTh171Step2Schema = baseStep2PropertySchema
  .extend({
    // Résidence principale
    is_principal_residence: z.boolean().optional(),
    occupation_status: occupationStatusEnum.optional(),

    // Système de chauffage
    heating_system: heatingSystemEnum.optional(),
    old_boiler_brand: z.string().max(100).optional(),

    // Eau chaude sanitaire
    is_water_heating_linked: z.boolean().optional(),
    water_heating_type: waterHeatingTypeEnum.optional(),
    usage_mode: usageModeEnum.optional(),

    // Compteur électrique
    electrical_phase: electricalPhaseEnum.optional(),
    power_kva: z.number().min(3).max(36).optional(),
  })
  .refine(
    (data) => {
      // Validation : is_principal_residence doit être true
      if (data.is_principal_residence === false) {
        return false;
      }
      return true;
    },
    {
      message: "Le logement doit être la résidence principale pour être éligible au dispositif BAR-TH-171",
      path: ["is_principal_residence"],
    }
  )
  .refine(
    (data) => {
      // Validation : heating_system ne doit pas être ELECTRIQUE
      if (data.heating_system === "ELECTRIQUE") {
        return false;
      }
      return true;
    },
    {
      message: "Le chauffage ne doit pas être électrique pour être éligible au dispositif BAR-TH-171",
      path: ["heating_system"],
    }
  )
  .refine(
    (data) => {
      // Validation : water_heating_type requis si is_water_heating_linked === false
      if (data.is_water_heating_linked === false && !data.water_heating_type) {
        return false;
      }
      return true;
    },
    {
      message: "Le système actuel de production d'eau chaude est requis lorsque l'eau chaude n'est pas produite par le système de chauffage",
      path: ["water_heating_type"],
    }
  )
  .refine(
    (data) => {
      // Validation : usage_mode requis si is_water_heating_linked === false
      if (data.is_water_heating_linked === false && !data.usage_mode) {
        return false;
      }
      return true;
    },
    {
      message: "Le mode d'usage souhaité est requis lorsque l'eau chaude n'est pas produite par le système de chauffage",
      path: ["usage_mode"],
    }
  );

export type BarTh171Step2Values = z.infer<typeof barTh171Step2Schema>;

// Registre des schémas Step2 par code module
export const step2SchemaRegistry = {
  "BAR-TH-171": barTh171Step2Schema,
  // Futurs modules :
  // "BAR-TH-XXX": barThXxxStep2Schema,
} as const;

export type Step2ModuleCode = keyof typeof step2SchemaRegistry;

// Helper pour récupérer le schéma Step2 selon le module
export function getStep2Schema(moduleCode: string) {
  return step2SchemaRegistry[moduleCode as Step2ModuleCode] ?? baseStep2PropertySchema;
}

// Alias pour rétrocompatibilité
export const step2PropertySchema = baseStep2PropertySchema;
export type Step2PropertyValues = BaseStep2PropertyValues;

// ============================================================================
// ÉTAPE 3 : Documents administratifs (BAR-TH-171)
// ============================================================================

export const barTh171Step3Schema = z.object({
  // Avis d'imposition
  tax_notice_url: z.string().optional(),

  // Question : l'adresse de l'avis correspond-elle à l'adresse des travaux ?
  is_address_same_as_works: z.boolean().optional(),

  // Justificatif de domicile (si adresse différente)
  address_proof_url: z.string().optional(),

  // Taxe foncière ou acte notarié (si propriétaire)
  property_proof_url: z.string().optional(),

  // Facture d'énergie (optionnel)
  energy_bill_url: z.string().optional(),

  // Revenu fiscal de référence
  reference_tax_income: z.number().int().positive().optional(),

  // Nombre de personnes dans le foyer fiscal
  household_size: z.number().int().min(1).max(20).optional(),
});

export type BarTh171Step3Values = z.infer<typeof barTh171Step3Schema>;

// Alias pour rétrocompatibilité (ancien schéma visite technique)
export const step3TechnicalVisitSchema = barTh171Step3Schema;
export type Step3TechnicalVisitValues = BarTh171Step3Values;

// ============================================================================
// Enums pour BAR-TH-171 - Étape 4 : Visite Technique
// ============================================================================

export const atticTypeEnum = z.enum(["PERDUS", "HABITES"]);
export type AtticType = z.infer<typeof atticTypeEnum>;

export const floorTypeEnum = z.enum(["CAVE", "VIDE_SANITAIRE", "TERRE_PLEIN"]);
export type FloorType = z.infer<typeof floorTypeEnum>;

export const wallIsolationTypeEnum = z.enum(["AUCUNE", "INTERIEUR", "EXTERIEUR", "DOUBLE"]);
export type WallIsolationType = z.infer<typeof wallIsolationTypeEnum>;

export const joineryTypeEnum = z.enum(["SIMPLE", "DOUBLE_OLD", "DOUBLE_RECENT"]);
export type JoineryType = z.infer<typeof joineryTypeEnum>;

export const emitterTypeEnum = z.enum(["FONTE", "RADIATEURS", "PLANCHER_CHAUFFANT"]);
export type EmitterType = z.infer<typeof emitterTypeEnum>;

// Schema for emitters per level
export const levelEmittersSchema = z.object({
  level: z.number().int().min(0).max(4),
  emitters: z.array(emitterTypeEnum),
});

export type LevelEmitters = z.infer<typeof levelEmittersSchema>;

// ============================================================================
// Schéma BAR-TH-171 - Étape 4 : Visite Technique
// ============================================================================

export const barTh171Step4Schema = z.object({
  // Chauffage
  nb_levels: z.number().int().min(1).max(5).optional(),
  avg_ceiling_height: z.number({ message: "La hauteur sous plafond est requise pour le dimensionnement" }).min(1.5, "Minimum 1.5m").max(6, "Maximum 6m"),
  target_temperature: z.number().int().min(15).max(25).optional(),
  emitters_configuration: z.array(levelEmittersSchema).optional(),

  // Enveloppe - Combles
  attic_type: atticTypeEnum.optional(),
  is_attic_isolated: z.boolean().optional(),
  attic_isolation_year: z.number().int().min(1900).max(2030).optional(),

  // Enveloppe - Plancher bas
  floor_type: floorTypeEnum.optional(),
  is_floor_isolated: z.boolean().optional(),
  floor_isolation_year: z.number().int().min(1900).max(2030).optional(),

  // Enveloppe - Murs
  wall_isolation_type: wallIsolationTypeEnum.optional(),
  wall_isolation_year_interior: z.number().int().min(1900).max(2030).optional(),
  wall_isolation_year_exterior: z.number().int().min(1900).max(2030).optional(),
  wall_same_year: z.boolean().optional(), // Helper field for UI

  // Menuiseries
  joinery_type: joineryTypeEnum.optional(),
})
  // Conditional: attic_isolation_year required if is_attic_isolated
  .refine(
    (data) => {
      if (data.is_attic_isolated === true && !data.attic_isolation_year) {
        return false;
      }
      return true;
    },
    {
      message: "L'année d'isolation des combles est requise",
      path: ["attic_isolation_year"],
    }
  )
  // Conditional: floor_isolation_year required if is_floor_isolated
  .refine(
    (data) => {
      if (data.is_floor_isolated === true && !data.floor_isolation_year) {
        return false;
      }
      return true;
    },
    {
      message: "L'année d'isolation du plancher bas est requise",
      path: ["floor_isolation_year"],
    }
  )
  // Conditional: wall isolation years based on type
  .refine(
    (data) => {
      if (data.wall_isolation_type === "INTERIEUR" && !data.wall_isolation_year_interior) {
        return false;
      }
      return true;
    },
    {
      message: "L'année d'isolation intérieure est requise",
      path: ["wall_isolation_year_interior"],
    }
  )
  .refine(
    (data) => {
      if (data.wall_isolation_type === "EXTERIEUR" && !data.wall_isolation_year_exterior) {
        return false;
      }
      return true;
    },
    {
      message: "L'année d'isolation extérieure est requise",
      path: ["wall_isolation_year_exterior"],
    }
  )
  .refine(
    (data) => {
      if (data.wall_isolation_type === "DOUBLE") {
        if (!data.wall_isolation_year_interior && !data.wall_isolation_year_exterior) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Au moins une année d'isolation est requise pour une isolation double",
      path: ["wall_isolation_year_interior"],
    }
  );

export type BarTh171Step4Values = z.infer<typeof barTh171Step4Schema>;

// Étape 4 : Dimensionnement (ancien schéma conservé pour rétrocompatibilité)
export const step4SizingSchema = z.object({
  power_kw: z.number().positive().optional(),
  pac_type: z.enum(["AIR_EAU", "EAU_EAU"]).optional(),
});

export type Step4SizingValues = z.infer<typeof step4SizingSchema>;

// Étape 5 : Calcul des offres
export const step5OffersSchema = z.object({
  selected_offer_id: z.string().optional(),
});

export type Step5OffersValues = z.infer<typeof step5OffersSchema>;

// Étape 6 : Génération des documents
export const step6DocumentsSchema = z.object({
  documents_generated: z.boolean().default(false),
});

export type Step6DocumentsValues = z.infer<typeof step6DocumentsSchema>;

// Schéma global pour toutes les étapes (BAR-TH-171)
export const barTh171DraftSchema = z.object({
  step1: step1HouseholdSchema.optional(),
  step2: barTh171Step2Schema.optional(),
  step3: barTh171Step3Schema.optional(),
  step4: barTh171Step4Schema.optional(),
  step5: step5OffersSchema.optional(),
  step6: step6DocumentsSchema.optional(),
});

export type BarTh171Draft = z.infer<typeof barTh171DraftSchema>;

