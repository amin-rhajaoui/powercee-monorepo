"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, RefreshCw } from "lucide-react";
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

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await getClient(clientId);
      setClient(data);
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
