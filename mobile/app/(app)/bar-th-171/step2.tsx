import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Select, RadioGroup } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { lightColors } from '@/lib/colors';

const HEATING_SYSTEMS = [
    { label: 'Chaudière Fioul', value: 'FIOUL' },
    { label: 'Chaudière Gaz', value: 'GAZ' },
    { label: 'Chaudière Charbon', value: 'CHARBON' },
    { label: 'Autre', value: 'AUTRE' },
];

const OCCUPATION_STATUS = [
    { label: 'Propriétaire', value: 'OWNER' },
    { label: 'Locataire', value: 'TENANT' },
];

const ELECTRICAL_PHASES = [
    { label: 'Monophasé', value: 'MONO' },
    { label: 'Triphasé', value: 'TRI' },
];

export default function Step2Technical() {
    const router = useRouter();

    // State for form fields
    const [isPrincipal, setIsPrincipal] = useState<boolean | null>(null);
    const [occupation, setOccupation] = useState<string>('');
    const [heatingSystem, setHeatingSystem] = useState<string>('');
    const [oldBoilerBrand, setOldBoilerBrand] = useState<string>('');
    const [isWaterInfoLinked, setIsWaterInfoLinked] = useState<boolean | null>(null);
    const [waterHeatingType, setWaterHeatingType] = useState<string>('');
    const [electricalPhase, setElectricalPhase] = useState<string>('');
    const [powerKva, setPowerKva] = useState<string>('');

    const handleNext = () => {
        // Basic validation could go here
        router.push('/(app)/bar-th-171/step3');
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1">
                    {/* Progress Bar */}
                    <View className="px-6 pt-4 pb-4">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-sm font-medium text-primary">Étape 2/3</Text>
                            <Text className="text-sm text-muted-foreground">Caractéristiques</Text>
                        </View>
                        <View className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <View className="h-full w-2/3 bg-primary rounded-full" />
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
                        <View className="gap-6 py-6">
                            <View>
                                <Text className="text-2xl font-bold text-foreground mb-2">
                                    Détails Techniques
                                </Text>
                                <Text className="text-base text-muted-foreground">
                                    Caractéristiques du logement et de l'installation actuelle.
                                </Text>
                            </View>

                            {/* Logement */}
                            <View className="gap-6 p-4 border border-border rounded-2xl bg-card">
                                <Text className="font-semibold text-lg text-foreground">Logement</Text>

                                <RadioGroup
                                    label="Résidence Principale ?"
                                    value={isPrincipal}
                                    onValueChange={setIsPrincipal}
                                    options={[
                                        { label: 'Oui', value: true },
                                        { label: 'Non', value: false },
                                    ]}
                                />

                                <RadioGroup
                                    label="Statut d'occupation"
                                    value={occupation}
                                    onValueChange={setOccupation}
                                    options={OCCUPATION_STATUS}
                                />
                            </View>

                            {/* Chauffage */}
                            <View className="gap-6 p-4 border border-border rounded-2xl bg-card">
                                <Text className="font-semibold text-lg text-foreground">Chauffage Actuel</Text>

                                <Select
                                    label="Système de chauffage"
                                    value={heatingSystem}
                                    onValueChange={setHeatingSystem}
                                    options={HEATING_SYSTEMS}
                                />

                                <Input
                                    label="Marque de l'ancienne chaudière"
                                    value={oldBoilerBrand}
                                    onChangeText={setOldBoilerBrand}
                                    placeholder="Ex: De Dietrich, Saunier Duval..."
                                />
                            </View>

                            {/* Eau Chaude */}
                            <View className="gap-6 p-4 border border-border rounded-2xl bg-card">
                                <Text className="font-semibold text-lg text-foreground">Eau Chaude Sanitaire</Text>

                                <RadioGroup
                                    label="Production liée au chauffage ?"
                                    value={isWaterInfoLinked}
                                    onValueChange={setIsWaterInfoLinked}
                                    options={[
                                        { label: 'Oui', value: true },
                                        { label: 'Non', value: false },
                                    ]}
                                />

                                {!isWaterInfoLinked && ( // Show only if independent
                                    <Select
                                        label="Type de chauffe-eau"
                                        value={waterHeatingType}
                                        onValueChange={setWaterHeatingType}
                                        options={[
                                            { label: 'Électrique (Cumulus)', value: 'ELEC' },
                                            { label: 'Gaz Instantané', value: 'GAZ' },
                                            { label: 'Autre', value: 'AUTRE' },
                                        ]}
                                    />
                                )}
                            </View>

                            {/* Électricité */}
                            <View className="gap-6 p-4 border border-border rounded-2xl bg-card">
                                <Text className="font-semibold text-lg text-foreground">Installation Électrique</Text>

                                <RadioGroup
                                    label="Type de raccordement"
                                    value={electricalPhase}
                                    onValueChange={setElectricalPhase}
                                    options={ELECTRICAL_PHASES}
                                />

                                <Input
                                    label="Puissance souscrite (kVA)"
                                    value={powerKva}
                                    onChangeText={setPowerKva}
                                    keyboardType="numeric"
                                    placeholder="Ex: 9, 12, 16..."
                                />
                            </View>

                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View className="p-6 border-t border-border bg-background">
                        <Button
                            label="Suivant"
                            onPress={handleNext}
                        />
                        <Button
                            variant="ghost"
                            label="Retour"
                            className="mt-2"
                            onPress={() => router.back()}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
