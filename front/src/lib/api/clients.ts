import { api } from "@/lib/api";

export type ClientType = "PARTICULIER" | "PROFESSIONNEL";
export type ClientStatus = "ACTIF" | "ARCHIVE";

export type Client = {
  id: string;
  tenant_id: string;
  owner_id: string;
  agency_id?: string | null;
  type: ClientType;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

export type PaginatedClients = {
  items: Client[];
  total: number;
  page: number;
  page_size: number;
};

export type ClientPayload = {
  type: ClientType;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  agency_id?: string | null;
};

export type ClientUpdatePayload = Partial<ClientPayload>;

export async function listClients(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "name" | "company_name" | "email" | "status" | "created_at";
  sortDir?: "asc" | "desc";
  status?: ClientStatus;
  type?: ClientType;
}): Promise<PaginatedClients> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.sortBy) searchParams.set("sort_by", params.sortBy);
  if (params.sortDir) searchParams.set("sort_dir", params.sortDir);
  if (params.status) searchParams.set("status", params.status);
  if (params.type) searchParams.set("type", params.type);

  const res = await api.get(`/clients?${searchParams.toString()}`);
  return res.json();
}

export async function getClient(clientId: string): Promise<Client> {
  const res = await api.get(`/clients/${clientId}`);
  return res.json();
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const res = await api.post("/clients", payload as any);
  return res.json();
}

export async function updateClient(clientId: string, payload: ClientUpdatePayload): Promise<Client> {
  const res = await api.put(`/clients/${clientId}`, payload as any);
  return res.json();
}

export async function archiveClient(clientId: string): Promise<Client> {
  const res = await api.post(`/clients/${clientId}/archive`, {} as any);
  return res.json();
}

export async function restoreClient(clientId: string): Promise<Client> {
  const res = await api.post(`/clients/${clientId}/restore`, {} as any);
  return res.json();
}

