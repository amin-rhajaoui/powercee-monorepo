/**
 * BAR-TH-175 Validation Schemas
 * Zod schemas for all steps with business rule validation
 * Module: Rénovation d'ampleur d'un appartement
 */

import { z } from 'zod';

// ============================================================================
// Step 1: Household (Foyer/Client)
// ============================================================================

export const step1HouseholdSchema = z.object({
    client_id: z.string().uuid('Un client doit être sélectionné'),
});

export type Step1HouseholdValues = z.infer<typeof step1HouseholdSchema>;

// ============================================================================
// Enums for Step 2
// ============================================================================

export const occupationStatusEnum = z.enum(['PROPRIETAIRE', 'LOCATAIRE']);
export type OccupationStatus = z.infer<typeof occupationStatusEnum>;

export const propertyTypeEnum = z.enum(['APPARTEMENT']);
export type PropertyType = z.infer<typeof propertyTypeEnum>;

export const heatingSystemEnum = z.enum(['FIOUL', 'GAZ', 'CHARBON', 'BOIS', 'ELECTRIQUE']);
export type HeatingSystem = z.infer<typeof heatingSystemEnum>;

export const waterHeatingTypeEnum = z.enum([
    'BALLON_ELECTRIQUE',
    'CHAUFFE_EAU_GAZ',
    'CHAUFFE_EAU_THERMODYNAMIQUE',
    'AUTRE',
]);
export type WaterHeatingType = z.infer<typeof waterHeatingTypeEnum>;

export const ventilationTypeEnum = z.enum([
    'NATURELLE',
    'VMC_SIMPLE_FLUX',
    'VMC_DOUBLE_FLUX',
    'AUTRE',
]);
export type VentilationType = z.infer<typeof ventilationTypeEnum>;

// ============================================================================
// Step 2: Property (Logement) with BAR-TH-175 specific fields
// ============================================================================

export const baseStep2PropertySchema = z.object({
    property_id: z.string().uuid('Un logement doit être sélectionné'),
});

export const barTh175Step2Schema = baseStep2PropertySchema
    .extend({
        // Type de bien
        property_type: propertyTypeEnum.optional(),

        // Résidence principale
        is_principal_residence: z.boolean().optional(),
        occupation_status: occupationStatusEnum.optional(),

        // Système de chauffage
        heating_system: heatingSystemEnum.optional(),
        old_boiler_brand: z.string().max(255).optional().nullable(),

        // Eau chaude sanitaire
        is_water_heating_linked: z.boolean().optional(),
        water_heating_type: waterHeatingTypeEnum.optional(),

        // Ventilation
        ventilation_type: ventilationTypeEnum.optional(),

        // Surface et étage
        living_area: z.number().positive().optional(),
        floor_number: z.number().int().min(0).max(50).optional(),
        total_floors_in_building: z.number().int().min(1).max(50).optional(),
    })
    .refine(
        (data) => {
            // Validation: must be principal residence
            if (data.is_principal_residence === false) {
                return false;
            }
            return true;
        },
        {
            message: 'Le logement doit être la résidence principale pour être éligible au dispositif BAR-TH-175',
            path: ['is_principal_residence'],
        }
    )
    .refine(
        (data) => {
            // Validation: must be an apartment
            if (data.property_type && data.property_type !== 'APPARTEMENT') {
                return false;
            }
            return true;
        },
        {
            message: 'Le dispositif BAR-TH-175 ne concerne que les appartements',
            path: ['property_type'],
        }
    );

export type BarTh175Step2Values = z.infer<typeof barTh175Step2Schema>;

// ============================================================================
// Step 3: Documents administratifs
// ============================================================================

export const barTh175Step3Schema = z.object({
    // Question adresse
    is_address_same_as_works: z.boolean().optional(),

    // Documents
    tax_notice_url: z.string().optional(),
    address_proof_url: z.string().optional(),
    property_proof_url: z.string().optional(),
    energy_bill_url: z.string().optional(),
    energy_audit_url: z.string().optional(), // Audit énergétique (spécifique rénovation d'ampleur)

    // Revenu fiscal de référence
    reference_tax_income: z.number().int().positive().optional(),

    // Nombre de personnes dans le foyer fiscal
    household_size: z.number().int().min(1).max(20).optional(),
});

export type BarTh175Step3Values = z.infer<typeof barTh175Step3Schema>;

// ============================================================================
// Enums for Step 4: Technical Visit
// ============================================================================

export const windowTypeEnum = z.enum(['SIMPLE', 'DOUBLE_OLD', 'DOUBLE_RECENT']);
export type WindowType = z.infer<typeof windowTypeEnum>;

export const wallIsolationTypeEnum = z.enum(['AUCUNE', 'INTERIEUR', 'EXTERIEUR', 'DOUBLE']);
export type WallIsolationType = z.infer<typeof wallIsolationTypeEnum>;

