/**
 * BAR-TH-171 Module - Index (Overview + Step1)
 * Shows drafts/folders overview OR Step1 (client selection) based on query params
 */

import React, { useState, useEffect } from 'react';
import { SafeAreaView, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useModuleDraft } from '@/hooks/useModuleDraft';
import { ModuleOverview } from '@/components/modules/bar-th-171/ModuleOverview';
import { Step1Household } from '@/components/modules/bar-th-171/Step1Household';

const MODULE_ID = 'bar-th-171';
const MODULE_CODE = 'BAR-TH-171';

export default function BarTh171Index() {
    const router = useRouter();
    const { draftId, step } = useLocalSearchParams<{ draftId?: string; step?: string }>();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [hasRedirected, setHasRedirected] = useState(false);

    // If step=1 is explicitly passed, don't auto-redirect
    const forceStep1 = step === '1';

    // Load draft to check current_step for redirect
    const { draft, isLoading } = useModuleDraft({
        moduleId: MODULE_ID,
        moduleCode: MODULE_CODE,
        draftId: draftId && draftId !== 'new' ? draftId : null,
    });

    // Redirect to correct step based on current_step (unless forced to step 1)
    useEffect(() => {
        if (
            !forceStep1 &&
            draft &&
            draftId &&
            draftId !== 'new' &&
            draft.current_step > 1 &&
            !hasRedirected &&
            !isRedirecting
        ) {
            setIsRedirecting(true);
            const stepRoutes: Record<number, string> = {
                2: `/(app)/bar-th-171/step2?draftId=${draftId}`,
                3: `/(app)/bar-th-171/step3?draftId=${draftId}`,
                4: `/(app)/bar-th-171/step4?draftId=${draftId}`,
            };
            const route = stepRoutes[draft.current_step];
            if (route) {
                setHasRedirected(true);
                router.replace(route as any);
            }
        }
    }, [draft, draftId, hasRedirected, isRedirecting, router, forceStep1]);

    const handleNewDraft = () => {
        router.push('/(app)/bar-th-171?draftId=new');
    };

    // Show loading while checking draft (but not if forced to step 1)
    if (!forceStep1 && draftId && draftId !== 'new' && (isLoading || isRedirecting)) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0066FF" />
                <Text className="text-gray-500 mt-4">Chargement du brouillon...</Text>
            </SafeAreaView>
        );
    }

    // If draftId present and step is 1 (or new), show wizard Step1
    if (draftId) {
        return <Step1Household draftId={draftId} initialDraft={draft} />;
    }

    // Otherwise show overview
    return <ModuleOverview onNewDraft={handleNewDraft} />;
}
