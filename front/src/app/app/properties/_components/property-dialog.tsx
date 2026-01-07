"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Property, createProperty, updateProperty } from "@/lib/api/properties";
import { listClients, Client, ClientType } from "@/lib/api/clients";
import { searchAddress, searchAddressSuggestions, type GeocodingResult } from "@/lib/geocoding";
import { mergeRefs } from "@/lib/utils";
import { getPropertyLabels } from "@/lib/property-labels";
import {
  propertyCreateSchema,
  PropertyFormValues,
  propertyTypeOptions,
} from "../_schemas";

// Import dynamique du composant Map pour éviter les erreurs SSR (Leaflet utilise window)
const LocationPickerMap = dynamic(
  () => import("@/components/maps/location-picker-map").then((mod) => ({ default: mod.LocationPickerMap })),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-md" />,
  }
);

type DialogState = "form" | "submitting" | "success";

type PropertyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  property?: Property | null;
  clientId?: string | null;
  clientType?: ClientType | null;
};

const defaultValues: PropertyFormValues = {
  client_id: "",
  label: "",
  type: "AUTRE",
  address: "",
  latitude: 48.8566,
  longitude: 2.3522,
  postal_code: "",
  city: "",
  country: "France",
  surface_m2: undefined,
  construction_year: undefined,
  notes: "",
};

