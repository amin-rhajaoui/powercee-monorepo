"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Info, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { barTh171Step3Schema, type BarTh171Step3Values } from "../_schemas";
import { useModuleDraft } from "../_hooks/use-module-draft";
import { FileUpload } from "@/components/upload/file-upload";
import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

type Step3DocumentsProps = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  onNext: () => void;
  onPrevious: () => void;
};

// ============================================================================
// Helper pour uploader un fichier vers S3 via le proxy
// ============================================================================

async function uploadFileToS3(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload", formData);

  if (!response.ok) {
    throw new Error("Erreur lors de l'upload du fichier");
  }

  const data = await response.json();
  return data.url;
}

// ============================================================================
// Composant principal Step3Documents
// ============================================================================

export function Step3Documents({
  moduleId,
  moduleCode,
  draftId,
  onNext,
  onPrevious,
}: Step3DocumentsProps) {
  const { draftData, draft, saveDraft } = useModuleDraft({
    moduleId,
    moduleCode,
    draftId,
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // États pour les fichiers en attente d'upload
  const [taxNoticeFile, setTaxNoticeFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [propertyProofFile, setPropertyProofFile] = useState<File | null>(null);
  const [energyBillFile, setEnergyBillFile] = useState<File | null>(null);

  // Récupérer le statut d'occupation depuis draftData.step2
  const occupationStatus = draftData.step2?.occupation_status;

  const form = useForm<BarTh171Step3Values>({
    resolver: zodResolver(barTh171Step3Schema),
    defaultValues: {
      tax_notice_url: draftData.step3?.tax_notice_url ?? undefined,
      is_address_same_as_works: draftData.step3?.is_address_same_as_works ?? undefined,
      address_proof_url: draftData.step3?.address_proof_url ?? undefined,
      property_proof_url: draftData.step3?.property_proof_url ?? undefined,
      energy_bill_url: draftData.step3?.energy_bill_url ?? undefined,
      reference_tax_income: draftData.step3?.reference_tax_income ?? undefined,
      household_size: draftData.step3?.household_size ?? undefined,
    },
    mode: "onChange",
  });

  // Recharger les valeurs quand le draft change
  useEffect(() => {
    if (draftData.step3) {
      form.reset({
        tax_notice_url: draftData.step3.tax_notice_url ?? undefined,
        is_address_same_as_works: draftData.step3.is_address_same_as_works ?? undefined,
        address_proof_url: draftData.step3.address_proof_url ?? undefined,
        property_proof_url: draftData.step3.property_proof_url ?? undefined,
        energy_bill_url: draftData.step3.energy_bill_url ?? undefined,
        reference_tax_income: draftData.step3.reference_tax_income ?? undefined,
        household_size: draftData.step3.household_size ?? undefined,
      });
    }
  }, [draftData.step3, form]);

  const isAddressSameAsWorks = form.watch("is_address_same_as_works");

  // Fonction pour uploader tous les fichiers en attente
  const uploadPendingFiles = useCallback(async (): Promise<Partial<BarTh171Step3Values>> => {
    const updates: Partial<BarTh171Step3Values> = {};

    if (taxNoticeFile) {
      updates.tax_notice_url = await uploadFileToS3(taxNoticeFile);
    }
    if (addressProofFile) {
      updates.address_proof_url = await uploadFileToS3(addressProofFile);
    }
    if (propertyProofFile) {
      updates.property_proof_url = await uploadFileToS3(propertyProofFile);
    }
    if (energyBillFile) {
      updates.energy_bill_url = await uploadFileToS3(energyBillFile);
    }

    return updates;
  }, [taxNoticeFile, addressProofFile, propertyProofFile, energyBillFile]);

  // Handler pour passer l'étape sans validation complète
  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      // Uploader les fichiers en attente
      const uploadedUrls = await uploadPendingFiles();
      const values = form.getValues();

      // Sauvegarder les données actuelles (sans validation stricte)
      await saveDraft(
        {
          step3: {
            is_address_same_as_works: values.is_address_same_as_works,
            tax_notice_url: uploadedUrls.tax_notice_url || values.tax_notice_url || null,
            address_proof_url: uploadedUrls.address_proof_url || values.address_proof_url || null,
            property_proof_url: uploadedUrls.property_proof_url || values.property_proof_url || null,
            energy_bill_url: uploadedUrls.energy_bill_url || values.energy_bill_url || null,
            reference_tax_income: values.reference_tax_income || null,
            household_size: values.household_size || null,
          },
        },
        4,
        undefined
      );
      onNext();
    } catch (error) {
      console.error("Erreur lors du passage:", error);
      toast.error("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setIsSkipping(false);
    }
  };

  // Handler pour passer à l'étape suivante avec validation
  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    // Valider le formulaire
    const isValid = await form.trigger();

    if (!isValid) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    setIsNavigating(true);
    try {
      // Uploader les fichiers en attente
      const uploadedUrls = await uploadPendingFiles();
      const values = form.getValues();

      await saveDraft(
        {
          step3: {
            is_address_same_as_works: values.is_address_same_as_works,
            tax_notice_url: uploadedUrls.tax_notice_url || values.tax_notice_url || null,
            address_proof_url: uploadedUrls.address_proof_url || values.address_proof_url || null,
            property_proof_url: uploadedUrls.property_proof_url || values.property_proof_url || null,
            energy_bill_url: uploadedUrls.energy_bill_url || values.energy_bill_url || null,
            reference_tax_income: values.reference_tax_income || null,
            household_size: values.household_size || null,
          },
        },
        4,
        undefined
      );
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
        <CardTitle>Étape 3 : Documents administratifs</CardTitle>
        <CardDescription>
          Collectez les documents nécessaires pour constituer le dossier CEE / Anah
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question adresse */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="is_address_same_as_works">
              L&apos;adresse sur l&apos;avis d&apos;imposition correspond-elle à l&apos;adresse des travaux ?
            </Label>
            <Select
              value={
                isAddressSameAsWorks === undefined || isAddressSameAsWorks === null
                  ? ""
                  : isAddressSameAsWorks
                  ? "oui"
                  : "non"
              }
              onValueChange={(value) => {
                if (value === "") return;
                form.setValue("is_address_same_as_works", value === "oui", {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger id="is_address_same_as_works">
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oui">Oui</SelectItem>
                <SelectItem value="non">Non, l&apos;adresse a changé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Avis d'imposition (toujours affiché) */}
        <div className="space-y-2">
          <Label>Avis d&apos;imposition</Label>
          <FileUpload
            value={form.watch("tax_notice_url")}
            onChange={(url) => form.setValue("tax_notice_url", url)}
            onFileChange={setTaxNoticeFile}
            label="Téléverser l'avis d'imposition"
          />
          <p className="text-xs text-muted-foreground">
            Document obligatoire pour déterminer l&apos;éligibilité aux aides
          </p>
        </div>

        {/* Justificatif de domicile (si adresse différente) */}
        {isAddressSameAsWorks === false && (
          <div className="space-y-2">
            <Label>Attestation de changement d&apos;adresse</Label>
            <FileUpload
              value={form.watch("address_proof_url")}
              onChange={(url) => form.setValue("address_proof_url", url)}
              onFileChange={setAddressProofFile}
              label="Téléverser le justificatif de domicile"
            />
            <p className="text-xs text-muted-foreground">
              Facture de moins de 3 mois ou attestation sur l&apos;honneur
            </p>
          </div>
        )}

        {/* Taxe foncière / Acte notarié (si propriétaire) */}
        {occupationStatus === "PROPRIETAIRE" && (
          <div className="space-y-2">
            <Label>Taxe foncière ou acte de propriété</Label>
            <FileUpload
              value={form.watch("property_proof_url")}
              onChange={(url) => form.setValue("property_proof_url", url)}
              onFileChange={setPropertyProofFile}
              label="Téléverser le justificatif de propriété"
            />
            <p className="text-xs text-muted-foreground">
              Dernier avis de taxe foncière ou acte notarié
            </p>
          </div>
        )}

        {/* Facture d'énergie (optionnel) */}
        <div className="space-y-2">
          <Label>
            Facture d&apos;énergie <span className="text-muted-foreground">(optionnel)</span>
          </Label>
          <FileUpload
            value={form.watch("energy_bill_url")}
            onChange={(url) => form.setValue("energy_bill_url", url)}
            onFileChange={setEnergyBillFile}
            label="Téléverser une facture d'énergie"
          />
          <p className="text-xs text-muted-foreground">
            Facture de moins de 3 mois (gaz, fioul, électricité)
          </p>
        </div>

        {/* Informations fiscales */}
        <div className="space-y-4 border-t pt-6">
          <h4 className="font-medium text-base">Informations fiscales</h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reference_tax_income">Revenu fiscal de référence</Label>
              <Input
                id="reference_tax_income"
                type="number"
                min={0}
                placeholder="Ex: 25000"
                {...form.register("reference_tax_income", { valueAsNumber: true })}
              />
              {form.formState.errors.reference_tax_income && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.reference_tax_income.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="household_size">Nombre de personnes dans le foyer</Label>
              <Input
                id="household_size"
                type="number"
                min={1}
                max={20}
                placeholder="Ex: 4"
                {...form.register("household_size", { valueAsNumber: true })}
              />
              {form.formState.errors.household_size && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.household_size.message}
                </p>
              )}
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Ces informations sont nécessaires pour calculer les plafonds de ressources
              et déterminer le niveau d&apos;aide applicable (MaPrimeRénov&apos; Bleu, Jaune, Violet, Rose).
            </AlertDescription>
          </Alert>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isNavigating || isSkipping}
          >
            Précédent
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isNavigating || isSkipping}
            >
              {isSkipping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Passer pour le moment
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isNavigating || isSkipping || form.formState.isSubmitting}
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
        </div>
      </CardContent>
    </Card>
  );
}
