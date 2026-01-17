<<<<<<< HEAD
/**
 * BAR-TH-171 - Step 3: Documents administratifs
 * Upload documents + fiscal info + skip option
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
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
=======
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/lib/colors';
import { createFolder } from '@/lib/api/folders';

interface PhotoPlaceholder {
    id: string;
    label: string;
    uri?: string;
    type?: 'photo' | 'pdf';
    required?: boolean;
}
>>>>>>> 1ae86f45af3843e9e873799975078a7a68a5093b

const MODULE_ID = 'bar-th-171';
const MODULE_CODE = 'BAR-TH-171';
const STEP_LABELS = ['Foyer', 'Logement', 'Documents', 'Visite Technique'];

// ============================================================================
// Component
// ============================================================================

export default function Step3Documents() {
    const router = useRouter();
<<<<<<< HEAD
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
=======
    const params = useLocalSearchParams<{ clientId?: string; propertyId?: string }>();
    const [isSaving, setIsSaving] = useState(false);
    const [photos, setPhotos] = useState<PhotoPlaceholder[]>([
        { id: 'boiler', label: 'Chaudière actuelle', required: true },
        { id: 'plate', label: 'Plaque signalétique', required: true },
        { id: 'panel', label: 'Tableau électrique', required: false },
        { id: 'environment', label: 'Vue d\'ensemble', required: false },
    ]);

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (cameraStatus.status !== 'granted' || mediaLibraryStatus.status !== 'granted') {
                Alert.alert(
                    'Permissions requises',
                    'Les permissions caméra et galerie sont nécessaires pour prendre des photos.'
                );
            }
        }
    };

    const handleTakePhoto = async (id: string) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Annuler', 'Prendre une photo', 'Choisir depuis la galerie', 'Scanner un PDF'],
                    cancelButtonIndex: 0,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        await openCamera(id);
                    } else if (buttonIndex === 2) {
                        await openImagePicker(id);
                    } else if (buttonIndex === 3) {
                        await openDocumentPicker(id);
                    }
                }
            );
        } else {
            Alert.alert(
                'Ajouter une image',
                'Choisissez une option',
                [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Prendre une photo', onPress: () => openCamera(id) },
                    { text: 'Choisir depuis la galerie', onPress: () => openImagePicker(id) },
                    { text: 'Scanner un PDF', onPress: () => openDocumentPicker(id) },
                ]
            );
        }
    };

    const openCamera = async (id: string) => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotos(current => current.map(p =>
                    p.id === id ? { ...p, uri: result.assets[0].uri, type: 'photo' } : p
                ));
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Erreur', 'Impossible de prendre la photo');
        }
    };

    const openImagePicker = async (id: string) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotos(current => current.map(p =>
                    p.id === id ? { ...p, uri: result.assets[0].uri, type: 'photo' } : p
                ));
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
        }
    };

    const openDocumentPicker = async (id: string) => {
        try {
            // On iOS, this will open the native document scanner if available
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotos(current => current.map(p =>
                    p.id === id ? { ...p, uri: result.assets[0].uri, type: 'pdf' } : p
                ));
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner le PDF');
        }
    };

    const handleFinish = async () => {
        const missingRequired = photos.filter(p => p.required && !p.uri);
        if (missingRequired.length > 0) {
            Alert.alert("Photos manquantes", "Veuillez prendre toutes les photos obligatoires.");
            return;
        }

        if (!params.clientId) {
            Alert.alert("Erreur", "Client non sélectionné");
            return;
        }

        setIsSaving(true);
        try {
            // Préparer les données des photos
            const photosData: Record<string, { uri: string; type: string }> = {};
            photos.forEach(photo => {
                if (photo.uri) {
                    photosData[photo.id] = {
                        uri: photo.uri,
                        type: photo.type || 'photo',
                    };
                }
            });

            // Créer le dossier dans le backend
            await createFolder({
                module_code: 'BAR-TH-171',
                client_id: params.clientId,
                property_id: params.propertyId || null,
                status: 'IN_PROGRESS',
                data: {
                    photos: photosData,
                    // Les autres données techniques pourraient être passées depuis step2 si nécessaire
                    // Pour l'instant, on sauvegarde juste les photos
                },
            });

            Alert.alert(
                "Dossier terminé",
                "Le dossier BAR-TH-171 a été sauvegardé avec succès.",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace('/(app)')
                    }
                ]
            );
        } catch (error: any) {
            console.error('Error saving folder:', error);
            Alert.alert(
                'Erreur',
                error?.message || 'Une erreur est survenue lors de la sauvegarde du dossier.'
            );
        } finally {
            setIsSaving(false);
        }
>>>>>>> 1ae86f45af3843e9e873799975078a7a68a5093b
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

<<<<<<< HEAD
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
=======
                        <View className="flex-row flex-wrap gap-4">
                            {photos.map((photo) => (
                                <TouchableOpacity
                                    key={photo.id}
                                    onPress={() => handleTakePhoto(photo.id)}
                                    className="w-[47%] aspect-square rounded-2xl border-2 border-dashed border-border bg-card overflow-hidden items-center justify-center relative"
                                    style={{ borderStyle: 'dashed' }}
                                >
                                    {photo.uri ? (
                                        <>
                                            {photo.type === 'pdf' ? (
                                                <View className="w-full h-full items-center justify-center bg-primary/10">
                                                    <Ionicons name="document-text-outline" size={48} color={lightColors.primary} />
                                                    <Text className="text-xs text-primary mt-2">PDF</Text>
                                                </View>
                                            ) : (
                                                <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                                            )}
                                            <View className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                                                <Ionicons name="checkmark" size={16} color="white" />
                                            </View>
                                            <TouchableOpacity
                                                className="absolute top-2 left-2 bg-destructive rounded-full p-1"
                                                onPress={() => {
                                                    setPhotos(current => current.map(p =>
                                                        p.id === id ? { ...p, uri: undefined, type: undefined } : p
                                                    ));
                                                }}
                                            >
                                                <Ionicons name="close" size={16} color="white" />
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View className="items-center gap-2 p-2">
                                            <Ionicons name="camera-outline" size={32} color={lightColors.mutedForeground} />
                                            <Text className="text-center text-sm font-medium text-muted-foreground">
                                                {photo.label}
                                                {photo.required && <Text className="text-destructive"> *</Text>}
                                            </Text>
                                        </View>
                                    )}

                                </TouchableOpacity>
                            ))}
>>>>>>> 1ae86f45af3843e9e873799975078a7a68a5093b
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
<<<<<<< HEAD
                        variant="outline"
                        label="Précédent"
                        onPress={handlePrevious}
                        disabled={isNavigating || isSkipping}
                        className="flex-1"
=======
                        label="Terminer le dossier"
                        onPress={handleFinish}
                        loading={isSaving}
                        disabled={isSaving}
>>>>>>> 1ae86f45af3843e9e873799975078a7a68a5093b
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
