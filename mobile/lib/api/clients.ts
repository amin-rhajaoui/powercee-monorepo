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
