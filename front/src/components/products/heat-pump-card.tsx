"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CompatiblePac } from "@/lib/api/sizing";
import { Zap, Thermometer, Plug, Volume2, AlertCircle, Leaf } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { s3UrlToProxyUrl } from "@/lib/api";

interface HeatPumpCardProps {
  pac: CompatiblePac;
  isEligibleForMPR?: boolean;
  onContinueWithoutMPR?: () => void;
}

export function HeatPumpCard({
  pac,
  isEligibleForMPR = false,
  onContinueWithoutMPR,
}: HeatPumpCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{pac.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{pac.brand}</p>
          </div>
          {pac.image_url && (
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border bg-muted">
              <Image
                src={s3UrlToProxyUrl(pac.image_url)}
                alt={pac.name}
                fill
                className="object-contain"
                sizes="80px"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prime CEE */}
        {pac.cee_error === "MISSING_VALUATION" ? (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-xs">Valorisation non configurée</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                <Link href="/app/settings/valuation" target="_blank">
                  Configurer
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : pac.estimated_cee_prime !== null && pac.estimated_cee_prime > 0 ? (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">Prime CEE estimée</span>
            </div>
            <span className="text-lg font-bold text-green-600">
              {pac.estimated_cee_prime.toLocaleString("fr-FR")} €
            </span>
          </div>
        ) : null}

        {/* Reste à charge */}
        {pac.estimated_rac !== null && pac.estimated_rac !== undefined ? (
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 dark:text-red-300">Reste à charge</span>
            </div>
            <span className="text-lg font-bold text-red-600">
              {pac.estimated_rac.toLocaleString("fr-FR")} €
            </span>
          </div>
        ) : null}

        {/* Informations techniques */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {pac.puissance_moins_7 && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Puissance</p>
                <p className="text-sm font-medium">{pac.puissance_moins_7} kW</p>
              </div>
            </div>
          )}

          {pac.etas_35 && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">ETAS 35°C</p>
                <p className="text-sm font-medium">{pac.etas_35}%</p>
              </div>
            </div>
          )}

          {pac.etas_55 && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">ETAS 55°C</p>
                <p className="text-sm font-medium">{pac.etas_55}%</p>
              </div>
            </div>
          )}

          {pac.noise_level && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Niveau sonore</p>
                <p className="text-sm font-medium">{pac.noise_level} dB</p>
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Badge variant="secondary" className="text-xs">
            {pac.usage}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Plug className="h-3 w-3 mr-1" />
            {pac.alimentation}
          </Badge>
          {pac.class_regulator && (
            <Badge variant="outline" className="text-xs">
              Classe {pac.class_regulator}
            </Badge>
          )}
        </div>

        {/* Référence */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Réf. {pac.reference}
          </p>
        </div>

        {/* Action Buttons */}
        <Separator />
        <div className="flex flex-col gap-2 pt-2">
          {isEligibleForMPR ? (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={onContinueWithoutMPR}
              >
                Continuer sans MPR
              </Button>
              <Button variant="default" className="w-full">
                Continuer avec MPR
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              className="w-full"
              onClick={onContinueWithoutMPR}
            >
              Continuer (CEE uniquement)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
