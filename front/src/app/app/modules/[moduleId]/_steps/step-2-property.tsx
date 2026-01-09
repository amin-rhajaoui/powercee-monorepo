"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, UseFormReturn, useFormState, useWatch } from "react-hook-form";
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
import { Loader2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getStep2Schema,
  type BarTh171Step2Values,
} from "../_schemas";
import { PropertySelector } from "../_components/property-selector";
import { useModuleDraft } from "../_hooks/use-module-draft";

// ============================================================================
// Types
// ============================================================================

type Step2PropertyProps = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  onNext: () => void;
  onPrevious: () => void;
};

type BarTh171FieldsProps = {
  form: UseFormReturn<BarTh171Step2Values>;
};

// ============================================================================
// Labels pour les enums
// ============================================================================

const OCCUPATION_STATUS_LABELS = {
  PROPRIETAIRE: "Propriétaire",
  LOCATAIRE: "Locataire",
} as const;

const HEATING_SYSTEM_LABELS = {
  FIOUL: "Fioul",
  GAZ: "Gaz",
  CHARBON: "Charbon",
  BOIS: "Bois",
  ELECTRIQUE: "Électrique",
} as const;

const WATER_HEATING_TYPE_LABELS = {
  BALLON_ELECTRIQUE: "Ballon électrique",
  CHAUFFE_EAU_GAZ: "Chauffe-eau gaz",
  CHAUFFE_EAU_THERMODYNAMIQUE: "Chauffe-eau thermodynamique",
  AUTRE: "Autre",
} as const;

const ELECTRICAL_PHASE_LABELS = {
  MONOPHASE: "Monophasé",
  TRIPHASE: "Triphasé",
} as const;

const USAGE_MODE_LABELS = {
  HEATING_ONLY: "Chauffage seul",
  HEATING_AND_HOT_WATER: "Chauffage et Eau chaude sanitaire",
} as const;

// ============================================================================
// Composant champs spécifiques BAR-TH-171
// ============================================================================

