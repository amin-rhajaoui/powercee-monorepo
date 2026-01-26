"use client";

import { use, useState, useEffect } from "react";
import { notFound, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getModuleById } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Loader2,
  FileEdit,
  FolderOpen,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useModuleDraft } from "./_hooks/use-module-draft";
import { Step1Household } from "./_steps/step-1-household";
import { Step2Property } from "./_steps/step-2-property";
import { Step3Documents } from "./_steps/step-3-documents";
import { Step4TechnicalVisit } from "./_steps/step-4-technical-visit";
import { listModuleDrafts, type ModuleDraft } from "@/lib/api/modules";
import { listFolders, type Folder } from "@/lib/api/folders";
import { getClient, type Client } from "@/lib/api/clients";

type ModuleDetailPageProps = {
  params: Promise<{ moduleId: string }>;
};

type ModuleDetailPageContentProps = {
  moduleId: string;
};

const STEP_LABELS = [
  "Foyer",
  "Logement",
  "Documents",
  "Visite Technique",
];

const STEP_DESCRIPTIONS = [
  "Selectionnez ou creez un client particulier pour ce dossier",
  "Selectionnez ou creez un logement pour ce dossier",
  "Collectez les documents administratifs du foyer",
  "Relevez les informations techniques du logement",
];

const FOLDER_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En cours",
  CLOSED: "Clos",
  ARCHIVED: "Archive",
  COMPLETED: "Terminé",
  PENDING_SIGNATURE: "En attente de signature",
};

const FOLDER_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  IN_PROGRESS: "default",
  CLOSED: "secondary",
  ARCHIVED: "outline",
  COMPLETED: "default",
  PENDING_SIGNATURE: "secondary",
};

const FOLDER_STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  ARCHIVED: "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PENDING_SIGNATURE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

// ============================================================================
// Module Overview Component (with tabs for drafts and folders)
// ============================================================================

