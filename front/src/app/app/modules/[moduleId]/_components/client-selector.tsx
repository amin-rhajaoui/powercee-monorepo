"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDialog } from "@/app/app/clients/_components/client-dialog";
import { listClients, getClient, type Client } from "@/lib/api/clients";
import { toast } from "sonner";

type ClientSelectorProps = {
  value: string | null;
  onChange: (clientId: string | null) => void;
  disabled?: boolean;
};

export function ClientSelector({ value, onChange, disabled = false }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Éviter les erreurs d'hydratation
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Charger la liste des clients particuliers
  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      try {
        const data = await listClients({
          page: 1,
          pageSize: 100,
          status: "ACTIF",
          type: "PARTICULIER",
        });
        setClients(data.items);
      } catch (error) {
        console.error("Erreur lors du chargement des clients:", error);
        toast.error("Impossible de charger les clients");
      } finally {
        setIsLoading(false);
      }
    }
    loadClients();
  }, []);

  // Charger le client sélectionné
  useEffect(() => {
    async function loadSelectedClient() {
      if (!value) {
        setSelectedClient(null);
        return;
      }

      try {
        const client = await getClient(value);
        setSelectedClient(client);
      } catch (error) {
        console.error("Erreur lors du chargement du client:", error);
        setSelectedClient(null);
      }
    }
    loadSelectedClient();
  }, [value]);

  const handleClientSelect = (clientId: string) => {
    onChange(clientId);
  };

  const handleClientCreated = async () => {
    // Recharger la liste des clients
    try {
      const data = await listClients({
        page: 1,
        pageSize: 100,
        status: "ACTIF",
        type: "PARTICULIER",
      });
      setClients(data.items);
      // Sélectionner le dernier client créé (le premier de la liste triée par date)
      if (data.items.length > 0) {
        const latestClient = data.items[0];
        onChange(latestClient.id);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors du rechargement des clients:", error);
    }
  };

  const getClientDisplayName = (client: Client): string => {
    if (client.type === "PROFESSIONNEL") {
      return client.company_name || client.email;
    }
    const name = [client.first_name, client.last_name].filter(Boolean).join(" ");
    return name || client.email;
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-2 flex items-center">
            <span className="text-muted-foreground">Chargement...</span>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={value || undefined}
          onValueChange={handleClientSelect}
          disabled={isLoading || disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner un client"} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {getClientDisplayName(client)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau
        </Button>
      </div>

      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>Client sélectionné</CardTitle>
            <CardDescription>Informations du foyer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Nom :</span>{" "}
                {getClientDisplayName(selectedClient)}
              </div>
              <div>
                <span className="font-medium">Email :</span> {selectedClient.email}
              </div>
              {selectedClient.phone && (
                <div>
                  <span className="font-medium">Téléphone :</span> {selectedClient.phone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ClientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleClientCreated}
        forceType="PARTICULIER"
      />
    </div>
  );
}
