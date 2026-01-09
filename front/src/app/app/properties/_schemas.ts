import { z } from "zod";
import { PropertyType } from "@/lib/api/properties";

export const propertyTypeOptions: { label: string; value: PropertyType }[] = [
  { label: "Maison", value: "MAISON" },
  { label: "Appartement", value: "APPARTEMENT" },
  { label: "Bâtiment professionnel", value: "BATIMENT_PRO" },
  { label: "Autre", value: "AUTRE" },
];

const basePropertySchema = z.object({
  client_id: z.string().uuid("Client invalide"),
  label: z.string().min(1, "Le label est requis").max(255),
  type: z.enum(["MAISON", "APPARTEMENT", "BATIMENT_PRO", "AUTRE"]), // Requis (pas de .default() pour éviter que le type soit optionnel)
  address: z.string().min(1, "L'adresse est requise").max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  postal_code: z.string().max(10).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().max(255).optional().or(z.literal("").transform(() => undefined)),
  country: z.string().max(100).optional().or(z.literal("").transform(() => undefined)),
  surface_m2: z.number().positive().optional().or(z.nan().transform(() => undefined)),
  construction_year: z.number().int().min(1000).max(2100).optional().or(z.nan().transform(() => undefined)),
  notes: z.string().optional().or(z.literal("").transform(() => undefined)),
});

export const propertyCreateSchema = basePropertySchema.superRefine((data, ctx) => {
  // Vérifier que lat/lng sont présents si l'adresse est fournie
  if (data.address && (!data.latitude || !data.longitude)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude et longitude sont requises après géocodage de l'adresse.",
      path: ["address"],
    });
  }
});

export const propertyUpdateSchema = basePropertySchema.partial();

export type PropertyFormValues = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateValues = z.infer<typeof propertyUpdateSchema>;

