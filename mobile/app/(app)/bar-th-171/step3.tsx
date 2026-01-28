/**
 * BAR-TH-171 - Step 3: Documents administratifs
 * Upload documents + fiscal info + skip option
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FileUpload } from '@/components/upload/FileUpload';
import { useModuleDraft } from '@/hooks/useModuleDraft';
import { barTh171Step3Schema, BarTh171Step3Values } from '@/lib/schemas/barTh171';

// ============================================================================
// Constants
// ============================================================================

const MODULE_ID = 'bar-th-171';
const MODULE_CODE = 'BAR-TH-171';
const STEP_LABELS = ['Foyer', 'Logement', 'Documents', 'Visite Technique'];

// ============================================================================
// Component
// ============================================================================

export default function Step3Documents() {
    const router = useRouter();
    const { draftId } = useLocalSearchParams<{ draftId?: string }>();
    const { draftData, saveDraft } = useModuleDraft({
        moduleId: MODULE_ID,
        moduleCode: MODULE_CODE,
        draftId,
    });

    const [isNavigating, setIsNavigating] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);

    // Get occupation status from step2
    const occupationStatus = draftData.step2?.occupation_status;

    // Form setup
    const form = useForm<BarTh171Step3Values>({
        resolver: zodResolver(barTh171Step3Schema),
        defaultValues: {
            is_address_same_as_works: draftData.step3?.is_address_same_as_works ?? undefined,
            tax_notice_url: draftData.step3?.tax_notice_url ?? undefined,
            address_proof_url: draftData.step3?.address_proof_url ?? undefined,
            property_proof_url: draftData.step3?.property_proof_url ?? undefined,
            energy_bill_url: draftData.step3?.energy_bill_url ?? undefined,
            reference_tax_income: draftData.step3?.reference_tax_income ?? undefined,
            household_size: draftData.step3?.household_size ?? undefined,
        },
        mode: 'onChange',
    });

    const isAddressSameAsWorks = form.watch('is_address_same_as_works');

    // Reload form when draft data changes
    useEffect(() => {
        if (draftData.step3) {
            form.reset({
                is_address_same_as_works: draftData.step3.is_address_same_as_works ?? undefined,
                tax_notice_url: draftData.step3.tax_notice_url ?? undefined,
                address_proof_url: draftData.step3.address_proof_url ?? undefined,
                property_proof_url: draftData.step3.property_proof_url ?? undefined,
                energy_bill_url: draftData.step3.energy_bill_url ?? undefined,
                reference_tax_income: draftData.step3.reference_tax_income ?? undefined,
                household_size: draftData.step3.household_size ?? undefined,
            });
        }
    }, [draftData.step3]);

    const handlePrevious = () => {
        router.back();
    };

    const saveAndNavigate = async (isSkip: boolean = false) => {
        const values = form.getValues();

        try {
            await saveDraft(
                {
                    step3: {
                        is_address_same_as_works: values.is_address_same_as_works,
                        tax_notice_url: values.tax_notice_url || undefined,
                        address_proof_url: values.address_proof_url || undefined,
                        property_proof_url: values.property_proof_url || undefined,
                        energy_bill_url: values.energy_bill_url || undefined,
                        reference_tax_income: values.reference_tax_income || undefined,
                        household_size: values.household_size || undefined,
                    },
                },
                4
            );
            router.push(`/(app)/bar-th-171/step4?draftId=${draftId}`);
        } catch (error) {
            console.error('Error saving:', error);
            Alert.alert('Erreur', 'Erreur lors de la sauvegarde');
        }
    };

    const handleSkip = async () => {
        setIsSkipping(true);
        await saveAndNavigate(true);
        setIsSkipping(false);
    };

    const handleNext = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs requis');
            return;
        }

        setIsNavigating(true);
        await saveAndNavigate(false);
        setIsNavigating(false);
    };

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
                        <Text className="text-sm text-gray-500">Étape 3 : Documents</Text>
                    </View>
                </View>
            </View>

            {/* Progress */}
            <View className="px-4 py-3 bg-white border-b border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-primary">Étape 3/{STEP_LABELS.length}</Text>
                    <Text className="text-sm text-gray-500">{STEP_LABELS[2]}</Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View className="h-full bg-primary rounded-full" style={{ width: '75%' }} />
                </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
                <View className="mb-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-1">Documents administratifs</Text>
                    <Text className="text-gray-600 text-sm">
                        Collectez les documents nécessaires pour constituer le dossier CEE / Anah
                    </Text>
                </View>

                {/* Question adresse */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <Controller
                        control={form.control}
                        name="is_address_same_as_works"
                        render={({ field }) => (
                            <Select
                                label="L'adresse sur l'avis d'imposition correspond-elle à l'adresse des travaux ?"
                                placeholder="Sélectionnez..."
                                options={[
                                    { value: 'true', label: 'Oui' },
                                    { value: 'false', label: 'Non, l\'adresse a changé' },
                                ]}
                                value={field.value === undefined ? null : field.value ? 'true' : 'false'}
                                onValueChange={(v) => field.onChange(v === 'true')}
                            />
                        )}
                    />
                </View>

                {/* Documents */}
                <View className="bg-white rounded-xl p-4 mb-4 gap-6">
                    {/* Avis d'imposition */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">Avis d'imposition</Text>
                        <Controller
                            control={form.control}
                            name="tax_notice_url"
                            render={({ field }) => (
                                <FileUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                    accept="any"
                                    label="Téléverser l'avis d'imposition"
                                />
                            )}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            Document obligatoire pour déterminer l'éligibilité aux aides
                        </Text>
                    </View>

                    {/* Justificatif de domicile (si adresse différente) */}
                    {isAddressSameAsWorks === false && (
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">
                                Attestation de changement d'adresse
                            </Text>
                            <Controller
                                control={form.control}
                                name="address_proof_url"
                                render={({ field }) => (
                                    <FileUpload
                                        value={field.value}
                                        onChange={field.onChange}
                                        accept="any"
                                        label="Téléverser le justificatif de domicile"
                                    />
                                )}
                            />
                            <Text className="text-xs text-gray-500 mt-1">
                                Facture de moins de 3 mois ou attestation sur l'honneur
                            </Text>
                        </View>
                    )}

                    {/* Taxe foncière (si propriétaire) */}
                    {occupationStatus === 'PROPRIETAIRE' && (
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">
                                Taxe foncière ou acte de propriété
                            </Text>
                            <Controller
                                control={form.control}
                                name="property_proof_url"
                                render={({ field }) => (
                                    <FileUpload
                                        value={field.value}
                                        onChange={field.onChange}
                                        accept="any"
                                        label="Téléverser le justificatif de propriété"
                                    />
                                )}
                            />
                            <Text className="text-xs text-gray-500 mt-1">
                                Dernier avis de taxe foncière ou acte notarié
                            </Text>
                        </View>
                    )}

                    {/* Facture énergie (optionnel) */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Facture d'énergie <Text className="text-gray-400">(optionnel)</Text>
                        </Text>
                        <Controller
                            control={form.control}
                            name="energy_bill_url"
                            render={({ field }) => (
                                <FileUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                    accept="any"
                                    label="Téléverser une facture d'énergie"
                                />
                            )}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            Facture de moins de 3 mois (gaz, fioul, électricité)
                        </Text>
                    </View>
                </View>

                {/* Informations fiscales */}
                <View className="bg-white rounded-xl p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-4">Informations fiscales</Text>

                    <View className="gap-4">
                        <Controller
                            control={form.control}
                            name="reference_tax_income"
                            render={({ field }) => (
                                <Input
                                    label="Revenu fiscal de référence"
                                    placeholder="Ex: 25000"
                                    keyboardType="numeric"
                                    value={field.value?.toString() || ''}
                                    onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="household_size"
                            render={({ field }) => (
                                <Input
                                    label="Nombre de personnes dans le foyer"
                                    placeholder="Ex: 4"
                                    keyboardType="numeric"
                                    value={field.value?.toString() || ''}
                                    onChangeText={(v) => field.onChange(v ? parseInt(v, 10) : undefined)}
                                />
                            )}
                        />
                    </View>

                    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex-row items-start gap-3 mt-4">
                        <Ionicons name="information-circle" size={20} color="#2563EB" />
                        <Text className="text-blue-800 text-sm flex-1">
                            Ces informations sont nécessaires pour calculer les plafonds de ressources et
                            déterminer le niveau d'aide applicable (MaPrimeRénov' Bleu, Jaune, Violet, Rose).
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View className="p-4 bg-white border-t border-gray-100">
                <View className="flex-row gap-3 mb-3">
                    <Button
                        variant="outline"
                        label="Précédent"
                        onPress={handlePrevious}
                        disabled={isNavigating || isSkipping}
                        className="flex-1"
                    />
                    <Button
                        label={isNavigating ? 'Enregistrement...' : 'Suivant'}
                        onPress={handleNext}
                        disabled={isNavigating || isSkipping}
                        loading={isNavigating}
                        className="flex-1"
                    />
                </View>
                <TouchableOpacity
                    onPress={handleSkip}
                    disabled={isNavigating || isSkipping}
                    className="py-2 items-center"
                    activeOpacity={0.7}
                >
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="play-skip-forward" size={16} color="#6B7280" />
                        <Text className="text-gray-500 font-medium">
                            {isSkipping ? 'Enregistrement...' : 'Passer pour le moment'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
