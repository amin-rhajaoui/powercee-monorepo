import { ClientType } from "@/lib/api/clients";

export type PropertyLabels = {
  singular: string;
  singularCapitalized: string;
  plural: string;
  pluralCapitalized: string;
  addButton: string;
  newTitle: string;
  editTitle: string;
  createdToast: string;
  updatedToast: string;
  archivedToast: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: "home" | "building";
};

/**
 * Retourne les labels adaptés au type de client.
 * - PARTICULIER → "logement"
 * - PROFESSIONNEL → "établissement"
 */
export function getPropertyLabels(clientType: ClientType | string): PropertyLabels {
  const isParticulier = clientType === "PARTICULIER";

  if (isParticulier) {
    return {
      singular: "logement",
      singularCapitalized: "Logement",
      plural: "logements",
      pluralCapitalized: "Logements",
      addButton: "Ajouter un logement",
      newTitle: "Nouveau logement",
      editTitle: "Modifier le logement",
      createdToast: "Logement ajouté avec succès",
      updatedToast: "Logement mis à jour",
      archivedToast: "Logement archivé",
      emptyTitle: "Aucun logement enregistré",
      emptyDescription:
        "Ajoutez le premier logement de ce client pour commencer à suivre ses projets de rénovation.",
      emptyIcon: "home",
    };
  }

  return {
    singular: "établissement",
    singularCapitalized: "Établissement",
    plural: "établissements",
    pluralCapitalized: "Établissements",
    addButton: "Ajouter un établissement",
    newTitle: "Nouvel établissement",
    editTitle: "Modifier l'établissement",
    createdToast: "Établissement ajouté avec succès",
    updatedToast: "Établissement mis à jour",
    archivedToast: "Établissement archivé",
    emptyTitle: "Aucun établissement enregistré",
    emptyDescription:
      "Ajoutez le premier établissement de cette entreprise pour commencer le suivi.",
    emptyIcon: "building",
  };
}
