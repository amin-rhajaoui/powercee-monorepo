"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBulkDrafts } from "@/lib/api/projects";
import type { ApiError } from "@/lib/api";
import type { BulkDraftsCreate } from "@/types/project";

const bulkCreateSchema = z.object({
  apartment_type: z
    .string()
    .trim()
    .min(1, "La typologie est requise")
    .max(50, "La typologie est trop longue"),
  quantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .min(1, "La quantité doit être au moins 1")
    .max(500, "La quantité ne peut pas dépasser 500"),
  common_data: z
    .object({
      living_area: z.number().positive().optional(),
      initial_energy_class: z.enum(["A", "B", "C", "D", "E", "F", "G"]).optional(),
      initial_ghg: z.number().nonnegative().optional(),
      floor_level: z.number().int().optional(),
    })
    .optional(),
});

type BulkCreateFormValues = z.infer<typeof bulkCreateSchema>;

type BulkCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
};

export function BulkCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: BulkCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BulkCreateFormValues>({
    resolver: zodResolver(bulkCreateSchema),
    defaultValues: {
      apartment_type: "",
      quantity: 1,
      common_data: {},
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        apartment_type: "",
        quantity: 1,
        common_data: {},
      });
    }
  }, [open, form]);

  const onSubmit = async (values: BulkCreateFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: BulkDraftsCreate = {
        apartment_type: values.apartment_type,
        quantity: values.quantity,
        common_data: values.common_data || {},
      };

      const response = await createBulkDrafts(projectId, payload);
      toast.success(
        `${response.created_count} lot${response.created_count > 1 ? "s" : ""} créé${response.created_count > 1 ? "s" : ""} avec succès.`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message =
        err?.data?.detail || err?.message || "Erreur lors de la création des lots.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des lots (Bulk)</DialogTitle>
          <DialogDescription>
            Créez plusieurs appartements en une seule fois avec des données communes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apartment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typologie</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: T3, T2, Studio..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Type d'appartement (T1, T2, T3, T4, T5, Studio, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantité</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Nombre d'appartements à créer (1-500)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Données communes (optionnel)</h4>

              <FormField
                control={form.control}
                name="common_data.living_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface habitable (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Ex: 60"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="common_data.initial_energy_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe énergétique initiale</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                        <option value="F">F</option>
                        <option value="G">G</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="common_data.initial_ghg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Émissions GES initiales (kgCO2/m²/an)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Ex: 65"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="common_data.floor_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Étage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 2"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
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
                <Plus className="mr-2 h-4 w-4" />
                Créer les lots
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
