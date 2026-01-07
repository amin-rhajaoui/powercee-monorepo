"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

type Step3TechnicalVisitProps = {
  onNext: () => void;
  onPrevious: () => void;
};

export function Step3TechnicalVisit({ onNext, onPrevious }: Step3TechnicalVisitProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 3 : Visite technique</CardTitle>
        <CardDescription>
          Informations de la visite technique (en développement)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-muted bg-muted/50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Construction className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Étape en développement</h3>
              <p className="text-sm text-muted-foreground">
                Cette étape sera bientôt disponible avec le formulaire de visite technique.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Précédent
          </Button>
          <Button type="button" onClick={onNext}>
            Suivant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

