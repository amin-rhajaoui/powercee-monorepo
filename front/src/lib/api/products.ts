import { api } from "@/lib/api";

export type ProductCategory = "HEAT_PUMP" | "THERMOSTAT" | "OTHER";
export type ProductType = "MATERIAL" | "LABOR" | "SERVICE";
export type PowerSupply = "MONOPHASE" | "TRIPHASE";

export type HeatPumpDetails = {
  id: string;
  etas_35?: number | null;
  etas_55?: number | null;
  power_minus_7?: number | null;
  power_minus_15?: number | null;
  power_supply?: PowerSupply | null;
  refrigerant_type?: string | null;
  noise_level?: number | null;
  is_duo: boolean;
  class_regulator?: string | null;
};

export type ThermostatDetails = {
  id: string;
  class_rank?: string | null;
};

export type Product = {
  id: string;
  tenant_id: string;
  name: string;
  brand: string;
  reference: string;
  price_ht: number;
  category: ProductCategory;
  module_codes?: string[] | null;
  image_url?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  heat_pump_details?: HeatPumpDetails | null;
  thermostat_details?: ThermostatDetails | null;
  compatible_product_ids: string[];
};

export type ProductListItem = {
  id: string;
  tenant_id: string;
  name: string;
  brand: string;
  reference: string;
  price_ht: number;
  buying_price_ht?: number | null;
  category: ProductCategory;
  product_type: ProductType;
  module_codes?: string[] | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
};

export type PaginatedProducts = {
  items: ProductListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type HeatPumpDetailsPayload = {
  etas_35?: number | null;
  etas_55?: number | null;
  power_minus_7?: number | null;
  power_minus_15?: number | null;
  power_supply?: PowerSupply | null;
  refrigerant_type?: string | null;
  noise_level?: number | null;
  is_duo?: boolean;
  class_regulator?: string | null;
};

export type ThermostatDetailsPayload = {
  class_rank?: string | null;
};

export type ProductCreatePayload = {
  name: string;
  brand: string;
  reference: string;
  price_ht: number;
  category: ProductCategory;
  module_codes?: string[] | null;
  image_url?: string | null;
  description?: string | null;
  is_active?: boolean;
  heat_pump_details?: HeatPumpDetailsPayload | null;
  thermostat_details?: ThermostatDetailsPayload | null;
  compatible_product_ids?: string[] | null;
};

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export type BrandsResponse = {
  brands: string[];
};

export async function listProducts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  brand?: string;
  category?: ProductCategory;
  moduleCode?: string;
  isActive?: boolean;
  sortBy?: "name" | "brand" | "price_ht" | "category" | "reference" | "created_at";
  sortDir?: "asc" | "desc";
}): Promise<PaginatedProducts> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.brand) searchParams.set("brand", params.brand);
  if (params.category) searchParams.set("category", params.category);
  if (params.moduleCode) searchParams.set("module_code", params.moduleCode);
  if (params.isActive !== undefined) searchParams.set("is_active", String(params.isActive));
  if (params.sortBy) searchParams.set("sort_by", params.sortBy);
  if (params.sortDir) searchParams.set("sort_dir", params.sortDir);

  const res = await api.get(`/products?${searchParams.toString()}`);
  return res.json();
}

export async function getProduct(productId: string): Promise<Product> {
  const res = await api.get(`/products/${productId}`);
  return res.json();
}

export async function createProduct(payload: ProductCreatePayload): Promise<Product> {
  const res = await api.post("/products", payload);
  return res.json();
}

export async function updateProduct(productId: string, payload: ProductUpdatePayload): Promise<Product> {
  const res = await api.put(`/products/${productId}`, payload);
  return res.json();
}

export async function deleteProduct(productId: string): Promise<Product> {
  const res = await api.delete(`/products/${productId}`);
  return res.json();
}

export async function restoreProduct(productId: string): Promise<Product> {
  const res = await api.post(`/products/${productId}/restore`, {});
  return res.json();
}

export async function uploadProductImage(productId: string, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/products/${productId}/image`, formData);
  return res.json();
}

export async function getUniqueBrands(): Promise<BrandsResponse> {
  const res = await api.get("/products/brands");
  return res.json();
}

export async function addCompatibility(sourceProductId: string, targetProductId: string): Promise<void> {
  await api.post(`/products/${sourceProductId}/compatibility/${targetProductId}`, {});
}

export async function removeCompatibility(sourceProductId: string, targetProductId: string): Promise<void> {
  await api.delete(`/products/${sourceProductId}/compatibility/${targetProductId}`);
}

// Constantes pour les modules CEE
export const MODULE_CODES = [
  { code: "BAR-TH-171", label: "BAR-TH-171 (PAC air/eau)" },
  { code: "BAR-TH-159", label: "BAR-TH-159 (Thermostat)" },
  { code: "BAR-TH-164", label: "BAR-TH-164 (Chaudiere)" },
  { code: "BAR-TH-148", label: "BAR-TH-148 (Chauffe-eau)" },
];

// Libelles pour les categories
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  HEAT_PUMP: "Pompe a chaleur",
  THERMOSTAT: "Thermostat",
  OTHER: "Autre",
};

// Libelles pour les alimentations
export const POWER_SUPPLY_LABELS: Record<PowerSupply, string> = {
  MONOPHASE: "Monophase",
  TRIPHASE: "Triphase",
};

// Formater le prix en euros
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
