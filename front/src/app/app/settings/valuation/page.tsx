"use client";

import { useState, useEffect } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Save,
  Euro,
  Home,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getValuations,
  saveValuations,
  type CEEValuationWithOperation,
  type CEEValuationCreate,
} from "@/lib/api/valuation";

// ============================================================================
// Zod Schema
// ============================================================================

const valuationItemSchema = z.object({
  operation_code: z.string(),
  is_residential: z.boolean(),
  value_standard: z.number().min(0).nullable().optional(),
  value_blue: z.number().min(0).nullable().optional(),
  value_yellow: z.number().min(0).nullable().optional(),
  value_violet: z.number().min(0).nullable().optional(),
  value_rose: z.number().min(0).nullable().optional(),
});

const formSchema = z.object({
  valuations: z.array(valuationItemSchema),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// MPR Color Config
// ============================================================================

const MPR_COLORS = [
  {
    key: "value_blue" as const,
    label: "Bleu",
    description: "Tres modeste",
    bgColor: "bg-blue-500",
    borderColor: "border-blue-500",
    textColor: "text-blue-600",
  },
  {
    key: "value_yellow" as const,
    label: "Jaune",
    description: "Modeste",
    bgColor: "bg-yellow-500",
    borderColor: "border-yellow-500",
    textColor: "text-yellow-600",
  },
  {
    key: "value_violet" as const,
    label: "Violet",
    description: "Intermediaire",
    bgColor: "bg-purple-500",
    borderColor: "border-purple-500",
    textColor: "text-purple-600",
  },
  {
    key: "value_rose" as const,
    label: "Rose",
    description: "Classique",
    bgColor: "bg-pink-500",
    borderColor: "border-pink-500",
    textColor: "text-pink-600",
  },
];

// ============================================================================
// Component
// ============================================================================

export default function ValuationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<CEEValuationWithOperation[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valuations: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "valuations",
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getValuations();
      setOperations(response.items);

      // Transform to form values
      const formValues: FormValues = {
        valuations: response.items.map((item) => ({
          operation_code: item.operation.code,
          is_residential: item.operation.category === "RESIDENTIAL",
          value_standard: item.valuation?.value_standard ?? null,
          value_blue: item.valuation?.value_blue ?? null,
          value_yellow: item.valuation?.value_yellow ?? null,
          value_violet: item.valuation?.value_violet ?? null,
          value_rose: item.valuation?.value_rose ?? null,
        })),
      };
      form.reset(formValues);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement des valorisations.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      // Filter only valuations with at least one value set
      const valuationsToSave: CEEValuationCreate[] = values.valuations
        .filter((v) => {
          if (v.is_residential) {
            return (
              v.value_blue !== null ||
              v.value_yellow !== null ||
              v.value_violet !== null ||
              v.value_rose !== null
            );
          }
          return v.value_standard !== null;
        })
        .map((v) => ({
          operation_code: v.operation_code,
          is_residential: v.is_residential,
          value_standard: v.value_standard,
          value_blue: v.value_blue,
          value_yellow: v.value_yellow,
          value_violet: v.value_violet,
          value_rose: v.value_rose,
        }));

      if (valuationsToSave.length === 0) {
        toast.info("Aucune valorisation a sauvegarder.");
        setSaving(false);
        return;
      }

      await saveValuations({ valuations: valuationsToSave });
      toast.success("Valorisations enregistrees avec succes.");
      // Reload to get updated data
      await loadData();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to parse input value
  const parseInputValue = (value: string): number | null => {
    if (value === "" || value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  // Split operations by category
  const residentialOperations = operations.filter(
    (op) => op.operation.category === "RESIDENTIAL"
  );
  const professionalOperations = operations.filter(
    (op) => op.operation.category === "PROFESSIONAL"
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Valorisation CEE</h1>
          <p className="text-muted-foreground mt-1">
            Configurez vos prix de rachat CEE en EUR/MWh cumac
          </p>
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Section Particuliers */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                  <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Operations Particuliers</CardTitle>
                  <CardDescription>
                    Prix differencies selon les revenus du menage (couleurs MPR)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {residentialOperations.map((item) => {
                  // Find the field index in the form
                  const fieldIndex = operations.findIndex(
                    (op) => op.operation.code === item.operation.code
                  );

                  return (
                    <AccordionItem
                      key={item.operation.code}
                      value={item.operation.code}
                      className="border-b"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.operation.code}
                            </Badge>
                            <span className="font-medium">{item.operation.name}</span>
                            {item.valuation && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 ml-2"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Configure
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {item.operation.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Blue Field */}
                          <FormField
                            control={form.control}
                            name={`valuations.${fieldIndex}.value_blue`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                                  <span>Bleu (Très modeste)</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      className="pr-20 border-blue-200 focus:ring-blue-500"
                                      value={field.value ?? ""}
                                      onChange={(e) =>
                                        field.onChange(parseInputValue(e.target.value))
                                      }
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                      EUR/MWh
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Others Field (Syncs Yellow, Violet, Rose) */}
                          <FormField
                            control={form.control}
                            name={`valuations.${fieldIndex}.value_rose`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <div className="flex -space-x-1">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500 ring-1 ring-white" />
                                    <div className="w-3 h-3 rounded-full bg-purple-500 ring-1 ring-white" />
                                    <div className="w-3 h-3 rounded-full bg-pink-500 ring-1 ring-white" />
                                  </div>
                                  <span>Autres couleurs</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      className="pr-20"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = parseInputValue(e.target.value);
                                        // Update all 3 "other" fields to keep them in sync
                                        form.setValue(`valuations.${fieldIndex}.value_yellow`, val, { shouldDirty: true });
                                        form.setValue(`valuations.${fieldIndex}.value_violet`, val, { shouldDirty: true });
                                        field.onChange(val); // Updates rose
                                      }}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                      EUR/MWh
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* Section Professionnels */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Operations Professionnels / Tertiaire</CardTitle>
                  <CardDescription>
                    Prix standard unique par operation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {professionalOperations.map((item) => {
                  const fieldIndex = operations.findIndex(
                    (op) => op.operation.code === item.operation.code
                  );

                  return (
                    <AccordionItem
                      key={item.operation.code}
                      value={item.operation.code}
                      className="border-b"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.operation.code}
                            </Badge>
                            <span className="font-medium">{item.operation.name}</span>
                            {item.valuation && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 ml-2"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Configure
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {item.operation.description}
                        </p>
                        <div className="flex items-center gap-3">
                          <FormField
                            control={form.control}
                            name={`valuations.${fieldIndex}.value_standard`}
                            render={({ field }) => (
                              <FormItem className="w-48">
                                <FormLabel>Prix standard</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      className="pr-20"
                                      value={field.value ?? ""}
                                      onChange={(e) =>
                                        field.onChange(parseInputValue(e.target.value))
                                      }
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                      EUR/MWh
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Euro className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    A propos des valorisations CEE
                  </p>
                  <p>
                    Les prix saisis correspondent a vos tarifs de rachat CEE en
                    EUR par MWh cumac. Ces valeurs seront utilisees pour calculer
                    les primes CEE dans les dossiers clients.
                  </p>
                  <p className="mt-2">
                    Pour les operations residentielles, les 4 couleurs
                    correspondent aux plafonds de revenus MaPrimeRenov' :
                  </p>
                  <ul className="mt-1 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Bleu : menages tres modestes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>Jaune : menages modestes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>Violet : menages intermediaires</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500" />
                      <span>Rose : menages aux revenus classiques</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
