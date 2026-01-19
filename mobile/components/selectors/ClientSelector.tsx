/**
 * ClientSelector - Uses NativePicker base component
 * DRY: All picker logic is in NativePicker, this just handles data fetching
 */

import React, { useState, useEffect } from 'react';
import { NativePicker, PickerOption } from '@/components/ui/Select';
import { Client } from '@/lib/api/clients';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface ClientSelectorProps {
    value: string | null;
    onChange: (clientId: string | null) => void;
    disabled?: boolean;
    clientType?: 'PARTICULIER' | 'PROFESSIONNEL';
}

interface PaginatedClients {
    items: Client[];
    total: number;
}

// ============================================================================
// Helpers
// ============================================================================

function getClientDisplayName(client: Client): string {
    if (client.first_name || client.last_name) {
        return `${client.first_name || ''} ${client.last_name || ''}`.trim();
    }
    return client.company_name || client.email;
}

// ============================================================================
// Component
// ============================================================================

export function ClientSelector({
    value,
    onChange,
    disabled = false,
    clientType = 'PARTICULIER',
}: ClientSelectorProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load clients on mount
    useEffect(() => {
        async function loadClients() {
            setIsLoading(true);
            try {
                const result = await api.get<PaginatedClients | Client[]>(
                    `/clients?type=${clientType}`
                );
                setClients(Array.isArray(result) ? result : result.items);
            } catch (error) {
                console.error('Error loading clients:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadClients();
    }, [clientType]);

    // Transform clients to picker options
    const options: PickerOption<string>[] = clients.map((client) => ({
        label: getClientDisplayName(client),
        value: client.id,
    }));

    // Helper text if no clients
    const helperText = !isLoading && clients.length === 0
        ? `Aucun client ${clientType === 'PARTICULIER' ? 'particulier' : 'professionnel'} trouvé`
        : undefined;

    return (
        <NativePicker
            label="Client"
            value={value}
            options={options}
            onChange={onChange}
            placeholder="Sélectionner un client..."
            disabled={disabled}
            loading={isLoading}
            helperText={helperText}
            helperVariant="warning"
        />
    );
}
