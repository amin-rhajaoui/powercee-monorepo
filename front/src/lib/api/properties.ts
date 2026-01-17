import { api } from "@/lib/api";

export type PropertyType = "MAISON" | "APPARTEMENT" | "BATIMENT_PRO" | "AUTRE";

export type Property = {
  id: string;
  tenant_id: string;
  client_id: string;
  label: string;
  type: PropertyType;
  address: string;
  latitude: number;
  longitude: number;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  surface_m2?: number | null;
  construction_year?: number | null;
  altitude?: number | null;
  base_temperature?: number | null;
  zone_climatique?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

export type PaginatedProperties = {
  items: Property[];
  total: number;
  page: number;
  page_size: number;
};

export type PropertyPayload = {
  client_id: string;
  label: string;
  type: PropertyType;
  address: string;
  latitude: number;
  longitude: number;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  surface_m2?: number | null;
  construction_year?: number | null;
  notes?: string | null;
};

export type PropertyUpdatePayload = Partial<PropertyPayload>;

export async function listProperties(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "label" | "type" | "address" | "city" | "created_at";
  sortDir?: "asc" | "desc";
  type?: PropertyType;
  isActive?: boolean;
  clientId?: string;
}): Promise<PaginatedProperties> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.sortBy) searchParams.set("sort_by", params.sortBy);
  if (params.sortDir) searchParams.set("sort_dir", params.sortDir);
  if (params.type) searchParams.set("type", params.type);
  if (params.isActive !== undefined) searchParams.set("is_active", String(params.isActive));
  if (params.clientId) searchParams.set("client_id", params.clientId);

  const res = await api.get(`/properties?${searchParams.toString()}`);
  return res.json();
}

export async function getProperty(propertyId: string): Promise<Property> {
  const res = await api.get(`/properties/${propertyId}`);
  return res.json();
}

export async function createProperty(payload: PropertyPayload): Promise<Property> {
  const res = await api.post("/properties", payload as any);
  return res.json();
}

export async function updateProperty(propertyId: string, payload: PropertyUpdatePayload): Promise<Property> {
  const res = await api.put(`/properties/${propertyId}`, payload as any);
  return res.json();
}

export async function archiveProperty(propertyId: string): Promise<Property> {
  const res = await api.post(`/properties/${propertyId}/archive`, {} as any);
  return res.json();
}

export async function restoreProperty(propertyId: string): Promise<Property> {
  const res = await api.post(`/properties/${propertyId}/restore`, {} as any);
  return res.json();
}

export async function listClientProperties(
  clientId: string,
  params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: "label" | "type" | "address" | "city" | "created_at";
    sortDir?: "asc" | "desc";
    type?: PropertyType;
    isActive?: boolean;
  }
): Promise<PaginatedProperties> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sort_by", params.sortBy);
  if (params?.sortDir) searchParams.set("sort_dir", params.sortDir);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.isActive !== undefined) searchParams.set("is_active", String(params.isActive));

  const res = await api.get(`/clients/${clientId}/properties?${searchParams.toString()}`);
  return res.json();
}

