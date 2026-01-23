import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type DocumentType = "sizing_note" | "quote" | "tva_attestation" | "cdc_cee";

export type Document = {
  id: string;
  folder_id: string;
  tenant_id: string;
  document_type: DocumentType;
  file_url: string;
  created_at: string;
};

// ============================================================================
// API Functions
// ============================================================================

export async function getFolderDocuments(folderId: string): Promise<Document[]> {
  const res = await api.get(`/documents/folders/${folderId}`);
  return res.json();
}

export async function downloadDocument(documentId: string): Promise<Blob> {
  const res = await api.get(`/documents/${documentId}/download`, {
    responseType: "blob",
  });
  return res.blob();
}
