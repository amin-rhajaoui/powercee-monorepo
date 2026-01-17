/**
 * Module Drafts API Service
 * CRUD operations for module drafts (brouillons)
 */

import { api } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface ModuleDraft {
    id: string;
    module_code: string;
    client_id: string | null;
    property_id: string | null;
    current_step: number;
    data: Record<string, unknown>;
    tenant_id: string;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ModuleDraftCreate {
    module_code: string;
    client_id?: string | null;
    property_id?: string | null;
    current_step?: number;
    data?: Record<string, unknown>;
}

export interface ModuleDraftUpdate {
    client_id?: string | null;
    property_id?: string | null;
    current_step?: number;
    data?: Record<string, unknown>;
}

export interface PaginatedModuleDrafts {
    items: ModuleDraft[];
    total: number;
    page: number;
    page_size: number;
}

export interface ListModuleDraftsParams {
    module_code?: string;
    client_id?: string;
    page?: number;
    pageSize?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List module drafts with pagination and filters
 */
export async function listModuleDrafts(
    params: ListModuleDraftsParams = {}
): Promise<PaginatedModuleDrafts> {
    const { module_code, client_id, page = 1, pageSize = 10 } = params;

    const queryParams = new URLSearchParams();
    if (module_code) queryParams.append('module_code', module_code);
    if (client_id) queryParams.append('client_id', client_id);
    queryParams.append('page', page.toString());
    queryParams.append('page_size', pageSize.toString());

    return api.get<PaginatedModuleDrafts>(`/module-drafts?${queryParams.toString()}`);
}

/**
 * Get a single module draft by ID
 */
export async function getModuleDraft(id: string): Promise<ModuleDraft> {
    return api.get<ModuleDraft>(`/module-drafts/${id}`);
}

/**
 * Create a new module draft
 */
export async function createModuleDraft(data: ModuleDraftCreate): Promise<ModuleDraft> {
    return api.post<ModuleDraft>('/module-drafts', data);
}

/**
 * Update an existing module draft
 */
export async function updateModuleDraft(
    id: string,
    data: ModuleDraftUpdate
): Promise<ModuleDraft> {
    return api.put<ModuleDraft>(`/module-drafts/${id}`, data);
}

/**
 * Delete a module draft (soft delete)
 */
export async function deleteModuleDraft(id: string): Promise<void> {
    return api.delete(`/module-drafts/${id}`);
}
