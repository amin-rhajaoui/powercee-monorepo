"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SortingState } from "@tanstack/react-table";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Client,
  archiveClient,
  listClients,
  restoreClient,
} from "@/lib/api/clients";
import type { ApiError } from "@/lib/api";
import { DataTable } from "./_components/data-table";
import { getColumns } from "./_components/columns";
import { ClientDialog } from "./_components/client-dialog";

const DEFAULT_PAGE_SIZE = 10;

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const sort = sorting[0];
      const sortBy = sort?.id === "actions" ? "created_at" : sort?.id || "created_at";
      const sortDir = sort ? (sort.desc ? "desc" : "asc") : "desc";

      const data = await listClients({
        page,
        pageSize,
        search: search || undefined,
        sortBy: sortBy as "name" | "company_name" | "email" | "status" | "created_at",
        sortDir,
      });
      setClients(data.items);
      setTotal(data.total);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err?.data?.detail || err?.message || "Impossible de charger les clients.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, sorting]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleArchive = useCallback(
    async (client: Client) => {
      try {
        await archiveClient(client.id);
        toast.success("Client desactive.");
        fetchClients();
      } catch (error: unknown) {
        const err = error as ApiError;
        toast.error(err?.data?.detail || err?.message || "Echec de la desactivation.");
      }
    },
    [fetchClients]
  );

  const handleRestore = useCallback(
    async (client: Client) => {
      try {
        await restoreClient(client.id);
        toast.success("Client restaure.");
        fetchClients();
      } catch (error: unknown) {
        const err = error as ApiError;
        toast.error(err?.data?.detail || err?.message || "Echec de la restauration.");
      }
    },
    [fetchClients]
  );

  const columns = useMemo(
    () =>
      getColumns({
        onView: (client) => router.push(`/app/clients/${client.id}`),
        onEdit: (client) => {
          setSelectedClient(client);
          setDialogOpen(true);
        },
        onArchive: handleArchive,
        onRestore: handleRestore,
      }),
    [router, handleArchive, handleRestore]
  );

  const onCreate = () => {
    setSelectedClient(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Pilotez vos clients dans une interface SaaS pro.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchClients} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraîchir
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-muted-foreground">
            Recherche rapide (nom / email)
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={clients}
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
          />
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchClients}
        client={selectedClient}
      />
    </div>
  );
}

