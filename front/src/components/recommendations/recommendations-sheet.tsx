"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  MapPin,
  Home,
  Thermometer,
  ShieldAlert,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecommendation,
  saveRecommendation,
  type InstallationRecommendation,
} from "@/lib/api/recommendations";
import { MultiImageUpload } from "./multi-image-upload";

// ============================================================================
// Zod Schema
// ============================================================================

const recommendationsSchema = z.object({
  access_recommendations: z.string().max(5000).nullable().optional(),
  indoor_unit_recommendations: z.string().max(5000).nullable().optional(),
  outdoor_unit_recommendations: z.string().max(5000).nullable().optional(),
  safety_recommendations: z.string().max(5000).nullable().optional(),
  photo_urls: z.array(z.string().url()).max(20).nullable().optional(),
});

type RecommendationsFormValues = z.infer<typeof recommendationsSchema>;

// ============================================================================
// Props
// ============================================================================

type RecommendationsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  onRecommendationUpdate?: (recommendation: InstallationRecommendation) => void;
};

// ============================================================================
// Component
// ============================================================================

export function RecommendationsSheet({
  open,
  onOpenChange,
  folderId,
  onRecommendationUpdate,
}: RecommendationsSheetProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingData, setExistingData] = useState<InstallationRecommendation | null>(null);

  const form = useForm<RecommendationsFormValues>({
    resolver: zodResolver(recommendationsSchema),
    defaultValues: {
      access_recommendations: "",
      indoor_unit_recommendations: "",
      outdoor_unit_recommendations: "",
      safety_recommendations: "",
      photo_urls: [],
    },
  });

  // Charger les donnees existantes
  useEffect(() => {
    if (open && folderId) {
      loadRecommendations();
    }
  }, [open, folderId]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await getRecommendation(folderId);
      setExistingData(data);
      if (data) {
        form.reset({
          access_recommendations: data.access_recommendations || "",
          indoor_unit_recommendations: data.indoor_unit_recommendations || "",
          outdoor_unit_recommendations: data.outdoor_unit_recommendations || "",
          safety_recommendations: data.safety_recommendations || "",
          photo_urls: data.photo_urls || [],
        });
      } else {
        form.reset({
          access_recommendations: "",
          indoor_unit_recommendations: "",
          outdoor_unit_recommendations: "",
          safety_recommendations: "",
          photo_urls: [],
        });
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement des preconisations.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: RecommendationsFormValues) => {
    setSaving(true);
    try {
      const result = await saveRecommendation(folderId, {
        access_recommendations: values.access_recommendations || null,
        indoor_unit_recommendations: values.indoor_unit_recommendations || null,
        outdoor_unit_recommendations: values.outdoor_unit_recommendations || null,
        safety_recommendations: values.safety_recommendations || null,
        photo_urls: values.photo_urls || null,
      });
      setExistingData(result);
      // Notifier le parent de la mise à jour
      if (onRecommendationUpdate) {
        onRecommendationUpdate(result);
      }
      toast.success("Preconisations enregistrees avec succes.");
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // Verifier si le formulaire a des donnees
  const hasData =
    form.watch("access_recommendations") ||
    form.watch("indoor_unit_recommendations") ||
    form.watch("outdoor_unit_recommendations") ||
    form.watch("safety_recommendations") ||
    (form.watch("photo_urls")?.length ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto px-6"
      >
        <SheetHeader className="pb-4 px-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">Preconisations Poseur</SheetTitle>
              <SheetDescription>
                Instructions specifiques pour l'installateur
              </SheetDescription>
            </div>
          </div>
          {existingData && (
            <Badge variant="secondary" className="w-fit mt-2">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Derniere mise a jour :{" "}
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-0">
              <Accordion
                type="multiple"
                defaultValue={["access", "indoor", "outdoor", "safety", "photos"]}
                className="w-full"
              >
                {/* Section 1: Acces */}
                <AccordionItem value="access">
                  <AccordionTrigger className="text-base">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span>Acces au chantier</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <FormField
                      control={form.control}
                      name="access_recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preconisations d'acces</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Digicode 1234A, interphone Martin, parking visiteur disponible, RDV a 8h devant le portail..."
                              className="min-h-[100px] resize-y"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Informations pour acceder au site (digicode, etage,
                            stationnement, horaires...)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 2: Unite Interieure */}
                <AccordionItem value="indoor">
                  <AccordionTrigger className="text-base">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-500" />
                      <span>Unite Interieure</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <FormField
                      control={form.control}
                      name="indoor_unit_recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installation Unite Interieure</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Emplacement prevu dans le cellier, prevoir fixation murale, passage de gaine par le faux-plafond..."
                              className="min-h-[100px] resize-y"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Emplacement, contraintes d'installation, raccordements...
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 3: Unite Exterieure */}
                <AccordionItem value="outdoor">
                  <AccordionTrigger className="text-base">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span>Unite Exterieure</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <FormField
                      control={form.control}
                      name="outdoor_unit_recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installation Unite Exterieure</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Dalle beton a prevoir (60x80cm), distance mini 3m de la limite voisin, evacuation des condensats vers le jardin..."
                              className="min-h-[100px] resize-y"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Dalle beton, distance voisins, evacuations, fixations...
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 4: Securite */}
                <AccordionItem value="safety">
                  <AccordionTrigger className="text-base">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      <span>Precautions / Securite</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <FormField
                      control={form.control}
                      name="safety_recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precautions generales</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Presence de plomb dans les peintures, amiante detecte dans la toiture, coupure electrique necessaire au compteur..."
                              className="min-h-[100px] resize-y"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Amiante, plomb, electricite, risques particuliers...
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 5: Photos */}
                <AccordionItem value="photos">
                  <AccordionTrigger className="text-base">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-purple-500" />
                      <span>Photos</span>
                      {(form.watch("photo_urls")?.length ?? 0) > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {form.watch("photo_urls")?.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <FormField
                      control={form.control}
                      name="photo_urls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Photos du chantier</FormLabel>
                          <FormControl>
                            <MultiImageUpload
                              value={field.value || []}
                              onChange={field.onChange}
                              disabled={saving}
                              maxImages={10}
                            />
                          </FormControl>
                          <FormDescription>
                            Photos illustrant les points importants (acces, emplacements,
                            contraintes...)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <SheetFooter className="gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
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
