"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step3Devis175Props = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  initialData?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, step?: number, clientId?: string) => Promise<void>;
  onPrevious: () => void;
};

export function Step3Devis175({
  moduleId,
  moduleCode,
  draftId,
  initialData,
  onSave,
  onPrevious,
}: Step3Devis175Props) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handlePrevious = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    await onPrevious();
  };

  const handleFinish = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    setIsNavigating(true);
    try {
      // TODO: Implémenter la validation et la sauvegarde finale, puis création du devis
      await onSave({});
      toast.success("Devis généré avec succès");
      // TODO: Rediriger vers la page du devis ou du dossier créé
    } catch (error) {
      console.error("Erreur lors de la génération du devis:", error);
      toast.error("Erreur lors de la génération du devis. Veuillez réessayer.");
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 3 : Génération du devis</CardTitle>
        <CardDescription>
          Générez le devis à partir des données d'audit et de simulation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-4">Génération de devis à implémenter</p>
          <p className="text-sm">
            Ce composant sera développé pour permettre la génération du devis
            à partir des données collectées dans les étapes précédentes.
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
            onClick={handleFinish}
            disabled={isNavigating}
          >
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              "Générer le devis"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
