"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Palette } from "lucide-react";

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

      <div className="max-w-2xl">
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
      </div>
    </div>
  );
}

