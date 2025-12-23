import { z } from "zod";

import { ClientPayload, ClientType } from "@/lib/api/clients";

export const clientTypeOptions: { label: string; value: ClientType }[] = [
  { label: "Particulier", value: "PARTICULIER" },
  { label: "Professionnel", value: "PROFESSIONNEL" },
];

const baseClientSchema = z.object({
  type: z.enum(["PARTICULIER", "PROFESSIONNEL"]).default("PARTICULIER"),
  first_name: z.string().trim().min(1, "Prénom requis").max(255).optional().or(z.literal("").transform(() => undefined)),
  last_name: z.string().trim().min(1, "Nom requis").max(255).optional().or(z.literal("").transform(() => undefined)),
  company_name: z.string().trim().min(1, "Raison sociale requise").max(255).optional().or(z.literal("").transform(() => undefined)),
  contact_name: z.string().trim().min(1, "Contact requis").max(255).optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().email("Email invalide"),
  phone: z.string().trim().min(5, "Téléphone trop court").max(50, "Téléphone trop long").optional().or(z.literal("").transform(() => undefined)),
  agency_id: z.string().uuid("Agence invalide").nullable().optional(),
});

export const clientCreateSchema = baseClientSchema.superRefine((data, ctx) => {
  if (data.type === "PARTICULIER") {
    if (!data.first_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Prénom requis pour un particulier", path: ["first_name"] });
    }
    if (!data.last_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nom requis pour un particulier", path: ["last_name"] });
    }
  }

  if (data.type === "PROFESSIONNEL") {
    if (!data.company_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Raison sociale requise pour un professionnel", path: ["company_name"] });
    }
    if (!data.contact_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Contact requis pour un professionnel", path: ["contact_name"] });
    }
  }
});

export const clientUpdateSchema = clientCreateSchema.partial();

// On utilise l'input schema pour autoriser les valeurs avec defaults/aplanissement côté Zod.
export type ClientFormValues = z.input<typeof clientCreateSchema>;
export type ClientUpdateValues = z.infer<typeof clientUpdateSchema>;
export type ClientCreatePayload = ClientPayload;