export function PropertyDialog({ open, onOpenChange, onSuccess, property, clientId, clientType }: PropertyDialogProps) {
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [createdPropertyLabel, setCreatedPropertyLabel] = useState("");
  const [selectedClientType, setSelectedClientType] = useState<ClientType | null>(clientType || null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Labels dynamiques basés sur le type de client
  const labels = useMemo(() => {
    const type = selectedClientType || clientType || "PARTICULIER";
    return getPropertyLabels(type);
  }, [selectedClientType, clientType]);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyCreateSchema),
    defaultValues,
    mode: "onChange",
  });

  // Charger la liste des clients pour permettre l'affichage du nom du client sélectionné
  useEffect(() => {
    async function loadClients() {
      setIsLoadingClients(true);
      try {
        const data = await listClients({ page: 1, pageSize: 100, status: "ACTIF" });
        setClients(data.items);
      } catch (error) {
        console.error("Erreur lors du chargement des clients:", error);
      } finally {
        setIsLoadingClients(false);
      }
    }
    if (open) {
      loadClients();
    }
  }, [open]);

  // Réinitialiser l'état quand le dialog s'ouvre/ferme
  useEffect(() => {
    if (property) {
      form.reset({
        client_id: property.client_id,
        label: property.label,
        type: property.type,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        postal_code: property.postal_code || "",
        city: property.city || "",
        country: property.country || "France",
        surface_m2: property.surface_m2 || undefined,
        construction_year: property.construction_year || undefined,
        notes: property.notes || "",
      });
    } else {
      form.reset({
        ...defaultValues,
        client_id: clientId || "",
      });
    }
    setDialogState("form");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSelectedClientType(clientType || null);
  }, [property, clientId, clientType, form, open]);

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

  // Mettre à jour selectedClientType quand on change de client dans le dropdown
  const handleClientChange = (newClientId: string) => {
    form.setValue("client_id", newClientId);
    const selectedClient = clients.find((c) => c.id === newClientId);
    if (selectedClient) {
      setSelectedClientType(selectedClient.type);
    }
  };

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

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadSuggestions(value);
    }, 300);

    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    form.setValue("address", suggestion.label);
    form.setValue("latitude", suggestion.latitude);
    form.setValue("longitude", suggestion.longitude);
    if (suggestion.postal_code) {
      form.setValue("postal_code", suggestion.postal_code);
    }
    if (suggestion.city) {
      form.setValue("city", suggestion.city);
    }
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    toast.success("Adresse localisee sur la carte.");
  };

  const handleAddressFocus = () => {
    const address = form.getValues("address");
    if (suggestions.length > 0 && address.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleAddressBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);

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
      if (result.postal_code) {
        form.setValue("postal_code", result.postal_code);
      }
      if (result.city) {
        form.setValue("city", result.city);
      }
      toast.success("Adresse localisee sur la carte.");
    } else {
      toast.error("Adresse introuvable. Verifiez votre saisie.");
    }
    setIsGeocoding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
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

  const handleSearchAddress = async () => {
    const address = form.getValues("address");
    if (!address || address.length < 3) {
      toast.error("Veuillez saisir une adresse (minimum 3 caracteres).");
      return;
    }
    setIsGeocoding(true);
    const result = await searchAddress(address);
    if (result) {
      form.setValue("latitude", result.latitude);
      form.setValue("longitude", result.longitude);
      form.setValue("address", result.label);
      if (result.postal_code) {
        form.setValue("postal_code", result.postal_code);
      }
      if (result.city) {
        form.setValue("city", result.city);
      }
      toast.success("Adresse localisee sur la carte.");
    } else {
      toast.error("Adresse introuvable. Verifiez votre saisie.");
    }
    setIsGeocoding(false);
  };

  const onSubmit = async (values: PropertyFormValues) => {
    setDialogState("submitting");
    try {
      if (property) {
        await updateProperty(property.id, values);
        toast.success(labels.updatedToast);
        onSuccess();
        onOpenChange(false);
      } else {
        const payload = {
          ...values,
          type: values.type ?? "AUTRE",
        };
        await createProperty(payload);
        setCreatedPropertyLabel(values.label);
        setDialogState("success");
        onSuccess();
      }
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string }; message?: string };
      const message = err?.data?.detail || err?.message || `Erreur lors de l'enregistrement du ${labels.singular}.`;
      toast.error(message);
      setDialogState("form");
    }
  };

  const handleAddAnother = () => {
    form.reset({
      ...defaultValues,
      client_id: clientId || form.getValues("client_id"),
    });
    setDialogState("form");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFinish = () => {
    onOpenChange(false);
  };

  const watchedLat = form.watch("latitude");
  const watchedLng = form.watch("longitude");

  // État succès
  if (dialogState === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
          <div className="flex flex-col items-center text-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl mb-2">
              {labels.singularCapitalized} ajoute avec succes !
            </DialogTitle>
            <DialogDescription className="mb-6">
              <span className="font-medium text-foreground">{createdPropertyLabel}</span> a ete cree et associe au client.
            </DialogDescription>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={handleAddAnother}>
                <Plus className="mr-2 h-4 w-4" />
                En ajouter un autre
              </Button>
              <Button className="flex-1" onClick={handleFinish}>
                <Check className="mr-2 h-4 w-4" />
                Terminer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isSubmitting = dialogState === "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? labels.editTitle : labels.newTitle}</DialogTitle>
          <DialogDescription>
            Remplissez les informations du {labels.singular}. L&apos;adresse sera geocodee automatiquement.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={handleClientChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger disabled={!!clientId || isLoadingClients}>
                        <SelectValue placeholder={isLoadingClients ? "Chargement..." : "Selectionner un client"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => {
                        const displayName =
                          client.type === "PROFESSIONNEL"
                            ? client.company_name
                            : [client.first_name, client.last_name].filter(Boolean).join(" ");
                        return (
                          <SelectItem key={client.id} value={client.id}>
                            {displayName || client.email}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label / Nom</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedClientType === "PROFESSIONNEL"
                          ? "Ex: Siege social, Site Lyon"
                          : "Ex: Maison principale, Appartement Paris"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {propertyTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <FormLabel>Adresse complete</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          ref={mergeRefs(inputRef, fieldRef)}
                          placeholder="Ex: 10 rue de la Paix, 75002 Paris"
                          {...fieldProps}
                          onChange={(e) => {
                            field.onChange(e);
                            handleAddressChange(e.target.value);
                          }}
                          onFocus={handleAddressFocus}
                          onBlur={handleAddressBlur}
                          onKeyDown={handleKeyDown}
                          className="pr-20"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {isGeocoding || isLoadingSuggestions ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Search className="w-4 h-4 text-muted-foreground" />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleSearchAddress}
                                className="h-6 px-2 text-xs"
                              >
                                Rechercher
                              </Button>
                            </>
                          )}
                        </div>

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
              <LocationPickerMap
                lat={watchedLat}
                lng={watchedLng}
                onPositionChange={(lat, lng) => {
                  form.setValue("latitude", lat);
                  form.setValue("longitude", lng);
                }}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Cliquez ou deplacez le marqueur pour ajuster la position.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input placeholder="75002" readOnly {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Paris" readOnly {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pays</FormLabel>
                  <FormControl>
                    <Input placeholder="France" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="surface_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface (m2)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="100"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(isNaN(value as number) ? undefined : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="construction_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annee de construction</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2020"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                          field.onChange(isNaN(value as number) ? undefined : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes libres..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || isGeocoding}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {property ? "Mettre à jour" : `Créer l'${labels.singular}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
