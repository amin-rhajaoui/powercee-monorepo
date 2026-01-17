/**
 * PropertySelector Component
 * Modal picker for selecting or creating a property for a client
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Property, listProperties } from '@/lib/api/properties';

// ============================================================================
// Types
// ============================================================================

interface PropertySelectorProps {
    clientId: string | null;
    value: string | null;
    onChange: (propertyId: string | null) => void;
    disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PropertySelector({
    clientId,
    value,
    onChange,
    disabled = false,
}: PropertySelectorProps) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    // Load properties for the client
    useEffect(() => {
        async function loadProperties() {
            if (!clientId) {
                setProperties([]);
                return;
            }

            setIsLoading(true);
            try {
                const result = await listProperties(clientId);
                setProperties(result);
            } catch (error) {
                console.error('Error loading properties:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (isModalVisible && clientId) {
            loadProperties();
        }
    }, [isModalVisible, clientId]);

    // Load selected property details
    useEffect(() => {
        if (value && properties.length > 0) {
            const property = properties.find((p) => p.id === value);
            if (property) {
                setSelectedProperty(property);
            }
        }
    }, [value, properties]);

    const getPropertyDisplayName = (property: Property): string => {
        return `${property.address}, ${property.postal_code} ${property.city}`;
    };

    const getPropertyTypeLabel = (type: string): string => {
        return type === 'MAISON' ? 'Maison' : 'Appartement';
    };

    const handleSelectProperty = (property: Property) => {
        setSelectedProperty(property);
        onChange(property.id);
        setIsModalVisible(false);
    };

    const handleClear = () => {
        setSelectedProperty(null);
        onChange(null);
    };

    if (!clientId) {
        return (
            <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Logement</Text>
                <View className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <Text className="text-gray-500 text-center">
                        Veuillez d'abord sélectionner un client
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Logement</Text>

            <TouchableOpacity
                onPress={() => !disabled && setIsModalVisible(true)}
                disabled={disabled}
                className="flex-row items-center justify-between p-4 border border-gray-300 rounded-xl bg-white"
                style={{ opacity: disabled ? 0.5 : 1 }}
                activeOpacity={0.7}
            >
                {selectedProperty ? (
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
                            <Ionicons
                                name={selectedProperty.type === 'MAISON' ? 'home' : 'business'}
                                size={20}
                                color="#0066FF"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-medium" numberOfLines={1}>
                                {getPropertyDisplayName(selectedProperty)}
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                {getPropertyTypeLabel(selectedProperty.type)}
                                {selectedProperty.living_area && ` • ${selectedProperty.living_area}m²`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClear} className="p-2">
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="flex-row items-center">
                        <Ionicons name="home-outline" size={20} color="#6B7280" />
                        <Text className="text-gray-500 ml-2">Sélectionner un logement</Text>
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
                        <Text className="text-lg font-semibold">Sélectionner un logement</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    {/* List */}
                    {isLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#0066FF" />
                        </View>
                    ) : (
                        <FlatList
                            data={properties}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectProperty(item)}
                                    className="flex-row items-center py-4 border-b border-gray-100"
                                    activeOpacity={0.7}
                                >
                                    <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mr-3">
                                        <Ionicons
                                            name={item.type === 'MAISON' ? 'home' : 'business'}
                                            size={24}
                                            color="#0066FF"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 font-medium" numberOfLines={2}>
                                            {getPropertyDisplayName(item)}
                                        </Text>
                                        <Text className="text-gray-500 text-sm">
                                            {getPropertyTypeLabel(item.type)}
                                            {item.living_area && ` • ${item.living_area}m²`}
                                            {item.construction_year && ` • Construit en ${item.construction_year}`}
                                        </Text>
                                    </View>
                                    {value === item.id && (
                                        <Ionicons name="checkmark-circle" size={24} color="#0066FF" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View className="items-center py-12">
                                    <Ionicons name="home-outline" size={48} color="#D1D5DB" />
                                    <Text className="text-gray-500 mt-4 text-center">
                                        Aucun logement trouvé{'\n'}pour ce client
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}
