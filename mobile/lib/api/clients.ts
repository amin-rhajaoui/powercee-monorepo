import { api } from '../api';

export type ClientType = 'PARTICULIER' | 'PROFESSIONNEL';

export type ClientStatus = 'ACTIF' | 'ARCHIVE';

export interface Client {
  id: string;
  type: ClientType;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  status: ClientStatus;
  agency_id?: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClientPayload {
  type: ClientType;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  agency_id?: string | null;
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  return api.post<Client>('/clients', payload);
}

export async function updateClient(clientId: string, payload: Partial<ClientPayload>): Promise<Client> {
  return api.put<Client>(`/clients/${clientId}`, payload);
}

export interface PaginatedClientsResponse {
  items: Client[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListClientsParams {
  search?: string;
  type?: ClientType;
  status?: ClientStatus;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export async function listClients(params?: ListClientsParams): Promise<PaginatedClientsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.search) queryParams.append('search', params.search);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_dir) queryParams.append('sort_dir', params.sort_dir);

  const query = queryParams.toString();
  const url = `/clients${query ? `?${query}` : ''}`;
  
  return api.get<PaginatedClientsResponse>(url);
}
