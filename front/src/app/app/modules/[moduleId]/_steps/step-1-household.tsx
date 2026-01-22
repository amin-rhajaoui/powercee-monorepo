"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { step1HouseholdSchema, type Step1HouseholdValues, type BarTh171Draft } from "../_schemas";
import { ClientSelector } from "../_components/client-selector";
import { DraftResumeDialog } from "../_components/draft-resume-dialog";
import { useModuleDraft } from "../_hooks/use-module-draft";
import { ModuleDraft } from "@/lib/api/modules";

type Step1HouseholdProps = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  initialData?: BarTh171Draft;
  onSave: (data: Partial<BarTh171Draft>, step?: number, clientId?: string) => Promise<void>;
  onNext: () => void;
};

export function Step1Household({ moduleId, moduleCode, draftId, initialData, onSave, onNext }: Step1HouseholdProps) {
  const {
    checkExistingDraft,
    loadDraftById,
    createNewDraft,
  } = useModuleDraft({ moduleId, moduleCode, draftId });
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCheckingDraft, setIsCheckingDraft] = useState(false);
  const [existingDraft, setExistingDraft] = useState<ModuleDraft | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const form = useForm<Step1HouseholdValues>({
    resolver: zodResolver(step1HouseholdSchema),
    defaultValues: {
      client_id: initialData?.step1?.client_id || "",
    },
    mode: "onChange",
  });

  const clientId = form.watch("client_id");

  // Mettre à jour le formulaire si initialData change
  useEffect(() => {
    if (initialData?.step1?.client_id) {
      form.setValue("client_id", initialData.step1.client_id);
    }
  }, [initialData, form]);

  // Vérifier l'existence d'un brouillon lors de la sélection d'un client
  const handleClientChange = useCallback(
    async (id: string | null) => {
      form.setValue("client_id", id || "", { shouldValidate: true });

      // Si un client est sélectionné et qu'on n'a pas déjà un brouillon chargé pour ce client
      if (id && (!draftId || initialData?.step1?.client_id !== id)) {
        setIsCheckingDraft(true);
        try {
          const foundDraft = await checkExistingDraft(id);
          if (foundDraft && foundDraft.id !== draftId) {
            setExistingDraft(foundDraft);
            setShowResumeDialog(true);
          }
        } catch (error) {
          console.error("Erreur lors de la vérification du brouillon:", error);
        } finally {
          setIsCheckingDraft(false);
        }
      }
    },
    [form, checkExistingDraft, draftId, initialData?.step1?.client_id]
  );

  // Reprendre le brouillon existant
  const handleResumeDraft = useCallback(async () => {
    if (!existingDraft) return;

    setShowResumeDialog(false);
    try {
      await loadDraftById(existingDraft.id);
      // NOTE: loadDraftById updates the URL, which triggers parent re-render with new draftId
      // The parent will then fetch new data and pass it down as initialData
      toast.success("Brouillon chargé avec succès");
    } catch (error) {
      console.error("Erreur lors du chargement du brouillon:", error);
      toast.error("Impossible de charger le brouillon");
    }
  }, [existingDraft, loadDraftById]);

  // Créer un nouveau brouillon
  const handleNewDraft = useCallback(async () => {
    if (!clientId) return;

    setShowResumeDialog(false);
    try {
      await createNewDraft(clientId);
      toast.success("Nouveau brouillon créé");
    } catch (error) {
      console.error("Erreur lors de la création du brouillon:", error);
      toast.error("Impossible de créer le brouillon");
    }
  }, [clientId, createNewDraft]);

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    console.log("handleNext appelé", { clientId });

    // Valider le formulaire
    const isValid = await form.trigger();
    console.log("Validation:", isValid, form.formState.errors);

    if (!isValid) {
      // Afficher les erreurs de validation
      const errors = form.formState.errors;
      if (errors.client_id) {
        toast.error(errors.client_id.message || "Veuillez sélectionner un client");
      }
      return;
    }

    if (!clientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    setIsNavigating(true);
    try {
      const values = form.getValues();
      console.log("Sauvegarde en cours...", values);
      // Sauvegarder avec la fonction passée en props
      await onSave({ step1: values }, 2, clientId);
      console.log("Sauvegarde réussie, navigation vers étape 2");
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
        <CardTitle>Étape 1 : Informations du foyer</CardTitle>
        <CardDescription>
          Sélectionnez ou créez un client particulier pour ce dossier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <ClientSelector
            value={clientId || null}
            onChange={handleClientChange}
            disabled={isCheckingDraft}
          />
          {isCheckingDraft && (
            <p className="text-sm text-muted-foreground mt-2">
              Vérification d'un brouillon existant...
            </p>
          )}
          {form.formState.errors.client_id && (
            <p className="text-sm text-destructive mt-2">
              {form.formState.errors.client_id.message}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              !clientId ||
              isNavigating ||
              isCheckingDraft ||
              form.formState.isSubmitting
            }
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

      <DraftResumeDialog
        open={showResumeDialog}
        onOpenChange={setShowResumeDialog}
        existingDraft={existingDraft}
        onResume={handleResumeDraft}
        onNew={handleNewDraft}
      />
    </Card>
  );
}

