import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { lightColors } from '@/lib/colors';
import { Ionicons } from '@expo/vector-icons'; // Assuming Ionicons is available

// Mock data for clients if API is not fully ready or for UI dev
const MOCK_CLIENTS = [
    { label: 'Jean Dupont', value: '1' },
    { label: 'Marie Martin', value: '2' },
    { label: 'Entreprise XYZ', value: '3' },
];

export default function Step1Client() {
    const router = useRouter();
    const [selectedClient, setSelectedClient] = useState<string | null>(null);

    const handleNext = () => {
        if (selectedClient) {
            router.push('/(app)/bar-th-171/step2');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1">
                {/* Progress Bar */}
                <View className="px-6 pt-4 pb-4">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm font-medium text-primary">Étape 1/3</Text>
                        <Text className="text-sm text-muted-foreground">Client</Text>
                    </View>
                    <View className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <View className="h-full w-1/3 bg-primary rounded-full" />
                    </View>
                </View>

                <ScrollView className="flex-1 px-6">
                    <View className="gap-6 py-6">
                        <View>
                            <Text className="text-2xl font-bold text-foreground mb-2">
                                Sélection du Client
                            </Text>
                            <Text className="text-base text-muted-foreground">
                                Pour qui réalisez-vous cette étude ?
                            </Text>
                        </View>

                        <Select
                            label="Client existant"
                            placeholder="Rechercher un client..."
                            options={MOCK_CLIENTS}
                            value={selectedClient}
                            onValueChange={setSelectedClient}
                        />

                        <View className="flex-row items-center gap-4 my-2">
                            <View className="h-[1px] flex-1 bg-border" />
                            <Text className="text-muted-foreground text-sm font-medium">OU</Text>
                            <View className="h-[1px] flex-1 bg-border" />
                        </View>

                        <Button
                            variant="outline"
                            className="gap-2"
                            onPress={() => router.push('/(app)/clients/add')}
                        >
                            <Ionicons name="add" size={20} color={lightColors.foreground} />
                            <Text>Créer un nouveau client</Text>
                        </Button>

                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View className="p-6 border-t border-border bg-background">
                    <Button
                        label="Suivant"
                        onPress={handleNext}
                        disabled={!selectedClient}
                    />
                    <Button
                        variant="ghost"
                        label="Annuler"
                        className="mt-2"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
