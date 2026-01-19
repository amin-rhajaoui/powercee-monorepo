/**
 * PropertySelector - Uses NativePicker base component
 * DRY: All picker logic is in NativePicker, this just handles data fetching
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NativePicker, PickerOption } from '@/components/ui/Select';
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
// Helpers
// ============================================================================

function getPropertyDisplayName(property: Property): string {
    const typeEmoji = property.type === 'MAISON' ? '🏠' : '🏢';
    return `${typeEmoji} ${property.address}, ${property.postal_code || ''} ${property.city}`;
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
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load properties when clientId changes
    useEffect(() => {
        async function loadProperties() {
            if (!clientId) {
                setProperties([]);
                onChange(null);
                return;
            }

            setIsLoading(true);
            try {
                const result = await listProperties({ client_id: clientId });
                setProperties(result.items);

                // Auto-select if only one property
                if (result.items.length === 1 && !value) {
                    onChange(result.items[0].id);
                }
            } catch (error) {
                console.error('Error loading properties:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadProperties();
    }, [clientId]);

    // No client selected state
    if (!clientId) {
        return (
            <View className="w-full mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">Logement</Text>
                <View className="h-14 bg-gray-100 rounded-xl items-center justify-center">
                    <Text className="text-gray-400 text-sm">Sélectionnez d'abord un client</Text>
                </View>
            </View>
        );
    }

    // Transform properties to picker options
    const options: PickerOption<string>[] = properties.map((property) => ({
        label: getPropertyDisplayName(property),
        value: property.id,
    }));

    // Helper text if no properties
    const helperText = !isLoading && properties.length === 0
        ? 'Aucun logement trouvé pour ce client'
        : undefined;

    return (
        <NativePicker
            label="Logement"
            value={value}
            options={options}
            onChange={onChange}
            placeholder="Sélectionner un logement..."
            disabled={disabled}
            loading={isLoading}
            helperText={helperText}
            helperVariant="warning"
        />
    );
}
