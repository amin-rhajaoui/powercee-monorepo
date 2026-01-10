"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SortingState } from "@tanstack/react-table";
import { Plus, RefreshCw, Search, LayoutGrid, LayoutList } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import {
  ProductListItem,
  Product,
  listProducts,
  getProduct,
  deleteProduct,
  restoreProduct,
  getUniqueBrands,
  ProductCategory,
  CATEGORY_LABELS,
  MODULE_CODES,
} from "@/lib/api/products";
import type { ApiError } from "@/lib/api";
import { DataTable } from "./_components/data-table";
import { getColumns } from "./_components/columns";
import { ProductCard } from "./_components/product-card";
import { ProductDialog } from "./_components/product-dialog";
import { ProductSheet } from "./_components/product-sheet";

const DEFAULT_PAGE_SIZE = 20;

type ViewMode = "list" | "grid";

export default function StockPage() {
  // Data state
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [brands, setBrands] = useState<string[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const sort = sorting[0];
      const sortBy = sort?.id || "name";
      const sortDir = sort ? (sort.desc ? "desc" : "asc") : "asc";

      const data = await listProducts({
        page,
        pageSize,
        search: search || undefined,
        brand: brandFilter || undefined,
        category: categoryFilter as ProductCategory | undefined,
        moduleCode: moduleFilter || undefined,
        sortBy: sortBy as "name" | "brand" | "price_ht" | "category" | "reference" | "created_at",
        sortDir,
      });
      setProducts(data.items);
      setTotal(data.total);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err?.data?.detail || err?.message || "Impossible de charger les produits.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, brandFilter, categoryFilter, moduleFilter, sorting]);

  // Fetch brands for filter
  const fetchBrands = useCallback(async () => {
    try {
      const data = await getUniqueBrands();
      setBrands(data.brands);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Handlers
  const handleView = useCallback((product: ProductListItem) => {
    setSelectedProductId(product.id);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback(async (product: ProductListItem | Product) => {
    try {
      const fullProduct = await getProduct(product.id);
      setSelectedProduct(fullProduct);
      setDialogOpen(true);
    } catch (error: unknown) {
      const err = error as ApiError;
      toast.error(err?.data?.detail || err?.message || "Impossible de charger le produit.");
    }
  }, []);

  const handleDelete = useCallback(
    async (product: ProductListItem | Product) => {
      try {
        await deleteProduct(product.id);
        toast.success("Produit desactive.");
        fetchProducts();
        setSheetOpen(false);
      } catch (error: unknown) {
        const err = error as ApiError;
        toast.error(err?.data?.detail || err?.message || "Echec de la desactivation.");
      }
    },
    [fetchProducts]
  );

  const handleRestore = useCallback(
    async (product: ProductListItem | Product) => {
      try {
        await restoreProduct(product.id);
        toast.success("Produit reactive.");
        fetchProducts();
        setSheetOpen(false);
      } catch (error: unknown) {
        const err = error as ApiError;
        toast.error(err?.data?.detail || err?.message || "Echec de la reactivation.");
      }
    },
    [fetchProducts]
  );

  const columns = useMemo(
    () =>
      getColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleView, handleEdit, handleDelete, handleRestore]
  );

  const onCreate = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handleFilterChange = (type: "brand" | "category" | "module", value: string) => {
    setPage(1);
    if (type === "brand") setBrandFilter(value === "all" ? "" : value);
    if (type === "category") setCategoryFilter(value === "all" ? "" : value);
    if (type === "module") setModuleFilter(value === "all" ? "" : value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock & Catalogue</h1>
          <p className="text-muted-foreground">Gerez vos produits PAC, thermostats et accessoires.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchProducts} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraichir
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base text-muted-foreground">Filtres</CardTitle>
            <div className="flex items-center gap-2">
              <Toggle
                pressed={viewMode === "list"}
                onPressedChange={() => setViewMode("list")}
                aria-label="Vue liste"
                size="sm"
              >
                <LayoutList className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={viewMode === "grid"}
                onPressedChange={() => setViewMode("grid")}
                aria-label="Vue grille"
                size="sm"
              >
                <LayoutGrid className="h-4 w-4" />
              </Toggle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Brand filter */}
            <Select value={brandFilter || "all"} onValueChange={(v) => handleFilterChange("brand", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Marque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les marques</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={categoryFilter || "all"} onValueChange={(v) => handleFilterChange("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Module filter */}
            <Select value={moduleFilter || "all"} onValueChange={(v) => handleFilterChange("module", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Module CEE" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modules</SelectItem>
                {MODULE_CODES.map((module) => (
                  <SelectItem key={module.code} value={module.code}>
                    {module.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Display */}
      {viewMode === "list" ? (
        <DataTable
          columns={columns}
          data={products}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(Math.max(1, newPage))}
          onPageSizeChange={(newSize) => {
            setPage(1);
            setPageSize(newSize);
          }}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={isLoading}
          onRowClick={handleView}
        />
      ) : (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Chargement des produits...
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Aucun produit trouve.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => handleView(product)}
                  />
                ))}
              </div>
              {/* Pagination for grid view */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Affichage {Math.min((page - 1) * pageSize + 1, total)} -{" "}
                  {Math.min(page * pageSize, total)} sur {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || isLoading}
                  >
                    Precedent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(total / pageSize) || isLoading}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Product Dialog (Create/Edit) */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          fetchProducts();
          fetchBrands();
        }}
        product={selectedProduct}
      />

      {/* Product Sheet (Details) */}
      <ProductSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        productId={selectedProductId}
        onEdit={(product) => {
          setSheetOpen(false);
          setSelectedProduct(product);
          setDialogOpen(true);
        }}
        onDelete={handleDelete}
        onRestore={handleRestore}
      />
    </div>
  );
}
