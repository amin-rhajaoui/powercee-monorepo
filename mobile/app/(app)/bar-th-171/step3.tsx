import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/lib/colors';

interface PhotoPlaceholder {
    id: string;
    label: string;
    uri?: string;
    required?: boolean;
}

export default function Step3Photos() {
    const router = useRouter();
    const [photos, setPhotos] = useState<PhotoPlaceholder[]>([
        { id: 'boiler', label: 'Chaudière actuelle', required: true },
        { id: 'plate', label: 'Plaque signalétique', required: true },
        { id: 'panel', label: 'Tableau électrique', required: false },
        { id: 'environment', label: 'Vue d\'ensemble', required: false },
    ]);

    const handleTakePhoto = (id: string) => {
        // Mock photo taking
        Alert.alert("Caméra", "Ouverture de la caméra... (Simulation)", [
            { text: "Annuler", style: "cancel" },
            {
                text: "Prendre photo",
                onPress: () => {
                    setPhotos(current => current.map(p =>
                        p.id === id ? { ...p, uri: 'https://via.placeholder.com/150' } : p
                    ));
                }
            }
        ]);
    };

    const handleFinish = () => {
        const missingRequired = photos.filter(p => p.required && !p.uri);
        if (missingRequired.length > 0) {
            Alert.alert("Photos manquantes", "Veuillez prendre toutes les photos obligatoires.");
            return;
        }

        Alert.alert("Dossier terminé", "Le dossier BAR-TH-171 a été sauvegardé avec succès.", [
            { text: "OK", onPress: () => router.navigate('/(app)') }
        ]);
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
                                            <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                                            <View className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                                                <Ionicons name="checkmark" size={16} color="white" />
                                            </View>
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
