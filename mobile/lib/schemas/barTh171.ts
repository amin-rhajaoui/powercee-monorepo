/**
 * BAR-TH-171 Validation Schemas
 * Zod schemas for all steps with business rule validation
 * Pattern from: front/src/app/app/modules/[moduleId]/_schemas.ts
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

export const heatingSystemEnum = z.enum(['FIOUL', 'GAZ', 'CHARBON', 'BOIS', 'ELECTRIQUE']);
export type HeatingSystem = z.infer<typeof heatingSystemEnum>;

export const waterHeatingTypeEnum = z.enum([
    'BALLON_ELECTRIQUE',
    'CHAUFFE_EAU_GAZ',
    'CHAUFFE_EAU_THERMODYNAMIQUE',
    'AUTRE',
]);
export type WaterHeatingType = z.infer<typeof waterHeatingTypeEnum>;

export const electricalPhaseEnum = z.enum(['MONOPHASE', 'TRIPHASE']);
export type ElectricalPhase = z.infer<typeof electricalPhaseEnum>;

export const usageModeEnum = z.enum(['HEATING_ONLY', 'HEATING_AND_HOT_WATER']);
export type UsageMode = z.infer<typeof usageModeEnum>;

// ============================================================================
// Step 2: Property (Logement) with BAR-TH-171 specific fields
// ============================================================================

export const baseStep2PropertySchema = z.object({
    property_id: z.string().uuid('Un logement doit être sélectionné'),
});

export const barTh171Step2Schema = baseStep2PropertySchema
    .extend({
        // Résidence principale
        is_principal_residence: z.boolean().optional(),
        occupation_status: occupationStatusEnum.optional(),

        // Système de chauffage
        heating_system: heatingSystemEnum.optional(),
        old_boiler_brand: z.string().max(255).optional().nullable(),

        // Eau chaude sanitaire
        is_water_heating_linked: z.boolean().optional(),
        water_heating_type: waterHeatingTypeEnum.optional(),
        usage_mode: usageModeEnum.optional(),

        // Compteur électrique
        electrical_phase: electricalPhaseEnum.optional(),
        power_kva: z.number().int().min(3).max(36).optional(),
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
            message: 'Le logement doit être la résidence principale pour être éligible au dispositif BAR-TH-171',
            path: ['is_principal_residence'],
        }
    )
    .refine(
        (data) => {
            // Validation: electric heating not allowed
            if (data.heating_system === 'ELECTRIQUE') {
                return false;
            }
            return true;
        },
        {
            message: 'Le chauffage ne doit pas être électrique pour être éligible au dispositif BAR-TH-171',
            path: ['heating_system'],
        }
    )
    .refine(
        (data) => {
            // Validation: water_heating_type required if is_water_heating_linked === false
            if (data.is_water_heating_linked === false && !data.water_heating_type) {
                return false;
            }
            return true;
        },
        {
            message: 'Le type de production d\'eau chaude est requis lorsque l\'eau chaude n\'est pas produite par le système de chauffage',
            path: ['water_heating_type'],
        }
    )
    .refine(
        (data) => {
            // Validation: usage_mode required if is_water_heating_linked === false
            if (data.is_water_heating_linked === false && !data.usage_mode) {
                return false;
            }
            return true;
        },
        {
            message: 'Le mode d\'usage souhaité est requis lorsque l\'eau chaude n\'est pas produite par le système de chauffage',
            path: ['usage_mode'],
        }
    );

export type BarTh171Step2Values = z.infer<typeof barTh171Step2Schema>;

// ============================================================================
// Step 3: Documents administratifs
// ============================================================================

export const barTh171Step3Schema = z.object({
    // Question adresse
    is_address_same_as_works: z.boolean().optional(),

    // Documents
    tax_notice_url: z.string().optional(),
    address_proof_url: z.string().optional(),
    property_proof_url: z.string().optional(),
    energy_bill_url: z.string().optional(),

    // Revenu fiscal de référence
    reference_tax_income: z.number().int().positive().optional(),

    // Nombre de personnes dans le foyer fiscal
    household_size: z.number().int().min(1).max(20).optional(),
});

export type BarTh171Step3Values = z.infer<typeof barTh171Step3Schema>;

// ============================================================================
// Enums for Step 4: Technical Visit
// ============================================================================

export const atticTypeEnum = z.enum(['PERDUS', 'HABITES']);
export type AtticType = z.infer<typeof atticTypeEnum>;

export const floorTypeEnum = z.enum(['CAVE', 'VIDE_SANITAIRE', 'TERRE_PLEIN']);
export type FloorType = z.infer<typeof floorTypeEnum>;

export const wallIsolationTypeEnum = z.enum(['AUCUNE', 'INTERIEUR', 'EXTERIEUR', 'DOUBLE']);
export type WallIsolationType = z.infer<typeof wallIsolationTypeEnum>;

export const joineryTypeEnum = z.enum(['SIMPLE', 'DOUBLE_OLD', 'DOUBLE_RECENT']);
export type JoineryType = z.infer<typeof joineryTypeEnum>;

export const emitterTypeEnum = z.enum(['FONTE', 'RADIATEURS', 'PLANCHER_CHAUFFANT']);
export type EmitterType = z.infer<typeof emitterTypeEnum>;

export const levelEmittersSchema = z.object({
    level: z.number().int().min(0).max(4),
    emitters: z.array(emitterTypeEnum),
});

export type LevelEmitters = z.infer<typeof levelEmittersSchema>;

// ============================================================================
// Step 4: Technical Visit (Visite technique)
// ============================================================================

export const barTh171Step4Schema = z.object({
    // Chauffage
    nb_levels: z.number().int().min(1).max(5).optional(),
    avg_ceiling_height: z.number().min(1.5).max(6).optional(),
    target_temperature: z.number().int().min(15).max(25).optional(),
    emitters_configuration: z.array(levelEmittersSchema).optional(),

    // Combles
    attic_type: atticTypeEnum.optional(),
    is_attic_isolated: z.boolean().optional(),
    attic_isolation_year: z.number().int().min(1900).max(2030).optional(),

    // Plancher bas
    floor_type: floorTypeEnum.optional(),
    is_floor_isolated: z.boolean().optional(),
    floor_isolation_year: z.number().int().min(1900).max(2030).optional(),

    // Murs
    wall_isolation_type: wallIsolationTypeEnum.optional(),
    wall_isolation_year_interior: z.number().int().min(1900).max(2030).optional(),
    wall_isolation_year_exterior: z.number().int().min(1900).max(2030).optional(),
    wall_same_year: z.boolean().optional(),

    // Menuiseries
    joinery_type: joineryTypeEnum.optional(),
});

export type BarTh171Step4Values = z.infer<typeof barTh171Step4Schema>;

// ============================================================================
// Global Draft schema
// ============================================================================

export const barTh171DraftSchema = z.object({
    step1: step1HouseholdSchema.optional(),
    step2: barTh171Step2Schema.optional(),
    step3: barTh171Step3Schema.optional(),
    step4: barTh171Step4Schema.optional(),
});

export type BarTh171Draft = z.infer<typeof barTh171DraftSchema>;

// ============================================================================
// Label Maps (for UI display)
// ============================================================================

export const OCCUPATION_STATUS_LABELS: Record<OccupationStatus, string> = {
    PROPRIETAIRE: 'Propriétaire',
    LOCATAIRE: 'Locataire',
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

export const ELECTRICAL_PHASE_LABELS: Record<ElectricalPhase, string> = {
    MONOPHASE: 'Monophasé',
    TRIPHASE: 'Triphasé',
};

export const USAGE_MODE_LABELS: Record<UsageMode, string> = {
    HEATING_ONLY: 'Chauffage seul',
    HEATING_AND_HOT_WATER: 'Chauffage et Eau chaude sanitaire',
};

export const ATTIC_TYPE_LABELS: Record<AtticType, string> = {
    PERDUS: 'Combles perdus',
    HABITES: 'Combles aménagés / habités',
};

export const FLOOR_TYPE_LABELS: Record<FloorType, string> = {
    CAVE: 'Cave / Sous-sol',
    VIDE_SANITAIRE: 'Vide sanitaire',
    TERRE_PLEIN: 'Terre-plein (sur dalle)',
};

export const WALL_ISOLATION_TYPE_LABELS: Record<WallIsolationType, string> = {
    AUCUNE: 'Aucune isolation',
    INTERIEUR: 'Isolation par l\'intérieur (ITI)',
    EXTERIEUR: 'Isolation par l\'extérieur (ITE)',
    DOUBLE: 'Double isolation (ITI + ITE)',
};

export const JOINERY_TYPE_LABELS: Record<JoineryType, string> = {
    SIMPLE: 'Simple vitrage',
    DOUBLE_OLD: 'Double vitrage ancien (avant 2000)',
    DOUBLE_RECENT: 'Double vitrage récent (après 2000)',
};

export const EMITTER_TYPE_LABELS: Record<EmitterType, string> = {
    FONTE: 'Radiateurs fonte',
    RADIATEURS: 'Radiateurs (acier/alu)',
    PLANCHER_CHAUFFANT: 'Plancher chauffant',
};
