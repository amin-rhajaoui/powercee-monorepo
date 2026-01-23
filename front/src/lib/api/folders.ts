import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type FolderStatus = "IN_PROGRESS" | "CLOSED" | "ARCHIVED" | "COMPLETED";

export type Folder = {
  id: string;
  tenant_id: string;
  client_id: string;
  property_id: string | null;
  module_code: string | null;
  status: FolderStatus;
  data: Record<string, unknown>;
  source_draft_id: string | null;
  mpr_color?: string | null;
  emitter_type?: string | null;
  zone_climatique?: string | null;
  quote_number?: string | null;
  created_at: string;
  updated_at: string;
};

export type FolderCreate = {
  client_id: string;
  property_id?: string | null;
  module_code?: string | null;
  data?: Record<string, unknown>;
};

export type FolderUpdate = {
  status?: FolderStatus;
  data?: Record<string, unknown>;
};

export type PaginatedFolders = {
  items: Folder[];
  total: number;
  page: number;
  page_size: number;
};

// ============================================================================
// API Functions
// ============================================================================

export async function createFolderFromDraft(draftId: string): Promise<Folder> {
  const res = await api.post(`/folders/from-draft/${draftId}`, {} as any);
  return res.json();
}

export async function createFolder(payload: FolderCreate): Promise<Folder> {
  const res = await api.post("/folders", payload as any);
  return res.json();
}

export async function getFolder(folderId: string): Promise<Folder> {
  const res = await api.get(`/folders/${folderId}`);
  return res.json();
}

export async function updateFolder(folderId: string, payload: FolderUpdate): Promise<Folder> {
  const res = await api.put(`/folders/${folderId}`, payload as any);
  return res.json();
}

export async function listFolders(params: {
  page?: number;
  pageSize?: number;
  module_code?: string;
  client_id?: string;
  status?: FolderStatus;
}): Promise<PaginatedFolders> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.module_code) searchParams.set("module_code", params.module_code);
  if (params.client_id) searchParams.set("client_id", params.client_id);
  if (params.status) searchParams.set("status", params.status);

  const res = await api.get(`/folders?${searchParams.toString()}`);
  return res.json();
}

export type FinalizeFolderResponse = {
  folder_id: string;
  quote_number: string;
  documents: Array<{
    id: string;
    folder_id: string;
    tenant_id: string;
    document_type: "sizing_note" | "quote" | "tva_attestation" | "cdc_cee";
    file_url: string;
    created_at: string;
  }>;
};

export async function finalizeFolder(folderId: string): Promise<FinalizeFolderResponse> {
  const res = await api.post(`/folders/${folderId}/finalize`, {} as any);
  return res.json();
}
