"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SortingState } from "@tanstack/react-table";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProjects } from "@/lib/api/projects";
import type { ApiError } from "@/lib/api";
import type { Project } from "@/types/project";
import { DataTable } from "./_components/data-table";
import { getColumns } from "./_components/columns";
import { ProjectDialog } from "./_components/project-dialog";

const DEFAULT_PAGE_SIZE = 10;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProjectsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sort = sorting[0];
      // Pour l'instant, on ne gère pas le tri côté backend, on utilise le tri par défaut
      const data = await fetchProjects({
        page,
        page_size: pageSize,
        module_code: "BAR-TH-175",
        // TODO: Ajouter le tri côté backend si nécessaire
      });
      setProjects(data.items);
      setTotal(data.total);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err?.data?.detail || err?.message || "Impossible de charger les projets.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sorting]);

  useEffect(() => {
    fetchProjectsData();
  }, [fetchProjectsData]);

  const columns = useMemo(
    () =>
      getColumns({
        onRowClick: (project) => router.push(`/app/projects/${project.id}`),
      }),
    [router]
  );

  const onCreate = () => {
    setDialogOpen(true);
  };

  // Filtrer les projets localement selon la recherche
  // TODO: Implémenter la recherche côté API si nécessaire pour de meilleures performances
  const filteredProjects = useMemo(() => {
    if (!search.trim()) {
      return projects;
    }
    const query = search.toLowerCase();
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(query) ||
        (project.building_address?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [projects, search]);

  // Pour la recherche locale, on utilise les projets filtrés
  // Sinon, on utilise la pagination serveur
  const displayProjects = search ? filteredProjects : projects;
  const displayTotal = search ? filteredProjects.length : total;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
          <p className="text-muted-foreground">Gérez vos projets de rénovation énergétique multi-appartements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchProjectsData} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraîchir
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-muted-foreground">
            Recherche rapide (nom / adresse)
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un projet..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={displayProjects}
            total={displayTotal}
            page={page}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(Math.max(1, newPage))}
            onPageSizeChange={(newSize) => {
              setPage(1);
              setPageSize(newSize);
            }}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
            onRowClick={(project) => router.push(`/app/projects/${project.id}`)}
          />
        </CardContent>
      </Card>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchProjectsData}
      />
    </div>
  );
}
