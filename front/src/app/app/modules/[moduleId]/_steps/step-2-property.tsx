"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { step2PropertySchema, type Step2PropertyValues } from "../_schemas";
import { PropertySelector } from "../_components/property-selector";
import { useModuleDraft } from "../_hooks/use-module-draft";

type Step2PropertyProps = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  onNext: () => void;
  onPrevious: () => void;
};

export function Step2Property({ moduleId, moduleCode, draftId, onNext, onPrevious }: Step2PropertyProps) {
  const { draftData, saveDraft } = useModuleDraft({ moduleId, moduleCode, draftId });
  const [isNavigating, setIsNavigating] = useState(false);

  const clientId = draftData.step1?.client_id || null;

  const form = useForm<Step2PropertyValues>({
    resolver: zodResolver(step2PropertySchema),
    defaultValues: {
      property_id: draftData.step2?.property_id || "",
    },
    mode: "onChange",
  });

  const propertyId = form.watch("property_id");

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    // Valider le formulaire
    const isValid = await form.trigger();

    if (!isValid) {
      // Afficher les erreurs de validation
      const errors = form.formState.errors;
      if (errors.property_id) {
        toast.error(errors.property_id.message || "Veuillez sélectionner un logement");
      }
      return;
    }

    if (!propertyId) {
      toast.error("Veuillez sélectionner un logement");
      return;
    }

    setIsNavigating(true);
    try {
      const values = form.getValues();
      // Sauvegarder uniquement lors du clic sur "Suivant"
      await saveDraft({ step2: values }, 3);
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
        <CardTitle>Étape 2 : Informations du logement</CardTitle>
        <CardDescription>
          Sélectionnez ou créez un logement pour ce dossier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <PropertySelector
            clientId={clientId}
            value={propertyId || null}
            onChange={(id) => {
              form.setValue("property_id", id || "", { shouldValidate: true });
            }}
          />
          {form.formState.errors.property_id && (
            <p className="text-sm text-destructive mt-2">
              {form.formState.errors.property_id.message}
            </p>
          )}
        </div>

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            disabled={isNavigating}
          >
            Précédent
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!propertyId || isNavigating || form.formState.isSubmitting}
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

