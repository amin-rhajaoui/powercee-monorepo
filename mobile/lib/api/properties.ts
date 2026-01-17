import { api } from '../api';

export type PropertyType = 'MAISON' | 'APPARTEMENT' | 'LOCAL_COMMERCIAL' | 'BATIMENT_TERTIAIRE' | 'AUTRE';

export type PropertyStatus = 'ACTIF' | 'ARCHIVE';

export interface Property {
  id: string;
  label: string;
  type: PropertyType;
  address: string;
  city: string;
  postal_code?: string | null;
  client_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyPayload {
  label: string;
  type: PropertyType;
  address: string;
  city: string;
  postal_code?: string | null;
  client_id: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  surface_m2?: number | null;
  construction_year?: number | null;
}

export async function createProperty(payload: PropertyPayload): Promise<Property> {
  return api.post<Property>('/properties', payload);
}

export async function updateProperty(propertyId: string, payload: Partial<PropertyPayload>): Promise<Property> {
  return api.put<Property>(`/properties/${propertyId}`, payload);
}

export interface PaginatedPropertiesResponse {
  items: Property[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListPropertiesParams {
  client_id?: string;
  search?: string;
  type?: PropertyType;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export async function listProperties(params?: ListPropertiesParams): Promise<PaginatedPropertiesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.client_id) queryParams.append('client_id', params.client_id);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_dir) queryParams.append('sort_dir', params.sort_dir);

  const query = queryParams.toString();
  const url = `/properties${query ? `?${query}` : ''}`;
  
  return api.get<PaginatedPropertiesResponse>(url);
}

export async function getProperty(propertyId: string): Promise<Property> {
  return api.get<Property>(`/properties/${propertyId}`);
}
