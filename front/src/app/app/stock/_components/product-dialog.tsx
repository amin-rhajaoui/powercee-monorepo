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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/lib/api/products";
import type { ApiError } from "@/lib/api";
import {
  productSchema,
  ProductFormValues,
  defaultProductValues,
  categoryOptions,
  powerSupplyOptions,
  moduleCodes,
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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultProductValues,
    mode: "onChange",
  });

  const category = form.watch("category");
  const selectedModuleCodes = form.watch("module_codes") || [];

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        brand: product.brand,
        reference: product.reference,
        price_ht: product.price_ht,
        category: product.category,
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

      // Parse values to get correct types (coerce numbers, etc.)
      const parsedValues = productSchema.parse(values);

      // Prepare payload based on category
      const payload = {
        ...parsedValues,
        heat_pump_details:
          parsedValues.category === "HEAT_PUMP" ? parsedValues.heat_pump_details : null,
        thermostat_details:
          parsedValues.category === "THERMOSTAT" ? parsedValues.thermostat_details : null,
      };

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="technical">Technique</TabsTrigger>
                <TabsTrigger value="modules">Modules</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom / Modele *</FormLabel>
                        <FormControl>
                          <Input placeholder="AEROLIA 8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brand"
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
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference *</FormLabel>
                        <FormControl>
                          <Input placeholder="526 780" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price_ht"
                    render={({ field }) => (
                      <FormItem>
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

                {category === "OTHER" && (
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
