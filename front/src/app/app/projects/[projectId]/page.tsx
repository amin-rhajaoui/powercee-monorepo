"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, MapPin, User, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProject, getProjectStats, getProjectDrafts } from "@/lib/api/projects";
import type { ApiError } from "@/lib/api";
import type { Project, ProjectStatus, EnergyClass } from "@/types/project";
import type { ModuleDraft } from "@/lib/api/modules";
import { BulkCreateDialog } from "../_components/bulk-create-dialog";

const getStatusBadgeVariant = (
  status: ProjectStatus
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "DRAFT":
      return "outline";
    case "IN_PROGRESS":
      return "default";
    case "AUDIT_PENDING":
      return "secondary";
    case "VALIDATED":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "ARCHIVED":
      return "outline";
    default:
      return "outline";
  }
};

const getStatusLabel = (status: ProjectStatus): string => {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "IN_PROGRESS":
      return "En cours";
    case "AUDIT_PENDING":
      return "Audit en attente";
    case "VALIDATED":
      return "Validé";
    case "COMPLETED":
      return "Terminé";
    case "ARCHIVED":
      return "Archivé";
    default:
      return status;
  }
};

const getStepLabel = (step: number): string => {
  const steps: Record<number, string> = {
    1: "Étape 1",
    2: "Étape 2",
    3: "Étape 3",
    4: "Étape 4",
    5: "Étape 5",
    6: "Étape 6",
  };
  return steps[step] || `Étape ${step}`;
};

const getEnergyClassBadgeVariant = (
  energyClass?: EnergyClass
): "default" | "secondary" | "outline" | "destructive" => {
  if (!energyClass) return "outline";
  switch (energyClass) {
    case "A":
    case "B":
      return "default";
    case "C":
    case "D":
      return "secondary";
    case "E":
    case "F":
      return "outline";
    case "G":
      return "destructive";
    default:
      return "outline";
  }
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<{
    drafts_count: number;
    total_apartments: number | null;
  } | null>(null);
  const [drafts, setDrafts] = useState<ModuleDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectData, statsData] = await Promise.all([
        getProject(projectId),
        getProjectStats(projectId),
      ]);
      setProject(projectData);
      setStats({
        drafts_count: statsData.drafts_count,
        total_apartments: statsData.total_apartments,
      });
    } catch (error: unknown) {
      const err = error as ApiError;
      const message =
        err?.data?.detail || err?.message || "Impossible de charger le projet.";
      toast.error(message);
      router.push("/app/projects");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  const fetchDrafts = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const data = await getProjectDrafts(projectId, {
        page: 1,
        page_size: 100,
      });
      setDrafts(data.items);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message =
        err?.data?.detail || err?.message || "Impossible de charger les lots.";
      toast.error(message);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchDrafts();
    }
  }, [projectId, fetchProject, fetchDrafts]);

  const handleBulkCreateSuccess = () => {
    fetchProject();
    fetchDrafts();
  };

  const getDraftReference = (draft: ModuleDraft): string => {
    const data = draft.data as { apartment_number?: number };
    return data?.apartment_number
      ? `Apt ${data.apartment_number}`
      : `Draft ${draft.id.slice(0, 8)}`;
  };

  const getDraftType = (draft: ModuleDraft): string => {
    const data = draft.data as { apartment_type?: string };
    return data?.apartment_type || "—";
  };

  const getDraftEnergyClass = (draft: ModuleDraft): EnergyClass | null => {
    const data = draft.data as {
      initial_energy_class?: EnergyClass;
      projected_energy_class?: EnergyClass;
    };
    return data?.projected_energy_class || data?.initial_energy_class || null;
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/app/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
            {project.client_id && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Client: {project.client_id.slice(0, 8)}...</span>
              </div>
            )}
            {project.building_address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{project.building_address}</span>
              </div>
            )}
            <Badge variant={getStatusBadgeVariant(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cartes de statistiques */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Nombre total de logements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_apartments ?? project.total_apartments ?? "—"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Études réalisées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.drafts_count ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Devis signés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground mt-1">
                  À venir
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bouton Ajouter des lots */}
          <div>
            <Button onClick={() => setBulkDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter des lots (Bulk)
            </Button>
          </div>

          {/* Tableau des Dossiers (Drafts) */}
          <Card>
            <CardHeader>
              <CardTitle>Dossiers (Drafts)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDrafts ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun lot créé pour ce projet.</p>
                  <p className="text-sm mt-2">
                    Utilisez le bouton "Ajouter des lots (Bulk)" pour commencer.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence lot</TableHead>
                        <TableHead>Typologie</TableHead>
                        <TableHead>Étape actuelle</TableHead>
                        <TableHead>Étiquette énergétique</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts.map((draft) => {
                        const energyClass = getDraftEnergyClass(draft);
                        return (
                          <TableRow key={draft.id}>
                            <TableCell>
                              <span className="font-medium">{getDraftReference(draft)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getDraftType(draft)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getStepLabel(draft.current_step)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {energyClass ? (
                                <Badge variant={getEnergyClassBadgeVariant(energyClass)}>
                                  {energyClass}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BulkCreateDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        projectId={projectId}
        onSuccess={handleBulkCreateSuccess}
      />
    </div>
  );
}
