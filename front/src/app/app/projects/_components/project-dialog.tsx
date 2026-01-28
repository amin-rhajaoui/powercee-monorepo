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
import { createProject } from "@/lib/api/projects";
import type { ApiError } from "@/lib/api";
import { ClientSelector } from "@/app/app/modules/[moduleId]/_components/client-selector";

const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Le nom du projet est requis").max(255, "Le nom est trop long"),
  client_id: z.string().uuid("Client invalide").nullable().optional(),
});

type ProjectFormValues = z.infer<typeof projectCreateSchema>;

type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function ProjectDialog({ open, onOpenChange, onSuccess }: ProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: "",
      client_id: null,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        name: "",
        client_id: null,
      });
    }
  }, [open, form]);

  const onSubmit = async (values: ProjectFormValues) => {
    setIsSubmitting(true);
    try {
      await createProject({
        name: values.name,
        client_id: values.client_id || null,
        module_code: "BAR-TH-175",
      });
      toast.success("Projet créé avec succès.");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err?.data?.detail || err?.message || "Erreur lors de la création du projet.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du projet</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Les Balcons de la Brévenne" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client (bailleur social)</FormLabel>
                  <FormControl>
                    <ClientSelector
                      value={field.value || null}
                      onChange={(clientId) => field.onChange(clientId)}
                      clientType="PROFESSIONNEL"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Créer le projet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
