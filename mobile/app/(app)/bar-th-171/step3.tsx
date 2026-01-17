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

export default function Step3Photos() {
    const router = useRouter();
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
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1">
                {/* Progress Bar */}
                <View className="px-6 pt-4 pb-4">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm font-medium text-primary">Étape 3/3</Text>
                        <Text className="text-sm text-muted-foreground">Photos</Text>
                    </View>
                    <View className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <View className="h-full w-full bg-primary rounded-full" />
                    </View>
                </View>

                <ScrollView className="flex-1 px-6">
                    <View className="gap-6 py-6">
                        <View>
                            <Text className="text-2xl font-bold text-foreground mb-2">
                                Photos de l'installation
                            </Text>
                            <Text className="text-base text-muted-foreground">
                                Une image vaut mille mots. Ajoutez les photos requises pour valider le dossier.
                            </Text>
                        </View>

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
                        </View>

                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View className="p-6 border-t border-border bg-background">
                    <Button
                        label="Terminer le dossier"
                        onPress={handleFinish}
                        loading={isSaving}
                        disabled={isSaving}
                    />
                    <Button
                        variant="ghost"
                        label="Retour"
                        className="mt-2"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
