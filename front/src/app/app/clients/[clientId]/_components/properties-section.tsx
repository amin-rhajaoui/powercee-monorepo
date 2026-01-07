"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, MapPin, Pencil, Archive, Eye, Home, Building2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Property, listClientProperties, archiveProperty } from "@/lib/api/properties";
import { ClientType } from "@/lib/api/clients";
import { PropertyDialog } from "@/app/app/properties/_components/property-dialog";
import { propertyTypeOptions } from "@/app/app/properties/_schemas";
import { getPropertyLabels } from "@/lib/property-labels";

interface PropertiesSectionProps {
  clientId: string;
  clientType: ClientType;
  onCountChange?: (count: number) => void;
}

export function PropertiesSection({ clientId, clientType, onCountChange }: PropertiesSectionProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const labels = getPropertyLabels(clientType);

  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listClientProperties(clientId, { page: 1, pageSize: 100, isActive: true });
      setProperties(data.items);
      onCountChange?.(data.items.length);
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err?.data?.detail || `Erreur lors du chargement des ${labels.plural}.`);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, labels.plural, onCountChange]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleArchive = async (propertyId: string) => {
    try {
      await archiveProperty(propertyId);
      toast.success(labels.archivedToast);
      fetchProperties();
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err?.data?.detail || "Erreur lors de l'archivage.");
    }
  };

  const getTypeLabel = (type: string) => {
    return propertyTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  const EmptyIcon = labels.emptyIcon === "home" ? Home : Building2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{labels.pluralCapitalized}</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {labels.addButton}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
          <div className="rounded-full bg-muted p-4 mb-4">
            <EmptyIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-base font-medium mb-1">{labels.emptyTitle}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            {labels.emptyDescription}
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {labels.addButton}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getTypeLabel(property.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[300px]">{property.address}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/app/properties/${property.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingProperty(property);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleArchive(property.id)}
                          className="text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingProperty(null);
          }
        }}
        onSuccess={() => {
          fetchProperties();
          setEditingProperty(null);
        }}
        property={editingProperty}
        clientId={clientId}
        clientType={clientType}
      />
    </div>
  );
}
