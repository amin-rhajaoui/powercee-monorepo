"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFormState } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Thermometer, Home, LayoutGrid, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createFolderFromDraft } from "@/lib/api/folders";
import {
  barTh171Step4Schema,
  type BarTh171Step4Values,
  type EmitterType,
  type LevelEmitters,
} from "../_schemas";
import { useModuleDraft } from "../_hooks/use-module-draft";

// ============================================================================
// Types
// ============================================================================

type Step4TechnicalVisitProps = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  onNext: () => void;
  onPrevious: () => void;
};

// ============================================================================
// Labels pour les enums
// ============================================================================

const LEVEL_LABELS: Record<number, string> = {
  0: "RDC (Rez-de-chaussee)",
  1: "R+1 (1er etage)",
  2: "R+2 (2eme etage)",
  3: "R+3 (3eme etage)",
  4: "R+4 (4eme etage)",
};

const ATTIC_TYPE_LABELS = {
  PERDUS: "Combles perdus",
  HABITES: "Combles amenages / habites",
} as const;

const FLOOR_TYPE_LABELS = {
  CAVE: "Cave / Sous-sol",
  VIDE_SANITAIRE: "Vide sanitaire",
  TERRE_PLEIN: "Terre-plein (sur dalle)",
} as const;

const WALL_ISOLATION_TYPE_LABELS = {
  AUCUNE: "Aucune isolation",
  INTERIEUR: "Isolation par l'interieur (ITI)",
  EXTERIEUR: "Isolation par l'exterieur (ITE)",
  DOUBLE: "Double isolation (ITI + ITE)",
} as const;

const JOINERY_TYPE_LABELS = {
  SIMPLE: "Simple vitrage",
  DOUBLE_OLD: "Double vitrage ancien (avant 2000)",
  DOUBLE_RECENT: "Double vitrage recent (apres 2000)",
} as const;

const EMITTER_TYPE_LABELS: Record<EmitterType, string> = {
  FONTE: "Radiateurs fonte",
  RADIATEURS: "Radiateurs (acier/alu)",
  PLANCHER_CHAUFFANT: "Plancher chauffant",
};

// ============================================================================
// Sub-components
// ============================================================================

