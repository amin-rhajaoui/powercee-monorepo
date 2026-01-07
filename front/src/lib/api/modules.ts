import { api } from "@/lib/api";

export type ModuleDraft = {
  id: string;
  tenant_id: string;
  module_code: string;
  client_id: string | null;
  property_id: string | null;
  current_step: number;
  data: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ModuleDraftCreate = {
  module_code: string;
  client_id?: string | null;
  property_id?: string | null;
  current_step?: number;
  data?: Record<string, unknown>;
};

export type ModuleDraftUpdate = {
  client_id?: string | null;
  property_id?: string | null;
  current_step?: number;
  data?: Record<string, unknown>;
};

export type PaginatedModuleDrafts = {
  items: ModuleDraft[];
  total: number;
  page: number;
  page_size: number;
};

export async function createModuleDraft(payload: ModuleDraftCreate): Promise<ModuleDraft> {
  const res = await api.post("/module-drafts", payload);
  return res.json();
}

export async function getModuleDraft(draftId: string): Promise<ModuleDraft> {
  const res = await api.get(`/module-drafts/${draftId}`);
  return res.json();
}

export async function updateModuleDraft(draftId: string, payload: ModuleDraftUpdate): Promise<ModuleDraft> {
  const res = await api.put(`/module-drafts/${draftId}`, payload);
  return res.json();
}

export async function listModuleDrafts(params: {
  page?: number;
  pageSize?: number;
  module_code?: string;
  client_id?: string;
}): Promise<PaginatedModuleDrafts> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.module_code) searchParams.set("module_code", params.module_code);
  if (params.client_id) searchParams.set("client_id", params.client_id);

  const res = await api.get(`/module-drafts?${searchParams.toString()}`);
  return res.json();
}

export async function deleteModuleDraft(draftId: string): Promise<void> {
  await api.delete(`/module-drafts/${draftId}`);
}

