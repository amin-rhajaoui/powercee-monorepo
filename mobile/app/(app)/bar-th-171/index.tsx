import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Select, RadioGroup } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { lightColors } from '@/lib/colors';
import { Ionicons } from '@expo/vector-icons';
import { listClients, createClient, type Client } from '@/lib/api/clients';
import { clientCreateSchema, clientTypeOptions, type ClientFormValues } from '@/lib/schemas/client';

export default function Step1Client() {
    const router = useRouter();
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<ClientFormValues>({
        resolver: zodResolver(clientCreateSchema),
        defaultValues: {
            type: 'PARTICULIER',
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            company_name: '',
            contact_name: '',
        },
    });

    const clientType = watch('type');

    const loadClients = async () => {
        try {
            setIsLoading(true);
            const response = await listClients({
                page_size: 100,
                sort_by: 'created_at',
                sort_dir: 'desc',
            });
            setClients(response.items);
        } catch (error: any) {
            console.error('Error loading clients:', error);
            Alert.alert('Erreur', 'Impossible de charger les clients');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);

    const formatClientOptions = (clientsList: Client[]) => {
        return clientsList.map((client) => {
            let label = '';
            if (client.type === 'PARTICULIER') {
                label = `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email;
            } else {
                label = client.company_name || client.email;
            }
            return { label, value: client.id };
        });
    };

    const handleCreateClient = async (values: ClientFormValues) => {
        setIsCreating(true);
        try {
            const newClient = await createClient({
                type: values.type,
                first_name: values.first_name || undefined,
                last_name: values.last_name || undefined,
                company_name: values.company_name || undefined,
                contact_name: values.contact_name || undefined,
                email: values.email,
                phone: values.phone || undefined,
                agency_id: null,
            });

            await loadClients();
            setSelectedClient(newClient.id);
            setShowCreateModal(false);
            reset();
        } catch (error: any) {
            Alert.alert(
                'Erreur',
                error?.message || 'Une erreur est survenue lors de la création du client'
            );
        } finally {
            setIsCreating(false);
        }
    };

    const handleNext = () => {
        if (selectedClient) {
            router.push({
                pathname: '/(app)/bar-th-171/step2',
                params: { clientId: selectedClient },
            });
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

                        {isLoading ? (
                            <View className="items-center py-8">
                                <Text className="text-base text-muted-foreground">Chargement...</Text>
                            </View>
                        ) : (
                            <>
                                <Select
                                    label="Client existant"
                                    placeholder="Rechercher un client..."
                                    options={formatClientOptions(clients)}
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
                                    onPress={() => setShowCreateModal(true)}
                                >
                                    <Ionicons name="add" size={20} color={lightColors.foreground} />
                                    <Text>Créer un nouveau client</Text>
                                </Button>
                            </>
                        )}

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

            {/* Modal pour créer un client */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => {
                    setShowCreateModal(false);
                    reset();
                }}
            >
                <SafeAreaView className="flex-1 bg-background">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                    >
                        <View className="flex-1">
                            {/* Header */}
                            <View className="flex-row items-center justify-between p-4 border-b border-border">
                                <Text className="text-xl font-bold text-foreground">Nouveau client</Text>
                                <Button
                                    variant="ghost"
                                    onPress={() => {
                                        setShowCreateModal(false);
                                        reset();
                                    }}
                                    label="Annuler"
                                />
                            </View>

                            <ScrollView
                                className="flex-1 px-6"
                                contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View className="gap-6">
                                    <Controller
                                        control={control}
                                        name="type"
                                        render={({ field: { onChange, value } }) => (
                                            <RadioGroup
                                                label="Type de client"
                                                value={value}
                                                options={clientTypeOptions}
                                                onValueChange={onChange}
                                            />
                                        )}
                                    />

                                    {clientType === 'PARTICULIER' ? (
                                        <View className="gap-6">
                                            <Controller
                                                control={control}
                                                name="first_name"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <Input
                                                        label="Prénom"
                                                        value={value || ''}
                                                        onChangeText={onChange}
                                                        onBlur={onBlur}
                                                        error={errors.first_name?.message}
                                                        autoCapitalize="words"
                                                    />
                                                )}
                                            />

                                            <Controller
                                                control={control}
                                                name="last_name"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <Input
                                                        label="Nom"
                                                        value={value || ''}
                                                        onChangeText={onChange}
                                                        onBlur={onBlur}
                                                        error={errors.last_name?.message}
                                                        autoCapitalize="words"
                                                    />
                                                )}
                                            />
                                        </View>
                                    ) : (
                                        <View className="gap-6">
                                            <Controller
                                                control={control}
                                                name="company_name"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <Input
                                                        label="Raison sociale"
                                                        value={value || ''}
                                                        onChangeText={onChange}
                                                        onBlur={onBlur}
                                                        error={errors.company_name?.message}
                                                        autoCapitalize="words"
                                                    />
                                                )}
                                            />

                                            <Controller
                                                control={control}
                                                name="contact_name"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <Input
                                                        label="Contact principal"
                                                        value={value || ''}
                                                        onChangeText={onChange}
                                                        onBlur={onBlur}
                                                        error={errors.contact_name?.message}
                                                        placeholder="Nom du contact"
                                                        autoCapitalize="words"
                                                    />
                                                )}
                                            />
                                        </View>
                                    )}

                                    <Controller
                                        control={control}
                                        name="email"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <Input
                                                label="Email"
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                error={errors.email?.message}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        )}
                                    />

                                    <Controller
                                        control={control}
                                        name="phone"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <Input
                                                label="Téléphone"
                                                value={value || ''}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                error={errors.phone?.message}
                                                keyboardType="phone-pad"
                                            />
                                        )}
                                    />
                                </View>
                            </ScrollView>

                            {/* Footer */}
                            <View className="p-6 border-t border-border bg-background">
                                <Button
                                    label="Créer le client"
                                    onPress={handleSubmit(handleCreateClient)}
                                    loading={isCreating}
                                    disabled={isCreating}
                                />
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