function ModuleOverview({
  moduleId,
  moduleCode,
  moduleTitle,
}: {
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
}) {
  const [drafts, setDrafts] = useState<ModuleDraft[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, Client>>({});
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [draftsPagination, setDraftsPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [foldersPagination, setFoldersPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // Load drafts
  useEffect(() => {
    async function loadDrafts() {
      setIsLoadingDrafts(true);
      try {
        const result = await listModuleDrafts({
          module_code: moduleCode,
          page: draftsPagination.page,
          pageSize: draftsPagination.pageSize,
        });
        setDrafts(result.items.filter((d) => !d.archived_at));
        setDraftsPagination((prev) => ({
          ...prev,
          total: result.items.filter((d) => !d.archived_at).length,
        }));

        // Load clients for drafts
        const clientIds = [
          ...new Set(
            result.items
              .filter((d) => d.client_id && !d.archived_at)
              .map((d) => d.client_id as string)
          ),
        ];
        const newClientsMap: Record<string, Client> = { ...clientsMap };
        await Promise.all(
          clientIds.map(async (clientId) => {
            if (!newClientsMap[clientId]) {
              try {
                const client = await getClient(clientId);
                newClientsMap[clientId] = client;
              } catch {
                // Ignore errors
              }
            }
          })
        );
        setClientsMap(newClientsMap);
      } catch (error) {
        console.error("Erreur lors du chargement des brouillons:", error);
        toast.error("Erreur lors du chargement des brouillons");
      } finally {
        setIsLoadingDrafts(false);
      }
    }

    loadDrafts();
  }, [moduleCode, draftsPagination.page, draftsPagination.pageSize]);

  // Load folders
  useEffect(() => {
    async function loadFolders() {
      setIsLoadingFolders(true);
      try {
        const result = await listFolders({
          module_code: moduleCode,
          page: foldersPagination.page,
          pageSize: foldersPagination.pageSize,
        });
        setFolders(result.items);
        setFoldersPagination((prev) => ({ ...prev, total: result.total }));

        // Load clients for folders
        const clientIds = [
          ...new Set(result.items.map((f) => f.client_id).filter(Boolean)),
        ];
        const newClientsMap: Record<string, Client> = { ...clientsMap };
        await Promise.all(
          clientIds.map(async (clientId) => {
            if (!newClientsMap[clientId]) {
              try {
                const client = await getClient(clientId);
                newClientsMap[clientId] = client;
              } catch {
                // Ignore errors
              }
            }
          })
        );
        setClientsMap(newClientsMap);
      } catch (error) {
        console.error("Erreur lors du chargement des dossiers:", error);
        toast.error("Erreur lors du chargement des dossiers");
      } finally {
        setIsLoadingFolders(false);
      }
    }

    loadFolders();
  }, [moduleCode, foldersPagination.page, foldersPagination.pageSize]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "—";
    const client = clientsMap[clientId];
    if (!client) return "—";
    if (client.first_name || client.last_name) {
      return `${client.first_name || ""} ${client.last_name || ""}`.trim();
    }
    return client.company_name || client.email;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/modules">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{moduleTitle}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {moduleCode}
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/modules/${moduleId}?draftId=new`}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau brouillon
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="drafts" className="w-full">
        <TabsList>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Brouillons
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="folders" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Dossiers
            {foldersPagination.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {foldersPagination.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Drafts Tab */}
        <TabsContent value="drafts">
          <Card>
            <CardHeader>
              <CardTitle>Brouillons en cours</CardTitle>
              <CardDescription>
                Liste des brouillons non valides pour ce module
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingDrafts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileEdit className="h-12 w-12 mb-4" />
                  <p>Aucun brouillon en cours</p>
                  <Button asChild className="mt-4">
                    <Link href={`/app/modules/${moduleId}?draftId=new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Creer un brouillon
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Etape</TableHead>
                      <TableHead>Cree le</TableHead>
                      <TableHead>Mis a jour</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((draft) => (
                      <TableRow key={draft.id}>
                        <TableCell className="font-medium">
                          {getClientName(draft.client_id)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Etape {draft.current_step}/{STEP_LABELS.length}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(draft.created_at)}</TableCell>
                        <TableCell>{formatDate(draft.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/app/modules/${moduleId}?draftId=${draft.id}`}
                            >
                              <FileEdit className="h-4 w-4 mr-1" />
                              Continuer
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Folders Tab */}
        <TabsContent value="folders">
          <Card>
            <CardHeader>
              <CardTitle>Dossiers valides</CardTitle>
              <CardDescription>
                Liste des dossiers crees a partir de ce module
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mb-4" />
                  <p>Aucun dossier pour ce module</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Cree le</TableHead>
                        <TableHead>Mis a jour</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folders.map((folder) => (
                        <TableRow key={folder.id}>
                          <TableCell className="font-medium">
                            {getClientName(folder.client_id)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={FOLDER_STATUS_VARIANTS[folder.status] || "default"}
                              className={FOLDER_STATUS_COLORS[folder.status] || ""}
                            >
                              {FOLDER_STATUS_LABELS[folder.status] || folder.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(folder.created_at)}</TableCell>
                          <TableCell>{formatDate(folder.updated_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/app/folders/${folder.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Voir
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {Math.ceil(
                    foldersPagination.total / foldersPagination.pageSize
                  ) > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          {foldersPagination.total} dossier
                          {foldersPagination.total > 1 ? "s" : ""} au total
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFoldersPagination((prev) => ({
                                ...prev,
                                page: prev.page - 1,
                              }))
                            }
                            disabled={foldersPagination.page === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Page {foldersPagination.page} sur{" "}
                            {Math.ceil(
                              foldersPagination.total / foldersPagination.pageSize
                            )}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFoldersPagination((prev) => ({
                                ...prev,
                                page: prev.page + 1,
                              }))
                            }
                            disabled={
                              foldersPagination.page >=
                              Math.ceil(
                                foldersPagination.total /
                                foldersPagination.pageSize
                              )
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Module Wizard Component
// ============================================================================

function ModuleWizard({
  moduleId,
  moduleCode,
  moduleTitle,
  draftId,
}: {
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  draftId: string;
}) {
  const { currentStep, draftData, draft, saveDraft, isLoading } = useModuleDraft({
    moduleId,
    moduleCode,
    draftId: draftId === "new" ? null : draftId,
  });

  const [activeStep, setActiveStep] = useState(currentStep || 1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Synchroniser activeStep avec currentStep du hook SEULEMENT quand le chargement est terminé
  useEffect(() => {
    if (!isLoading && isInitialLoad && currentStep) {
      setActiveStep(currentStep);
      setIsInitialLoad(false);
    }
  }, [currentStep, isInitialLoad, isLoading]);

  const handleNext = () => {
    if (activeStep < STEP_LABELS.length) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handlePrevious = async () => {
    if (activeStep > 1) {
      const newStep = activeStep - 1;
      setActiveStep(newStep);
      await saveDraft({}, newStep);
    }
  };

  const renderStep = () => {
    const effectiveDraftId = draftId === "new" ? null : draftId;

    switch (activeStep) {
      case 1:
        return (
          <Step1Household
            moduleId={moduleId}
            moduleCode={moduleCode}
            draftId={effectiveDraftId}
            initialData={draftData}
            onSave={saveDraft}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2Property
            moduleId={moduleId}
            moduleCode={moduleCode}
            draftId={effectiveDraftId}
            initialData={draftData}
            draft={draft}
            onSave={saveDraft}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <Step3Documents
            moduleId={moduleId}
            moduleCode={moduleCode}
            draftId={effectiveDraftId}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 4:
        return (
          <Step4TechnicalVisit
            moduleId={moduleId}
            moduleCode={moduleCode}
            draftId={effectiveDraftId}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/app/modules/${moduleId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{moduleTitle}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {moduleCode}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Etape {activeStep} : {STEP_LABELS[activeStep - 1]}
              </h2>
              <span className="text-sm text-muted-foreground">
                {activeStep} / {STEP_LABELS.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {STEP_DESCRIPTIONS[activeStep - 1]}
            </p>
          </div>
          <Progress
            value={(activeStep / STEP_LABELS.length) * 100}
            className="h-2"
          />
        </div>
        {renderStep()}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Content Component
// ============================================================================

function ModuleDetailPageContent({ moduleId }: ModuleDetailPageContentProps) {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  const module = getModuleById(moduleId);

  if (!module) {
    notFound();
  }

  // Si draftId est présent, afficher le wizard, sinon afficher les onglets
  if (draftId) {
    return (
      <ModuleWizard
        moduleId={moduleId}
        moduleCode={module.code}
        moduleTitle={module.title}
        draftId={draftId}
      />
    );
  }

  return (
    <ModuleOverview
      moduleId={moduleId}
      moduleCode={module.code}
      moduleTitle={module.title}
    />
  );
}

export default function ModuleDetailPage({ params }: ModuleDetailPageProps) {
  // Déballer params dans le composant wrapper pour éviter les erreurs d'énumération
  const resolvedParams = use(params);
  return <ModuleDetailPageContent moduleId={resolvedParams.moduleId} />;
}
