"use client";

import { use, useState, useEffect } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { getModuleById } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { useModuleDraft } from "./_hooks/use-module-draft";
import { Step1Household } from "./_steps/step-1-household";
import { Step2Property } from "./_steps/step-2-property";
import { Step3TechnicalVisit } from "./_steps/step-3-technical-visit";
import { Step4Sizing } from "./_steps/step-4-sizing";
import { Step5Offers } from "./_steps/step-5-offers";
import { Step6Documents } from "./_steps/step-6-documents";

type ModuleDetailPageProps = {
  params: Promise<{ moduleId: string }>;
};

type ModuleDetailPageContentProps = {
  moduleId: string;
};

const STEP_LABELS = [
  "Foyer",
  "Logement",
  "Visite technique",
  "Dimensionnement",
  "Offres",
  "Documents",
];

const STEP_DESCRIPTIONS = [
  "Sélectionnez ou créez un client particulier pour ce dossier",
  "Sélectionnez ou créez un logement pour ce dossier",
  "Renseignez les informations de la visite technique",
  "Déterminez le dimensionnement de la pompe à chaleur",
  "Calculez les offres et le reste à charge",
  "Générez les documents conformes CEE + Anah",
];

function ModuleDetailPageContent({ moduleId }: ModuleDetailPageContentProps) {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  const module = getModuleById(moduleId);

  if (!module) {
    notFound();
  }

  const { currentStep, draftData, saveDraft } = useModuleDraft({
    moduleId,
    moduleCode: module.code,
    draftId,
  });

  const [activeStep, setActiveStep] = useState(currentStep || 1);

  // Synchroniser activeStep avec currentStep du hook quand il change
  useEffect(() => {
    if (currentStep && currentStep !== activeStep) {
      console.log("Synchronisation activeStep avec currentStep:", currentStep);
      setActiveStep(currentStep);
    }
  }, [currentStep]);

  const handleNext = () => {
    console.log("handleNext dans page.tsx appelé, activeStep actuel:", activeStep);
    // Utiliser currentStep du hook qui est déjà mis à jour par saveDraft
    if (currentStep < 6) {
      const nextStep = currentStep + 1;
      console.log("Passage à l'étape:", nextStep);
      setActiveStep(nextStep);
    }
  };

  const handlePrevious = async () => {
    if (activeStep > 1) {
      const newStep = activeStep - 1;
      setActiveStep(newStep);
      // Sauvegarder l'étape dans le brouillon
      await saveDraft({}, newStep);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 1:
        return (
          <Step1Household
            moduleId={moduleId}
            moduleCode={module.code}
            draftId={draftId}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2Property
            moduleId={moduleId}
            moduleCode={module.code}
            draftId={draftId}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return <Step3TechnicalVisit onNext={handleNext} onPrevious={handlePrevious} />;
      case 4:
        return <Step4Sizing onNext={handleNext} onPrevious={handlePrevious} />;
      case 5:
        return <Step5Offers onNext={handleNext} onPrevious={handlePrevious} />;
      case 6:
        return <Step6Documents onPrevious={handlePrevious} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/modules">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {module.code}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Étape {activeStep} : {STEP_LABELS[activeStep - 1]}
              </h2>
              <span className="text-sm text-muted-foreground">
                {activeStep} / {STEP_LABELS.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {STEP_DESCRIPTIONS[activeStep - 1]}
            </p>
          </div>
          <Progress value={(activeStep / STEP_LABELS.length) * 100} className="h-2" />
        </div>
        {renderStep()}
      </div>
    </div>
  );
}

export default function ModuleDetailPage({ params }: ModuleDetailPageProps) {
  // Déballer params dans le composant wrapper pour éviter les erreurs d'énumération
  const resolvedParams = use(params);
  return <ModuleDetailPageContent moduleId={resolvedParams.moduleId} />;
}
