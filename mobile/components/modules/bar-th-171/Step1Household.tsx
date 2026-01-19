/**
 * Step1Household - Simplified
 * Just a client picker, no modal, no add button inline
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { DraftResumeDialog } from '@/components/dialogs/DraftResumeDialog';
import { useModuleDraft } from '@/hooks/useModuleDraft';
import { ModuleDraft } from '@/lib/api/moduleDrafts';
import { useStepNavigation } from '@/hooks/useStepNavigation';

const MODULE_ID = 'bar-th-171';
const MODULE_CODE = 'BAR-TH-171';
const STEP_LABELS = ['Foyer', 'Logement', 'Documents', 'Visite Technique'];

interface Step1HouseholdProps {
    draftId: string;
    initialDraft?: ModuleDraft | null;
}

export function Step1Household({ draftId, initialDraft }: Step1HouseholdProps) {
    const router = useRouter();
    const { isNavigating, navigate } = useStepNavigation();

    const { draft, draftData, saveDraft, checkExistingDraft, loadDraftById, createNewDraft } = useModuleDraft({
        moduleId: MODULE_ID,
        moduleCode: MODULE_CODE,
        draftId: draftId === 'new' ? null : draftId,
        initialData: initialDraft,
    });

    const [clientId, setClientId] = useState<string | null>(draftData.step1?.client_id || null);
    const [isCheckingDraft, setIsCheckingDraft] = useState(false);
    const [existingDraft, setExistingDraft] = useState<ModuleDraft | null>(null);
    const [showResumeDialog, setShowResumeDialog] = useState(false);

    // Load client from draft data
    useEffect(() => {
        if (draftData.step1?.client_id && !clientId) {
            setClientId(draftData.step1.client_id);
        }
    }, [draftData.step1?.client_id]);

    const handleClientChange = async (id: string | null) => {
        setClientId(id);

        // Check for existing draft if client selected
        if (id && (!draftId || draftId === 'new' || draftData.step1?.client_id !== id)) {
            setIsCheckingDraft(true);
            try {
                const foundDraft = await checkExistingDraft(id);
                if (foundDraft && foundDraft.id !== draftId) {
                    setExistingDraft(foundDraft);
                    setShowResumeDialog(true);
                }
            } catch (error) {
                console.error('Error checking draft:', error);
            } finally {
                setIsCheckingDraft(false);
            }
        }
    };

    const handleResumeDraft = async () => {
        if (!existingDraft) return;
        setShowResumeDialog(false);
        await loadDraftById(existingDraft.id);
    };

    const handleNewDraft = async () => {
        if (!clientId) return;
        setShowResumeDialog(false);
        await createNewDraft(clientId);
    };

    const handleNext = () => {
        if (!clientId) return;

        navigate(
            () => saveDraft({ step1: { client_id: clientId } }, 2, clientId),
            (id) => `/(app)/bar-th-171/step2?draftId=${id}`
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900">BAR-TH-171</Text>
                        <Text className="text-sm text-gray-500">Étape 1 : Foyer</Text>
                    </View>
                </View>
            </View>

            {/* Progress */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-primary">Étape 1/{STEP_LABELS.length}</Text>
                    <Text className="text-sm text-gray-500">{STEP_LABELS[0]}</Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View className="h-full bg-primary rounded-full" style={{ width: '25%' }} />
                </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-4 py-6">
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                        Sélection du foyer
                    </Text>
                    <Text className="text-gray-600">
                        Choisissez le client particulier pour ce dossier CEE
                    </Text>
                </View>

                {/* Client Picker */}
                <ClientSelector
                    value={clientId}
                    onChange={handleClientChange}
                    disabled={isCheckingDraft}
                    clientType="PARTICULIER"
                />

                {isCheckingDraft && (
                    <Text className="text-sm text-gray-500 mt-3">
                        Vérification d'un brouillon existant...
                    </Text>
                )}

                {/* Info Card */}
                <View className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <View className="flex-row items-start gap-3">
                        <Ionicons name="information-circle" size={20} color="#0066FF" />
                        <View className="flex-1">
                            <Text className="text-sm text-blue-800 font-medium mb-1">
                                Module BAR-TH-171
                            </Text>
                            <Text className="text-sm text-blue-700">
                                Pompe à chaleur Air/Eau - Clients particuliers uniquement
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View className="p-4 bg-white border-t border-gray-100">
                <Button
                    label={isNavigating ? 'Enregistrement...' : 'Suivant'}
                    onPress={handleNext}
                    disabled={!clientId || isNavigating || isCheckingDraft}
                    loading={isNavigating}
                />
            </View>

            {/* Resume Dialog */}
            <DraftResumeDialog
                visible={showResumeDialog}
                onClose={() => setShowResumeDialog(false)}
                existingDraft={existingDraft}
                onResume={handleResumeDraft}
                onNew={handleNewDraft}
            />
        </SafeAreaView>
    );
}
