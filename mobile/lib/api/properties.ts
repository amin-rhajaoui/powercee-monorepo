/**
 * Properties API Service
 * Operations for properties (logements)
 */

import { api } from '../api';

// ============================================================================
// Types
// ============================================================================

export type PropertyType = 'MAISON' | 'APPARTEMENT';

export interface Property {
    id: string;
    client_id: string;
    type: PropertyType;
    address: string;
    postal_code: string;
    city: string;
    living_area: number | null;
    construction_year: number | null;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface PropertyCreate {
    client_id: string;
    type: PropertyType;
    address: string;
    postal_code: string;
    city: string;
    living_area?: number;
    construction_year?: number;
}

export interface PaginatedProperties {
    items: Property[];
    total: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List properties for a client
 */
export async function listProperties(clientId: string): Promise<Property[]> {
    const result = await api.get<PaginatedProperties | Property[]>(`/properties?client_id=${clientId}`);
    // Handle both paginated and array response
    if (Array.isArray(result)) {
        return result;
    }
    return result.items;
}

/**
 * Get a single property by ID
 */
export async function getProperty(id: string): Promise<Property> {
    return api.get<Property>(`/properties/${id}`);
}

/**
 * Create a new property
 */
export async function createProperty(data: PropertyCreate): Promise<Property> {
    return api.post<Property>('/properties', data);
}

/**
 * Update a property
 */
export async function updateProperty(
    id: string,
    data: Partial<PropertyCreate>
): Promise<Property> {
    return api.put<Property>(`/properties/${id}`, data);
}
