import { api } from '../api';

export type FolderStatus = 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';

export interface Folder {
  id: string;
  module_code: string;
  client_id: string;
  property_id?: string | null;
  status: FolderStatus;
  data: Record<string, any>;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface FolderPayload {
  module_code: string;
  client_id: string;
  property_id?: string | null;
  status?: FolderStatus;
  data?: Record<string, any>;
}

export async function createFolder(payload: FolderPayload): Promise<Folder> {
  return api.post<Folder>('/folders', payload);
}

export async function updateFolder(folderId: string, payload: Partial<FolderPayload>): Promise<Folder> {
  return api.put<Folder>(`/folders/${folderId}`, payload);
}

export interface PaginatedFoldersResponse {
  items: Folder[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListFoldersParams {
  module_code?: string;
  client_id?: string;
  status?: FolderStatus;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export async function listFolders(params?: ListFoldersParams): Promise<PaginatedFoldersResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.module_code) queryParams.append('module_code', params.module_code);
  if (params?.client_id) queryParams.append('client_id', params.client_id);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_dir) queryParams.append('sort_dir', params.sort_dir);

  const query = queryParams.toString();
  const url = `/folders${query ? `?${query}` : ''}`;
  
  return api.get<PaginatedFoldersResponse>(url);
}

export async function getFolder(folderId: string): Promise<Folder> {
  return api.get<Folder>(`/folders/${folderId}`);
}
