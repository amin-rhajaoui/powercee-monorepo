/**
 * Folders API Service
 * Operations for folders (dossiers validés)
 */

import { api } from '../api';

// ============================================================================
// Types
// ============================================================================

export type FolderStatus = 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';

export interface Folder {
    id: string;
    module_code: string;
    client_id: string;
    property_id: string | null;
    status: FolderStatus;
    data: Record<string, unknown>;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface PaginatedFolders {
    items: Folder[];
    total: number;
    page: number;
    page_size: number;
}

export interface ListFoldersParams {
    module_code?: string;
    client_id?: string;
    page?: number;
    pageSize?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List folders with pagination and filters
 */
export async function listFolders(
    params: ListFoldersParams = {}
): Promise<PaginatedFolders> {
    const { module_code, client_id, page = 1, pageSize = 10 } = params;

    const queryParams = new URLSearchParams();
    if (module_code) queryParams.append('module_code', module_code);
    if (client_id) queryParams.append('client_id', client_id);
    queryParams.append('page', page.toString());
    queryParams.append('page_size', pageSize.toString());

    return api.get<PaginatedFolders>(`/folders?${queryParams.toString()}`);
}

/**
 * Get a single folder by ID
 */
export async function getFolder(id: string): Promise<Folder> {
    return api.get<Folder>(`/folders/${id}`);
}

/**
 * Create a folder from a draft (validation finale du brouillon)
 */
export async function createFolderFromDraft(draftId: string): Promise<Folder> {
    return api.post<Folder>(`/folders/from-draft/${draftId}`, {});
}
