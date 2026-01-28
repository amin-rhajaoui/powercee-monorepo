import { Package, Building2, Home, ThermometerSun, Wrench } from "lucide-react";
import { LucideIcon } from "lucide-react";

export type ModuleCategory = "PARTICULIER" | "PROFESSIONNEL";

export type ModuleStatus = "DEVELOPED" | "IN_DEVELOPMENT";

export type Module = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: ModuleCategory;
  icon: LucideIcon;
  status: ModuleStatus;
};

export const modules: Module[] = [
  {
    id: "bar-th-171",
    code: "BAR-TH-171",
    title: "Pompe à chaleur de type air/eau ou eau/eau",
    description: "Module de calcul pour les pompes à chaleur air/eau ou eau/eau dans le cadre de la rénovation énergétique.",
    category: "PARTICULIER",
    icon: ThermometerSun,
    status: "IN_DEVELOPMENT",
  },
  {
    id: "bar-th-175",
    code: "BAR-TH-175",
    title: "Rénovation d'ampleur appartement",
    description: "Module de calcul pour la rénovation énergétique d'appartements dans le cadre de la rénovation d'ampleur (particuliers).",
    category: "PARTICULIER",
    icon: Building2,
    status: "IN_DEVELOPMENT",
  },
  {
    id: "bar-th-175-pro",
    code: "BAR-TH-175",
    title: "Rénovation d'ampleur appartement (Bailleurs sociaux)",
    description: "Module de calcul pour la rénovation énergétique multi-appartements pour les bailleurs sociaux dans le cadre de la rénovation d'ampleur.",
    category: "PROFESSIONNEL",
    icon: Building2,
    status: "IN_DEVELOPMENT",
  },
  {
    id: "bat-th-xxx",
    code: "BAT-TH-XXX",
    title: "Rénovation globale tertiaire",
    description: "Module de calcul pour la rénovation globale des bâtiments tertiaires dans le cadre de la rénovation énergétique.",
    category: "PROFESSIONNEL",
    icon: Wrench,
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

