"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, RefreshCw, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Property,
  archiveProperty,
  getProperty,
  restoreProperty,
} from "@/lib/api/properties";
import type { ApiError } from "@/lib/api";
import dynamic from "next/dynamic";
import { PropertyDialog } from "../_components/property-dialog";
import { propertyTypeOptions } from "../_schemas";

// Import dynamique du composant Map pour éviter les erreurs SSR (Leaflet utilise window)
const LocationPickerMap = dynamic(
  () => import("@/components/maps/location-picker-map").then((mod) => ({ default: mod.LocationPickerMap })),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-md" />,
  }
);

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams<{ propertyId: string }>();
  const propertyId = params?.propertyId;

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    try {
      const data = await getProperty(propertyId);
      setProperty(data);
    } catch (error: unknown) {
      const err = error as ApiError;
      toast.error(err?.data?.detail || "Logement introuvable.");
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const handleArchive = async () => {
    if (!property) return;
    try {
      await archiveProperty(property.id);
      toast.success("Logement archive.");
      fetchProperty();
    } catch (error: unknown) {
      const err = error as ApiError;
      toast.error(err?.data?.detail || "Echec de l'archivage.");
    }
  };

  const handleRestore = async () => {
    if (!property) return;
    try {
      await restoreProperty(property.id);
      toast.success("Logement restaure.");
      fetchProperty();
    } catch (error: unknown) {
      const err = error as ApiError;
      toast.error(err?.data?.detail || "Echec de la restauration.");
    }
  };

  const getTypeLabel = (type: string) => {
    return propertyTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/app/properties")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Logement</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{property?.label || "Logement"}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{property ? getTypeLabel(property.type) : "—"}</Badge>
              <Badge variant={property?.is_active ? "secondary" : "muted"}>
                {property?.is_active ? "Actif" : "Archivé"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchProperty} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={!property}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            {property?.is_active ? (
              <Button variant="destructive" size="sm" onClick={handleArchive} disabled={isLoading || !property}>
                <Archive className="mr-2 h-4 w-4" />
                Archiver
              </Button>
            ) : (
              <Button size="sm" onClick={handleRestore} disabled={isLoading || !property}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du logement...
            </div>
          ) : property ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Label" value={property.label} />
                <DetailField label="Type" value={getTypeLabel(property.type)} />
                <DetailField label="Client ID" value={property.client_id.slice(0, 8) + "..."} />
                <DetailField label="Adresse" value={property.address} />
                {property.postal_code && <DetailField label="Code postal" value={property.postal_code} />}
                {property.city && <DetailField label="Ville" value={property.city} />}
                {property.country && <DetailField label="Pays" value={property.country} />}
                {property.surface_m2 && <DetailField label="Surface (m²)" value={String(property.surface_m2)} />}
                {property.construction_year && (
                  <DetailField label="Année de construction" value={String(property.construction_year)} />
                )}
              </div>

              {property.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{property.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Localisation</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <DetailField label="Latitude" value={property.latitude.toFixed(6)} />
                  <DetailField label="Longitude" value={property.longitude.toFixed(6)} />
                </div>
                <LocationPickerMap
                  lat={property.latitude}
                  lng={property.longitude}
                  onPositionChange={() => {
                    // En lecture seule, on ne permet pas la modification depuis la carte
                  }}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Créé le" value={new Date(property.created_at).toLocaleString()} />
                <DetailField label="Mis à jour" value={new Date(property.updated_at).toLocaleString()} />
                <DetailField
                  label="Archivé le"
                  value={property.archived_at ? new Date(property.archived_at).toLocaleString() : "—"}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Logement introuvable.</div>
          )}
        </CardContent>
      </Card>

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchProperty}
        property={property}
        clientId={property?.client_id}
      />
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