function LevelEmittersSection({
  level,
  selectedEmitters,
  onChange,
}: {
  level: number;
  selectedEmitters: EmitterType[];
  onChange: (emitters: EmitterType[]) => void;
}) {
  const handleToggle = (emitter: EmitterType) => {
    if (selectedEmitters.includes(emitter)) {
      onChange(selectedEmitters.filter((e) => e !== emitter));
    } else {
      onChange([...selectedEmitters, emitter]);
    }
  };

  return (
    <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
      <Label className="font-medium">{LEVEL_LABELS[level]}</Label>
      <div className="flex flex-wrap gap-4">
        {(Object.entries(EMITTER_TYPE_LABELS) as [EmitterType, string][]).map(
          ([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`emitter-${level}-${key}`}
                checked={selectedEmitters.includes(key)}
                onCheckedChange={() => handleToggle(key)}
              />
              <Label
                htmlFor={`emitter-${level}-${key}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Step4TechnicalVisit({
  moduleId,
  moduleCode,
  draftId,
  onNext,
  onPrevious,
}: Step4TechnicalVisitProps) {
  const router = useRouter();
  const { draft, draftData, saveDraft } = useModuleDraft({
    moduleId,
    moduleCode,
    draftId,
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Initialize emitters configuration state
  const [emittersConfig, setEmittersConfig] = useState<LevelEmitters[]>([]);

  const form = useForm<BarTh171Step4Values>({
    resolver: zodResolver(barTh171Step4Schema),
    defaultValues: {
      nb_levels: draft?.nb_levels ?? undefined,
      avg_ceiling_height: draft?.avg_ceiling_height ?? undefined,
      target_temperature: draft?.target_temperature ?? 19,
      attic_type: draft?.attic_type ?? undefined,
      is_attic_isolated: draft?.is_attic_isolated ?? undefined,
      attic_isolation_year: draft?.attic_isolation_year ?? undefined,
      floor_type: draft?.floor_type ?? undefined,
      is_floor_isolated: draft?.is_floor_isolated ?? undefined,
      floor_isolation_year: draft?.floor_isolation_year ?? undefined,
      wall_isolation_type: draft?.wall_isolation_type ?? undefined,
      wall_isolation_year_interior: draft?.wall_isolation_year_interior ?? undefined,
      wall_isolation_year_exterior: draft?.wall_isolation_year_exterior ?? undefined,
      wall_same_year: false,
      joinery_type: draft?.joinery_type ?? undefined,
      emitters_configuration: draft?.emitters_configuration ?? [],
    },
    mode: "onChange",
  });

  // Watch form values
  useFormState({ control: form.control });
  const nbLevels = form.watch("nb_levels");
  const isAtticIsolated = form.watch("is_attic_isolated");
  const isFloorIsolated = form.watch("is_floor_isolated");
  const wallIsolationType = form.watch("wall_isolation_type");
  const wallSameYear = form.watch("wall_same_year");

  // Initialize form with draft data when it loads
  useEffect(() => {
    if (draftData.step4) {
      form.reset({
        nb_levels: draftData.step4.nb_levels ?? undefined,
        avg_ceiling_height: draftData.step4.avg_ceiling_height ?? undefined,
        target_temperature: draftData.step4.target_temperature ?? 19,
        attic_type: draftData.step4.attic_type ?? undefined,
        is_attic_isolated: draftData.step4.is_attic_isolated ?? undefined,
        attic_isolation_year: draftData.step4.attic_isolation_year ?? undefined,
        floor_type: draftData.step4.floor_type ?? undefined,
        is_floor_isolated: draftData.step4.is_floor_isolated ?? undefined,
        floor_isolation_year: draftData.step4.floor_isolation_year ?? undefined,
        wall_isolation_type: draftData.step4.wall_isolation_type ?? undefined,
        wall_isolation_year_interior: draftData.step4.wall_isolation_year_interior ?? undefined,
        wall_isolation_year_exterior: draftData.step4.wall_isolation_year_exterior ?? undefined,
        wall_same_year: draftData.step4.wall_isolation_year_interior === draftData.step4.wall_isolation_year_exterior && draftData.step4.wall_isolation_type === "DOUBLE",
        joinery_type: draftData.step4.joinery_type ?? undefined,
        emitters_configuration: draftData.step4.emitters_configuration ?? [],
      });

      // Initialize emitters config from draftData
      if (draftData.step4.emitters_configuration) {
        setEmittersConfig(draftData.step4.emitters_configuration as LevelEmitters[]);
      }
    }
  }, [draftData.step4, form]);

  // Update emitters config when nb_levels changes
  useEffect(() => {
    if (nbLevels) {
      const newConfig = Array.from({ length: nbLevels }, (_, i) => {
        const existing = emittersConfig.find((c) => c.level === i);
        return existing || { level: i, emitters: [] as EmitterType[] };
      });
      setEmittersConfig(newConfig);
      form.setValue("emitters_configuration", newConfig);
    }
  }, [nbLevels]);

  // Handle wall_same_year checkbox - duplicate year to both fields
  useEffect(() => {
    if (wallSameYear && wallIsolationType === "DOUBLE") {
      const interiorYear = form.getValues("wall_isolation_year_interior");
      if (interiorYear) {
        form.setValue("wall_isolation_year_exterior", interiorYear);
      }
    }
  }, [wallSameYear, wallIsolationType, form]);

  // Update emitter for a specific level
  const handleEmitterChange = (level: number, emitters: EmitterType[]) => {
    const newConfig = emittersConfig.map((c) =>
      c.level === level ? { ...c, emitters } : c
    );
    setEmittersConfig(newConfig);
    form.setValue("emitters_configuration", newConfig);
  };

  const handleValidateFolder = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      return;
    }

    if (!draftId) {
      toast.error("Brouillon introuvable");
      return;
    }

    setIsValidating(true);
    try {
      const values = form.getValues();

      // If wall_same_year is checked, duplicate the interior year to exterior
      let wallYearExterior = values.wall_isolation_year_exterior;
      if (values.wall_same_year && values.wall_isolation_type === "DOUBLE") {
        wallYearExterior = values.wall_isolation_year_interior;
      }

      // Sauvegarder d'abord les données de l'étape 4
      await saveDraft(
        {
          step4: {
            nb_levels: values.nb_levels ?? null,
            avg_ceiling_height: values.avg_ceiling_height ?? null,
            target_temperature: values.target_temperature ?? null,
            attic_type: values.attic_type ?? null,
            is_attic_isolated: values.is_attic_isolated ?? null,
            attic_isolation_year: values.attic_isolation_year ?? null,
            floor_type: values.floor_type ?? null,
            is_floor_isolated: values.is_floor_isolated ?? null,
            floor_isolation_year: values.floor_isolation_year ?? null,
            wall_isolation_type: values.wall_isolation_type ?? null,
            wall_isolation_year_interior: values.wall_isolation_year_interior ?? null,
            wall_isolation_year_exterior: wallYearExterior ?? null,
            joinery_type: values.joinery_type ?? null,
            emitters_configuration: values.emitters_configuration ?? null,
          },
        },
        4,
        undefined
      );

      // Créer le dossier à partir du brouillon
      const folder = await createFolderFromDraft(draftId);
      toast.success("Dossier cree avec succes !");

      // Rediriger vers la page du dossier
      router.push(`/app/folders/${folder.id}`);
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      toast.error("Erreur lors de la creation du dossier. Veuillez reessayer.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visite Technique</CardTitle>
        <CardDescription>
          Renseignez les informations techniques relevees lors de la visite du logement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Card: Chauffage */}
        <div className="space-y-4 border rounded-lg p-6">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Chauffage</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nb_levels">Nombre de niveaux</Label>
              <Select
                value={nbLevels?.toString() ?? ""}
                onValueChange={(v) =>
                  form.setValue("nb_levels", parseInt(v), { shouldValidate: true })
                }
              >
                <SelectTrigger id="nb_levels">
                  <SelectValue placeholder="Selectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} niveau{n > 1 ? "x" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avg_ceiling_height">Hauteur sous plafond (m)</Label>
              <Input
                id="avg_ceiling_height"
                type="number"
                step="0.1"
                min={1.5}
                max={6}
                placeholder="Ex: 2.5"
                {...form.register("avg_ceiling_height", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_temperature">Temperature cible (C)</Label>
              <Input
                id="target_temperature"
                type="number"
                min={15}
                max={25}
                placeholder="19"
                {...form.register("target_temperature", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Dynamic levels with emitters */}
          {nbLevels && nbLevels > 0 && (
            <div className="space-y-4 mt-4">
              <Label className="text-base font-medium">
                Emetteurs par niveau
              </Label>
              {emittersConfig.map((config) => (
                <LevelEmittersSection
                  key={config.level}
                  level={config.level}
                  selectedEmitters={config.emitters}
                  onChange={(emitters) =>
                    handleEmitterChange(config.level, emitters)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Card: Enveloppe */}
        <div className="space-y-6 border rounded-lg p-6">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Enveloppe</h3>
          </div>

          {/* Combles */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-medium">Combles</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="attic_type">Type de combles</Label>
                <Select
                  value={form.watch("attic_type") ?? ""}
                  onValueChange={(v) =>
                    form.setValue("attic_type", v as "PERDUS" | "HABITES", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="attic_type">
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ATTIC_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_attic_isolated">Isoles ?</Label>
                <Select
                  value={
                    isAtticIsolated === undefined
                      ? ""
                      : isAtticIsolated
                      ? "oui"
                      : "non"
                  }
                  onValueChange={(v) =>
                    form.setValue("is_attic_isolated", v === "oui", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="is_attic_isolated">
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oui">Oui</SelectItem>
                    <SelectItem value="non">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAtticIsolated && (
                <div className="space-y-2">
                  <Label htmlFor="attic_isolation_year">Annee d'isolation</Label>
                  <Input
                    id="attic_isolation_year"
                    type="number"
                    min={1900}
                    max={2030}
                    placeholder="Ex: 2015"
                    {...form.register("attic_isolation_year", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Plancher bas */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-medium">Plancher bas</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="floor_type">Type de plancher</Label>
                <Select
                  value={form.watch("floor_type") ?? ""}
                  onValueChange={(v) =>
                    form.setValue(
                      "floor_type",
                      v as "CAVE" | "VIDE_SANITAIRE" | "TERRE_PLEIN",
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger id="floor_type">
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FLOOR_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_floor_isolated">Isole ?</Label>
                <Select
                  value={
                    isFloorIsolated === undefined
                      ? ""
                      : isFloorIsolated
                      ? "oui"
                      : "non"
                  }
                  onValueChange={(v) =>
                    form.setValue("is_floor_isolated", v === "oui", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="is_floor_isolated">
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oui">Oui</SelectItem>
                    <SelectItem value="non">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isFloorIsolated && (
                <div className="space-y-2">
                  <Label htmlFor="floor_isolation_year">Annee d'isolation</Label>
                  <Input
                    id="floor_isolation_year"
                    type="number"
                    min={1900}
                    max={2030}
                    placeholder="Ex: 2015"
                    {...form.register("floor_isolation_year", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Murs */}
          <div className="space-y-4">
            <h4 className="font-medium">Murs</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wall_isolation_type">Type d'isolation</Label>
                <Select
                  value={wallIsolationType ?? ""}
                  onValueChange={(v) =>
                    form.setValue(
                      "wall_isolation_type",
                      v as "AUCUNE" | "INTERIEUR" | "EXTERIEUR" | "DOUBLE",
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger id="wall_isolation_type">
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WALL_ISOLATION_TYPE_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {(wallIsolationType === "INTERIEUR" ||
                wallIsolationType === "DOUBLE") && (
                <div className="space-y-2">
                  <Label htmlFor="wall_isolation_year_interior">
                    Annee isolation interieure
                  </Label>
                  <Input
                    id="wall_isolation_year_interior"
                    type="number"
                    min={1900}
                    max={2030}
                    placeholder="Ex: 2015"
                    {...form.register("wall_isolation_year_interior", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              )}

              {wallIsolationType === "EXTERIEUR" && (
                <div className="space-y-2">
                  <Label htmlFor="wall_isolation_year_exterior">
                    Annee isolation exterieure
                  </Label>
                  <Input
                    id="wall_isolation_year_exterior"
                    type="number"
                    min={1900}
                    max={2030}
                    placeholder="Ex: 2015"
                    {...form.register("wall_isolation_year_exterior", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              )}

              {wallIsolationType === "DOUBLE" && (
                <>
                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox
                      id="wall_same_year"
                      checked={wallSameYear}
                      onCheckedChange={(checked) =>
                        form.setValue("wall_same_year", checked === true)
                      }
                    />
                    <Label
                      htmlFor="wall_same_year"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Meme annee pour les deux isolations
                    </Label>
                  </div>

                  {!wallSameYear && (
                    <div className="space-y-2">
                      <Label htmlFor="wall_isolation_year_exterior">
                        Annee isolation exterieure
                      </Label>
                      <Input
                        id="wall_isolation_year_exterior"
                        type="number"
                        min={1900}
                        max={2030}
                        placeholder="Ex: 2015"
                        {...form.register("wall_isolation_year_exterior", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card: Menuiseries */}
        <div className="space-y-4 border rounded-lg p-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Menuiseries</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joinery_type">Type de vitrages</Label>
            <Select
              value={form.watch("joinery_type") ?? ""}
              onValueChange={(v) =>
                form.setValue(
                  "joinery_type",
                  v as "SIMPLE" | "DOUBLE_OLD" | "DOUBLE_RECENT",
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger id="joinery_type" className="max-w-md">
                <SelectValue placeholder="Selectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(JOINERY_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isValidating}
          >
            Precedent
          </Button>
          <Button
            type="button"
            onClick={handleValidateFolder}
            disabled={isValidating || form.formState.isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creation du dossier...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider le dossier
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
