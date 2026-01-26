"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDialog } from "@/app/app/clients/_components/client-dialog";
import { listClients, getClient, type Client } from "@/lib/api/clients";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ClientSelectorProps = {
  value: string | null;
  onChange: (clientId: string | null) => void;
  disabled?: boolean;
};

export function ClientSelector({ value, onChange, disabled = false }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filtrer les clients selon la recherche
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }
    const query = searchQuery.toLowerCase();
    return clients.filter((client) => {
      const name = getClientDisplayName(client).toLowerCase();
      const email = client.email?.toLowerCase() || "";
      return name.includes(query) || email.includes(query);
    });
  }, [clients, searchQuery]);

  const handleClientSelect = (clientId: string) => {
    onChange(clientId);
    setIsSheetOpen(false);
    setSearchQuery("");
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
      setIsCreateDialogOpen(false);
      setIsSheetOpen(false);
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
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 justify-start"
          disabled
        >
          <User className="h-4 w-4 mr-2" />
          <span className="text-muted-foreground">Chargement...</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bouton principal de sélection - Plus visible et intuitif */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-14 justify-start text-left font-normal",
              selectedClient && "bg-primary/5 border-primary/20"
            )}
            disabled={isLoading || disabled}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full",
                selectedClient ? "bg-primary/10" : "bg-muted"
              )}>
                <User className={cn(
                  "h-5 w-5",
                  selectedClient ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                {selectedClient ? (
                  <>
                    <div className="font-medium text-foreground truncate">
                      {getClientDisplayName(selectedClient)}
                    </div>
                    {selectedClient.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {selectedClient.email}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    Sélectionner un client...
                  </div>
                )}
              </div>
              {selectedClient && (
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </div>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[80vh]">
          <SheetHeader>
            <SheetTitle>Sélectionner un client</SheetTitle>
            <SheetDescription>
              Choisissez le client particulier pour ce dossier CEE
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11"
                autoFocus
              />
            </div>

            {/* Liste des clients */}
            <div className="space-y-2 overflow-y-auto max-h-[calc(85vh-200px)] sm:max-h-[calc(80vh-200px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Aucun client trouvé"
                      : "Aucun client particulier disponible"}
                  </p>
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = value === client.id;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-colors",
                        "hover:bg-accent hover:border-accent-foreground/20",
                        isSelected && "bg-primary/10 border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0",
                          isSelected ? "bg-primary/20" : "bg-muted"
                        )}>
                          <User className={cn(
                            "h-5 w-5",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium truncate",
                            isSelected && "text-primary"
                          )}>
                            {getClientDisplayName(client)}
                          </div>
                          {client.email && (
                            <div className="text-sm text-muted-foreground truncate">
                              {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {client.phone}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bouton créer nouveau client */}
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => {
                  setIsSheetOpen(false);
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau client
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Affichage des informations du client sélectionné */}
      {selectedClient && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Client sélectionné</CardTitle>
            <CardDescription className="text-xs">
              Informations du foyer
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
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
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleClientCreated}
        forceType="PARTICULIER"
      />
    </div>
  );
}
