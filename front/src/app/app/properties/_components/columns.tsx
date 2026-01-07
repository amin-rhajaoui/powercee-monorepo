"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Property } from "@/lib/api/properties";
import { DataTableColumnHeader } from "./data-table-column-header";
import { MoreHorizontal, MapPin } from "lucide-react";
import { propertyTypeOptions } from "../_schemas";

type Handlers = {
  onView: (property: Property) => void;
  onEdit: (property: Property) => void;
  onArchive: (property: Property) => void;
  onRestore: (property: Property) => void;
};

const getTypeLabel = (type: string) => {
  return propertyTypeOptions.find((opt) => opt.value === type)?.label || type;
};

export function getColumns(handlers: Handlers): ColumnDef<Property>[] {
  return [
    {
      accessorKey: "label",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Label" />,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("label")}</span>,
      enableSorting: true,
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => {
        // Note: Le client n'est pas inclus dans Property par défaut, on affiche l'ID pour l'instant
        // TODO: Inclure le client dans la réponse API si nécessaire
        return <span className="text-sm text-muted-foreground">{row.original.client_id.slice(0, 8)}...</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const value = row.getValue<string>("type");
        return <Badge variant="secondary">{getTypeLabel(value)}</Badge>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "address",
      header: "Adresse",
      cell: ({ row }) => {
        const address = row.getValue<string>("address");
        return (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[250px]">{address}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Statut" />,
      cell: ({ row }) => {
        const isActive = row.getValue<boolean>("is_active");
        const variant = isActive ? "secondary" : "muted";
        return <Badge variant={variant}>{isActive ? "Actif" : "Archivé"}</Badge>;
      },
      enableSorting: true,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const property = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handlers.onView(property)}>Voir</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlers.onEdit(property)}>Modifier</DropdownMenuItem>
              <DropdownMenuSeparator />
              {property.is_active ? (
                <DropdownMenuItem onClick={() => handlers.onArchive(property)} className="text-destructive">
                  Archiver
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handlers.onRestore(property)}>Restaurer</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

