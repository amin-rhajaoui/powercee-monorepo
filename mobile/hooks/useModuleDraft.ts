/**
 * useModuleDraft Hook
 * State management for module drafts (brouillons)
 * Pattern copied from web: front/src/app/app/modules/[moduleId]/_hooks/use-module-draft.ts
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import {
    ModuleDraft,
    createModuleDraft,
    getModuleDraft,
    updateModuleDraft,
    listModuleDrafts,
    deleteModuleDraft,
    ModuleDraftUpdate,
} from '@/lib/api/moduleDrafts';

// ============================================================================
// Types
// ============================================================================

export interface BarTh171Step1 {
    client_id: string;
}

export interface BarTh171Step2 {
    property_id: string;
    is_principal_residence?: boolean;
    occupation_status?: 'PROPRIETAIRE' | 'LOCATAIRE';
    heating_system?: 'FIOUL' | 'GAZ' | 'CHARBON' | 'BOIS' | 'ELECTRIQUE';
    old_boiler_brand?: string;
    is_water_heating_linked?: boolean;
    water_heating_type?: 'BALLON_ELECTRIQUE' | 'CHAUFFE_EAU_GAZ' | 'CHAUFFE_EAU_THERMODYNAMIQUE' | 'AUTRE';
    usage_mode?: 'HEATING_ONLY' | 'HEATING_AND_HOT_WATER';
    electrical_phase?: 'MONOPHASE' | 'TRIPHASE';
    power_kva?: number;
}

export interface BarTh171Step3 {
    is_address_same_as_works?: boolean;
    tax_notice_url?: string;
    address_proof_url?: string;
    property_proof_url?: string;
    energy_bill_url?: string;
    reference_tax_income?: number;
    household_size?: number;
}

export type EmitterType = 'FONTE' | 'RADIATEURS' | 'PLANCHER_CHAUFFANT';

export interface LevelEmitters {
    level: number;
    emitters: EmitterType[];
}

export interface BarTh171Step4 {
    nb_levels?: number;
    avg_ceiling_height?: number;
    target_temperature?: number;
    attic_type?: 'PERDUS' | 'HABITES';
    is_attic_isolated?: boolean;
    attic_isolation_year?: number;
    floor_type?: 'CAVE' | 'VIDE_SANITAIRE' | 'TERRE_PLEIN';
    is_floor_isolated?: boolean;
    floor_isolation_year?: number;
    wall_isolation_type?: 'AUCUNE' | 'INTERIEUR' | 'EXTERIEUR' | 'DOUBLE';
    wall_isolation_year_interior?: number;
    wall_isolation_year_exterior?: number;
    joinery_type?: 'SIMPLE' | 'DOUBLE_OLD' | 'DOUBLE_RECENT';
    emitters_configuration?: LevelEmitters[];
}

export interface BarTh171Draft {
    step1?: BarTh171Step1;
    step2?: BarTh171Step2;
    step3?: BarTh171Step3;
    step4?: BarTh171Step4;
}

interface UseModuleDraftOptions {
    moduleId: string;
    moduleCode: string;
    draftId?: string | null;
    initialData?: ModuleDraft | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useModuleDraft({ moduleId, moduleCode, draftId, initialData }: UseModuleDraftOptions) {
    const router = useRouter();
    const [draft, setDraft] = useState<ModuleDraft | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStep] = useState(initialData?.current_step || 1);
    const [draftData, setDraftData] = useState<BarTh171Draft>((initialData?.data as BarTh171Draft) || {});

    // Use a ref to prevent multiple load calls for the same ID
    const loadingDraftIdRef = useRef<string | null>(null);

    // Load existing draft if draftId is provided
    useEffect(() => {
        async function loadDraft() {
            if (!draftId || draftId === 'new' || draftId === 'undefined') return;

            // If we have initial data that matches, don't reload
            if (initialData && initialData.id === draftId && draft?.id === draftId) return;

            // Prevent multiple calls for same draftId
            if (loadingDraftIdRef.current === draftId) return;
            loadingDraftIdRef.current = draftId;

            setIsLoading(true);
            try {
                const loadedDraft = await getModuleDraft(draftId);
                setDraft(loadedDraft);
                setCurrentStep(loadedDraft.current_step);
                if (loadedDraft.data) {
                    setDraftData(loadedDraft.data as BarTh171Draft);
                }
            } catch (error) {
                console.error('Erreur lors du chargement du brouillon:', error);
                // Don't alert on 422 if it's just a transient issue
                // Alert.alert('Erreur', 'Impossible de charger le brouillon');
            } finally {
                setIsLoading(false);
                loadingDraftIdRef.current = null;
            }
        }

        loadDraft();
    }, [draftId]);

    // Check if a draft exists for a client and module
    const checkExistingDraft = useCallback(
        async (clientId: string): Promise<ModuleDraft | null> => {
            try {
                const result = await listModuleDrafts({
                    module_code: moduleCode,
                    client_id: clientId,
                    page: 1,
                    pageSize: 1,
                });

                // Return first non-archived draft
                const activeDraft = result.items.find((d) => !d.archived_at);
                return activeDraft || null;
            } catch (error) {
                console.error('Erreur lors de la vérification du brouillon:', error);
                return null;
            }
        },
        [moduleCode]
    );

    // Load a draft by ID
    const loadDraftById = useCallback(
        async (draftIdToLoad: string) => {
            setIsLoading(true);
            try {
                const loadedDraft = await getModuleDraft(draftIdToLoad);
                setDraft(loadedDraft);
                setCurrentStep(loadedDraft.current_step);
                if (loadedDraft.data) {
                    setDraftData(loadedDraft.data as BarTh171Draft);
                }
                // Update URL with draftId
                router.replace(`/(app)/bar-th-171?draftId=${loadedDraft.id}`);
                return loadedDraft;
            } catch (error) {
                console.error('Erreur lors du chargement du brouillon:', error);
                Alert.alert('Erreur', 'Impossible de charger le brouillon');
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [router]
    );

    // Create a new draft
    const createNewDraft = useCallback(
        async (clientId?: string): Promise<string | null> => {
            setIsLoading(true);
            try {
                const newDraft = await createModuleDraft({
                    module_code: moduleCode,
                    client_id: clientId || null,
                    current_step: 1,
                    data: {},
                });
                setDraft(newDraft);
                setDraftData({});
                setCurrentStep(1);
                // Update URL with draftId
                router.replace(`/(app)/bar-th-171?draftId=${newDraft.id}`);
                return newDraft.id;
            } catch (error) {
                console.error('Erreur lors de la création du brouillon:', error);
                Alert.alert('Erreur', 'Impossible de créer le brouillon');
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [moduleCode, router]
    );

    // Save the draft (only on step transition)
    // Save the draft (only on step transition)
    const saveDraft = useCallback(
        async (
            data: Partial<BarTh171Draft>,
            step?: number,
            clientId?: string
        ): Promise<ModuleDraft> => {
            let draftIdToUse = draft?.id;
            let currentDraft = draft;

            // If no draft, create a new one
            if (!draftIdToUse) {
                const newDraftId = await createNewDraft(clientId);
                if (!newDraftId) {
                    throw new Error('Impossible de créer le brouillon');
                }
                draftIdToUse = newDraftId;
                // Fetch the freshly created draft
                currentDraft = await getModuleDraft(newDraftId);
                setDraft(currentDraft);
                setDraftData((currentDraft.data as BarTh171Draft) || {});
            }

            // Merge with current draft data
            const currentDraftData = (currentDraft?.data as BarTh171Draft) || {};
            const newData = { ...currentDraftData, ...data };
            setDraftData(newData);

            // Save immediately
            setIsSaving(true);
            try {
                const updatePayload: ModuleDraftUpdate = {
                    data: newData,
                };
                if (step !== undefined) {
                    updatePayload.current_step = step;
                }
                if (clientId !== undefined) {
                    updatePayload.client_id = clientId;
                }
                // Extract property_id from step2 if present
                if (newData.step2?.property_id) {
                    updatePayload.property_id = newData.step2.property_id;
                }

                const updatedDraft = await updateModuleDraft(draftIdToUse, updatePayload);
                setDraft(updatedDraft);
                if (step !== undefined) {
                    setCurrentStep(step);
                }
                return updatedDraft;
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                Alert.alert('Erreur', 'Erreur lors de la sauvegarde du brouillon');
                throw error;
            } finally {
                setIsSaving(false);
            }
        },
        [draft, createNewDraft]
    );

    // Delete a draft
    const deleteDraft = useCallback(async (id: string) => {
        try {
            await deleteModuleDraft(id);
            if (draft?.id === id) {
                setDraft(null);
                setDraftData({});
            }
        } catch (error) {
            console.error('Erreur suppression brouillon:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le brouillon');
            throw error;
        }
    }, [draft]);

    return {
        draft,
        draftData,
        currentStep,
        isLoading,
        isSaving,
        setCurrentStep,
        saveDraft,
        checkExistingDraft,
        loadDraftById,
        createNewDraft,
        deleteDraft,
    };
}
