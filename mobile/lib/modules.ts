/**
 * Modules de calcul pour la rénovation énergétique
 * Adapté depuis front/src/lib/modules.ts
 */

export type ModuleCategory = "PARTICULIER" | "PROFESSIONNEL";

export type ModuleStatus = "DEVELOPED" | "IN_DEVELOPMENT";

export type Module = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: ModuleCategory;
  icon: string; // Nom de l'icône (sera mappé vers react-native-vector-icons)
  status: ModuleStatus;
};

export const modules: Module[] = [
  {
    id: "bar-th-171",
    code: "BAR-TH-171",
    title: "Pompe à chaleur de type air/eau ou eau/eau",
    description: "Module de calcul pour les pompes à chaleur air/eau ou eau/eau dans le cadre de la rénovation énergétique.",
    category: "PARTICULIER",
    icon: "thermometer",
    status: "IN_DEVELOPMENT",
  },
  {
    id: "bar-th-175",
    code: "BAR-TH-175",
    title: "Rénovation d'ampleur d'un appartement",
    description: "Module de calcul pour la rénovation d'ampleur d'un appartement dans le cadre de la rénovation énergétique.",
    category: "PARTICULIER",
    icon: "home",
    status: "IN_DEVELOPMENT",
  },
  {
    id: "bat-th-xxx",
    code: "BAT-TH-XXX",
    title: "Rénovation globale tertiaire",
    description: "Module de calcul pour la rénovation globale des bâtiments tertiaires dans le cadre de la rénovation énergétique.",
    category: "PROFESSIONNEL",
    icon: "wrench",
    status: "IN_DEVELOPMENT",
  },
  {
    id: "bar-th-175-pro",
    code: "BAR-TH-175",
    title: "Rénovation d'ampleur d'un appartement",
    description: "Module de calcul pour la rénovation d'ampleur d'un appartement dans le cadre de la rénovation énergétique.",
    category: "PROFESSIONNEL",
    icon: "home",
    status: "IN_DEVELOPMENT",
  },
];

export function getModulesByCategory(category: ModuleCategory): Module[] {
  return modules.filter((module) => module.category === category);
}

export function getModuleById(id: string): Module | undefined {
  return modules.find((module) => module.id === id);
}

export function getModuleByCode(code: string): Module | undefined {
  return modules.find((module) => module.code === code);
}
