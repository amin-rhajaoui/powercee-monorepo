"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ClientSelector } from "../_components/client-selector";
import { DraftResumeDialog } from "../_components/draft-resume-dialog";
import { useModuleDraft } from "../_hooks/use-module-draft";
import { ModuleDraft } from "@/lib/api/modules";

// Schema pour l'étape 1 de BAR-TH-175
const step1Schema = z.object({
  client_id: z.string().min(1, "Veuillez sélectionner un client"),
});

type Step1Values = z.infer<typeof step1Schema>;

// Type pour les données du draft BAR-TH-175
type BarTh175Draft = {
  step1?: Step1Values;
  [key: string]: unknown;
};

type Step1Audit175Props = {
  moduleId: string;
  moduleCode: string;
  moduleCategory: "PARTICULIER" | "PROFESSIONNEL";
  draftId?: string | null;
  initialData?: BarTh175Draft;
  onSave: (data: Partial<BarTh175Draft>, step?: number, clientId?: string) => Promise<void>;
  onNext: () => void;
};

export function Step1Audit175({
  moduleId,
  moduleCode,
  moduleCategory,
  draftId,
  initialData,
  onSave,
  onNext,
}: Step1Audit175Props) {
  const {
    checkExistingDraft,
    loadDraftById,
    createNewDraft,
  } = useModuleDraft({ moduleId, moduleCode, draftId });
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCheckingDraft, setIsCheckingDraft] = useState(false);
  const [existingDraft, setExistingDraft] = useState<ModuleDraft | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // Déterminer le type de client selon la catégorie du module
  const clientType = moduleCategory === "PROFESSIONNEL" ? "PROFESSIONNEL" : "PARTICULIER";

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
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

    // Valider le formulaire
    const isValid = await form.trigger();

    if (!isValid) {
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
      await onSave({ step1: values }, 2, clientId);
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
        <CardTitle>Étape 1 : Sélection du client</CardTitle>
        <CardDescription>
          {clientType === "PROFESSIONNEL"
            ? "Sélectionnez ou créez le bailleur social pour ce projet de rénovation d'ampleur"
            : "Sélectionnez ou créez le client particulier pour ce dossier de rénovation d'ampleur"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <ClientSelector
            value={clientId || null}
            onChange={handleClientChange}
            disabled={isCheckingDraft}
            clientType={clientType}
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
