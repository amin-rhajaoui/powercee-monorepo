"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

type Step6DocumentsProps = {
  onPrevious: () => void;
};

export function Step6Documents({ onPrevious }: Step6DocumentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 6 : Génération des documents</CardTitle>
        <CardDescription>
          Génération des documents conformes CEE + Anah (en développement)
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
                Cette étape sera bientôt disponible avec la génération des documents conformes pour CEE + Anah.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Précédent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

