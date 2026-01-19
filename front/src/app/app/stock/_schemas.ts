import { z } from "zod";

export const categoryOptions = [
  { value: "HEAT_PUMP", label: "Pompe a chaleur" },
  { value: "THERMOSTAT", label: "Thermostat" },
  { value: "LABOR", label: "Main d'oeuvre" },
  { value: "OTHER", label: "Autre" },
] as const;

export const productTypeOptions = [
  { value: "MATERIAL", label: "Materiel" },
  { value: "LABOR", label: "Main d'oeuvre" },
  { value: "SERVICE", label: "Service" },
] as const;

export const powerSupplyOptions = [
  { value: "MONOPHASE", label: "Monophase" },
  { value: "TRIPHASE", label: "Triphase" },
] as const;

export const moduleCodes = [
  { code: "BAR-TH-171", label: "BAR-TH-171 (PAC air/eau)" },
  { code: "BAR-TH-159", label: "BAR-TH-159 (Thermostat)" },
  { code: "BAR-TH-164", label: "BAR-TH-164 (Chaudiere)" },
  { code: "BAR-TH-148", label: "BAR-TH-148 (Chauffe-eau)" },
];

// Heat pump details schema
export const heatPumpDetailsSchema = z.object({
  etas_35: z.coerce.number().min(0).max(300).nullable().optional(),
  etas_55: z.coerce.number().min(0).max(300).nullable().optional(),
  power_minus_7: z.coerce.number().min(0).nullable().optional(),
  power_minus_15: z.coerce.number().min(0).nullable().optional(),
  power_supply: z.enum(["MONOPHASE", "TRIPHASE"]).nullable().optional(),
  refrigerant_type: z.string().max(50).nullable().optional(),
  noise_level: z.coerce.number().min(0).nullable().optional(),
  is_duo: z.boolean().default(false),
  class_regulator: z.string().max(10).nullable().optional(),
});

// Thermostat details schema
export const thermostatDetailsSchema = z.object({
  class_rank: z.string().max(10).nullable().optional(),
});

// Main product schema with conditional validation
export const productSchema = z
  .object({
    name: z.string().min(1, "Le nom est requis").max(255),
    brand: z.string().max(255).nullable().optional(),
    reference: z.string().max(255).nullable().optional(),
    price_ht: z.coerce.number().min(0, "Le prix doit etre positif"),
    category: z.enum(["HEAT_PUMP", "THERMOSTAT", "LABOR", "OTHER"]),
    product_type: z.enum(["MATERIAL", "LABOR", "SERVICE"]).default("MATERIAL"),
    module_codes: z.array(z.string()).nullable().optional(),
    image_url: z.string().max(500).nullable().optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().default(true),
    heat_pump_details: heatPumpDetailsSchema.nullable().optional(),
    thermostat_details: thermostatDetailsSchema.nullable().optional(),
    compatible_product_ids: z.array(z.string()).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validation conditionnelle selon la categorie
    if (data.category === "HEAT_PUMP" || data.category === "THERMOSTAT") {
      if (!data.brand || data.brand.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La marque est requise",
          path: ["brand"],
        });
      }
      if (!data.reference || data.reference.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La reference est requise",
          path: ["reference"],
        });
      }
    }
    // LABOR et OTHER: brand et reference optionnels
  });

export type ProductFormValues = z.input<typeof productSchema>;

// Default values for the form
export const defaultProductValues: ProductFormValues = {
  name: "",
  brand: "",
  reference: "",
  price_ht: 0,
  category: "HEAT_PUMP",
  product_type: "MATERIAL",
  module_codes: [],
  image_url: null,
  description: null,
  is_active: true,
  heat_pump_details: {
    etas_35: null,
    etas_55: null,
    power_minus_7: null,
    power_minus_15: null,
    power_supply: null,
    refrigerant_type: null,
    noise_level: null,
    is_duo: false,
    class_regulator: null,
  },
  thermostat_details: {
    class_rank: null,
  },
  compatible_product_ids: [],
};
