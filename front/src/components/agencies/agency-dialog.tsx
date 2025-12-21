"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { searchAddress, searchAddressSuggestions, type GeocodingResult } from "@/lib/geocoding";

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
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    // Réinitialiser les suggestions quand le dialog s'ouvre/ferme
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [agency, form, open]);

  // Nettoyer les timers au démontage
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const loadSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const results = await searchAddressSuggestions(query, 3);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error loading suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    form.setValue("address", value, { shouldValidate: false });
    
    // Annuler le timer précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Débounce de 300ms
    debounceTimerRef.current = setTimeout(() => {
      loadSuggestions(value);
    }, 300);

    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    form.setValue("address", suggestion.label);
    form.setValue("latitude", suggestion.latitude);
    form.setValue("longitude", suggestion.longitude);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    toast.success("Adresse sélectionnée et localisée sur la carte.");
  };

  const handleAddressFocus = () => {
    const address = form.getValues("address");
    if (suggestions.length > 0 && address.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleAddressBlur = () => {
    // Délai pour permettre le clic sur les suggestions
    blurTimerRef.current = setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      
      // Ancien comportement : géocoder si aucune suggestion n'a été sélectionnée
      const address = form.getValues("address");
      if (address && address.length >= 5 && suggestions.length === 0) {
        handleAddressBlurGeocode(address);
      }
    }, 200);
  };

  const handleAddressBlurGeocode = async (address: string) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectSuggestion(suggestions[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
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
              render={({ field }) => {
                const { ref: fieldRef, ...fieldProps } = field;
                return (
                  <FormItem>
                    <FormLabel>Adresse postale</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          ref={(e) => {
                            inputRef.current = e;
                            if (typeof fieldRef === "function") {
                              fieldRef(e);
                            } else if (fieldRef) {
                              fieldRef.current = e;
                            }
                          }}
                          placeholder="Ex: 10 rue de la Paix, 75002 Paris" 
                          {...fieldProps}
                          onChange={(e) => {
                            field.onChange(e);
                            handleAddressChange(e.target.value);
                          }}
                          onFocus={handleAddressFocus}
                          onBlur={handleAddressBlur}
                          onKeyDown={handleKeyDown}
                          className="pr-10"
                        />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isGeocoding || isLoadingSuggestions ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Search className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Liste des suggestions */}
                      {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) && (
                        <div
                          ref={suggestionsRef}
                          className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {isLoadingSuggestions ? (
                            <div className="p-3 text-sm text-muted-foreground flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Recherche en cours...
                            </div>
                          ) : (
                            suggestions.map((suggestion, index) => (
                              <button
                                key={`${suggestion.label}-${index}`}
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                                  index === selectedIndex ? "bg-accent text-accent-foreground" : ""
                                }`}
                                onClick={() => {
                                  // Annuler le blur timer si présent
                                  if (blurTimerRef.current) {
                                    clearTimeout(blurTimerRef.current);
                                  }
                                  handleSelectSuggestion(suggestion);
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{suggestion.label}</span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                );
              }}
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

