import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Select, RadioGroup } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { lightColors } from '@/lib/colors';
import { Ionicons } from '@expo/vector-icons';
import { listProperties, createProperty, type Property } from '@/lib/api/properties';

const PROPERTY_TYPES = [
    { label: 'Maison', value: 'MAISON' },
    { label: 'Appartement', value: 'APPARTEMENT' },
    { label: 'Local Commercial', value: 'LOCAL_COMMERCIAL' },
    { label: 'Bâtiment Tertiaire', value: 'BATIMENT_TERTIAIRE' },
    { label: 'Autre', value: 'AUTRE' },
];

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
    const params = useLocalSearchParams<{ clientId?: string }>();
    const clientId = params.clientId || null;

    // Property selection state
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [isLoadingProperties, setIsLoadingProperties] = useState(false);
    const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false);
    const [isCreatingProperty, setIsCreatingProperty] = useState(false);

    // Property form state
    const [propertyLabel, setPropertyLabel] = useState('');
    const [propertyType, setPropertyType] = useState<string>('MAISON');
    const [propertyAddress, setPropertyAddress] = useState('');
    const [propertyCity, setPropertyCity] = useState('');
    const [propertyPostalCode, setPropertyPostalCode] = useState('');

    // State for form fields
    const [isPrincipal, setIsPrincipal] = useState<boolean | null>(null);
    const [occupation, setOccupation] = useState<string>('');
    const [heatingSystem, setHeatingSystem] = useState<string>('');
    const [oldBoilerBrand, setOldBoilerBrand] = useState<string>('');
    const [isWaterInfoLinked, setIsWaterInfoLinked] = useState<boolean | null>(null);
    const [waterHeatingType, setWaterHeatingType] = useState<string>('');
    const [electricalPhase, setElectricalPhase] = useState<string>('');
    const [powerKva, setPowerKva] = useState<string>('');

    useEffect(() => {
        if (clientId) {
            loadProperties();
        }
    }, [clientId]);

    const loadProperties = async () => {
        if (!clientId) return;

        try {
            setIsLoadingProperties(true);
            const response = await listProperties({
                client_id: clientId,
                page_size: 100,
                sort_by: 'created_at',
                sort_dir: 'desc',
            });
            setProperties(response.items);
        } catch (error: any) {
            console.error('Error loading properties:', error);
            Alert.alert('Erreur', 'Impossible de charger les logements');
        } finally {
            setIsLoadingProperties(false);
        }
    };

    const formatPropertyOptions = (propertiesList: Property[]) => {
        return propertiesList.map((property) => ({
            label: property.label || `${property.address}, ${property.city}`,
            value: property.id,
        }));
    };

    const handleCreateProperty = async () => {
        if (!clientId || !propertyLabel.trim() || !propertyAddress.trim() || !propertyCity.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
            return;
        }

        setIsCreatingProperty(true);
        try {
            // Use default coordinates (0,0) - could be improved with geocoding later
            const newProperty = await createProperty({
                label: propertyLabel,
                type: propertyType as any,
                address: propertyAddress,
                city: propertyCity,
                postal_code: propertyPostalCode || null,
                client_id: clientId,
                latitude: 0, // TODO: Geocoding
                longitude: 0, // TODO: Geocoding
                country: 'France',
            });

            await loadProperties();
            setSelectedPropertyId(newProperty.id);
            setShowCreatePropertyModal(false);
            // Reset form
            setPropertyLabel('');
            setPropertyAddress('');
            setPropertyCity('');
            setPropertyPostalCode('');
        } catch (error: any) {
            Alert.alert('Erreur', error?.message || 'Une erreur est survenue lors de la création du logement');
        } finally {
            setIsCreatingProperty(false);
        }
    };

    const handleNext = () => {
        if (!selectedPropertyId) {
            Alert.alert('Erreur', 'Veuillez sélectionner ou créer un logement');
            return;
        }
        router.push({
            pathname: '/(app)/bar-th-171/step3',
            params: { clientId, propertyId: selectedPropertyId },
        });
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

                            {/* Property Selection */}
                            <View className="gap-6 p-4 border border-border rounded-2xl bg-card">
                                <Text className="font-semibold text-lg text-foreground">Sélection du logement</Text>

                                {isLoadingProperties ? (
                                    <Text className="text-sm text-muted-foreground">Chargement...</Text>
                                ) : properties.length > 0 ? (
                                    <>
                                        <Select
                                            label="Logement existant"
                                            placeholder="Choisir un logement..."
                                            options={formatPropertyOptions(properties)}
                                            value={selectedPropertyId}
                                            onValueChange={setSelectedPropertyId}
                                        />

                                        <View className="flex-row items-center gap-4 my-2">
                                            <View className="h-[1px] flex-1 bg-border" />
                                            <Text className="text-muted-foreground text-sm font-medium">OU</Text>
                                            <View className="h-[1px] flex-1 bg-border" />
                                        </View>

                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onPress={() => setShowCreatePropertyModal(true)}
                                        >
                                            <Ionicons name="add" size={20} color={lightColors.foreground} />
                                            <Text>Créer un nouveau logement</Text>
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onPress={() => setShowCreatePropertyModal(true)}
                                    >
                                        <Ionicons name="add" size={20} color={lightColors.foreground} />
                                        <Text>Créer un logement</Text>
                                    </Button>
                                )}
                            </View>

                            {/* Logement Details */}
                            <View className="gap-6 p-4 border border-border rounded-2xl bg-card">
                                <Text className="font-semibold text-lg text-foreground">Détails du logement</Text>

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

            {/* Modal pour créer un logement */}
            <Modal
                visible={showCreatePropertyModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowCreatePropertyModal(false)}
            >
                <SafeAreaView className="flex-1 bg-background">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                    >
                        <View className="flex-1">
                            {/* Header */}
                            <View className="flex-row items-center justify-between p-4 border-b border-border">
                                <Text className="text-xl font-bold text-foreground">Nouveau logement</Text>
                                <Button
                                    variant="ghost"
                                    onPress={() => setShowCreatePropertyModal(false)}
                                    label="Annuler"
                                />
                            </View>

                            <ScrollView
                                className="flex-1 px-6"
                                contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View className="gap-6">
                                    <Input
                                        label="Nom du logement"
                                        value={propertyLabel}
                                        onChangeText={setPropertyLabel}
                                        placeholder="Ex: Maison principale"
                                    />

                                    <Select
                                        label="Type de logement"
                                        value={propertyType}
                                        onValueChange={setPropertyType}
                                        options={PROPERTY_TYPES}
                                    />

                                    <Input
                                        label="Adresse"
                                        value={propertyAddress}
                                        onChangeText={setPropertyAddress}
                                        placeholder="Ex: 123 Rue de la République"
                                    />

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Input
                                                label="Code postal"
                                                value={propertyPostalCode}
                                                onChangeText={setPropertyPostalCode}
                                                placeholder="75001"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View className="flex-2">
                                            <Input
                                                label="Ville"
                                                value={propertyCity}
                                                onChangeText={setPropertyCity}
                                                placeholder="Paris"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Footer */}
                            <View className="p-6 border-t border-border bg-background">
                                <Button
                                    label="Créer le logement"
                                    onPress={handleCreateProperty}
                                    loading={isCreatingProperty}
                                    disabled={isCreatingProperty}
                                />
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
