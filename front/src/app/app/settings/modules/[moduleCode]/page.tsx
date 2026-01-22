"use client";

import { useState, useEffect, use } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  Settings,
  Plus,
  Trash2,
  Grid3X3,
  Calculator,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  getModuleSettings,
  updateModuleSettings,
  type ModuleSettings,
  type FixedLineItem,
  type LegacyGridRule,
} from "@/lib/api/module-settings";
import { listProducts, type ProductListItem } from "@/lib/api/products";

// ============================================================================
// Zod Schemas
// ============================================================================

const fixedLineItemSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z.string().min(1, "Description requise"),
  quantity: z.number().int().positive("Quantite positive requise"),
  unit_price_ht: z.number().nonnegative("Prix HT positif requis"),
  tva_rate: z.number(),
});

const legacyGridRuleSchema = z.object({
  brand: z.string().min(1, "Marque requise"),
  etas_min: z.number().int().min(100, "ETAS min >= 100"),
  etas_max: z.number().int().max(300, "ETAS max <= 300"),
  surface_min: z.number().int().min(0, "Surface min >= 0"),
  surface_max: z.number().int().min(0, "Surface max >= 0").nullable(),
  mpr_profile: z.string().min(1, "Profil MPR requis"),
  rac_amount: z.number().positive("RAC positif requis"),
});

