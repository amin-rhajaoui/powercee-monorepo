import { z } from "zod";

// Étape 1 : Informations du foyer
export const step1HouseholdSchema = z.object({
  client_id: z.string().uuid("Un client doit être sélectionné"),
});

export type Step1HouseholdValues = z.infer<typeof step1HouseholdSchema>;

// Étape 2 : Informations du logement
export const step2PropertySchema = z.object({
  property_id: z.string().uuid("Un logement doit être sélectionné"),
});

export type Step2PropertyValues = z.infer<typeof step2PropertySchema>;

// Étape 3 : Visite technique
export const step3TechnicalVisitSchema = z.object({
  visit_date: z.string().optional(),
  technician_name: z.string().optional(),
  observations: z.string().optional(),
});

export type Step3TechnicalVisitValues = z.infer<typeof step3TechnicalVisitSchema>;

// Étape 4 : Dimensionnement
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

// Schéma global pour toutes les étapes
export const batTh113DraftSchema = z.object({
  step1: step1HouseholdSchema.optional(),
  step2: step2PropertySchema.optional(),
  step3: step3TechnicalVisitSchema.optional(),
  step4: step4SizingSchema.optional(),
  step5: step5OffersSchema.optional(),
  step6: step6DocumentsSchema.optional(),
});

export type BatTh113Draft = z.infer<typeof batTh113DraftSchema>;

