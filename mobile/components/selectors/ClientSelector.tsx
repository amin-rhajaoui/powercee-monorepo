/**
 * ClientSelector Component
 * Modal picker for selecting or creating a client
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@/lib/api/clients';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface ClientSelectorProps {
    value: string | null;
    onChange: (clientId: string | null) => void;
    disabled?: boolean;
}

interface PaginatedClients {
    items: Client[];
    total: number;
}

// ============================================================================
// Component
// ============================================================================

export function ClientSelector({ value, onChange, disabled = false }: ClientSelectorProps) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Load clients
    useEffect(() => {
        async function loadClients() {
            setIsLoading(true);
            try {
                const result = await api.get<PaginatedClients | Client[]>('/clients?type=PARTICULIER');
                if (Array.isArray(result)) {
                    setClients(result);
                } else {
                    setClients(result.items);
                }
            } catch (error) {
                console.error('Error loading clients:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (isModalVisible) {
            loadClients();
        }
    }, [isModalVisible]);

    // Load selected client details
    useEffect(() => {
        async function loadSelectedClient() {
            if (value && !selectedClient) {
                try {
                    const client = await api.get<Client>(`/clients/${value}`);
                    setSelectedClient(client);
                } catch (error) {
                    console.error('Error loading selected client:', error);
                }
            }
        }

        loadSelectedClient();
    }, [value, selectedClient]);

    const getClientDisplayName = (client: Client): string => {
        if (client.first_name || client.last_name) {
            return `${client.first_name || ''} ${client.last_name || ''}`.trim();
        }
        return client.company_name || client.email;
    };

    const filteredClients = clients.filter((client) => {
        const name = getClientDisplayName(client).toLowerCase();
        const email = client.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        onChange(client.id);
        setIsModalVisible(false);
        setSearchQuery('');
    };

    const handleClear = () => {
        setSelectedClient(null);
        onChange(null);
    };

    return (
        <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Client</Text>

            <TouchableOpacity
                onPress={() => !disabled && setIsModalVisible(true)}
                disabled={disabled}
                className="flex-row items-center justify-between p-4 border border-gray-300 rounded-xl bg-white"
                style={{ opacity: disabled ? 0.5 : 1 }}
                activeOpacity={0.7}
            >
                {selectedClient ? (
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                            <Text className="text-primary font-semibold">
                                {getClientDisplayName(selectedClient).charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-medium" numberOfLines={1}>
                                {getClientDisplayName(selectedClient)}
                            </Text>
                            <Text className="text-gray-500 text-sm" numberOfLines={1}>
                                {selectedClient.email}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClear} className="p-2">
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="flex-row items-center">
                        <Ionicons name="person-add-outline" size={20} color="#6B7280" />
                        <Text className="text-gray-500 ml-2">Sélectionner un client</Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View className="flex-1 bg-white">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                        <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                            <Text className="text-primary font-medium">Annuler</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold">Sélectionner un client</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    {/* Search */}
                    <View className="px-4 py-3">
                        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                            <Ionicons name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-2 text-gray-900"
                                placeholder="Rechercher par nom ou email..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* List */}
                    {isLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#0066FF" />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredClients}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectClient(item)}
                                    className="flex-row items-center py-3 border-b border-gray-100"
                                    activeOpacity={0.7}
                                >
                                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
                                        <Text className="text-primary font-semibold text-lg">
                                            {getClientDisplayName(item).charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 font-medium">
                                            {getClientDisplayName(item)}
                                        </Text>
                                        <Text className="text-gray-500 text-sm">{item.email}</Text>
                                    </View>
                                    {value === item.id && (
                                        <Ionicons name="checkmark-circle" size={24} color="#0066FF" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View className="items-center py-12">
                                    <Ionicons name="person-outline" size={48} color="#D1D5DB" />
                                    <Text className="text-gray-500 mt-4">Aucun client trouvé</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}
