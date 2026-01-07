import { Package, Building2, Home, ThermometerSun } from "lucide-react";
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
    id: "bat-th-113",
    code: "BAT-TH-113",
    title: "Pompe à chaleur de type air/eau ou eau/eau",
    description: "Module de calcul pour les pompes à chaleur air/eau ou eau/eau dans le cadre de la rénovation énergétique.",
    category: "PARTICULIER",
    icon: ThermometerSun,
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

