"use client";

import { use, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { simulateQuote, type QuotePreview, type QuoteLine } from "@/lib/api/quote";
import {
  createQuoteDraft,
  updateQuoteDraft,
  listQuoteDrafts,
  deleteQuoteDraft,
  generateDraftName,
  type QuoteDraft,
  type QuoteDraftCreate,
} from "@/lib/api/quote-drafts";
import { getFolder, type Folder } from "@/lib/api/folders";

import { QuoteLinesTable } from "./_components/quote-lines-table";
import { QuoteSummary } from "./_components/quote-summary";
import { DraftSidebar } from "./_components/draft-sidebar";

type SimulationPageProps = {
  params: Promise<{ folderId: string }>;
};
//refacto: ne pas se repeter
const getQuoteTotals = (
  lines: QuoteLine[],
  ceePrime: number,
  customRac: number | null
) => {
  const baseTotals = lines.reduce(
    (acc, line) => ({
      total_ht: acc.total_ht + line.total_ht,
      total_ttc: acc.total_ttc + line.total_ttc,
    }),
    { total_ht: 0, total_ttc: 0 }
  );

  const calculatedRac = baseTotals.total_ttc - ceePrime;

  // Si le RAC est personnalisé, on ajuste le Total TTC en conséquence
  if (customRac !== null) {
    const adjustedTotalTtc = customRac + ceePrime;
    return {
      total_ht: baseTotals.total_ht,
      total_ttc: adjustedTotalTtc,
      rac_ttc: customRac,
    };
  }

  // Sinon, calcul normal
  return {
    total_ht: baseTotals.total_ht,
    total_ttc: baseTotals.total_ttc,
    rac_ttc: calculatedRac,
  };
};

function SimulationPageContent({ folderId }: { folderId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Mémoiser productIds pour éviter de recréer le tableau à chaque render
  const productIds = useMemo(
    () => searchParams.get("product_ids")?.split(",") || [],
    [searchParams]
  );

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [quote, setQuote] = useState<QuotePreview | null>(null);
  const [editedLines, setEditedLines] = useState<QuoteLine[]>([]);
  const [drafts, setDrafts] = useState<QuoteDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customRac, setCustomRac] = useState<number | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Debounce timer for RAC recalculation
  const racRecalcTimerRef = useRef<NodeJS.Timeout | null>(null);



  // Load folder and initial simulation
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load folder and drafts in parallel
      const [folderData, draftsData] = await Promise.all([
        getFolder(folderId),
        listQuoteDrafts(folderId),
      ]);

      setFolder(folderData);
      const sortedDrafts = draftsData.drafts.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setDrafts(sortedDrafts);

      // Load simulation
      const simulationResult = await simulateQuote(folderData.module_code || "BAR-TH-171", {
        folder_id: folderId,
        product_ids: productIds,
      });

      setQuote(simulationResult);

      // Auto-load most recent draft if exists
      if (sortedDrafts.length > 0) {
        const lastDraft = sortedDrafts[0];
        setEditedLines(lastDraft.lines);
        setCurrentDraftId(lastDraft.id);
        setCustomRac(lastDraft.rac_ttc);
        setHasUnsavedChanges(false);
        toast.info(`Reprise du brouillon "${lastDraft.name}"`);
      } else {
        setEditedLines(simulationResult.lines);
      }

    } catch (err) {
      console.error("Erreur chargement:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors du chargement des données"
      );
    } finally {
      setLoading(false);
    }
  }, [folderId, productIds]);

  useEffect(() => {
    if (productIds.length === 0) {
      setError("Aucun produit sélectionné");
      setLoading(false);
      return;
    }

    loadInitialData();
  }, [productIds, loadInitialData]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (racRecalcTimerRef.current) {
        clearTimeout(racRecalcTimerRef.current);
      }
    };
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      const data = await listQuoteDrafts(folderId);
      setDrafts(data.drafts.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
    } catch (err) {
      console.error("Erreur chargement brouillons:", err);
      toast.error("Erreur lors du chargement des brouillons");
    }
  }, [folderId]);

  const handleAutoSave = useCallback(async () => {
    if (!quote) return;

    try {
      const totals = getQuoteTotals(editedLines, quote.cee_prime, customRac);

      const draftData: QuoteDraftCreate = {
        name: currentDraftId ? drafts.find((d) => d.id === currentDraftId)?.name || generateDraftName() : generateDraftName(),
        folder_id: folderId,
        module_code: folder?.module_code || "BAR-TH-171",
        product_ids: productIds,
        lines: editedLines,
        total_ht: totals.total_ht,
        total_ttc: totals.total_ttc,
        rac_ttc: totals.rac_ttc,
        cee_prime: quote.cee_prime,
        margin_ht: quote.margin_ht,
        margin_percent: quote.margin_percent,
        strategy_used: quote.strategy_used,
        warnings: quote.warnings,
      };

      if (currentDraftId) {
        await updateQuoteDraft(currentDraftId, draftData);
      } else {
        const newDraft = await createQuoteDraft(draftData);
        setCurrentDraftId(newDraft.id);
      }

      setHasUnsavedChanges(false);
      await loadDrafts();
      toast.success("Brouillon sauvegardé automatiquement");
    } catch (err) {
      console.error("Erreur sauvegarde automatique:", err);
    }
  }, [quote, editedLines, currentDraftId, drafts, folderId, folder?.module_code, productIds, customRac, loadDrafts]);

  // Trigger auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    // Autosave after 2 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);
  }, [handleAutoSave]);

  const handleUpdateLine = useCallback(
    (index: number, field: keyof QuoteLine, value: string | number) => {
      setEditedLines((prev) => {
        const updated = [...prev];
        const line = { ...updated[index] };

        if (field === "title") {
          line.title = value as string;
        } else if (field === "description") {
          line.description = value as string;
        } else if (field === "unit_price_ht") {
          const price = parseFloat(value as string) || 0;
          line.unit_price_ht = price;
          line.total_ht = price * line.quantity;
          line.total_ttc = line.total_ht * (1 + line.tva_rate / 100);
        } else if (field === "quantity") {
          const qty = parseInt(value as string) || 1;
          line.quantity = qty;
          line.total_ht = line.unit_price_ht * qty;
          line.total_ttc = line.total_ht * (1 + line.tva_rate / 100);
        }

        updated[index] = line;
        setHasUnsavedChanges(true);
        triggerAutoSave();
        return updated;
      });
    },
    [triggerAutoSave]
  );

  const handleUpdateRac = useCallback((value: number) => {
    setCustomRac(value);
    setHasUnsavedChanges(true);
    triggerAutoSave();

    // Debounce: Clear previous timer
    if (racRecalcTimerRef.current) {
      clearTimeout(racRecalcTimerRef.current);
    }

    // Only recalculate if strategy is COST_PLUS
    if (quote?.strategy_used === "COST_PLUS" && folder) {
      // Set loading state
      setIsRecalculating(true);

      // Debounce the API call (500ms delay)
      racRecalcTimerRef.current = setTimeout(async () => {
        try {
          const simulationResult = await simulateQuote(
            folder.module_code || "BAR-TH-171",
            {
              folder_id: folderId,
              product_ids: productIds,
              target_rac: value,
            }
          );

          // Update quote and lines with new calculation
          setQuote(simulationResult);
          setEditedLines(simulationResult.lines);
        } catch (err) {
          console.error("Erreur recalcul:", err);
          toast.error("Erreur lors du recalcul du devis");
        } finally {
          setIsRecalculating(false);
        }
      }, 500);
    }
  }, [quote?.strategy_used, folder, folderId, productIds]);



  const handleManualSave = async () => {
    if (!quote) return;

    setIsSaving(true);
    try {
      const totals = calculateTotals();
      const draftData: QuoteDraftCreate = {
        name: generateDraftName(),
        folder_id: folderId,
        module_code: folder?.module_code || "BAR-TH-171",
        product_ids: productIds,
        lines: editedLines,
        total_ht: totals.total_ht,
        total_ttc: totals.total_ttc,
        rac_ttc: totals.rac_ttc,
        cee_prime: quote.cee_prime,
        margin_ht: quote.margin_ht,
        margin_percent: quote.margin_percent,
        strategy_used: quote.strategy_used,
        warnings: quote.warnings,
      };

      const newDraft = await createQuoteDraft(draftData);
      setCurrentDraftId(newDraft.id);
      setHasUnsavedChanges(false);
      await loadDrafts();
      toast.success("Brouillon sauvegardé");
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDraft = async (draft: QuoteDraft) => {
    setEditedLines(draft.lines);
    setCurrentDraftId(draft.id);
    setCustomRac(draft.rac_ttc);
    setHasUnsavedChanges(false);
    toast.success(`Brouillon "${draft.name}" chargé`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteQuoteDraft(draftId);
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
      await loadDrafts();
      toast.success("Brouillon supprimé");
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleGenerateQuote = () => {
    // TODO: Navigate to quote PDF generation or save final quote
    toast.success("Génération du devis (à implémenter)");
    router.push(`/app/folders/${folderId}/quote`);
  };

  const calculateTotals = () => {
    return getQuoteTotals(editedLines, quote?.cee_prime || 0, customRac);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/app/folders/${folderId}/quote`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Simulation du devis</h1>
            <p className="text-muted-foreground">
              Ajustez les lignes du devis avant génération
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Non sauvegardé
            </Badge>
          )}
          <Button onClick={handleManualSave} disabled={isSaving} variant="outline">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Sauvegarder brouillon
          </Button>
          <Button onClick={handleGenerateQuote}>
            <FileText className="mr-2 h-4 w-4" />
            Générer le devis
          </Button>
        </div>
      </div>

      {/* Strategy Badge */}
      {quote && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Stratégie:</span>
          <Badge variant="default">
            {quote.strategy_used === "COST_PLUS"
              ? "Coût + Marge"
              : "Grille héritée"}
          </Badge>
          {isRecalculating && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Recalcul...
            </Badge>
          )}
        </div>
      )}

      {/* Warnings */}
      {quote && quote.warnings.length > 0 && (
        <Alert>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {quote.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quote Lines Table (70%) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lignes du devis</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteLinesTable lines={editedLines} onUpdateLine={handleUpdateLine} />
            </CardContent>
          </Card>

          <QuoteSummary
            totalHt={totals.total_ht}
            totalTtc={totals.total_ttc}
            ceePrime={quote?.cee_prime || 0}
            racTtc={totals.rac_ttc}
            marginHt={quote?.margin_ht || 0}
            marginPercent={quote?.margin_percent || 0}
            onUpdateRac={handleUpdateRac}
          />
        </div>

        {/* Right: Draft Sidebar (30%) */}
        <div className="lg:col-span-1">
          <DraftSidebar
            drafts={drafts}
            currentDraftId={currentDraftId}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={handleDeleteDraft}
          />
        </div>
      </div>
    </div>
  );
}

export default function SimulationPage({ params }: SimulationPageProps) {
  const resolvedParams = use(params);
  return <SimulationPageContent folderId={resolvedParams.folderId} />;
}
