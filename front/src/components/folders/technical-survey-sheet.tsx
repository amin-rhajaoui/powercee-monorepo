"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Camera,
  CheckCircle2,
  Home,
  Building2,
  Wrench,
  Zap,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTechnicalSurvey,
  updateTechnicalSurvey,
  type TechnicalSurvey,
} from "@/lib/api/technical-surveys";
import {
  technicalSurveyDraftSchema,
  technicalSurveyCompleteSchema,
  type TechnicalSurveyDraftValues,
  type TechnicalSurveyCompleteValues,
} from "@/lib/schemas/technical-survey";
import { ImageUpload } from "@/components/upload/image-upload";
import { api } from "@/lib/api";

// ============================================================================
// Helper function to upload file to S3
// ============================================================================

async function uploadFileToS3(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/upload", formData);
  const data = await response.json();
  return data.url;
}

// ============================================================================
// Props
// ============================================================================

type TechnicalSurveySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  onSurveyUpdate?: (survey: TechnicalSurvey) => void;
};

// ============================================================================
// Component
// ============================================================================

export function TechnicalSurveySheet({
  open,
  onOpenChange,
  folderId,
  onSurveyUpdate,
}: TechnicalSurveySheetProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingData, setExistingData] = useState<TechnicalSurvey | null>(null);

  // Store files locally before upload
  const [pendingFiles, setPendingFiles] = useState<{
    photo_house?: File | null;
    photo_facade?: File | null;
    photo_old_system?: File | null;
    photo_electric_panel?: File | null;
    photo_linky?: File | null;
    photo_breaker?: File | null;
  }>({});

  const form = useForm<TechnicalSurveyDraftValues>({
    resolver: zodResolver(technicalSurveyDraftSchema),
    defaultValues: {
      photo_house: null,
      photo_facade: null,
      photo_old_system: null,
      photo_electric_panel: null,
      has_linky: null,
      photo_linky: null,
      photo_breaker: null,
    },
  });

  // Watch has_linky to conditionally show fields
  const hasLinky = form.watch("has_linky");

  // Charger les données existantes
  useEffect(() => {
    if (open && folderId) {
      loadSurvey();
    }
  }, [open, folderId]);

  const loadSurvey = async () => {
    setLoading(true);
    try {
      const data = await getTechnicalSurvey(folderId);
      setExistingData(data);
      form.reset({
        photo_house: data.photo_house,
        photo_facade: data.photo_facade,
        photo_old_system: data.photo_old_system,
        photo_electric_panel: data.photo_electric_panel,
        has_linky: data.has_linky,
        photo_linky: data.photo_linky,
        photo_breaker: data.photo_breaker,
      });
      // Reset pending files
      setPendingFiles({});
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement des photos techniques.");
    } finally {
      setLoading(false);
    }
  };

  // Upload pending files and return URLs
  const uploadPendingFiles = async (): Promise<Partial<TechnicalSurveyDraftValues>> => {
    const updates: Partial<TechnicalSurveyDraftValues> = {};

    if (pendingFiles.photo_house) {
      updates.photo_house = await uploadFileToS3(pendingFiles.photo_house);
    }
    if (pendingFiles.photo_facade) {
      updates.photo_facade = await uploadFileToS3(pendingFiles.photo_facade);
    }
    if (pendingFiles.photo_old_system) {
      updates.photo_old_system = await uploadFileToS3(pendingFiles.photo_old_system);
    }
    if (pendingFiles.photo_electric_panel) {
      updates.photo_electric_panel = await uploadFileToS3(pendingFiles.photo_electric_panel);
    }
    if (pendingFiles.photo_linky) {
      updates.photo_linky = await uploadFileToS3(pendingFiles.photo_linky);
    }
    if (pendingFiles.photo_breaker) {
      updates.photo_breaker = await uploadFileToS3(pendingFiles.photo_breaker);
    }

    return updates;
  };

  const onSubmitDraft = async (values: TechnicalSurveyDraftValues) => {
    setSaving(true);
    try {
      // Upload pending files first
      const uploadedUrls = await uploadPendingFiles();

      // Merge with form values (uploaded URLs take precedence)
      const payload = {
        ...values,
        ...uploadedUrls,
      };

      const result = await updateTechnicalSurvey(folderId, payload);
      setExistingData(result);
      setPendingFiles({});
      if (onSurveyUpdate) {
        onSurveyUpdate(result);
      }
      toast.success("Photos techniques enregistrées comme brouillon.");
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmitComplete = async () => {
    setSaving(true);
    try {
      // Upload pending files first
      const uploadedUrls = await uploadPendingFiles();

      // Merge with form values (uploaded URLs take precedence)
      const values = form.getValues();
      const payload = {
        ...values,
        ...uploadedUrls,
      };

      // Validate with complete schema AFTER uploading files
      const validationResult = technicalSurveyCompleteSchema.safeParse(payload);

      if (!validationResult.success) {
        // Show first error
        const firstError = validationResult.error.issues[0];
        if (firstError) {
          const fieldPath = firstError.path[0] as keyof TechnicalSurveyDraftValues;
          form.setError(fieldPath, {
            message: firstError.message,
          });
          toast.error(firstError.message);
        } else {
          toast.error("Veuillez remplir tous les champs requis.");
        }
        setSaving(false);
        return;
      }

      const result = await updateTechnicalSurvey(folderId, payload);
      setExistingData(result);
      setPendingFiles({});
      if (onSurveyUpdate) {
        onSurveyUpdate(result);
      }
      toast.success("Photos techniques enregistrées avec succès.");
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto px-6"
      >
        <SheetHeader className="pb-4 px-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">Photos de Visite Technique</SheetTitle>
              <SheetDescription>
                Checklist des photos requises pour le dossier
              </SheetDescription>
            </div>
          </div>
          {existingData && (
            <Badge variant="secondary" className="w-fit mt-2">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Dernière mise à jour :{" "}
              {new Date(existingData.updated_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Badge>
          )}
        </SheetHeader>

        <Separator className="my-4" />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitDraft)} className="space-y-6 px-0">
              {/* Grid 2x2 pour les 4 photos standard */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="photo_house"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Photo du logement
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={(url) => {
                            field.onChange(url || null);
                            // Clear pending file if URL is set
                            if (url) {
                              setPendingFiles((prev) => ({ ...prev, photo_house: null }));
                            }
                          }}
                          onFileChange={(file) => {
                            setPendingFiles((prev) => ({ ...prev, photo_house: file || null }));
                            // Clear URL if file is removed
                            if (!file) {
                              field.onChange(null);
                            }
                          }}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo_facade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Photo de la façade
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={(url) => {
                            field.onChange(url || null);
                            if (url) {
                              setPendingFiles((prev) => ({ ...prev, photo_facade: null }));
                            }
                          }}
                          onFileChange={(file) => {
                            setPendingFiles((prev) => ({ ...prev, photo_facade: file || null }));
                            if (!file) {
                              field.onChange(null);
                            }
                          }}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo_old_system"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Photo de l'ancien système
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={(url) => {
                            field.onChange(url || null);
                            if (url) {
                              setPendingFiles((prev) => ({ ...prev, photo_old_system: null }));
                            }
                          }}
                          onFileChange={(file) => {
                            setPendingFiles((prev) => ({ ...prev, photo_old_system: file || null }));
                            if (!file) {
                              field.onChange(null);
                            }
                          }}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo_electric_panel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Photo du tableau électrique
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={(url) => {
                            field.onChange(url || null);
                            if (url) {
                              setPendingFiles((prev) => ({ ...prev, photo_electric_panel: null }));
                            }
                          }}
                          onFileChange={(file) => {
                            setPendingFiles((prev) => ({ ...prev, photo_electric_panel: file || null }));
                            if (!file) {
                              field.onChange(null);
                            }
                          }}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* RadioGroup pour has_linky */}
              <FormField
                control={form.control}
                name="has_linky"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Le logement a-t-il un compteur Linky ?
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value === null ? undefined : field.value ? "yes" : "no"}
                        onValueChange={(value) => {
                          if (value === "yes") {
                            field.onChange(true);
                            // Clear photo_breaker if switching to Linky
                            form.setValue("photo_breaker", null);
                            setPendingFiles((prev) => ({ ...prev, photo_breaker: null }));
                          } else if (value === "no") {
                            field.onChange(false);
                            // Clear photo_linky if switching to breaker
                            form.setValue("photo_linky", null);
                            setPendingFiles((prev) => ({ ...prev, photo_linky: null }));
                          }
                        }}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="linky-yes" />
                          <Label htmlFor="linky-yes" className="cursor-pointer">
                            Oui
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="linky-no" />
                          <Label htmlFor="linky-no" className="cursor-pointer">
                            Non
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Affichage conditionnel : photo_linky ou photo_breaker */}
              {hasLinky === true && (
                <FormField
                  control={form.control}
                  name="photo_linky"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Power className="h-4 w-4" />
                        Photo du compteur Linky
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={(url) => {
                            field.onChange(url || null);
                            if (url) {
                              setPendingFiles((prev) => ({ ...prev, photo_linky: null }));
                            }
                          }}
                          onFileChange={(file) => {
                            setPendingFiles((prev) => ({ ...prev, photo_linky: file || null }));
                            if (!file) {
                              field.onChange(null);
                            }
                          }}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormDescription>
                        Photo du compteur Linky (obligatoire si compteur Linky présent)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {hasLinky === false && (
                <FormField
                  control={form.control}
                  name="photo_breaker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Power className="h-4 w-4" />
                        Photo du disjoncteur
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={(url) => {
                            field.onChange(url || null);
                            if (url) {
                              setPendingFiles((prev) => ({ ...prev, photo_breaker: null }));
                            }
                          }}
                          onFileChange={(file) => {
                            setPendingFiles((prev) => ({ ...prev, photo_breaker: file || null }));
                            if (!file) {
                              field.onChange(null);
                            }
                          }}
                          disabled={saving}
                        />
                      </FormControl>
                      <FormDescription>
                        Photo du disjoncteur (obligatoire si pas de compteur Linky)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <SheetFooter className="gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={form.handleSubmit(onSubmitDraft)}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer comme brouillon
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={onSubmitComplete}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
