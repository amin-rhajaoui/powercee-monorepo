"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  CheckCircle2,
  FileSignature,
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
  PENDING_SIGNATURE: "En attente de signature",
};

const FOLDER_STATUS_VARIANTS: Record<
  FolderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  IN_PROGRESS: "default",
  CLOSED: "secondary",
  ARCHIVED: "outline",
  COMPLETED: "default",
  PENDING_SIGNATURE: "secondary",
};

const FOLDER_STATUS_COLORS: Record<FolderStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  ARCHIVED: "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PENDING_SIGNATURE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

// ============================================================================
// Main Component
// ============================================================================

type ViewMode = "all" | "to-finalize" | "pending-signature" | "completed";

export default function DossiersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [viewMode, setViewMode] = useState<ViewMode>("all");
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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setPagination((prev) => ({ ...prev, page: 1 }));
    
    // Mapper le mode de vue au filtre de statut
    switch (mode) {
      case "to-finalize":
        setStatusFilter("IN_PROGRESS");
        break;
      case "pending-signature":
        setStatusFilter("PENDING_SIGNATURE");
        break;
      case "completed":
        setStatusFilter("COMPLETED");
        break;
      default:
        setStatusFilter("ALL");
    }
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
            Gérez tous vos dossiers en un seul endroit
          </p>
        </div>
      </div>

      {/* Quick View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as ViewMode)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="to-finalize" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            À finaliser
          </TabsTrigger>
          <TabsTrigger value="pending-signature" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            En attente
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Complets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <FoldersTableContent
            folders={folders}
            clientsMap={clientsMap}
            isLoading={isLoading}
            pagination={pagination}
            totalPages={totalPages}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onPageChange={handlePageChange}
            getClientName={getClientName}
            getModuleLabel={getModuleLabel}
            formatDate={formatDate}
            viewMode="all"
          />
        </TabsContent>

        <TabsContent value="to-finalize" className="mt-6">
          <FoldersTableContent
            folders={folders}
            clientsMap={clientsMap}
            isLoading={isLoading}
            pagination={pagination}
            totalPages={totalPages}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onPageChange={handlePageChange}
            getClientName={getClientName}
            getModuleLabel={getModuleLabel}
            formatDate={formatDate}
            viewMode="to-finalize"
          />
        </TabsContent>

        <TabsContent value="pending-signature" className="mt-6">
          <FoldersTableContent
            folders={folders}
            clientsMap={clientsMap}
            isLoading={isLoading}
            pagination={pagination}
            totalPages={totalPages}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onPageChange={handlePageChange}
            getClientName={getClientName}
            getModuleLabel={getModuleLabel}
            formatDate={formatDate}
            viewMode="pending-signature"
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <FoldersTableContent
            folders={folders}
            clientsMap={clientsMap}
            isLoading={isLoading}
            pagination={pagination}
            totalPages={totalPages}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onPageChange={handlePageChange}
            getClientName={getClientName}
            getModuleLabel={getModuleLabel}
            formatDate={formatDate}
            viewMode="completed"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// FoldersTableContent Component
// ============================================================================

interface FoldersTableContentProps {
  folders: Folder[];
  clientsMap: Record<string, Client>;
  isLoading: boolean;
  pagination: { page: number; pageSize: number; total: number };
  totalPages: number;
  statusFilter: FolderStatus | "ALL";
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  getClientName: (clientId: string) => string;
  getModuleLabel: (moduleCode: string | null) => React.ReactNode;
  formatDate: (dateString: string) => string;
  viewMode: ViewMode;
}

function FoldersTableContent({
  folders,
  clientsMap,
  isLoading,
  pagination,
  totalPages,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  getClientName,
  getModuleLabel,
  formatDate,
  viewMode,
}: FoldersTableContentProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Additional Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres avancés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={onStatusFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                  <SelectItem value="PENDING_SIGNATURE">En attente de signature</SelectItem>
                  <SelectItem value="COMPLETED">Terminé</SelectItem>
                  <SelectItem value="CLOSED">Clos</SelectItem>
                  <SelectItem value="ARCHIVED">Archive</SelectItem>
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
                  <p className="font-medium">Aucun dossier trouvé</p>
                  <p className="text-sm mt-1">
                    {viewMode === "to-finalize" && "Aucun dossier à finaliser"}
                    {viewMode === "pending-signature" && "Aucun dossier en attente de signature"}
                    {viewMode === "completed" && "Aucun dossier complété"}
                    {viewMode === "all" && "Commencez par créer un nouveau dossier"}
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Numéro de devis</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead>Mis à jour</TableHead>
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
                            <Badge 
                              className={FOLDER_STATUS_COLORS[folder.status]}
                              variant="outline"
                            >
                              {FOLDER_STATUS_LABELS[folder.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {folder.quote_number ? (
                              <Badge variant="secondary" className="font-mono">
                                {folder.quote_number}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
                          onClick={() => onPageChange(pagination.page - 1)}
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
                          onClick={() => onPageChange(pagination.page + 1)}
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
