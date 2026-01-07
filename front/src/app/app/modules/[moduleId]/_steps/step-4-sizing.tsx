"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

type Step4SizingProps = {
  onNext: () => void;
  onPrevious: () => void;
};

export function Step4Sizing({ onNext, onPrevious }: Step4SizingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 4 : Dimensionnement</CardTitle>
        <CardDescription>
          Dimensionnement de la pompe à chaleur (en développement)
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
                Cette étape sera bientôt disponible avec le formulaire de dimensionnement.
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

