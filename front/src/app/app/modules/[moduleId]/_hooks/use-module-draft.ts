"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ModuleDraft,
  createModuleDraft,
  getModuleDraft,
  updateModuleDraft,
  listModuleDrafts,
  type ModuleDraftUpdate,
} from "@/lib/api/modules";
import { BatTh113Draft } from "../_schemas";

type UseModuleDraftOptions = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
};

export function useModuleDraft({ moduleId, moduleCode, draftId }: UseModuleDraftOptions) {
  const router = useRouter();
  const [draft, setDraft] = useState<ModuleDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftData, setDraftData] = useState<BatTh113Draft>({});

  // Charger le brouillon existant si draftId est fourni
  useEffect(() => {
    async function loadDraft() {
      if (!draftId) return;

      setIsLoading(true);
      try {
        const loadedDraft = await getModuleDraft(draftId);
        setDraft(loadedDraft);
        setCurrentStep(loadedDraft.current_step);
        if (loadedDraft.data) {
          setDraftData(loadedDraft.data as BatTh113Draft);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du brouillon:", error);
        toast.error("Impossible de charger le brouillon");
      } finally {
        setIsLoading(false);
      }
    }

    loadDraft();
  }, [draftId]);

  // Vérifier s'il existe un brouillon pour un client et un module donné
  const checkExistingDraft = useCallback(
    async (clientId: string): Promise<ModuleDraft | null> => {
      try {
        const result = await listModuleDrafts({
          module_code: moduleCode,
          client_id: clientId,
          page: 1,
          pageSize: 1,
        });
        
        // Retourner le premier brouillon non archivé trouvé
        const activeDraft = result.items.find((d) => !d.archived_at);
        return activeDraft || null;
      } catch (error) {
        console.error("Erreur lors de la vérification du brouillon:", error);
        return null;
      }
    },
    [moduleCode]
  );

  // Charger un brouillon existant
  const loadDraftById = useCallback(async (draftIdToLoad: string) => {
    setIsLoading(true);
    try {
      const loadedDraft = await getModuleDraft(draftIdToLoad);
      setDraft(loadedDraft);
      setCurrentStep(loadedDraft.current_step);
      if (loadedDraft.data) {
        setDraftData(loadedDraft.data as BatTh113Draft);
      }
      // Mettre à jour l'URL avec le draftId
      router.replace(`/app/modules/${moduleId}?draftId=${loadedDraft.id}`);
      return loadedDraft;
    } catch (error) {
      console.error("Erreur lors du chargement du brouillon:", error);
      toast.error("Impossible de charger le brouillon");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, router]);

  // Créer un nouveau brouillon
  const createNewDraft = useCallback(
    async (clientId?: string): Promise<string | null> => {
      setIsLoading(true);
      try {
        const newDraft = await createModuleDraft({
          module_code: moduleCode,
          client_id: clientId || null,
          current_step: 1,
          data: {},
        });
        setDraft(newDraft);
        setDraftData({});
        setCurrentStep(1);
        // Mettre à jour l'URL avec le draftId
        router.replace(`/app/modules/${moduleId}?draftId=${newDraft.id}`);
        return newDraft.id;
      } catch (error) {
        console.error("Erreur lors de la création du brouillon:", error);
        toast.error("Impossible de créer le brouillon");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [moduleCode, moduleId, router]
  );

  // Sauvegarder le brouillon (uniquement lors du passage d'une étape à l'autre)
  const saveDraft = useCallback(
    async (data: Partial<BatTh113Draft>, step?: number, clientId?: string): Promise<void> => {
      console.log("saveDraft appelé", { data, step, clientId, draftId: draft?.id });
      
      let draftIdToUse = draft?.id;
      let currentDraft = draft;

      // Si pas de brouillon, en créer un nouveau
      if (!draftIdToUse) {
        console.log("Création d'un nouveau brouillon...");
        const newDraftId = await createNewDraft(clientId);
        if (!newDraftId) {
          throw new Error("Impossible de créer le brouillon");
        }
        draftIdToUse = newDraftId;
        // Récupérer le draft fraîchement créé pour avoir les bonnes données
        currentDraft = await getModuleDraft(newDraftId);
        setDraft(currentDraft);
        setDraftData((currentDraft.data as BatTh113Draft) || {});
        console.log("Nouveau brouillon créé:", currentDraft);
      }

      // Utiliser les données actuelles du draft (toujours à jour) ou un objet vide
      const currentDraftData = (currentDraft?.data as BatTh113Draft) || {};
      const newData = { ...currentDraftData, ...data };
      console.log("Données à sauvegarder:", newData);
      setDraftData(newData);

      // Sauvegarder immédiatement
      setIsSaving(true);
      try {
        const updatePayload: ModuleDraftUpdate = {
          data: newData,
        };
        if (step !== undefined) {
          updatePayload.current_step = step;
        }
        if (clientId !== undefined) {
          updatePayload.client_id = clientId;
        }

        console.log("Payload de mise à jour:", updatePayload);
        const updatedDraft = await updateModuleDraft(draftIdToUse, updatePayload);
        console.log("Brouillon mis à jour:", updatedDraft);
        setDraft(updatedDraft);
        if (step !== undefined) {
          setCurrentStep(step);
        }
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error("Erreur lors de la sauvegarde du brouillon");
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [draft, createNewDraft]
  );

  return {
    draft,
    draftData,
    currentStep,
    isLoading,
    isSaving,
    setCurrentStep,
    saveDraft,
    checkExistingDraft,
    loadDraftById,
    createNewDraft,
  };
}

