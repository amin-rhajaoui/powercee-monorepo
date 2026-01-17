import { api } from '../api';

export interface ModuleDraft {
  id: string;
  module_code: string;
  client_id?: string | null;
  property_id?: string | null;
  current_step: number;
  data: Record<string, any>;
  tenant_id: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleDraftPayload {
  module_code: string;
  client_id?: string | null;
  property_id?: string | null;
  current_step?: number;
  data?: Record<string, any>;
}

export async function createModuleDraft(payload: ModuleDraftPayload): Promise<ModuleDraft> {
  return api.post<ModuleDraft>('/module_drafts', payload);
}

export async function updateModuleDraft(draftId: string, payload: Partial<ModuleDraftPayload>): Promise<ModuleDraft> {
  return api.put<ModuleDraft>(`/module_drafts/${draftId}`, payload);
}

export interface PaginatedModuleDraftsResponse {
  items: ModuleDraft[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListModuleDraftsParams {
  module_code?: string;
  client_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export async function listModuleDrafts(params?: ListModuleDraftsParams): Promise<PaginatedModuleDraftsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.module_code) queryParams.append('module_code', params.module_code);
  if (params?.client_id) queryParams.append('client_id', params.client_id);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_dir) queryParams.append('sort_dir', params.sort_dir);

  const query = queryParams.toString();
  const url = `/module_drafts${query ? `?${query}` : ''}`;
  
  return api.get<PaginatedModuleDraftsResponse>(url);
}

export async function getModuleDraft(draftId: string): Promise<ModuleDraft> {
  return api.get<ModuleDraft>(`/module_drafts/${draftId}`);
}