export const ceilingIsolationTypeEnum = z.enum(['AUCUNE', 'ISOLEE']);
export type CeilingIsolationType = z.infer<typeof ceilingIsolationTypeEnum>;

export const floorIsolationTypeEnum = z.enum(['AUCUNE', 'ISOLEE']);
export type FloorIsolationType = z.infer<typeof floorIsolationTypeEnum>;

export const heatingEmitterEnum = z.enum(['RADIATEURS', 'PLANCHER_CHAUFFANT', 'CONVECTEURS']);
export type HeatingEmitter = z.infer<typeof heatingEmitterEnum>;

// ============================================================================
// Step 4: Technical Visit (Visite technique)
// ============================================================================

export const barTh175Step4Schema = z.object({
    // Isolation murs
    wall_isolation_type: wallIsolationTypeEnum.optional(),
    wall_isolation_year: z.number().int().min(1900).max(2030).optional(),

    // Isolation plafond
    ceiling_isolation_type: ceilingIsolationTypeEnum.optional(),
    ceiling_isolation_year: z.number().int().min(1900).max(2030).optional(),

    // Isolation plancher bas
    floor_isolation_type: floorIsolationTypeEnum.optional(),
    floor_isolation_year: z.number().int().min(1900).max(2030).optional(),

    // Menuiseries
    window_type: windowTypeEnum.optional(),
    window_installation_year: z.number().int().min(1900).max(2030).optional(),
    nb_windows: z.number().int().min(0).max(50).optional(),

    // Chauffage
    heating_emitter: heatingEmitterEnum.optional(),
    target_temperature: z.number().int().min(15).max(25).optional(),

    // Photos et notes
    photos: z.array(z.string()).optional(),
    notes: z.string().max(2000).optional(),
});

export type BarTh175Step4Values = z.infer<typeof barTh175Step4Schema>;

// ============================================================================
// Global Draft schema
// ============================================================================

export const barTh175DraftSchema = z.object({
    step1: step1HouseholdSchema.optional(),
    step2: barTh175Step2Schema.optional(),
    step3: barTh175Step3Schema.optional(),
    step4: barTh175Step4Schema.optional(),
});

export type BarTh175Draft = z.infer<typeof barTh175DraftSchema>;

// ============================================================================
// Label Maps (for UI display)
// ============================================================================

export const OCCUPATION_STATUS_LABELS: Record<OccupationStatus, string> = {
    PROPRIETAIRE: 'Propriétaire',
    LOCATAIRE: 'Locataire',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
    APPARTEMENT: 'Appartement',
};

export const HEATING_SYSTEM_LABELS: Record<HeatingSystem, string> = {
    FIOUL: 'Fioul',
    GAZ: 'Gaz',
    CHARBON: 'Charbon',
    BOIS: 'Bois',
    ELECTRIQUE: 'Électrique',
};

export const WATER_HEATING_TYPE_LABELS: Record<WaterHeatingType, string> = {
    BALLON_ELECTRIQUE: 'Ballon électrique',
    CHAUFFE_EAU_GAZ: 'Chauffe-eau gaz',
    CHAUFFE_EAU_THERMODYNAMIQUE: 'Chauffe-eau thermodynamique',
    AUTRE: 'Autre',
};

export const VENTILATION_TYPE_LABELS: Record<VentilationType, string> = {
    NATURELLE: 'Ventilation naturelle',
    VMC_SIMPLE_FLUX: 'VMC simple flux',
    VMC_DOUBLE_FLUX: 'VMC double flux',
    AUTRE: 'Autre',
};

export const WINDOW_TYPE_LABELS: Record<WindowType, string> = {
    SIMPLE: 'Simple vitrage',
    DOUBLE_OLD: 'Double vitrage ancien (avant 2000)',
    DOUBLE_RECENT: 'Double vitrage récent (après 2000)',
};

export const WALL_ISOLATION_TYPE_LABELS: Record<WallIsolationType, string> = {
    AUCUNE: 'Aucune isolation',
    INTERIEUR: 'Isolation par l\'intérieur (ITI)',
    EXTERIEUR: 'Isolation par l\'extérieur (ITE)',
    DOUBLE: 'Double isolation (ITI + ITE)',
};

export const CEILING_ISOLATION_TYPE_LABELS: Record<CeilingIsolationType, string> = {
    AUCUNE: 'Non isolé',
    ISOLEE: 'Isolé',
};

export const FLOOR_ISOLATION_TYPE_LABELS: Record<FloorIsolationType, string> = {
    AUCUNE: 'Non isolé',
    ISOLEE: 'Isolé',
};

export const HEATING_EMITTER_LABELS: Record<HeatingEmitter, string> = {
    RADIATEURS: 'Radiateurs',
    PLANCHER_CHAUFFANT: 'Plancher chauffant',
    CONVECTEURS: 'Convecteurs électriques',
};
