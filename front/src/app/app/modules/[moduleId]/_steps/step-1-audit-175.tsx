"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step1Audit175Props = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  initialData?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, step?: number, clientId?: string) => Promise<void>;
  onNext: () => void;
};

export function Step1Audit175({
  moduleId,
  moduleCode,
  draftId,
  initialData,
  onSave,
  onNext,
}: Step1Audit175Props) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    setIsNavigating(true);
    try {
      // TODO: Implémenter la validation et la sauvegarde des données d'audit
      await onSave({}, 2);
      onNext();
    } catch (error) {
      console.error("Erreur lors de la navigation:", error);
      toast.error("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 1 : Audit énergétique</CardTitle>
        <CardDescription>
          Renseignez les données d'audit énergétique du logement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-4">Formulaire d'audit énergétique à implémenter</p>
          <p className="text-sm">
            Ce composant sera développé pour permettre la saisie des données d'audit
            (classe énergétique initiale, émissions GES, isolation, chauffage, etc.)
          </p>
        </div>

        <div className="flex justify-end">
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
