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
import { ProductListItem, formatPrice, CATEGORY_LABELS } from "@/lib/api/products";
import { DataTableColumnHeader } from "./data-table-column-header";
import { MoreHorizontal, Eye, Pencil, Trash2, RotateCcw } from "lucide-react";

type Handlers = {
  onView: (product: ProductListItem) => void;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
  onRestore: (product: ProductListItem) => void;
};

const getCategoryBadgeVariant = (category: string) => {
  switch (category) {
    case "HEAT_PUMP":
      return "default";
    case "THERMOSTAT":
      return "secondary";
    default:
      return "outline";
  }
};

export function getColumns(handlers: Handlers): ColumnDef<ProductListItem>[] {
  return [
    {
      accessorKey: "reference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-foreground">{row.getValue("reference")}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{product.name}</span>
            {product.module_codes && product.module_codes.length > 0 && (
              <div className="flex gap-1 mt-1">
                {product.module_codes.slice(0, 2).map((code) => (
                  <Badge key={code} variant="outline" className="text-xs">
                    {code}
                  </Badge>
                ))}
                {product.module_codes.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{product.module_codes.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "brand",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marque" />,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{row.getValue("brand")}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "price_ht",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Prix HT" />,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatPrice(row.getValue("price_ht"))}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Categorie" />,
      cell: ({ row }) => {
        const category = row.getValue<string>("category");
        return (
          <Badge variant={getCategoryBadgeVariant(category)}>
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      id: "status",
      header: "Statut",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Actif" : "Inactif"}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlers.onView(product)}>
                <Eye className="mr-2 h-4 w-4" />
                Voir les details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handlers.onEdit(product)}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {product.is_active ? (
                <DropdownMenuItem
                  onClick={() => handlers.onDelete(product)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Desactiver
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handlers.onRestore(product)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reactiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
