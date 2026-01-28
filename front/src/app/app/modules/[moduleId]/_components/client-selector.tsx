"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Check, User, Mail, Phone, UserPlus } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientDialog } from "@/app/app/clients/_components/client-dialog";
import { listClients, getClient, type Client } from "@/lib/api/clients";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ClientSelectorProps = {
  value: string | null;
  onChange: (clientId: string | null) => void;
  disabled?: boolean;
  clientType?: "PARTICULIER" | "PROFESSIONNEL";
};

export function ClientSelector({ value, onChange, disabled = false, clientType = "PARTICULIER" }: ClientSelectorProps) {
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

  // Charger la liste des clients selon le type
  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      try {
        const data = await listClients({
          page: 1,
          pageSize: 100,
          status: "ACTIF",
          type: clientType,
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
  }, [clientType]);

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
        type: clientType,
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

  const getClientInitials = (client: Client): string => {
    if (client.type === "PROFESSIONNEL" && client.company_name) {
      return client.company_name.slice(0, 2).toUpperCase();
    }
    const first = client.first_name?.slice(0, 1) ?? "";
    const last = client.last_name?.slice(0, 1) ?? "";
    return (first + last).toUpperCase() || "?";
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    );
  }

  const emptyTitle = searchQuery
    ? "Aucun client trouvé"
    : clientType === "PROFESSIONNEL"
      ? "Aucun bailleur social"
      : "Aucun client particulier";
  const emptyDescription = searchQuery
    ? "Essayez un autre nom ou une autre adresse email."
    : clientType === "PROFESSIONNEL"
      ? "Créez un premier bailleur pour ce projet."
      : "Créez un premier client pour ce dossier CEE.";

  return (
    <div className="space-y-4">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-14 justify-start text-left font-normal rounded-xl border-2 transition-colors",
              selectedClient
                ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30"
                : "hover:bg-muted/50 hover:border-muted-foreground/20"
            )}
            disabled={isLoading || disabled}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {selectedClient ? (
                <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getClientInitials(selectedClient)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
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
                  <span className="text-muted-foreground">
                    Sélectionner un client...
                  </span>
                )}
              </div>
              {selectedClient && (
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </div>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="flex h-[85vh] max-h-[720px] flex-col gap-0 rounded-t-2xl border-t px-0 sm:h-[80vh]"
        >
          <SheetHeader className="px-4 pb-4 pr-12 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <SheetTitle className="text-xl">Sélectionner un client</SheetTitle>
            <SheetDescription className="text-base">
              {clientType === "PROFESSIONNEL"
                ? "Choisissez le bailleur social pour ce projet."
                : "Choisissez le client particulier pour ce dossier CEE."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl border-border bg-muted/30 pl-10 focus-visible:ring-2 focus-visible:ring-primary/20"
                autoFocus
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <EmptyState
                  icon={User}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={
                    searchQuery
                      ? undefined
                      : {
                          label: "Créer un client",
                          onClick: () => {
                            setIsSheetOpen(false);
                            setIsCreateDialogOpen(true);
                          },
                          icon: UserPlus,
                        }
                  }
                  secondaryAction={
                    searchQuery
                      ? {
                          label: "Effacer la recherche",
                          onClick: () => setSearchQuery(""),
                        }
                      : undefined
                  }
                  className="flex-1"
                />
              ) : (
                <ScrollArea className="min-h-0 flex-1 pr-2">
                  <div className="space-y-2 pb-4">
                    {filteredClients.map((client) => {
                      const isSelected = value === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client.id)}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                            "hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm",
                            isSelected &&
                              "border-primary/40 bg-primary/10 shadow-sm"
                          )}
                        >
                          <Avatar
                            className={cn(
                              "h-11 w-11 shrink-0",
                              isSelected && "ring-2 ring-primary/40"
                            )}
                          >
                            <AvatarFallback
                              className={cn(
                                "text-sm font-medium",
                                isSelected
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {getClientInitials(client)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "font-medium truncate",
                                isSelected && "text-primary"
                              )}
                            >
                              {getClientDisplayName(client)}
                            </div>
                            {client.email && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                {client.phone}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator className="shrink-0" />
            <div className="shrink-0 pb-6">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 font-medium hover:border-primary/50 hover:bg-primary/10"
                onClick={() => {
                  setIsSheetOpen(false);
                  setIsCreateDialogOpen(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Créer un nouveau client
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {selectedClient && (
        <Card className="overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getClientInitials(selectedClient)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">Client sélectionné</CardTitle>
                <CardDescription className="text-xs">
                  Informations du foyer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{getClientDisplayName(selectedClient)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{selectedClient.email}</span>
              </div>
              {selectedClient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{selectedClient.phone}</span>
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
        forceType={clientType}
      />
    </div>
  );
}
