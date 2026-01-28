"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Project, ProjectStatus } from "@/types/project";
import { DataTableColumnHeader } from "./data-table-column-header";

type Handlers = {
  onRowClick: (project: Project) => void;
};

const getStatusBadgeVariant = (status: ProjectStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "DRAFT":
      return "outline";
    case "IN_PROGRESS":
      return "default";
    case "AUDIT_PENDING":
      return "secondary";
    case "VALIDATED":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "ARCHIVED":
      return "outline";
    default:
      return "outline";
  }
};

const getStatusLabel = (status: ProjectStatus): string => {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "IN_PROGRESS":
      return "En cours";
    case "AUDIT_PENDING":
      return "Audit en attente";
    case "VALIDATED":
      return "Validé";
    case "COMPLETED":
      return "Terminé";
    case "ARCHIVED":
      return "Archivé";
    default:
      return status;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function getColumns(handlers: Handlers): ColumnDef<Project>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nom du projet" />,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{project.name}</span>
            {project.building_address && (
              <span className="text-xs text-muted-foreground">{project.building_address}</span>
            )}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: "alphanumeric",
    },
    {
      id: "client",
      accessorFn: (project) => project.client_id || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
      cell: ({ row }) => {
        const project = row.original;
        // Pour l'instant, on affiche "—" car l'API ne retourne pas les infos client
        // TODO: Récupérer le nom du client via l'API si nécessaire ou modifier l'API backend
        return (
          <span className="text-sm text-muted-foreground">
            {project.client_id ? "—" : "—"}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
      cell: ({ row }) => {
        const status = row.getValue<ProjectStatus>("status");
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      id: "apartments_count",
      accessorFn: (project) => project.total_apartments ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre de lots" />,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <span className="text-sm text-foreground">
            {project.total_apartments ?? "—"}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date création" />,
      cell: ({ row }) => {
        const date = row.getValue<string>("created_at");
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(date)}
          </span>
        );
      },
      enableSorting: true,
    },
  ];
}
