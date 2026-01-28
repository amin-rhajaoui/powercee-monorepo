import { api } from "@/lib/api";
import type {
  BulkDraftsCreate,
  BulkDraftsResponse,
  PaginatedProjectsResponse,
  ProjectCreate,
  ProjectResponse,
  ProjectStats,
  PropagateAuditRequest,
  PropagateAuditResponse,
} from "@/types/project";
import type { ModuleDraft, PaginatedModuleDrafts } from "@/lib/api/modules";

// ============================================================================
// CRUD Endpoints
// ============================================================================

/**
 * Récupérer la liste des projets avec pagination et filtres.
 */
export async function fetchProjects(params: {
  client_id?: string;
  status?: string;
  module_code?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedProjectsResponse> {
  const searchParams = new URLSearchParams();
  if (params.client_id) searchParams.set("client_id", params.client_id);
  if (params.status) searchParams.set("status", params.status);
  if (params.module_code) searchParams.set("module_code", params.module_code);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));

  const res = await api.get(`/projects?${searchParams.toString()}`);
  return res.json();
}

/**
 * Créer un nouveau projet de rénovation.
 */
export async function createProject(
  payload: ProjectCreate
): Promise<ProjectResponse> {
  const res = await api.post("/projects", payload as any);
  return res.json();
}

/**
 * Récupérer un projet par son ID.
 */
export async function getProject(projectId: string): Promise<ProjectResponse> {
  const res = await api.get(`/projects/${projectId}`);
  return res.json();
}

// ============================================================================
// Opérations sur les appartements (ModuleDrafts)
// ============================================================================

/**
 * Créer plusieurs appartements (ModuleDrafts) en masse pour un projet.
 */
export async function createBulkDrafts(
  projectId: string,
  payload: BulkDraftsCreate
): Promise<BulkDraftsResponse> {
  const res = await api.post(
    `/projects/${projectId}/bulk-drafts`,
    payload as any
  );
  return res.json();
}

/**
 * Récupérer les drafts (appartements) d'un projet.
 */
export async function getProjectDrafts(
  projectId: string,
  params?: {
    apartment_type?: string;
    page?: number;
    page_size?: number;
  }
): Promise<PaginatedModuleDrafts> {
  const searchParams = new URLSearchParams();
  if (params?.apartment_type) searchParams.set("apartment_type", params.apartment_type);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));

  const queryString = searchParams.toString();
  const url = `/projects/${projectId}/drafts${queryString ? `?${queryString}` : ""}`;
  const res = await api.get(url);
  return res.json();
}

// ============================================================================
// Propagation d'audit
// ============================================================================

/**
 * Propager les données d'audit d'un appartement vers d'autres.
 */
export async function propagateAudit(
  projectId: string,
  payload: PropagateAuditRequest
): Promise<PropagateAuditResponse> {
  const res = await api.patch(
    `/projects/${projectId}/propagate-audit`,
    payload as any
  );
  return res.json();
}

// ============================================================================
// Statistiques
// ============================================================================

/**
 * Récupérer les statistiques d'un projet.
 */
export async function getProjectStats(
  projectId: string
): Promise<ProjectStats> {
  const res = await api.get(`/projects/${projectId}/stats`);
  return res.json();
}
