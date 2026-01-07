"use client";

// Force le rendu dynamique pour éviter les erreurs SSR avec Leaflet
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SortingState } from "@tanstack/react-table";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Property,
  archiveProperty,
  listProperties,
  restoreProperty,
} from "@/lib/api/properties";
import type { ApiError } from "@/lib/api";
import { DataTable } from "./_components/data-table";
import { getColumns } from "./_components/columns";
import { PropertyDialog } from "./_components/property-dialog";

const DEFAULT_PAGE_SIZE = 10;

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const sort = sorting[0];
      const sortBy = sort?.id === "actions" ? "created_at" : sort?.id || "created_at";
      const sortDir = sort ? (sort.desc ? "desc" : "asc") : "desc";

      const data = await listProperties({
        page,
        pageSize,
        search: search || undefined,
        sortBy: sortBy as "label" | "type" | "address" | "city" | "created_at",
        sortDir,
      });
      setProperties(data.items);
      setTotal(data.total);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err?.data?.detail || err?.message || "Impossible de charger les logements.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sorting]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleArchive = useCallback(
    async (property: Property) => {
      try {
        await archiveProperty(property.id);
        toast.success("Logement archive.");
        fetchProperties();
      } catch (error: unknown) {
        const err = error as ApiError;
        toast.error(err?.data?.detail || err?.message || "Echec de l'archivage.");
      }
    },
    [fetchProperties]
  );

  const handleRestore = useCallback(
    async (property: Property) => {
      try {
        await restoreProperty(property.id);
        toast.success("Logement restaure.");
        fetchProperties();
      } catch (error: unknown) {
        const err = error as ApiError;
        toast.error(err?.data?.detail || err?.message || "Echec de la restauration.");
      }
    },
    [fetchProperties]
  );

  const columns = useMemo(
    () =>
      getColumns({
        onView: (property) => router.push(`/app/properties/${property.id}`),
        onEdit: (property) => {
          setSelectedProperty(property);
          setDialogOpen(true);
        },
        onArchive: handleArchive,
        onRestore: handleRestore,
      }),
    [router, handleArchive, handleRestore]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logements</h1>
          <p className="text-muted-foreground">Gérez les logements et établissements de vos clients.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau logement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des logements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par label, adresse ou ville..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchProperties} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={properties}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedProperty(null);
          }
        }}
        onSuccess={() => {
          fetchProperties();
          setSelectedProperty(null);
        }}
        property={selectedProperty}
      />
    </div>
  );
}

