"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Palette, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/upload/image-upload";
import { api } from "@/lib/api";

const brandingSchema = z.object({
  logo_url: z.string().optional().nullable(),
  primary_color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Couleur invalide"),
  secondary_color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Couleur invalide"),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function BrandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo_url: "",
      primary_color: "#000000",
      secondary_color: "#ffffff",
    },
  });

  const { watch } = form;
  const watchedValues = watch();

  useEffect(() => {
    async function loadTenantData() {
      try {
        const response = await api.get("tenants/me/branding"); // On utilise cet endpoint pour tester, mais on pourrait avoir un /me plus complet
        const data = await response.json();
        setTenantName(data.name);
        form.reset({
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || "#000000",
          secondary_color: data.secondary_color || "#ffffff",
        });
      } catch (error) {
        // Si l'endpoint me/branding n'existe pas encore (GET), on pourrait échouer ici.
        // Pour l'instant on ignore l'erreur pour permettre le développement UI.
        console.error("Failed to load tenant data", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTenantData();
  }, [form]);

  async function onSubmit(values: BrandingFormValues) {
    setIsSaving(true);
    try {
      // Toujours envoyer via FormData pour que l'endpoint puisse gérer le fichier optionnel
      const formData = new FormData();
      
      // Ajouter le fichier logo si présent
      if (logoFile) {
        formData.append("logo_file", logoFile);
      }
      
      // Toujours envoyer les couleurs
      formData.append("primary_color", values.primary_color);
      formData.append("secondary_color", values.secondary_color);
      
      const response = await api.put("tenants/me/branding", formData);
      const data = await response.json();
      
      // Mettre à jour le logo_url dans le formulaire avec la nouvelle URL si un fichier a été uploadé
      if (logoFile && data.logo_url) {
        form.setValue("logo_url", data.logo_url);
        setLogoFile(null);
      }
      
      toast.success("Branding mis à jour avec succès.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Personnalisation</h1>
        <p className="text-muted-foreground">
          Gérez l'identité visuelle de votre entreprise {tenantName && <strong>({tenantName})</strong>}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Identité Visuelle
            </CardTitle>
            <CardDescription>
              Configurez votre logo et vos couleurs d'interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo de l'entreprise</FormLabel>
                      <FormControl>
                        <ImageUpload 
                          value={field.value || ""} 
                          onChange={field.onChange}
                          onFileChange={setLogoFile}
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormDescription>
                        Format conseillé : PNG ou SVG (fond transparent). Le logo sera uploadé lors de l'enregistrement.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur Primaire</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              className="w-12 h-10 p-1"
                              {...field} 
                            />
                            <Input 
                              type="text" 
                              className="font-mono"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur Secondaire</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              className="w-12 h-10 p-1"
                              {...field} 
                            />
                            <Input 
                              type="text" 
                              className="font-mono"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer les modifications
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Aperçu en direct</CardTitle>
            <CardDescription>
              Visualisez comment vos couleurs s'appliqueront à l'interface.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border rounded-lg overflow-hidden bg-background">
              {/* Fake Header */}
              <div 
                className="h-14 px-4 flex items-center justify-between border-b"
                style={{ borderBottomColor: `${watchedValues.primary_color}20` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 relative">
                    {watchedValues.logo_url ? (
                      <img src={watchedValues.logo_url} alt="Logo preview" className="object-contain w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">Logo</div>
                    )}
                  </div>
                  <span className="font-semibold text-sm">PowerCEE</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full bg-muted" />
                  <div className="w-4 h-4 rounded-full bg-muted" />
                </div>
              </div>

              {/* Fake Content */}
              <div className="p-6 space-y-4 bg-muted/30">
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-3/4 bg-muted/50 rounded" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 bg-background border-none shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded" style={{ backgroundColor: `${watchedValues.primary_color}15` }}>
                        <ShieldCheck className="w-4 h-4" style={{ color: watchedValues.primary_color }} />
                      </div>
                      <div className="h-2.5 w-12 bg-muted rounded" />
                    </div>
                    <div className="h-3.5 w-8 bg-muted rounded" />
                  </Card>
                  
                  <Card className="p-3 bg-background border-none shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded" style={{ backgroundColor: `${watchedValues.secondary_color}15` }}>
                        <Palette className="w-4 h-4" style={{ color: watchedValues.secondary_color }} />
                      </div>
                      <div className="h-2.5 w-12 bg-muted rounded" />
                    </div>
                    <div className="h-3.5 w-8 bg-muted rounded" />
                  </Card>
                </div>

                <div className="pt-2">
                  <Button 
                    className="w-full text-xs h-9"
                    style={{ 
                      backgroundColor: watchedValues.primary_color,
                      color: getContrastColor(watchedValues.primary_color)
                    }}
                  >
                    Bouton Action
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Note : Les couleurs sont appliquées en temps réel ici, mais ne seront définitives qu'après enregistrement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper simple pour déterminer la couleur du texte (noir ou blanc) selon la luminosité
function getContrastColor(hexcolor: string) {
  // Supprimer le #
  const hex = hexcolor.replace("#", "");
  
  // Convertir en RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Formule de luminosité YIQ
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return (yiq >= 128) ? 'black' : 'white';
}

