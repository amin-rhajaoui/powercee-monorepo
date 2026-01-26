"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Plug,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  PenLine,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getIntegrationTypes,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  type IntegrationTypeInfo,
  type IntegrationType,
} from "@/lib/api/integrations";

// Logo/icones des integrations
const INTEGRATION_LOGOS: Record<IntegrationType, React.ReactNode> = {
  yousign: (
    <div className="flex items-center gap-2">
      {/* Logo Yousign officiel */}
      <img
        src="/yousignlogo.png"
        alt="Yousign"
        className="h-10 w-auto object-contain"
      />
    </div>
  ),
};

export default function IntegrationsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationTypeInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationTypeInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadIntegrations = async () => {
    try {
      const data = await getIntegrationTypes();
      setIntegrations(data);
      setError(null);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 401 || error?.status === 403) {
        setError("Vous n'etes pas autorise a acceder a cette page.");
        router.push("/login");
      } else {
        setError(
          error?.message || "Erreur lors du chargement des integrations"
        );
        toast.error("Erreur lors du chargement des integrations");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleOpenConfig = (integration: IntegrationTypeInfo) => {
    setSelectedIntegration(integration);
    setApiKey("");
    setShowApiKey(false);
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration || !apiKey.trim()) {
      toast.error("Veuillez entrer une cle API valide");
      return;
    }

    setIsSaving(true);
    try {
      await createIntegration({
        integration_type: selectedIntegration.type,
        api_key: apiKey.trim(),
      });
      toast.success(
        `Integration ${selectedIntegration.name} configuree avec succes`
      );
      setConfigModalOpen(false);
      await loadIntegrations();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Erreur lors de la configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (integration: IntegrationTypeInfo) => {
    if (!integration.configured) return;

    try {
      await updateIntegration(integration.type, {
        is_active: !integration.is_active,
      });
      toast.success(
        `Integration ${integration.is_active ? "desactivee" : "activee"}`
      );
      await loadIntegrations();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Erreur lors de la mise a jour");
    }
  };

  const handleOpenDelete = (integration: IntegrationTypeInfo) => {
    setSelectedIntegration(integration);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedIntegration) return;

    setIsDeleting(true);
    try {
      await deleteIntegration(selectedIntegration.type);
      toast.success(
        `Integration ${selectedIntegration.name} supprimee avec succes`
      );
      setDeleteDialogOpen(false);
      await loadIntegrations();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && error.includes("autorise")) {
    return (
      <div className="container max-w-6xl py-10">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">{error}</p>
              <Button onClick={() => router.push("/login")}>
                Aller a la page de connexion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connectez vos outils externes pour automatiser vos processus.
        </p>
        {error && !error.includes("autorise") && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Integrations List */}
      <div className="grid gap-6">
        {integrations.map((integration) => (
          <Card
            key={integration.type}
            className={`overflow-hidden ${
              integration.type === "yousign"
                ? "border-[#5B5FC7]/20 shadow-sm"
                : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Logo & Info */}
              <div
                className={`flex items-start gap-4 p-6 flex-1 ${
                  integration.type === "yousign"
                    ? "bg-gradient-to-br from-[#5B5FC7]/5 to-transparent"
                    : ""
                }`}
              >
                <div className="shrink-0">
                  {INTEGRATION_LOGOS[integration.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {integration.configured ? (
                      integration.is_active ? (
                        <Badge
                          variant="default"
                          className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">Non configuree</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {integration.description}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 p-6 pt-0 sm:pt-6 border-t sm:border-t-0 sm:border-l bg-muted/30">
                {integration.configured ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.is_active ?? false}
                        onCheckedChange={() => handleToggleActive(integration)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {integration.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenConfig(integration)}
                    >
                      <PenLine className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleOpenDelete(integration)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleOpenConfig(integration)}>
                    <Plug className="w-4 h-4 mr-2" />
                    Configurer
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {integrations.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Plug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune integration disponible pour le moment.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Configuration Modal */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration &&
                INTEGRATION_LOGOS[selectedIntegration.type]}
              Configurer {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              Entrez votre cle API pour activer cette integration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Cle API</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Entrez votre cle API..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedIntegration?.type === "yousign" && (
                  <>
                    Vous pouvez trouver votre cle API dans votre{" "}
                    <a
                      href="https://app.yousign.com/settings/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      espace Yousign
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigModalOpen(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveConfig} disabled={isSaving || !apiKey.trim()}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;integration ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer l&apos;integration{" "}
              <strong>{selectedIntegration?.name}</strong> ? Cette action est
              irreversible et desactivera toutes les fonctionnalites associees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
