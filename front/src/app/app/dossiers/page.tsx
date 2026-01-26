"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  FolderOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  listFolders,
  type Folder,
  type FolderStatus,
  type PaginatedFolders,
} from "@/lib/api/folders";
import { getClient, type Client } from "@/lib/api/clients";
import { getModuleById } from "@/lib/modules";

// ============================================================================
// Constants
// ============================================================================

const FOLDER_STATUS_LABELS: Record<FolderStatus, string> = {
  IN_PROGRESS: "En cours",
  CLOSED: "Clos",
  ARCHIVED: "Archive",
  COMPLETED: "Terminé",
};

const FOLDER_STATUS_VARIANTS: Record<
  FolderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  IN_PROGRESS: "default",
  CLOSED: "secondary",
  ARCHIVED: "outline",
  COMPLETED: "default",
};

// ============================================================================
// Main Component
// ============================================================================

export default function DossiersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState<FolderStatus | "ALL">("ALL");

  // Load folders
  useEffect(() => {
    async function loadFolders() {
      setIsLoading(true);
      try {
        const params: Parameters<typeof listFolders>[0] = {
          page: pagination.page,
          pageSize: pagination.pageSize,
        };

        if (statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        const result = await listFolders(params);
        setFolders(result.items);
        setPagination((prev) => ({ ...prev, total: result.total }));

        // Load client info for each folder
        const clientIds = [
          ...new Set(result.items.map((f) => f.client_id).filter(Boolean)),
        ];
        const clientsData: Record<string, Client> = {};

        await Promise.all(
          clientIds.map(async (clientId) => {
            try {
              const client = await getClient(clientId);
              clientsData[clientId] = client;
            } catch {
              // Ignore errors for individual clients
            }
          })
        );

        setClientsMap(clientsData);
      } catch (error) {
        console.error("Erreur lors du chargement des dossiers:", error);
        toast.error("Erreur lors du chargement des dossiers");
      } finally {
        setIsLoading(false);
      }
    }

    loadFolders();
  }, [pagination.page, pagination.pageSize, statusFilter]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as FolderStatus | "ALL");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getClientName = (clientId: string) => {
    const client = clientsMap[clientId];
    if (!client) return "—";
    if (client.first_name || client.last_name) {
      return `${client.first_name || ""} ${client.last_name || ""}`.trim();
    }
    return client.company_name || client.email;
  };

  const getModuleLabel = (moduleCode: string | null) => {
    if (!moduleCode) {
      return <Badge variant="secondary">Dossier libre</Badge>;
    }
    const module = getModuleById(moduleCode);
    return (
      <Badge variant="outline" className="font-mono text-xs">
        {moduleCode}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground mt-1">
            Liste de tous les dossiers valides
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                  <SelectItem value="CLOSED">Clos</SelectItem>
                  <SelectItem value="ARCHIVED">Archive</SelectItem>
                  <SelectItem value="COMPLETED">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p>Aucun dossier trouve</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Cree le</TableHead>
                    <TableHead>Mis a jour</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folders.map((folder) => (
                    <TableRow key={folder.id}>
                      <TableCell className="font-medium">
                        {getClientName(folder.client_id)}
                      </TableCell>
                      <TableCell>{getModuleLabel(folder.module_code)}</TableCell>
                      <TableCell>
                        <Badge variant={FOLDER_STATUS_VARIANTS[folder.status]}>
                          {FOLDER_STATUS_LABELS[folder.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(folder.created_at)}</TableCell>
                      <TableCell>{formatDate(folder.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/app/folders/${folder.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} dossier{pagination.total > 1 ? "s" : ""}{" "}
                    au total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} sur {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
