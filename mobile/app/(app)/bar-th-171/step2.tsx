/**
 * BAR-TH-171 - Step 2: Property (Logement)
 * Property selection + BAR-TH-171 specific fields + eligibility validation
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PropertySelector } from '@/components/selectors/PropertySelector';
import { useModuleDraft } from '@/hooks/useModuleDraft';
import {
    barTh171Step2Schema,
    BarTh171Step2Values,
    OCCUPATION_STATUS_LABELS,
    HEATING_SYSTEM_LABELS,
    WATER_HEATING_TYPE_LABELS,
    ELECTRICAL_PHASE_LABELS,
    USAGE_MODE_LABELS,
} from '@/lib/schemas/barTh171';

// ============================================================================
// Constants
// ============================================================================

const MODULE_ID = 'bar-th-171';
const MODULE_CODE = 'BAR-TH-171';
const STEP_LABELS = ['Foyer', 'Logement', 'Documents', 'Visite Technique'];

// ============================================================================
// Component
// ============================================================================

import { useStepNavigation } from '@/hooks/useStepNavigation';

export default function Step2Property() {
    const router = useRouter();
    const { draftId } = useLocalSearchParams<{ draftId?: string }>();
    const { isNavigating, navigate } = useStepNavigation();
    const { draftData, draft, saveDraft } = useModuleDraft({
        moduleId: MODULE_ID,
        moduleCode: MODULE_CODE,
        draftId,
    });

    const clientId = draftData.step1?.client_id || null;

    // Form setup
    const form = useForm<BarTh171Step2Values>({
        resolver: zodResolver(barTh171Step2Schema),
        defaultValues: {
            property_id: draftData.step2?.property_id || draft?.property_id || '',
            is_principal_residence: draftData.step2?.is_principal_residence ?? undefined,
            occupation_status: draftData.step2?.occupation_status ?? undefined,
            heating_system: draftData.step2?.heating_system ?? undefined,
            old_boiler_brand: draftData.step2?.old_boiler_brand ?? '',
            is_water_heating_linked: draftData.step2?.is_water_heating_linked ?? undefined,
            water_heating_type: draftData.step2?.water_heating_type ?? undefined,
            usage_mode: draftData.step2?.usage_mode ?? undefined,
            electrical_phase: draftData.step2?.electrical_phase ?? undefined,
            power_kva: draftData.step2?.power_kva ?? undefined,
        },
        mode: 'onChange',
    });

    // Watch values for conditional display
    const propertyId = form.watch('property_id');
    const isPrincipalResidence = form.watch('is_principal_residence');
    const heatingSystem = form.watch('heating_system');
    const isWaterHeatingLinked = form.watch('is_water_heating_linked');

    // Eligibility blocking
    const isBlocked = isPrincipalResidence === false || heatingSystem === 'ELECTRIQUE';

    // Reload form when draft data changes
    useEffect(() => {
        if (draftData.step2) {
            form.reset({
                property_id: draftData.step2.property_id || draft?.property_id || '',
                is_principal_residence: draftData.step2.is_principal_residence ?? undefined,
                occupation_status: draftData.step2.occupation_status ?? undefined,
                heating_system: draftData.step2.heating_system ?? undefined,
                old_boiler_brand: draftData.step2.old_boiler_brand ?? '',
                is_water_heating_linked: draftData.step2.is_water_heating_linked ?? undefined,
                water_heating_type: draftData.step2.water_heating_type ?? undefined,
                usage_mode: draftData.step2.usage_mode ?? undefined,
                electrical_phase: draftData.step2.electrical_phase ?? undefined,
                power_kva: draftData.step2.power_kva ?? undefined,
            });
        }
    }, [draftData.step2]);

    const handlePrevious = async () => {
        if (form.getValues('property_id')) {
            navigate(
                () => saveDraft({ step2: { ...form.getValues() } as any }, 1),
                (id) => `/(app)/bar-th-171?draftId=${id}`,
                'replace'
            );
        } else {
            router.push(`/(app)/bar-th-171?draftId=${draftId}`);
        }
    };

    const handleNext = async () => {
        // Validation logic
        const values = form.getValues();
        const isPrincipalResidence = values.is_principal_residence;
        const heatingSystem = values.heating_system;

        // Eligibility blocking
        const isBlocked = isPrincipalResidence === false || heatingSystem === 'ELECTRIQUE';

        if (isBlocked) {
            Alert.alert('Non éligible', 'Ce dossier ne peut pas être poursuivi avec les critères actuels.');
            return;
        }

        const isValid = await form.trigger();
        if (!isValid) {
            const errors = form.formState.errors;

            if (errors.property_id) {
                Alert.alert('Erreur', 'Veuillez sélectionner un logement');
            } else if (errors.is_principal_residence) {
                Alert.alert('Erreur', 'Le logement doit être une résidence principale');
            } else if (errors.heating_system) {
                Alert.alert('Erreur', 'Le chauffage actuel ne peut pas être électrique');
            } else if (errors.power_kva) {
                Alert.alert('Erreur', 'La puissance doit être comprise entre 3 et 36 kVA');
            } else {
                Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
            }
            return;
        }

        navigate(
            () =>
                saveDraft(
                    {
                        step2: {
                            property_id: values.property_id,
                            is_principal_residence: values.is_principal_residence,
                            occupation_status: values.occupation_status,
                            heating_system: values.heating_system,
                            old_boiler_brand: values.old_boiler_brand || undefined,
                            is_water_heating_linked: values.is_water_heating_linked,
                            water_heating_type: values.water_heating_type,
                            usage_mode: values.usage_mode,
                            electrical_phase: values.electrical_phase,
                            power_kva: values.power_kva,
                        },
                    },
                    3
                ),
            (id) => `/(app)/bar-th-171/step3?draftId=${id}`
        );
    };

    // Options for select fields
    const occupationOptions = Object.entries(OCCUPATION_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const heatingOptions = Object.entries(HEATING_SYSTEM_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const waterHeatingOptions = Object.entries(WATER_HEATING_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const phaseOptions = Object.entries(ELECTRICAL_PHASE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const usageModeOptions = Object.entries(USAGE_MODE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={handlePrevious}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900">BAR-TH-171</Text>
                        <Text className="text-sm text-gray-500">Étape 2 : Logement</Text>
                    </View>
                </View>
            </View>

            {/* Progress */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-primary">Étape 2/{STEP_LABELS.length}</Text>
                    <Text className="text-sm text-gray-500">{STEP_LABELS[1]}</Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View className="h-full bg-primary rounded-full" style={{ width: '50%' }} />
                </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
                {/* Property Selector */}
                <View className="mb-6 flex-row gap-3 items-center">
                    <View className="flex-1">
                        <PropertySelector
                            clientId={clientId}
                            value={propertyId || null}
                            onChange={(id) => form.setValue('property_id', id || '', { shouldValidate: true })}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Information', 'La création de logement sera disponible prochainement.')}
                        className="w-14 h-14 bg-white rounded-xl items-center justify-center border border-gray-200 shadow-sm"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="home-outline" size={24} color="#0066FF" />
                        <View className="absolute top-3 right-3 w-3 h-3 bg-primary rounded-full border-2 border-white" />
                        <Ionicons name="add" size={12} color="white" style={{ position: 'absolute', top: 3, right: 3 }} />
                    </TouchableOpacity>
                </View>

                {/* Résidence principale */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-4">Résidence principale</Text>

                    <View className="mb-4">
                        <Controller
                            control={form.control}
                            name="is_principal_residence"
                            render={({ field }) => (
                                <Select
                                    label="Le logement est-il la résidence principale ?"
                                    placeholder="Sélectionnez..."
                                    options={[
                                        { value: 'true', label: 'Oui' },
                                        { value: 'false', label: 'Non' },
                                    ]}
                                    value={field.value === undefined ? null : field.value ? 'true' : 'false'}
                                    onValueChange={(v) => field.onChange(v === 'true')}
                                />
                            )}
                        />
                    </View>

                    {isPrincipalResidence === false && (
                        <View className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-start gap-3">
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                            <View className="flex-1">
                                <Text className="text-red-800 font-semibold mb-1">Non éligible</Text>
                                <Text className="text-red-700 text-sm">
                                    Le dispositif BAR-TH-171 n'est applicable que pour les résidences principales.
                                </Text>
                            </View>
                        </View>
                    )}

                    <Controller
                        control={form.control}
                        name="occupation_status"
                        render={({ field }) => (
                            <Select
                                label="Statut d'occupation"
                                placeholder="Sélectionnez..."
                                options={occupationOptions}
                                value={field.value || null}
                                onValueChange={field.onChange}
                            />
                        )}
                    />
                </View>

                {/* Système de chauffage */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-4">Système de chauffage actuel</Text>

                    <View className="mb-4">
                        <Controller
                            control={form.control}
                            name="heating_system"
                            render={({ field }) => (
                                <Select
                                    label="Type de chauffage à remplacer"
                                    placeholder="Sélectionnez..."
                                    options={heatingOptions}
                                    value={field.value || null}
                                    onValueChange={field.onChange}
                                />
                            )}
                        />
                    </View>

                    {heatingSystem === 'ELECTRIQUE' && (
                        <View className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-start gap-3 mb-4">
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                            <View className="flex-1">
                                <Text className="text-red-800 font-semibold mb-1">Non éligible</Text>
                                <Text className="text-red-700 text-sm">
                                    Le remplacement d'un chauffage électrique n'est pas éligible au dispositif BAR-TH-171.
                                </Text>
                            </View>
                        </View>
                    )}

                    <Controller
                        control={form.control}
                        name="old_boiler_brand"
                        render={({ field }) => (
                            <Input
                                label="Marque de l'ancienne chaudière (optionnel)"
                                placeholder="Ex: De Dietrich, Viessmann..."
                                value={field.value ?? ''}
                                onChangeText={field.onChange}
                            />
                        )}
                    />
                </View>

                {/* Eau chaude sanitaire */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-4">Eau chaude sanitaire</Text>

                    <Controller
                        control={form.control}
                        name="is_water_heating_linked"
                        render={({ field }) => (
                            <Select
                                label="L'eau chaude est-elle produite par le système de chauffage ?"
                                placeholder="Sélectionnez..."
                                options={[
                                    { value: 'true', label: 'Oui (chaudière mixte / ballon intégré)' },
                                    { value: 'false', label: 'Non (production séparée)' },
                                ]}
                                value={field.value === undefined ? null : field.value ? 'true' : 'false'}
                                onValueChange={(v) => field.onChange(v === 'true')}
                            />
                        )}
                    />

                    {isWaterHeatingLinked === false && (
                        <View className="mt-4 gap-4">
                            <Controller
                                control={form.control}
                                name="water_heating_type"
                                render={({ field }) => (
                                    <Select
                                        label="Système actuel de production d'eau chaude"
                                        placeholder="Sélectionnez..."
                                        options={waterHeatingOptions}
                                        value={field.value || null}
                                        onValueChange={field.onChange}
                                    />
                                )}
                            />

                            <Controller
                                control={form.control}
                                name="usage_mode"
                                render={({ field }) => (
                                    <Select
                                        label="Mode d'usage souhaité"
                                        placeholder="Sélectionnez..."
                                        options={usageModeOptions}
                                        value={field.value || null}
                                        onValueChange={field.onChange}
                                    />
                                )}
                            />
                        </View>
                    )}
                </View>

                {/* Compteur électrique */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-4">Compteur électrique</Text>

                    <View className="gap-4">
                        <Controller
                            control={form.control}
                            name="electrical_phase"
                            render={({ field }) => (
                                <Select
                                    label="Type de compteur"
                                    placeholder="Sélectionnez..."
                                    options={phaseOptions}
                                    value={field.value || null}
                                    onValueChange={field.onChange}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="power_kva"
                            render={({ field }) => (
                                <Input
                                    label="Puissance souscrite (kVA)"
                                    placeholder="Ex: 6, 9, 12..."
                                    keyboardType="numeric"
                                    value={field.value?.toString() || ''}
                                    onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                />
                            )}
                        />
                    </View>

                    <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex-row items-start gap-3 mt-4">
                        <Ionicons name="information-circle" size={20} color="#D97706" />
                        <Text className="text-amber-800 text-sm flex-1">
                            La puissance du compteur peut impacter le dimensionnement de la PAC. Une puissance
                            insuffisante peut nécessiter une mise à niveau.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View className="p-4 bg-white border-t border-gray-100 flex-row gap-3">
                <Button
                    variant="outline"
                    label="Précédent"
                    onPress={handlePrevious}
                    disabled={isNavigating}
                    className="flex-1"
                />
                <Button
                    label={isNavigating ? 'Enregistrement...' : 'Suivant'}
                    onPress={handleNext}
                    disabled={!propertyId || isNavigating || isBlocked}
                    loading={isNavigating}
                    className="flex-1"
                />
            </View>
        </SafeAreaView>
    );
}
