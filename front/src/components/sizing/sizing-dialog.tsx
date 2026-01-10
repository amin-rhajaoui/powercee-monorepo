"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Download,
  Calculator,
  Zap,
  TrendingUp,
  Thermometer,
  Home,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { calculateSizing, generateSizingPdf, saveSizingPdf, type SizingRequest, type SizingResponse } from "@/lib/api/sizing";
import { getFolder, type Folder } from "@/lib/api/folders";
import type { Property } from "@/lib/api/properties";

type SizingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder;
  property: Property | null;
  onFolderUpdate?: (folder: Folder) => void;
};

export function SizingDialog({ open, onOpenChange, folder, property, onFolderUpdate }: SizingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [sizingResult, setSizingResult] = useState<SizingResponse | null>(null);
  
  // Paramètres modifiables
  const [surfaceChauffee, setSurfaceChauffee] = useState<number | null>(null);
  const [hauteurPlafond, setHauteurPlafond] = useState<number | null>(null);
  const [temperatureConsigne, setTemperatureConsigne] = useState<number>(19.0);
  const [typeEmetteur, setTypeEmetteur] = useState<"BT" | "MT_HT" | null>(null);
  const [typeIsolationOverride, setTypeIsolationOverride] = useState<"faible" | "bonne" | "tres_bonne" | null>(null);

  // Initialiser les valeurs depuis folder/property
  useEffect(() => {
    if (open && folder && property) {
      setSurfaceChauffee(property.surface_m2 || null);
      setHauteurPlafond((folder.data?.avg_ceiling_height as number) || null);
      setTemperatureConsigne((folder.data?.target_temperature as number) || 19.0);
      
      // Type d'émetteur depuis folder
      if (folder.emitter_type === "BASSE_TEMPERATURE") {
        setTypeEmetteur("BT");
      } else if (folder.emitter_type === "MOYENNE_HAUTE_TEMPERATURE") {
        setTypeEmetteur("MT_HT");
      }
      
      setTypeIsolationOverride(null);
    }
  }, [open, folder, property]);

  // Calcul automatique avec debounce
  const performCalculation = useCallback(async () => {
    if (!folder?.id) return;
    
    // Vérifier que les paramètres minimums sont fournis
    if (surfaceChauffee === null || hauteurPlafond === null || !property?.construction_year || !folder.zone_climatique) {
      return;
    }

    setLoading(true);
    try {
      const params: SizingRequest = {
        surface_chauffee: surfaceChauffee,
        hauteur_plafond: hauteurPlafond,
        temperature_consigne: temperatureConsigne,
        type_emetteur_override: typeEmetteur || null,
        type_isolation_override: typeIsolationOverride || null,
      };

      const result = await calculateSizing(folder.id, params);
      setSizingResult(result);
    } catch (error: unknown) {
      console.error("Erreur lors du calcul:", error);
      const message = error instanceof Error ? error.message : "Erreur lors du calcul de dimensionnement";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [folder, property, surfaceChauffee, hauteurPlafond, temperatureConsigne, typeEmetteur, typeIsolationOverride]);

  // Debounce pour éviter trop de calculs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recalculer quand les paramètres changent
  useEffect(() => {
    if (open && debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (open) {
      debounceTimerRef.current = setTimeout(() => {
        performCalculation();
      }, 500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [open, surfaceChauffee, hauteurPlafond, temperatureConsigne, typeEmetteur, typeIsolationOverride, performCalculation]);

  // Génération PDF
  const handleGeneratePdf = async () => {
    if (!folder?.id || !sizingResult) {
      toast.error("Calcul de dimensionnement requis avant la génération du PDF");
      return;
    }

    setGeneratingPdf(true);
    try {
      const params: SizingRequest = {
        surface_chauffee: surfaceChauffee,
        hauteur_plafond: hauteurPlafond,
        temperature_consigne: temperatureConsigne,
        type_emetteur_override: typeEmetteur || null,
        type_isolation_override: typeIsolationOverride || null,
      };

      const blob = await generateSizingPdf(folder.id, {
        sizing_params: params,
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `note_dimensionnement_${folder.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("PDF généré avec succès");
    } catch (error: unknown) {
      console.error("Erreur lors de la génération du PDF:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la génération du PDF";
      toast.error(message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Validation et sauvegarde du PDF
  const handleValidate = async () => {
    if (!folder?.id || !sizingResult) {
      toast.error("Calcul de dimensionnement requis avant la validation");
      return;
    }

    setSavingPdf(true);
    try {
      const params: SizingRequest = {
        surface_chauffee: surfaceChauffee,
        hauteur_plafond: hauteurPlafond,
        temperature_consigne: temperatureConsigne,
        type_emetteur_override: typeEmetteur || null,
        type_isolation_override: typeIsolationOverride || null,
      };

      await saveSizingPdf(folder.id, {
        sizing_params: params,
      });

      // Rafraîchir le dossier pour obtenir les nouvelles données
      const updatedFolder = await getFolder(folder.id);
      
      // Appeler le callback pour mettre à jour le dossier dans le parent
      if (onFolderUpdate) {
        onFolderUpdate(updatedFolder);
      }

      toast.success("Note de dimensionnement validée et sauvegardée");
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Erreur lors de la validation:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la validation";
      toast.error(message);
    } finally {
      setSavingPdf(false);
    }
  };

  // Vérifier si les paramètres sont valides
  const isValidParams = surfaceChauffee !== null && hauteurPlafond !== null && property?.construction_year && folder.zone_climatique;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] w-[92vw] sm:max-w-[90vw] sm:w-[90vw] lg:max-w-[88vw] lg:w-[88vw] max-h-[95vh] overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
        <DialogHeader className="pb-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 flex-shrink-0">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold leading-tight break-words">
                Dimensionnement de la pompe à chaleur
              </DialogTitle>
              <DialogDescription className="mt-2 text-base leading-relaxed break-words">
                Calculez la puissance nécessaire et ajustez les paramètres en temps réel
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 md:space-y-8 py-2">
          {/* Section Paramètres */}
          <Card className="border-2">
            <CardHeader className="pb-4 px-6 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 flex-shrink-0" />
                    <span className="break-words">Paramètres du logement</span>
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed break-words">
                    Modifiez les valeurs ci-dessous pour ajuster le dimensionnement
                  </CardDescription>
                </div>
                {!isValidParams && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600 flex-shrink-0 self-start sm:self-auto">
                    <AlertCircle className="h-3 w-3 mr-1.5" />
                    <span className="whitespace-nowrap">Paramètres manquants</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                <div className="space-y-2.5">
                  <Label htmlFor="surface" className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">Surface chauffée</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">(m²)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="surface"
                      type="number"
                      step="0.1"
                      min="1"
                      value={surfaceChauffee ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        setSurfaceChauffee(val);
                      }}
                      placeholder={property?.surface_m2?.toString() || "Ex: 120"}
                      className="pr-10 w-full"
                    />
                    {property?.surface_m2 && (
                      <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    )}
                  </div>
                  {property?.surface_m2 && (
                    <p className="text-xs text-muted-foreground truncate" title={`Depuis le logement: ${property.surface_m2} m²`}>
                      Depuis le logement: {property.surface_m2} m²
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="hauteur" className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">Hauteur sous plafond</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">(m)</span>
                  </Label>
                  <Input
                    id="hauteur"
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={hauteurPlafond ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      setHauteurPlafond(val);
                    }}
                    placeholder="Ex: 2.5"
                    className="w-full"
                  />
                  {(folder.data?.avg_ceiling_height as number) && (
                    <p className="text-xs text-muted-foreground truncate" title={`Depuis le dossier: ${folder.data.avg_ceiling_height} m`}>
                      Depuis le dossier: {String(folder.data.avg_ceiling_height)} m
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="temperature" className="flex items-center gap-1.5 text-sm font-medium">
                    <Thermometer className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">Température de consigne</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">(°C)</span>
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="15"
                    max="25"
                    value={temperatureConsigne}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 19.0;
                      setTemperatureConsigne(val);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="emetteur" className="text-sm font-medium">Type d'émetteur</Label>
                  <Select
                    value={typeEmetteur || ""}
                    onValueChange={(value) => setTypeEmetteur(value as "BT" | "MT_HT" | null)}
                  >
                    <SelectTrigger id="emetteur" className="w-full">
                      <SelectValue placeholder="Sélectionner" className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[--radix-select-trigger-width]">
                      <SelectItem value="BT">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="break-words">Basse température (Plancher chauffant)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="MT_HT">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                          <span className="break-words">Moyenne/Haute température (Radiateurs)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {folder.emitter_type && (
                    <p className="text-xs text-muted-foreground truncate" title={`Depuis le dossier: ${folder.emitter_type === "BASSE_TEMPERATURE" ? "Basse température" : "Moyenne/Haute température"}`}>
                      Depuis le dossier:{" "}
                      {folder.emitter_type === "BASSE_TEMPERATURE"
                        ? "Basse température"
                        : "Moyenne/Haute température"}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="isolation" className="flex items-center gap-2 text-sm font-medium flex-wrap">
                    <span>Type d'isolation</span>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">Override</Badge>
                  </Label>
                  <Select
                    value={typeIsolationOverride || ""}
                    onValueChange={(value) =>
                      setTypeIsolationOverride(
                        value ? (value as "faible" | "bonne" | "tres_bonne") : null
                      )
                    }
                  >
                    <SelectTrigger id="isolation" className="w-full">
                      <SelectValue placeholder="Auto (calculé automatiquement)" className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faible">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="truncate">Faible</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bonne">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                          <span className="truncate">Bonne</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tres_bonne">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="truncate">Très bonne</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground break-words">
                    Par défaut, calculé depuis les données du dossier
                  </p>
                </div>

                {/* Info sur le logement */}
                <div className="space-y-3 p-4 md:p-5 rounded-lg border-2 border-dashed bg-muted/30">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Informations logement</span>
                  </Label>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {property?.construction_year && (
                      <div className="break-words">
                        <span className="font-medium">Construction:</span>{" "}
                        <span className="truncate">{property.construction_year}</span>
                      </div>
                    )}
                    {folder.zone_climatique && (
                      <div className="break-words">
                        <span className="font-medium">Zone climatique:</span>{" "}
                        <span className="truncate">{folder.zone_climatique.toUpperCase()}</span>
                      </div>
                    )}
                    {property?.base_temperature !== null && property?.base_temperature !== undefined && (
                      <div className="break-words">
                        <span className="font-medium">Temp. base:</span>{" "}
                        <span className="truncate">{property.base_temperature}°C</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Résultats */}
          {loading && (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium break-words text-center">Calcul en cours...</p>
                <p className="text-sm text-muted-foreground mt-2 break-words text-center max-w-md">
                  Analyse des paramètres et calcul de la puissance optimale
                </p>
              </CardContent>
            </Card>
          )}

          {sizingResult && !loading && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-5 px-6 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="truncate">Résultats du dimensionnement</span>
                  </CardTitle>
                  <Badge variant="default" className="bg-primary flex-shrink-0 self-start sm:self-auto">
                    <Zap className="h-3 w-3 mr-1.5" />
                    <span className="whitespace-nowrap">Calculé</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                {/* Résultats principaux - Mise en avant */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="relative rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5 md:p-6 shadow-lg min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-muted-foreground truncate">
                          Puissance préconisée
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                      <span className="text-3xl md:text-4xl font-bold text-primary break-words">
                        {sizingResult.Puissance_Estimee_kW}
                      </span>
                      <span className="text-lg md:text-xl font-semibold text-muted-foreground whitespace-nowrap flex-shrink-0">kW</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-primary/20">
                      <p className="text-xs text-muted-foreground break-words leading-relaxed">
                        Puissance nécessaire pour couvrir les déperditions à la température de base
                      </p>
                    </div>
                  </div>

                  <div className="relative rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-5 md:p-6 shadow-lg min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-muted-foreground truncate">
                          Besoins annuels
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                      <span className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 break-words">
                        {Math.round(sizingResult.Besoins_Chaleur_Annuel_kWh).toLocaleString()}
                      </span>
                      <span className="text-lg md:text-xl font-semibold text-muted-foreground whitespace-nowrap flex-shrink-0">kWh/an</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-blue-300/20">
                      <p className="text-xs text-muted-foreground break-words leading-relaxed">
                        Consommation annuelle estimée pour le chauffage
                      </p>
                    </div>
                  </div>
                </div>

                {/* Résultats secondaires */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="rounded-lg border bg-card p-3 md:p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground truncate">Régime</span>
                    </div>
                    <p className="text-sm font-semibold break-words">
                      {sizingResult.Regime_Temperature}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-card p-3 md:p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        Taux de couverture
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{sizingResult.Taux_Couverture}%</p>
                  </div>

                  <div className="rounded-lg border bg-card p-3 md:p-4 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-2 truncate">Volume</div>
                    <p className="text-sm font-semibold break-words">
                      {sizingResult.Details_Calcul.Volume_Chauffe_m3.toFixed(0)} m³
                    </p>
                  </div>

                  <div className="rounded-lg border bg-card p-3 md:p-4 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-2 truncate">
                      Coefficient G
                    </div>
                    <p className="text-sm font-semibold break-words">
                      {sizingResult.Details_Calcul.G_Coefficient_Wm3K.toFixed(2)} W/m³·K
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Détails techniques */}
                <div className="rounded-lg border-2 border-muted bg-muted/30 p-5 md:p-6">
                  <h4 className="font-semibold mb-4 md:mb-5 flex items-center gap-2">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span className="break-words">Détails techniques du calcul</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 text-sm">
                    <div className="min-w-0">
                      <span className="text-muted-foreground block mb-2 truncate">Delta T</span>
                      <span className="font-semibold break-words">
                        {sizingResult.Details_Calcul.Delta_T_K.toFixed(1)} K
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground block mb-2 truncate">Facteur émetteur</span>
                      <span className="font-semibold break-words">
                        {sizingResult.Details_Calcul.Facteur_Correction_Emetteur}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground block mb-2 truncate">Temp. ext. base</span>
                      <span className="font-semibold break-words">
                        {sizingResult.Details_Calcul.Teb_Ajustee > 0
                          ? `+${sizingResult.Details_Calcul.Teb_Ajustee}`
                          : sizingResult.Details_Calcul.Teb_Ajustee}
                        °C
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground block mb-2 truncate">Puissance brute</span>
                      <span className="font-semibold break-words">
                        {sizingResult.Details_Calcul.Puissance_kW_Brute.toFixed(2)} kW
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!sizingResult && !loading && isValidParams && (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium break-words text-center">En attente de calcul</p>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-md break-words">
                  Les paramètres sont valides. Le calcul se déclenchera automatiquement dans quelques
                  instants...
                </p>
              </CardContent>
            </Card>
          )}

          {!isValidParams && !loading && (
            <Card className="border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-600 flex-shrink-0" />
                <p className="text-lg font-medium break-words text-center">Paramètres incomplets</p>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-md break-words leading-relaxed">
                  Veuillez renseigner au minimum la surface chauffée et la hauteur sous plafond
                  pour effectuer le calcul.
                </p>
                <ul className="mt-5 text-sm text-left space-y-2 text-muted-foreground w-full max-w-md">
                  {!surfaceChauffee && (
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="break-words">Surface chauffée requise</span>
                    </li>
                  )}
                  {!hauteurPlafond && (
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="break-words">Hauteur sous plafond requise</span>
                    </li>
                  )}
                  {!property?.construction_year && (
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="break-words">Année de construction requise (dans le logement)</span>
                    </li>
                  )}
                  {!folder.zone_climatique && (
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="break-words">Zone climatique requise</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-2 pt-6 mt-6 border-t px-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Fermer
          </Button>
          <Button
            onClick={handleGeneratePdf}
            disabled={!sizingResult || generatingPdf || loading || savingPdf}
            variant="outline"
            className="min-w-[160px] w-full sm:w-auto"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="truncate">Génération...</span>
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Générer le PDF</span>
              </>
            )}
          </Button>
          <Button
            onClick={handleValidate}
            disabled={!sizingResult || savingPdf || generatingPdf || loading}
            className="min-w-[160px] w-full sm:w-auto"
          >
            {savingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="truncate">Validation...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Valider</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
