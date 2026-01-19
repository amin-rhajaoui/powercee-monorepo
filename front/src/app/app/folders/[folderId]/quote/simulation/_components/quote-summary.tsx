"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { TrendingUp } from "lucide-react";

interface QuoteSummaryProps {
  totalHt: number;
  totalTtc: number;
  ceePrime: number;
  racTtc: number;
  marginHt: number;
  marginPercent: number;
  onUpdateRac?: (value: number) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function QuoteSummary({
  totalHt,
  totalTtc,
  ceePrime,
  racTtc,
  marginHt,
  marginPercent,
  onUpdateRac,
}: QuoteSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Récapitulatif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total HT</span>
          <span>{formatCurrency(totalHt)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total TTC</span>
          <span>{formatCurrency(totalTtc)}</span>
        </div>

        <div className="flex justify-between text-sm text-green-600">
          <span>Prime CEE</span>
          <span>- {formatCurrency(ceePrime)}</span>
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Reste à Charge</span>
          {onUpdateRac ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={racTtc}
              onChange={(e) => onUpdateRac(parseFloat(e.target.value) || 0)}
              className="h-8 w-28 text-right font-bold"
            />
          ) : (
            <span>{formatCurrency(racTtc)}</span>
          )}
        </div>

        <Separator />

        <div className="flex justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Marge estimée
          </span>
          <span>
            {formatCurrency(marginHt)} ({marginPercent.toFixed(1)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
