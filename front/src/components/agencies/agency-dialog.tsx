"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { searchAddress } from "@/lib/geocoding";

// Import dynamique du composant Map pour éviter les erreurs SSR
const AgencyMap = dynamic(() => import("@/components/maps/agency-map"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-md" />,
});

const agencySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  address: z.string().min(5, "L'adresse est requise"),
  latitude: z.number(),
  longitude: z.number(),
  is_active: z.boolean(),
});

type AgencyFormValues = z.infer<typeof agencySchema>;

interface AgencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  agency?: any; // Pour l'édition
}

export function AgencyDialog({ open, onOpenChange, onSuccess, agency }: AgencyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: "",
      address: "",
      latitude: 48.8566, // Paris par défaut
      longitude: 2.3522,
      is_active: true,
    },
  });

  useEffect(() => {
    if (agency) {
      form.reset({
        name: agency.name,
        address: agency.address || "",
        latitude: agency.latitude || 48.8566,
        longitude: agency.longitude || 2.3522,
        is_active: agency.is_active,
      });
    } else {
      form.reset({
        name: "",
        address: "",
        latitude: 48.8566,
        longitude: 2.3522,
        is_active: true,
      });
    }
  }, [agency, form, open]);

  const handleAddressBlur = async () => {
    const address = form.getValues("address");
    if (!address || address.length < 5) return;

    setIsGeocoding(true);
    const result = await searchAddress(address);
    if (result) {
      form.setValue("latitude", result.latitude);
      form.setValue("longitude", result.longitude);
      form.setValue("address", result.label);
      toast.success("Adresse localisée sur la carte.");
    }
    setIsGeocoding(false);
  };

  async function onSubmit(values: AgencyFormValues) {
    setIsSubmitting(true);
    try {
      if (agency) {
        await api.put(`agencies/${agency.id}`, values);
        toast.success("Agence mise à jour avec succès.");
      } else {
        await api.post("agencies", values);
        toast.success("Agence créée avec succès.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{agency ? "Modifier l'agence" : "Ajouter une agence"}</DialogTitle>
          <DialogDescription>
            Remplissez les informations de l'agence. L'adresse sera géocodée automatiquement.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'agence</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Agence Paris Centre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse postale</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Ex: 10 rue de la Paix, 75002 Paris" 
                        {...field} 
                        onBlur={handleAddressBlur}
                        className="pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isGeocoding ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Search className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Localisation sur la carte</FormLabel>
              <AgencyMap 
                lat={form.watch("latitude")} 
                lng={form.watch("longitude")} 
                onPositionChange={(lat, lng) => {
                  form.setValue("latitude", lat);
                  form.setValue("longitude", lng);
                }}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Vous pouvez déplacer le marqueur pour affiner la position.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || isGeocoding}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {agency ? "Enregistrer" : "Créer l'agence"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

