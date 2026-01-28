"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleDraft } from "@/lib/api/modules";

type Step2Simulation175Props = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  initialData?: Record<string, unknown>;
  draft?: ModuleDraft | null;
  onSave: (data: Record<string, unknown>, step?: number, clientId?: string) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
};

export function Step2Simulation175({
  moduleId,
  moduleCode,
  draftId,
  initialData,
  draft,
  onSave,
  onNext,
  onPrevious,
}: Step2Simulation175Props) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    setIsNavigating(true);
    try {
      // TODO: Implémenter la validation et la sauvegarde des données de simulation
      await onSave({}, 3);
      onNext();
    } catch (error) {
      console.error("Erreur lors de la navigation:", error);
      toast.error("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setIsNavigating(false);
    }
  };

  const handlePrevious = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    await onPrevious();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 2 : Simulation de rénovation</CardTitle>
        <CardDescription>
          Configurez la simulation de rénovation énergétique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-4">Formulaire de simulation à implémenter</p>
          <p className="text-sm">
            Ce composant sera développé pour permettre la configuration de la simulation
            (scénarios de travaux, postes d'isolation, système de chauffage, etc.)
          </p>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isNavigating}
          >
            Précédent
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={isNavigating}
          >
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Suivant"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
