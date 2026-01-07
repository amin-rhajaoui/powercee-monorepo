"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Client } from "@/lib/api/clients";
import { DataTableColumnHeader } from "./data-table-column-header";
import { MoreHorizontal } from "lucide-react";

type Handlers = {
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
  onRestore: (client: Client) => void;
};

const getDisplayName = (client: Client) => {
  if (client.type === "PROFESSIONNEL") {
    return client.company_name || "—";
  }
  const name = [client.first_name, client.last_name].filter(Boolean).join(" ");
  return name || "—";
};

export function getColumns(handlers: Handlers): ColumnDef<Client>[] {
  return [
    {
      id: "name",
      accessorFn: (client) =>
        client.type === "PROFESSIONNEL"
          ? client.company_name || ""
          : [client.first_name, client.last_name].filter(Boolean).join(" "),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nom / Raison sociale" />,
      cell: ({ row }) => {
        const client = row.original;
        const primary = getDisplayName(client);
        const secondary =
          client.type === "PROFESSIONNEL"
            ? client.contact_name
            : [client.first_name, client.last_name].filter(Boolean).join(" ");
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{primary}</span>
            {secondary && <span className="text-xs text-muted-foreground">{secondary}</span>}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: "alphanumeric",
      meta: { columnId: "name" },
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const value = row.getValue<string>("type");
        return (
          <Badge variant="secondary">
            {value === "PARTICULIER" ? "Particulier" : "Professionnel"}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <span className="text-sm text-foreground">{row.getValue("email")}</span>,
      enableSorting: true,
    },
    {
      accessorKey: "phone",
      header: "Téléphone",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("phone") || "—"}</span>,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        const variant = status === "ACTIF" ? "secondary" : "muted";
        return <Badge variant={variant}>{status === "ACTIF" ? "Actif" : "Archivé"}</Badge>;
      },
      enableSorting: true,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handlers.onView(client)}
                className="font-medium"
              >
                Voir la fiche complète
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handlers.onEdit(client)}>Modifier</DropdownMenuItem>
              {client.status === "ARCHIVE" ? (
                <DropdownMenuItem onClick={() => handlers.onRestore(client)}>Restaurer</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handlers.onArchive(client)} className="text-destructive">
                  Désactiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

