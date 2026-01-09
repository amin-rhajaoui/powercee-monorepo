"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, RefreshCw, Thermometer, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Client,
  archiveClient,
  getClient,
  restoreClient,
} from "@/lib/api/clients";
import { listFolders, Folder } from "@/lib/api/folders";
import { listClientProperties, Property } from "@/lib/api/properties";
import { getPropertyLabels } from "@/lib/property-labels";
import { ClientDialog } from "../_components/client-dialog";
import { PropertiesSection } from "./_components/properties-section";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId;

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await getClient(clientId);
      setClient(data);
      
      // Récupérer les dossiers du client pour afficher les informations MPR et type d'émetteur
      try {
        const foldersData = await listFolders({ client_id: clientId, page: 1, pageSize: 100 });
        setFolders(foldersData.items);
      } catch (error) {
        // Ne pas afficher d'erreur si les dossiers ne peuvent pas être récupérés
        console.warn("Erreur lors de la récupération des dossiers:", error);
      }
      
      // Récupérer les propriétés du client pour afficher la température de base et la zone climatique
      try {
        const propertiesData = await listClientProperties(clientId, { page: 1, pageSize: 100, isActive: true });
        setProperties(propertiesData.items);
      } catch (error) {
        console.warn("Erreur lors de la récupération des propriétés:", error);
      }
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err?.data?.detail || "Client introuvable.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleArchive = async () => {
    if (!client) return;
    try {
      await archiveClient(client.id);
      toast.success("Client archiv\u00e9.");
      fetchClient();
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err?.data?.detail || "\u00c9chec de l'archivage.");
    }
  };

  const handleRestore = async () => {
    if (!client) return;
    try {
      await restoreClient(client.id);
      toast.success("Client restaur\u00e9.");
      fetchClient();
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err?.data?.detail || "\u00c9chec de la restauration.");
    }
  };

  const displayName =
    client?.type === "PROFESSIONNEL"
      ? client?.company_name
      : [client?.first_name, client?.last_name].filter(Boolean).join(" ");

  const labels = client ? getPropertyLabels(client.type) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/app/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Client</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{displayName || "Client"}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">
                {client?.type === "PARTICULIER" ? "Particulier" : "Professionnel"}
              </Badge>
              <Badge variant={client?.status === "ACTIF" ? "secondary" : "outline"}>
                {client?.status === "ACTIF" ? "Actif" : "Archiv\u00e9"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchClient} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={!client}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            {client?.status === "ARCHIVE" ? (
              <Button size="sm" onClick={handleRestore} disabled={isLoading || !client}>
                Restaurer
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={handleArchive} disabled={isLoading || !client}>
                Archiver
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du client...
            </div>
          ) : client ? (
            <div className="text-sm text-muted-foreground">
              Utilisez les onglets ci-dessous pour voir les d\u00e9tails et les {labels?.plural || "logements"}.
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Client introuvable.</div>
          )}
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchClient}
        client={client}
      />

      {client && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="info" className="w-full">
              <TabsList>
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="properties">
                  {labels?.pluralCapitalized || "Logements"}
                  {propertiesCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {propertiesCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="mt-4">
                <div className="space-y-4 text-sm">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailField label="Email" value={client.email} />
                    <DetailField label="T\u00e9l\u00e9phone" value={client.phone || "\u2014"} />
                    <DetailField
                      label="Contact"
                      value={
                        client.type === "PROFESSIONNEL"
                          ? client.contact_name || "\u2014"
                          : [client.first_name, client.last_name].filter(Boolean).join(" ") || "\u2014"
                      }
                    />
                    <DetailField label="Agence" value={client.agency_id || "\u2014"} />
                  </div>
                  <Separator />
                  {/* Informations techniques */}
                  {(folders.length > 0 || properties.length > 0) && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Informations techniques</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {(() => {
                            // Récupérer la dernière couleur MPR disponible
                            const lastMprColor = folders
                              .filter(f => f.mpr_color)
                              .map(f => f.mpr_color)
                              .slice(-1)[0];
                            
                            // Récupérer le dernier type d'émetteur disponible
                            const lastEmitterType = folders
                              .filter(f => f.emitter_type)
                              .map(f => f.emitter_type)
                              .slice(-1)[0];
                            
                            // Récupérer la dernière zone climatique (depuis dossier ou propriété)
                            const lastZoneClimatique = folders
                              .filter(f => f.zone_climatique)
                              .map(f => f.zone_climatique)
                              .slice(-1)[0] || 
                              properties
                              .filter(p => p.zone_climatique)
                              .map(p => p.zone_climatique)
                              .slice(-1)[0];
                            
                            // Récupérer la température de base depuis la première propriété disponible
                            const baseTemperature = properties
                              .filter(p => p.base_temperature !== null && p.base_temperature !== undefined)
                              .map(p => p.base_temperature)
                              [0];
                            
                            return (
                              <>
                                {lastMprColor && (
                                  <DetailField 
                                    label="Couleur MPR" 
                                    value={lastMprColor}
                                  />
                                )}
                                {lastEmitterType && (
                                  <DetailField 
                                    label="Type d'émetteur" 
                                    value={
                                      lastEmitterType === "BASSE_TEMPERATURE"
                                        ? "Basse température"
                                        : lastEmitterType === "MOYENNE_HAUTE_TEMPERATURE"
                                        ? "Moyenne / Haute température"
                                        : lastEmitterType
                                    }
                                  />
                                )}
                                {baseTemperature !== undefined && baseTemperature !== null && (
                                  <BaseTemperatureBadge temperature={baseTemperature} />
                                )}
                                {lastZoneClimatique && (
                                  <ClimateZoneBadge zone={lastZoneClimatique} />
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DetailField label="Cr\u00e9\u00e9 le" value={new Date(client.created_at).toLocaleString()} />
                    <DetailField label="Mis \u00e0 jour" value={new Date(client.updated_at).toLocaleString()} />
                    <DetailField
                      label="Archiv\u00e9 le"
                      value={client.archived_at ? new Date(client.archived_at).toLocaleString() : "\u2014"}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="properties" className="mt-4">
                <PropertiesSection
                  clientId={client.id}
                  clientType={client.type}
                  onCountChange={setPropertiesCount}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
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

// ============================================================================
// Base Temperature Badge Component
// ============================================================================

function BaseTemperatureBadge({ temperature }: { temperature: number }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        Température extérieure de base
      </p>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Thermometer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {temperature > 0 ? `+${temperature}` : temperature}°C
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Climate Zone Badge Component
// ============================================================================

function ClimateZoneBadge({ zone }: { zone: string }) {
  const zoneLabels: Record<string, string> = {
    h1: "Zone H1",
    h2: "Zone H2",
    h3: "Zone H3",
  };
  
  const zoneColors: Record<string, { bg: string; border: string; text: string }> = {
    h1: {
      bg: "bg-orange-50 dark:bg-orange-950",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
    },
    h2: {
      bg: "bg-amber-50 dark:bg-amber-950",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
    },
    h3: {
      bg: "bg-yellow-50 dark:bg-yellow-950",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-300",
    },
  };
  
  const config = zoneColors[zone.toLowerCase()] || {
    bg: "bg-gray-50 dark:bg-gray-950",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-700 dark:text-gray-300",
  };
  
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        Zone climatique
      </p>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${config.bg} ${config.border}`}>
          <MapPin className={`h-4 w-4 ${config.text}`} />
          <span className={`text-sm font-semibold ${config.text}`}>
            {zoneLabels[zone.toLowerCase()] || zone.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