const formSchema = z.object({
  enable_legacy_grid_rules: z.boolean(),
  enable_rounding: z.boolean(),
  min_margin_amount: z.number().nonnegative(),
  max_rac_addon: z.number().nonnegative().nullable(),
  default_labor_product_ids: z.array(z.string()),
  fixed_line_items: z.array(fixedLineItemSchema),
  line_percentages: z.object({
    HEAT_PUMP: z.number().min(0).max(100).default(0),
    LABOR: z.number().min(0).max(100).default(0),
    THERMOSTAT: z.number().min(0).max(100).default(0),
    FIXED: z.number().min(0).max(100).default(0),
  }).refine(
    (data) => {
      const total = data.HEAT_PUMP + data.LABOR + data.THERMOSTAT + data.FIXED;
      return total <= 100;
    },
    {
      message: "La somme des pourcentages ne peut pas depasser 100%",
    }
  ),
  legacy_grid_rules: z.array(legacyGridRuleSchema),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// Constants
// ============================================================================

const MPR_PROFILES = [
  { value: "Bleu", label: "Bleu (Tres modeste)" },
  { value: "Jaune", label: "Jaune (Modeste)" },
  { value: "Violet", label: "Violet (Intermediaire)" },
  { value: "Rose", label: "Rose (Classique)" },
  { value: "Non-Bleu", label: "Non-Bleu (Tous sauf Bleu)" },
];

// ============================================================================
// Component
// ============================================================================

export default function ModuleSettingsPage({
  params,
}: {
  params: Promise<{ moduleCode: string }>;
}) {
  const resolvedParams = use(params);
  const moduleCode = resolvedParams.moduleCode;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [laborProducts, setLaborProducts] = useState<ProductListItem[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [addRuleDialogOpen, setAddRuleDialogOpen] = useState(false);
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enable_legacy_grid_rules: false,
      enable_rounding: false,
      min_margin_amount: 0,
      max_rac_addon: null,
      default_labor_product_ids: [],
      fixed_line_items: [],
      line_percentages: {
        HEAT_PUMP: 0,
        LABOR: 0,
        THERMOSTAT: 0,
        FIXED: 0,
      },
      legacy_grid_rules: [],
    },
  });

  const {
    fields: fixedLineFields,
    append: appendFixedLine,
    remove: removeFixedLine,
  } = useFieldArray({
    control: form.control,
    name: "fixed_line_items",
  });

  const {
    fields: gridRuleFields,
    append: appendGridRule,
    remove: removeGridRule,
  } = useFieldArray({
    control: form.control,
    name: "legacy_grid_rules",
  });

  const watchLegacyEnabled = form.watch("enable_legacy_grid_rules");

  // Load data
  useEffect(() => {
    loadData();
  }, [moduleCode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settings, productsResponse] = await Promise.all([
        getModuleSettings(moduleCode),
        listProducts({ pageSize: 100, isActive: true }),
      ]);

      // Filter labor products
      const labor = productsResponse.items.filter(
        (p) => p.product_type === "LABOR"
      );
      setLaborProducts(labor);

      // Extract unique brands from heat pumps
      const heatPumps = productsResponse.items.filter(
        (p) => p.category === "HEAT_PUMP"
      );
      const uniqueBrands = [...new Set(heatPumps.map((p) => p.brand).filter((b): b is string => b !== null))];
      setBrands(uniqueBrands);

      // Set form values
      form.reset({
        enable_legacy_grid_rules: settings.enable_legacy_grid_rules,
        enable_rounding: settings.rounding_mode === "X90",
        min_margin_amount: settings.min_margin_amount,
        max_rac_addon: settings.max_rac_addon,
        default_labor_product_ids: settings.default_labor_product_ids,
        fixed_line_items: settings.fixed_line_items || [],
        line_percentages: settings.line_percentages || {
          HEAT_PUMP: 0,
          LABOR: 0,
          THERMOSTAT: 0,
          FIXED: 0,
        },
        legacy_grid_rules: settings.legacy_grid_rules || [],
      });
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement des parametres.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await updateModuleSettings(moduleCode, {
        enable_legacy_grid_rules: values.enable_legacy_grid_rules,
        rounding_mode: values.enable_rounding ? "X90" : "NONE",
        min_margin_amount: values.min_margin_amount,
        max_rac_addon: values.max_rac_addon,
        default_labor_product_ids: values.default_labor_product_ids,
        fixed_line_items: values.fixed_line_items,
        line_percentages: values.line_percentages,
        legacy_grid_rules: values.legacy_grid_rules,
      });
      toast.success("Parametres enregistres avec succes.");
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFixedLine = () => {
    appendFixedLine({
      title: "",
      description: "",
      quantity: 1,
      unit_price_ht: 0,
      tva_rate: 5.5,
    });
    setAddLineDialogOpen(false);
  };

  const handleAddGridRule = () => {
    appendGridRule({
      brand: brands[0] || "",
      etas_min: 111,
      etas_max: 140,
      surface_min: 70,
      surface_max: null,
      mpr_profile: "Bleu",
      rac_amount: 1990,
    });
    setAddRuleDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configuration Module
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-1">
            Parametres de tarification pour le module
            <Badge variant="outline" className="font-mono">
              {moduleCode}
            </Badge>
          </div>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={saving}>
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
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Strategie de tarification */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
                  <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Strategie de tarification</CardTitle>
                  <CardDescription>
                    Definissez les parametres de calcul des prix
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="enable_legacy_grid_rules"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Regles de grille
                        </FormLabel>
                        <FormDescription>
                          Activer les regles de RAC fixe par marque/surface/profil
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_rounding"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Arrondi X90</FormLabel>
                        <FormDescription>
                          Arrondir le RAC a 490, 990, 1490, 1990...
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="min_margin_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marge minimale (EUR HT)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="100"
                          min="0"
                          placeholder="3000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Marge minimale a conserver sur chaque devis
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_rac_addon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RAC additionnel max (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="100"
                          min="0"
                          placeholder="2000"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Plafond que le commercial peut ajouter au RAC minimum
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Repartition par pourcentages */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-indigo-100 dark:bg-indigo-900 p-2">
                  <Calculator className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle>Repartition par pourcentages</CardTitle>
                  <CardDescription>
                    Definissez la repartition du total TTC par categorie de produits
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="line_percentages.HEAT_PUMP"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pompe a chaleur (HEAT_PUMP) %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="40.0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="line_percentages.LABOR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main d'oeuvre (LABOR) %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="30.0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="line_percentages.THERMOSTAT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thermostat (THERMOSTAT) %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="10.0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="line_percentages.FIXED"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lignes fixes (FIXED) %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="20.0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Indicateur de total */}
              <div className="pt-4 border-t">
                {(() => {
                  const percentages = form.watch("line_percentages");
                  const total = 
                    (percentages?.HEAT_PUMP || 0) +
                    (percentages?.LABOR || 0) +
                    (percentages?.THERMOSTAT || 0) +
                    (percentages?.FIXED || 0);
                  const isValid = total <= 100;
                  
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total des pourcentages:
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isValid
                              ? total === 100
                                ? "text-green-600"
                                : "text-orange-600"
                              : "text-red-600"
                          }`}
                        >
                          {total.toFixed(1)}% / 100%
                        </span>
                        {!isValid && (
                          <Badge variant="destructive" className="text-xs">
                            Depasse 100%
                          </Badge>
                        )}
                        {isValid && total < 100 && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Inferieur a 100%
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {form.formState.errors.line_percentages && (
                <div className="text-sm text-red-600">
                  {form.formState.errors.line_percentages.message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Produits main d'oeuvre */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-2">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>Produits main d'oeuvre par defaut</CardTitle>
                  <CardDescription>
                    Selectionnez les produits de type LABOR a inclure
                    automatiquement
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {laborProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Aucun produit de type LABOR dans le catalogue. Creez des
                  produits de main d'oeuvre dans le stock.
                </p>
              ) : (
                <FormField
                  control={form.control}
                  name="default_labor_product_ids"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        {laborProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">
                                {product.brand} - {product.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {product.price_ht.toFixed(2)} EUR HT
                              </p>
                            </div>
                            <Switch
                              checked={field.value.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, product.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter((id) => id !== product.id)
                                  );
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 4: Lignes fixes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                    <Settings className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>Lignes fixes</CardTitle>
                    <CardDescription>
                      Forfaits toujours inclus dans les devis (ex: desembouage)
                    </CardDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFixedLine}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fixedLineFields.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Aucune ligne fixe configuree.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Qte</TableHead>
                      <TableHead className="w-32">Prix HT</TableHead>
                      <TableHead className="w-24">TVA %</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedLineFields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`fixed_line_items.${index}.title`}
                            render={({ field }) => (
                              <Input {...field} placeholder="Titre" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`fixed_line_items.${index}.description`}
                            render={({ field }) => (
                              <Input {...field} placeholder="Description" />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`fixed_line_items.${index}.quantity`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 1)
                                }
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`fixed_line_items.${index}.unit_price_ht`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`fixed_line_items.${index}.tva_rate`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value) || 5.5)
                                }
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFixedLine(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Regles de grille (conditionnel) */}
          {watchLegacyEnabled && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-2">
                      <Grid3X3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle>Grille RAC</CardTitle>
                      <CardDescription>
                        Regles de RAC fixe par marque, ETAS, surface et profil
                        MPR
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddGridRule}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une regle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {gridRuleFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Aucune regle de grille configuree.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marque</TableHead>
                          <TableHead>ETAS min</TableHead>
                          <TableHead>ETAS max</TableHead>
                          <TableHead>Surface min</TableHead>
                          <TableHead>Surface max</TableHead>
                          <TableHead>Profil MPR</TableHead>
                          <TableHead>RAC (EUR)</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gridRuleFields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.brand`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {brands.map((brand) => (
                                        <SelectItem key={brand} value={brand}>
                                          {brand}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.etas_min`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    className="w-20"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value) || 111)
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.etas_max`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    className="w-20"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value) || 140)
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.surface_min`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    className="w-20"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value) || 0)
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.surface_max`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    placeholder="Illimite"
                                    className="w-20"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? null : parseInt(val) || null);
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.mpr_profile`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger className="w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MPR_PROFILES.map((profile) => (
                                        <SelectItem
                                          key={profile.value}
                                          value={profile.value}
                                        >
                                          {profile.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`legacy_grid_rules.${index}.rac_amount`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    className="w-24"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseFloat(e.target.value) || 0)
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeGridRule(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
