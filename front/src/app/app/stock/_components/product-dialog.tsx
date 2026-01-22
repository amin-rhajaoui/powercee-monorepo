"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/upload/image-upload";
import {
  Product,
  createProduct,
  updateProduct,
  uploadProductImage,
  listProducts,
  type ProductListItem,
} from "@/lib/api/products";
import type { ApiError } from "@/lib/api";
import {
  productSchema,
  ProductFormValues,
  defaultProductValues,
  categoryOptions,
  productTypeOptions,
  powerSupplyOptions,
  moduleCodes,
  associatedThermostatNewSchema,
} from "../_schemas";

type ProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  product?: Product | null;
};

export function ProductDialog({
  open,
  onOpenChange,
  onSuccess,
  product,
}: ProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thermostats, setThermostats] = useState<ProductListItem[]>([]);
  const [isLoadingThermostats, setIsLoadingThermostats] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultProductValues,
    mode: "onChange",
  });

  const category = form.watch("category");
  const selectedModuleCodes = form.watch("module_codes") || [];
  const associatedThermostatId = form.watch("associated_thermostat_id");
  const associatedThermostatNew = form.watch("associated_thermostat_new");

  // Helpers pour l'affichage conditionnel
  const showBrandReference = category !== "LABOR";
  const showTechnicalTab = category === "HEAT_PUMP" || category === "THERMOSTAT";
  const showThermostatSection = category === "HEAT_PUMP" && selectedModuleCodes.includes("BAR-TH-171");

  // Déterminer le mode thermostat
  const thermostatMode = associatedThermostatNew ? "new" : associatedThermostatId ? "existing" : "none";

  // Auto-set product_type to LABOR when category is LABOR
  useEffect(() => {
    if (category === "LABOR") {
      form.setValue("product_type", "LABOR");
    }
  }, [category, form]);

  // Charger les thermostats existants
  useEffect(() => {
    if (showThermostatSection && open) {
      setIsLoadingThermostats(true);
      listProducts({ category: "THERMOSTAT", isActive: true, pageSize: 100 })
        .then((data) => {
          setThermostats(data.items);
        })
        .catch((err) => {
          console.error("Erreur lors du chargement des thermostats:", err);
        })
        .finally(() => {
          setIsLoadingThermostats(false);
        });
    }
  }, [showThermostatSection, open]);

  useEffect(() => {
    if (product) {
      // Le thermostat associé est le premier ID dans compatible_product_ids
      // (on suppose qu'il n'y a qu'un seul thermostat associé par PAC)
      const thermostatId = product.compatible_product_ids && product.compatible_product_ids.length > 0
        ? product.compatible_product_ids[0]
        : null;

      form.reset({
        name: product.name,
        brand: product.brand,
        reference: product.reference,
        price_ht: product.price_ht,
        category: product.category,
        product_type: product.product_type,
        module_codes: product.module_codes || [],
        image_url: product.image_url,
        description: product.description,
        is_active: product.is_active,
        heat_pump_details: product.heat_pump_details
          ? {
            etas_35: product.heat_pump_details.etas_35,
            etas_55: product.heat_pump_details.etas_55,
            power_minus_7: product.heat_pump_details.power_minus_7,
            power_minus_15: product.heat_pump_details.power_minus_15,
            power_supply: product.heat_pump_details.power_supply,
            refrigerant_type: product.heat_pump_details.refrigerant_type,
            noise_level: product.heat_pump_details.noise_level,
            is_duo: product.heat_pump_details.is_duo,
            class_regulator: product.heat_pump_details.class_regulator,
          }
          : defaultProductValues.heat_pump_details,
        thermostat_details: product.thermostat_details
          ? {
            class_rank: product.thermostat_details.class_rank,
          }
          : defaultProductValues.thermostat_details,
        compatible_product_ids: product.compatible_product_ids || [],
        associated_thermostat_id: thermostatId,
        associated_thermostat_new: null,
      });
    } else {
      form.reset(defaultProductValues);
    }
    setImageFile(null);
  }, [product, form, open]);

  const handleModuleCodeChange = (code: string, checked: boolean) => {
    const current = selectedModuleCodes;
    if (checked) {
      form.setValue("module_codes", [...current, code]);
    } else {
      form.setValue(
        "module_codes",
        current.filter((c) => c !== code)
      );
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      let savedProduct: Product;
      let thermostatId: string | null = null;

      // Si un nouveau thermostat doit être créé
      // Si un nouveau thermostat doit être créé
      if (values.associated_thermostat_new) {
        // Parse the sub-schema to ensure correct types (coercion)
        const thermostatValues = associatedThermostatNewSchema.parse(values.associated_thermostat_new);

        const newThermostat = await createProduct({
          name: thermostatValues.name,
          brand: thermostatValues.brand,
          reference: thermostatValues.reference,
          price_ht: thermostatValues.price_ht,
          category: "THERMOSTAT",
          product_type: "MATERIAL",
          is_active: true,
          thermostat_details: {
            class_rank: thermostatValues.class_rank || null,
          },
        });
        thermostatId = newThermostat.id;
      } else if (values.associated_thermostat_id) {
        thermostatId = values.associated_thermostat_id;
      }

      // Parse values to get correct types (coerce numbers, etc.)
      const parsedValues = productSchema.parse(values);

      // Préparer les compatible_product_ids
      const compatibleProductIds = thermostatId
        ? [thermostatId]
        : (parsedValues.compatible_product_ids || []);

      // Prepare payload based on category
      const payload = {
        ...parsedValues,
        // Clear brand/reference for LABOR if empty
        brand: parsedValues.category === "LABOR" ? (parsedValues.brand || null) : parsedValues.brand,
        reference: parsedValues.category === "LABOR" ? (parsedValues.reference || null) : parsedValues.reference,
        // Set product_type to LABOR for LABOR category
        product_type: parsedValues.category === "LABOR" ? "LABOR" : parsedValues.product_type,
        heat_pump_details:
          parsedValues.category === "HEAT_PUMP" ? parsedValues.heat_pump_details : null,
        thermostat_details:
          parsedValues.category === "THERMOSTAT" ? parsedValues.thermostat_details : null,
        compatible_product_ids: compatibleProductIds,
      };

      // Retirer les champs associés_thermostat du payload
      delete (payload as any).associated_thermostat_id;
      delete (payload as any).associated_thermostat_new;

      if (product) {
        savedProduct = await updateProduct(product.id, payload);
        toast.success("Produit mis a jour.");
      } else {
        savedProduct = await createProduct(payload);
        toast.success("Produit cree.");
      }

      // Upload image if a new one was selected
      if (imageFile) {
        await uploadProductImage(savedProduct.id, imageFile);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message =
        err?.data?.detail || err?.message || "Erreur lors de l'enregistrement.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className={`grid w-full ${showTechnicalTab ? "grid-cols-3" : "grid-cols-2"}`}>
                <TabsTrigger value="general">General</TabsTrigger>
                {showTechnicalTab && <TabsTrigger value="technical">Technique</TabsTrigger>}
                <TabsTrigger value="modules">Modules</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className={!showBrandReference ? "sm:col-span-2" : ""}>
                        <FormLabel>Nom / Modele *</FormLabel>
                        <FormControl>
                          <Input placeholder={showBrandReference ? "AEROLIA 8" : "Installation PAC"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showBrandReference && (
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Marque {(category === "HEAT_PUMP" || category === "THERMOSTAT") && "*"}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Thermor" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {showBrandReference && (
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Reference {(category === "HEAT_PUMP" || category === "THERMOSTAT") && "*"}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="526 780" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="price_ht"
                    render={({ field }) => (
                      <FormItem className={!showBrandReference ? "sm:col-span-2" : ""}>
                        <FormLabel>Prix HT (EUR) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="6000"
                            value={field.value === undefined || field.value === null ? "" : String(field.value)}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : e.target.value;
                              field.onChange(val);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categorie *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selectionner une categorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((option) => (
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
                    name="product_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de produit *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selectionner un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productTypeOptions.map((option) => (
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
                </div>

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || undefined}
                          onChange={field.onChange}
                          onFileChange={setImageFile}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description du produit..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Produit actif</FormLabel>
                        <FormDescription>
                          Afficher ce produit dans le catalogue
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Section Thermostat associé - Uniquement pour PAC avec BAR-TH-171 */}
                {showThermostatSection && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <FormLabel className="text-base">Thermostat associé</FormLabel>
                      <FormDescription>
                        Sélectionnez un thermostat existant ou créez-en un nouveau pour cette pompe à chaleur
                      </FormDescription>
                    </div>

                    <FormField
                      control={form.control}
                      name="associated_thermostat_id"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup
                              value={thermostatMode}
                              onValueChange={(value) => {
                                if (value === "none") {
                                  form.setValue("associated_thermostat_id", null);
                                  form.setValue("associated_thermostat_new", null);
                                } else if (value === "existing") {
                                  form.setValue("associated_thermostat_new", null);
                                  if (!field.value && thermostats.length > 0) {
                                    form.setValue("associated_thermostat_id", thermostats[0].id);
                                  }
                                } else if (value === "new") {
                                  form.setValue("associated_thermostat_id", null);
                                  form.setValue("associated_thermostat_new", {
                                    name: "",
                                    brand: "",
                                    reference: "",
                                    price_ht: 0,
                                    class_rank: null,
                                  });
                                }
                              }}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="none" id="thermostat-none" />
                                </FormControl>
                                <Label htmlFor="thermostat-none" className="font-normal cursor-pointer">
                                  Aucun thermostat
                                </Label>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="existing" id="thermostat-existing" />
                                </FormControl>
                                <Label htmlFor="thermostat-existing" className="font-normal cursor-pointer">
                                  Sélectionner un thermostat existant
                                </Label>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="new" id="thermostat-new" />
                                </FormControl>
                                <Label htmlFor="thermostat-new" className="font-normal cursor-pointer">
                                  Créer un nouveau thermostat
                                </Label>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sélection thermostat existant */}
                    {thermostatMode === "existing" && (
                      <FormField
                        control={form.control}
                        name="associated_thermostat_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thermostat</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                              disabled={isLoadingThermostats}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={isLoadingThermostats ? "Chargement..." : "Sélectionner un thermostat"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {thermostats.map((thermo) => (
                                  <SelectItem key={thermo.id} value={thermo.id}>
                                    {thermo.brand} - {thermo.name} {thermo.reference ? `(${thermo.reference})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Formulaire nouveau thermostat */}
                    {thermostatMode === "new" && (
                      <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                        <FormField
                          control={form.control}
                          name="associated_thermostat_new.name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom / Modèle *</FormLabel>
                              <FormControl>
                                <Input placeholder="Thermostat connecté" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="associated_thermostat_new.brand"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Marque *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Thermor" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="associated_thermostat_new.reference"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Référence *</FormLabel>
                                <FormControl>
                                  <Input placeholder="526 780" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="associated_thermostat_new.price_ht"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prix HT (EUR) *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="200"
                                    value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? undefined : e.target.value;
                                      field.onChange(val);
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="associated_thermostat_new.class_rank"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Classe</FormLabel>
                                <FormControl>
                                  <Input placeholder="V" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormDescription>
                                  Classe du thermostat (ex: IV, V, VI)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Technical Tab */}
              <TabsContent value="technical" className="space-y-4 mt-4">
                {category === "HEAT_PUMP" && (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="heat_pump_details.etas_35"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ETAS 35C (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="177"
                                value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : e.target.value;
                                  field.onChange(val);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heat_pump_details.etas_55"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ETAS 55C (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="128"
                                value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : e.target.value;
                                  field.onChange(val);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="heat_pump_details.power_minus_7"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Puissance -7C (kW)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="8"
                                value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : e.target.value;
                                  field.onChange(val);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heat_pump_details.power_minus_15"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Puissance -15C (kW)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="6"
                                value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : e.target.value;
                                  field.onChange(val);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="heat_pump_details.power_supply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alimentation</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {powerSupplyOptions.map((option) => (
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
                      name="heat_pump_details.is_duo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Chauffage + ECS (DUO)</FormLabel>
                            <FormDescription>
                              Le produit gere le chauffage et l'eau chaude sanitaire
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="heat_pump_details.class_regulator"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Classe regulateur</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="IV"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heat_pump_details.refrigerant_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type refrigerant</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="R32"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="heat_pump_details.noise_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Niveau sonore (dB)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="45"
                              value={field.value === undefined || field.value === null ? "" : String(field.value)}
                              onChange={(e) => {
                                const val = e.target.value === "" ? undefined : e.target.value;
                                field.onChange(val);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {category === "THERMOSTAT" && (
                  <FormField
                    control={form.control}
                    name="thermostat_details.class_rank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classe</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="V"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Classe du thermostat (ex: IV, V, VI)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(category === "OTHER" || category === "LABOR") && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun champ technique specifique pour cette categorie.
                  </div>
                )}
              </TabsContent>

              {/* Modules Tab */}
              <TabsContent value="modules" className="space-y-4 mt-4">
                <div>
                  <FormLabel className="text-base">Modules CEE</FormLabel>
                  <FormDescription>
                    Selectionnez les codes modules applicables a ce produit
                  </FormDescription>
                  <div className="grid grid-cols-1 gap-3 mt-4">
                    {moduleCodes.map((module) => (
                      <div
                        key={module.code}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={module.code}
                          checked={selectedModuleCodes.includes(module.code)}
                          onCheckedChange={(checked) =>
                            handleModuleCodeChange(module.code, !!checked)
                          }
                        />
                        <label
                          htmlFor={module.code}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {module.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Mettre a jour
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Creer le produit
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
