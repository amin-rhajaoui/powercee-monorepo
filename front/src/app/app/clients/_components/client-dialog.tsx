"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Client, createClient, updateClient } from "@/lib/api/clients";
import type { ApiError } from "@/lib/api";
import {
  clientCreateSchema,
  ClientFormValues,
  clientTypeOptions,
} from "../_schemas";

type ClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  client?: Client | null;
  forceType?: "PARTICULIER" | "PROFESSIONNEL";
};

const defaultValues: ClientFormValues = {
  type: "PARTICULIER",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company_name: "",
  contact_name: "",
  agency_id: null,
};

export function ClientDialog({ open, onOpenChange, onSuccess, client, forceType }: ClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: {
      ...defaultValues,
      type: forceType || defaultValues.type,
    },
    mode: "onChange",
  });

  const currentType = forceType || form.watch("type");

  useEffect(() => {
    if (client) {
      form.reset({
        type: forceType || client.type,
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        company_name: client.company_name || "",
        contact_name: client.contact_name || "",
        email: client.email,
        phone: client.phone || "",
        agency_id: client.agency_id || null,
      });
    } else {
      form.reset({
        ...defaultValues,
        type: forceType || defaultValues.type,
      });
    }
  }, [client, form, open, forceType]);

  const submitLabel = useMemo(
    () => (client ? "Mettre à jour" : "Créer le client"),
    [client]
  );

  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      if (client) {
        await updateClient(client.id, values);
        toast.success("Client mis à jour.");
      } else {
        // Type explicite pour le payload de création (type toujours requis).
        const payload = {
          ...values,
          type: forceType || (values.type ?? "PARTICULIER"),
        };
        await createClient(payload);
        toast.success("Client créé.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err?.data?.detail || err?.message || "Erreur lors de l'enregistrement du client.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!forceType && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientTypeOptions.map((option) => (
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
            )}

            {currentType === "PARTICULIER" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Prénom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {currentType === "PROFESSIONNEL" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Raison sociale</FormLabel>
                      <FormControl>
                        <Input placeholder="Entreprise SAS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Contact principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom du contact" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+33 6 00 00 00 00" {...field} />
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
                {client ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {submitLabel}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {submitLabel}
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

