"use client";

import { getModulesByCategory } from "@/lib/modules";
import { ModuleCard } from "./_components/module-card";
import { Separator } from "@/components/ui/separator";
import { Home, Building2 } from "lucide-react";

export default function ModulesPage() {
  const particulierModules = getModulesByCategory("PARTICULIER");
  const professionnelModules = getModulesByCategory("PROFESSIONNEL");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
        <p className="text-muted-foreground mt-2">
          Accédez aux différents modules de calcul pour la rénovation énergétique.
        </p>
      </div>

      {particulierModules.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Particulier</h2>
              <p className="text-sm text-muted-foreground">
                Modules destinés aux particuliers
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {particulierModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      )}

      {professionnelModules.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Professionnel</h2>
              <p className="text-sm text-muted-foreground">
                Modules destinés aux professionnels
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {professionnelModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      )}

      {particulierModules.length === 0 && professionnelModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Aucun module disponible pour le moment.
          </p>
        </div>
      )}
    </div>
  );
}

