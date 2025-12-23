"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Client,
  archiveClient,
  getClient,
  restoreClient,
} from "@/lib/api/clients";
import { ClientDialog } from "../_components/client-dialog";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId;

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await getClient(clientId);
      setClient(data);
    } catch (error: any) {
      toast.error(error?.data?.detail || "Client introuvable.");
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
      toast.success("Client archivé.");
      fetchClient();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Échec de l'archivage.");
    }
  };

  const handleRestore = async () => {
    if (!client) return;
    try {
      await restoreClient(client.id);
      toast.success("Client restauré.");
      fetchClient();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Échec de la restauration.");
    }
  };

  const displayName =
    client?.type === "PROFESSIONNEL"
      ? client?.company_name
      : [client?.first_name, client?.last_name].filter(Boolean).join(" ");

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
              <Badge variant={client?.status === "ACTIF" ? "secondary" : "muted"}>
                {client?.status === "ACTIF" ? "Actif" : "Archivé"}
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
            <div className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Email" value={client.email} />
                <DetailField label="Téléphone" value={client.phone || "—"} />
                <DetailField
                  label="Contact"
                  value={
                    client.type === "PROFESSIONNEL"
                      ? client.contact_name || "—"
                      : [client.first_name, client.last_name].filter(Boolean).join(" ") || "—"
                  }
                />
                <DetailField label="Agence" value={client.agency_id || "—"} />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailField label="Créé le" value={new Date(client.created_at).toLocaleString()} />
                <DetailField label="Mis à jour" value={new Date(client.updated_at).toLocaleString()} />
                <DetailField
                  label="Archivé le"
                  value={client.archived_at ? new Date(client.archived_at).toLocaleString() : "—"}
                />
              </div>
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

