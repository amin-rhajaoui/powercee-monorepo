import { z } from "zod";

/**
 * Schéma de base pour Technical Survey.
 * Tous les champs sont optionnels pour permettre les sauvegardes partielles (draft).
 */
export const technicalSurveyBaseSchema = z.object({
  photo_house: z.string().optional().nullable(),
  photo_facade: z.string().optional().nullable(),
  photo_old_system: z.string().optional().nullable(),
  photo_electric_panel: z.string().optional().nullable(),
  has_linky: z.boolean().optional().nullable(),
  photo_linky: z.string().optional().nullable(),
  photo_breaker: z.string().optional().nullable(),
});

export type TechnicalSurveyBaseValues = z.infer<typeof technicalSurveyBaseSchema>;

/**
 * Schéma pour sauvegarde complète (tous les champs requis).
 * Utilise superRefine pour la logique conditionnelle Linky.
 */
export const technicalSurveyCompleteSchema = technicalSurveyBaseSchema
  .superRefine((data, ctx) => {
    // Les 4 photos standard sont toujours requises
    if (!data.photo_house) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La photo du logement est requise",
        path: ["photo_house"],
      });
    }
    if (!data.photo_facade) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La photo de la façade est requise",
        path: ["photo_facade"],
      });
    }
    if (!data.photo_old_system) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La photo de l'ancien système est requise",
        path: ["photo_old_system"],
      });
    }
    if (!data.photo_electric_panel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La photo du tableau électrique est requise",
        path: ["photo_electric_panel"],
      });
    }

    // Logique conditionnelle Linky
    if (data.has_linky === true) {
      if (!data.photo_linky) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La photo du compteur Linky est requise",
          path: ["photo_linky"],
        });
      }
    } else if (data.has_linky === false) {
      if (!data.photo_breaker) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La photo du disjoncteur est requise",
          path: ["photo_breaker"],
        });
      }
    } else {
      // has_linky n'est pas défini
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Veuillez indiquer si le logement a un compteur Linky",
        path: ["has_linky"],
      });
    }
  });

export type TechnicalSurveyCompleteValues = z.infer<
  typeof technicalSurveyCompleteSchema
>;

/**
 * Schéma pour sauvegarde draft (validation assouplie).
 * Seule la logique conditionnelle Linky est appliquée.
 */
export const technicalSurveyDraftSchema = technicalSurveyBaseSchema.superRefine(
  (data, ctx) => {
    // Logique conditionnelle Linky uniquement
    if (data.has_linky === true && !data.photo_linky) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La photo du compteur Linky est requise",
        path: ["photo_linky"],
      });
    } else if (data.has_linky === false && !data.photo_breaker) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La photo du disjoncteur est requise",
        path: ["photo_breaker"],
      });
    }
  }
);

export type TechnicalSurveyDraftValues = z.infer<
  typeof technicalSurveyDraftSchema
>;