function BarTh171Fields({ form }: BarTh171FieldsProps) {
  // Utiliser useWatch pour déclencher les re-renders quand les valeurs changent
  const isPrincipalResidence = useWatch({ control: form.control, name: "is_principal_residence" });
  const heatingSystem = useWatch({ control: form.control, name: "heating_system" });
  const occupationStatus = useWatch({ control: form.control, name: "occupation_status" });
  const isWaterHeatingLinked = useWatch({ control: form.control, name: "is_water_heating_linked" });
  const waterHeatingType = useWatch({ control: form.control, name: "water_heating_type" });
  const usageMode = useWatch({ control: form.control, name: "usage_mode" });
  const electricalPhase = useWatch({ control: form.control, name: "electrical_phase" });
  
  // Utiliser un état local pour garantir que le re-render se déclenche
  const [localIsWaterHeatingLinked, setLocalIsWaterHeatingLinked] = useState<boolean | undefined>(isWaterHeatingLinked);
  
  // Synchroniser l'état local avec la valeur du formulaire
  useEffect(() => {
    setLocalIsWaterHeatingLinked(isWaterHeatingLinked);
  }, [isWaterHeatingLinked]);
  
  // Afficher les questions si is_water_heating_linked est explicitement false
  const shouldShowQuestions = localIsWaterHeatingLinked === false;
  
  // Forcer la validation quand is_water_heating_linked change
  useEffect(() => {
    if (localIsWaterHeatingLinked === false) {
      form.trigger("water_heating_type");
      form.trigger("usage_mode");
    }
  }, [localIsWaterHeatingLinked, form]);

  return (
    <div className="space-y-6 border-t pt-6 mt-6">
      {/* Section Résidence Principale */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">Résidence principale</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="is_principal_residence">
              Le logement est-il la résidence principale du client ?
            </Label>
            <Select
              value={
                isPrincipalResidence === undefined || isPrincipalResidence === null
                  ? ""
                  : isPrincipalResidence
                  ? "oui"
                  : "non"
              }
              onValueChange={(value) => {
                if (value === "") return;
                form.setValue(
                  "is_principal_residence",
                  value === "oui",
                  { shouldValidate: true, shouldDirty: true, shouldTouch: true }
                );
              }}
            >
              <SelectTrigger id="is_principal_residence">
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oui">Oui</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation_status">Statut d&apos;occupation</Label>
            <Select
              value={occupationStatus ?? ""}
              onValueChange={(value) => {
                if (value === "") return;
                form.setValue(
                  "occupation_status",
                  value as "PROPRIETAIRE" | "LOCATAIRE",
                  { shouldValidate: true, shouldDirty: true, shouldTouch: true }
                );
              }}
            >
              <SelectTrigger id="occupation_status">
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OCCUPATION_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isPrincipalResidence === false && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Non éligible</AlertTitle>
            <AlertDescription>
              Le dispositif BAR-TH-171 n&apos;est applicable que pour les résidences
              principales. Ce dossier ne peut pas être poursuivi.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Section Chauffage */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">Système de chauffage actuel</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="heating_system">Type de chauffage à remplacer</Label>
            <Select
              value={heatingSystem ?? ""}
              onValueChange={(value) => {
                if (value === "") return;
                form.setValue(
                  "heating_system",
                  value as "FIOUL" | "GAZ" | "CHARBON" | "BOIS" | "ELECTRIQUE",
                  { shouldValidate: true, shouldDirty: true, shouldTouch: true }
                );
              }}
            >
              <SelectTrigger id="heating_system">
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HEATING_SYSTEM_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="old_boiler_brand">
              Marque de l&apos;ancienne chaudière (optionnel)
            </Label>
            <Input
              id="old_boiler_brand"
              placeholder="Ex: De Dietrich, Viessmann..."
              {...form.register("old_boiler_brand")}
            />
          </div>
        </div>

        {heatingSystem === "ELECTRIQUE" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Non éligible</AlertTitle>
            <AlertDescription>
              Le remplacement d&apos;un chauffage électrique n&apos;est pas éligible au
              dispositif BAR-TH-171. Ce dossier ne peut pas être poursuivi.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Section Eau Chaude Sanitaire */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">Eau chaude sanitaire</h4>

        <div className="space-y-2">
          <Label htmlFor="is_water_heating_linked">
            L&apos;eau chaude est-elle produite par le système de chauffage ?
          </Label>
          <Select
            value={
              isWaterHeatingLinked === undefined || isWaterHeatingLinked === null
                ? ""
                : isWaterHeatingLinked
                ? "oui"
                : "non"
            }
            onValueChange={(value) => {
              if (value === "") return;
              const newValue = value === "oui";
              setLocalIsWaterHeatingLinked(newValue);
              form.setValue("is_water_heating_linked", newValue, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              });
            }}
          >
            <SelectTrigger id="is_water_heating_linked">
              <SelectValue placeholder="Sélectionnez..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oui">
                Oui (chaudière mixte / ballon intégré)
              </SelectItem>
              <SelectItem value="non">
                Non (production séparée)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {shouldShowQuestions && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="water_heating_type">
                Système actuel de production d&apos;eau chaude
              </Label>
              <Select
                value={waterHeatingType ?? ""}
                onValueChange={(value) => {
                  if (value === "") return;
                  form.setValue(
                    "water_heating_type",
                    value as
                      | "BALLON_ELECTRIQUE"
                      | "CHAUFFE_EAU_GAZ"
                      | "CHAUFFE_EAU_THERMODYNAMIQUE"
                      | "AUTRE",
                    { shouldValidate: true, shouldDirty: true, shouldTouch: true }
                  );
                }}
              >
                <SelectTrigger id="water_heating_type">
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WATER_HEATING_TYPE_LABELS).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.water_heating_type && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.water_heating_type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_mode">
                Mode d&apos;usage souhaité
              </Label>
              <Select
                value={usageMode ?? ""}
                onValueChange={(value) => {
                  if (value === "") return;
                  form.setValue(
                    "usage_mode",
                    value as "HEATING_ONLY" | "HEATING_AND_HOT_WATER",
                    { shouldValidate: true, shouldDirty: true, shouldTouch: true }
                  );
                }}
              >
                <SelectTrigger id="usage_mode">
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USAGE_MODE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.usage_mode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.usage_mode.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section Compteur Électrique */}
      <div className="space-y-4">
        <h4 className="font-medium text-base">Compteur électrique</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="electrical_phase">Type de compteur</Label>
            <Select
              value={electricalPhase ?? ""}
              onValueChange={(value) => {
                if (value === "") return;
                form.setValue(
                  "electrical_phase",
                  value as "MONOPHASE" | "TRIPHASE",
                  { shouldValidate: true, shouldDirty: true, shouldTouch: true }
                );
              }}
            >
              <SelectTrigger id="electrical_phase">
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ELECTRICAL_PHASE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="power_kva">Puissance souscrite (kVA)</Label>
            <Input
              id="power_kva"
              type="number"
              min={3}
              max={36}
              step={1}
              placeholder="Ex: 6, 9, 12..."
              {...form.register("power_kva", { valueAsNumber: true })}
            />
            {form.formState.errors.power_kva && (
              <p className="text-sm text-destructive">
                {form.formState.errors.power_kva.message}
              </p>
            )}
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            La puissance du compteur électrique peut impacter le dimensionnement
            de la pompe à chaleur. Une puissance insuffisante peut nécessiter une
            mise à niveau du compteur.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// ============================================================================
// Registre des composants de champs par module
// ============================================================================

const MODULE_STEP2_FIELDS: Record<
  string,
  React.ComponentType<BarTh171FieldsProps> | null
> = {
  "BAR-TH-171": BarTh171Fields,
};

// ============================================================================
// Composant principal Step2Property
// ============================================================================

export function Step2Property({
  moduleId,
  moduleCode,
  draftId,
  onNext,
  onPrevious,
}: Step2PropertyProps) {
  const { draftData, draft, saveDraft } = useModuleDraft({
    moduleId,
    moduleCode,
    draftId,
  });
  const [isNavigating, setIsNavigating] = useState(false);

  const clientId = draftData.step1?.client_id || null;

  // Récupérer le schéma dynamiquement selon le module
  const schema = useMemo(() => getStep2Schema(moduleCode), [moduleCode]);

  // Récupérer le composant de champs conditionnels
  const ModuleFields = MODULE_STEP2_FIELDS[moduleCode];

  const form = useForm<BarTh171Step2Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      property_id: draftData.step2?.property_id || draft?.property_id || "",
      // Charger les valeurs depuis le draft (colonnes dédiées)
      is_principal_residence: draft?.is_principal_residence ?? undefined,
      occupation_status: draft?.occupation_status ?? undefined,
      heating_system: draft?.heating_system ?? undefined,
      old_boiler_brand: draft?.old_boiler_brand ?? undefined,
      is_water_heating_linked: draft?.is_water_heating_linked ?? undefined,
      water_heating_type: draft?.water_heating_type ?? undefined,
      usage_mode: draft?.usage_mode ?? undefined,
      electrical_phase: draft?.electrical_phase ?? undefined,
      power_kva: draft?.power_kva != null ? draft.power_kva : undefined,
    },
    mode: "onChange",
  });

  // Recharger les valeurs quand le draft change
  useEffect(() => {
    if (draft) {
      const resetValues = {
        property_id: draftData.step2?.property_id || draft.property_id || "",
        is_principal_residence: draft.is_principal_residence ?? undefined,
        occupation_status: draft.occupation_status ?? undefined,
        heating_system: draft.heating_system ?? undefined,
        old_boiler_brand: draft.old_boiler_brand ?? undefined,
        is_water_heating_linked: draft.is_water_heating_linked ?? undefined,
        water_heating_type: draft.water_heating_type ?? undefined,
        usage_mode: draft.usage_mode ?? undefined,
        electrical_phase: draft.electrical_phase ?? undefined,
        power_kva: draft.power_kva != null ? draft.power_kva : undefined,
      };
      form.reset(resetValues);
      // Forcer la mise à jour du champ power_kva pour les inputs numériques
      if (draft.power_kva != null) {
        form.setValue("power_kva", draft.power_kva, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [draft, draftData.step2?.property_id, form]);

  // Utiliser useWatch pour garantir la synchronisation
  const propertyId = useWatch({ control: form.control, name: "property_id" });
  const isPrincipalResidence = useWatch({ control: form.control, name: "is_principal_residence" });
  const heatingSystem = useWatch({ control: form.control, name: "heating_system" });

  // Refs pour suivre les valeurs précédentes et éviter d'afficher le toast plusieurs fois
  const prevPrincipalResidenceRef = useRef<boolean | undefined>(undefined);
  const prevHeatingSystemRef = useRef<string | undefined>(undefined);

  // Afficher un toast immédiatement quand une valeur invalide est détectée
  useEffect(() => {
    // Ne pas afficher si c'est la valeur initiale ou si elle n'a pas changé
    if (
      isPrincipalResidence === false &&
      prevPrincipalResidenceRef.current !== false
    ) {
      toast.error(
        "Le logement doit être la résidence principale pour être éligible au dispositif BAR-TH-171"
      );
    }
    prevPrincipalResidenceRef.current = isPrincipalResidence;
  }, [isPrincipalResidence]);

  useEffect(() => {
    // Ne pas afficher si c'est la valeur initiale ou si elle n'a pas changé
    if (
      heatingSystem === "ELECTRIQUE" &&
      prevHeatingSystemRef.current !== "ELECTRIQUE"
    ) {
      toast.error(
        "Le chauffage ne doit pas être électrique pour être éligible au dispositif BAR-TH-171"
      );
    }
    prevHeatingSystemRef.current = heatingSystem;
  }, [heatingSystem]);

  // Calculer le blocage directement (pas de useEffect pour éviter les problèmes de re-render)
  const isBlocked = useMemo(() => {
    return isPrincipalResidence === false || heatingSystem === "ELECTRIQUE";
  }, [isPrincipalResidence, heatingSystem]);

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    // Vérifier les validations spécifiques avec toasts d'erreur
    if (isPrincipalResidence === false) {
      toast.error(
        "Le logement doit être la résidence principale pour être éligible au dispositif BAR-TH-171"
      );
      return;
    }

    if (heatingSystem === "ELECTRIQUE") {
      toast.error(
        "Le chauffage ne doit pas être électrique pour être éligible au dispositif BAR-TH-171"
      );
      return;
    }

    // Valider le formulaire
    const isValid = await form.trigger();

    if (!isValid) {
      const errors = form.formState.errors;
      if (errors.property_id) {
        toast.error(
          errors.property_id.message || "Veuillez sélectionner un logement"
        );
      }
      if (errors.is_principal_residence) {
        toast.error(errors.is_principal_residence.message || "");
      }
      if (errors.heating_system) {
        toast.error(errors.heating_system.message || "");
      }
      if (errors.water_heating_type) {
        toast.error(errors.water_heating_type.message || "");
      }
      if (errors.usage_mode) {
        toast.error(errors.usage_mode.message || "");
      }
      // Afficher toutes les autres erreurs
      const otherErrors = Object.keys(errors).filter(
        (key) =>
          !["property_id", "is_principal_residence", "heating_system", "water_heating_type", "usage_mode"].includes(key)
      );
      if (otherErrors.length > 0) {
        console.error("Autres erreurs de validation:", otherErrors);
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

      // Envoyer les données au premier niveau (colonnes dédiées)
      // et non dans data.step2
      await saveDraft(
        {
          step2: { property_id: values.property_id },
        },
        3,
        undefined,
        // Champs BAR-TH-171 au premier niveau
        {
          property_id: values.property_id,
          is_principal_residence: values.is_principal_residence,
          occupation_status: values.occupation_status,
          heating_system: values.heating_system,
          old_boiler_brand: values.old_boiler_brand || null,
          is_water_heating_linked: values.is_water_heating_linked,
          water_heating_type: values.water_heating_type,
          usage_mode: values.usage_mode,
          electrical_phase: values.electrical_phase,
          power_kva: values.power_kva,
        }
      );
      console.log("Sauvegarde réussie, navigation vers étape 3");
      // Appeler onNext après la sauvegarde pour naviguer vers l'étape suivante
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
          Sélectionnez un logement et renseignez les informations techniques
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sélection du logement (base commune) */}
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

        {/* Champs conditionnels selon le module */}
        {ModuleFields && <ModuleFields form={form} />}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
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
            onClick={(e) => {
              e.preventDefault();
              handleNext(e);
            }}
            disabled={
              !propertyId ||
              isNavigating ||
              isBlocked ||
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
    </Card>
  );
}
