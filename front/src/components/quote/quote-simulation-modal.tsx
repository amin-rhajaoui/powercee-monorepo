/**
 * @deprecated Ce composant est déprécié. Utilisez la page /quote/simulation à la place.
 * Conservé temporairement pour compatibilité.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  simulateQuote,
  type QuotePreview,
  type QuoteLine,
} from "@/lib/api/quote";

// ============================================================================
// Types
// ============================================================================

interface QuoteSimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleCode: string;
  folderId: string;
  productIds: string[];
  onConfirm: (quote: QuotePreview) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// Component
// ============================================================================

export function QuoteSimulationModal({
  open,
  onOpenChange,
  moduleCode,
  folderId,
  productIds,
  onConfirm,
}: QuoteSimulationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuotePreview | null>(null);
  const [editedLines, setEditedLines] = useState<QuoteLine[]>([]);

  // Load simulation when modal opens
  useEffect(() => {
    if (open && productIds.length > 0) {
      loadSimulation();
    }
  }, [open, folderId, productIds]);

  const loadSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await simulateQuote(moduleCode, {
        folder_id: folderId,
        product_ids: productIds,
      });
      setQuote(result);
      setEditedLines(result.lines);
    } catch (err) {
      console.error("Erreur simulation:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la simulation du devis"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update line
  const updateLine = useCallback(
    (index: number, field: keyof QuoteLine, value: string | number) => {
      setEditedLines((prev) => {
        const updated = [...prev];
        const line = { ...updated[index] };

        if (field === "description") {
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
        return updated;
      });
    },
    []
  );

  // Calculate totals from edited lines
  const totals = editedLines.reduce(
    (acc, line) => ({
      total_ht: acc.total_ht + line.total_ht,
      total_ttc: acc.total_ttc + line.total_ttc,
    }),
    { total_ht: 0, total_ttc: 0 }
  );

  const calculatedRac = totals.total_ttc - (quote?.cee_prime || 0);

  // Handle confirm
  const handleConfirm = () => {
    if (!quote) return;

    const updatedQuote: QuotePreview = {
      ...quote,
      lines: editedLines,
      total_ht: totals.total_ht,
      total_ttc: totals.total_ttc,
      rac_ttc: calculatedRac,
    };

    onConfirm(updatedQuote);
    toast.success("Devis confirme");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Simulation du devis
          </DialogTitle>
          <DialogDescription>
            Verifiez et ajustez les lignes du devis avant confirmation. Mode CEE
            uniquement (sans MaPrimeRenov).
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && quote && (
          <>
            {/* Warnings */}
            {quote.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {quote.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Strategy Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Strategie:</span>
              <Badge variant={quote.strategy_used === "LEGACY_GRID" ? "default" : "secondary"}>
                {quote.strategy_used === "LEGACY_GRID"
                  ? "Grille heritee"
                  : "Cout + Marge"}
              </Badge>
            </div>

            {/* Quote Lines Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="w-20 text-center">Qte</TableHead>
                    <TableHead className="w-28 text-right">Prix HT</TableHead>
                    <TableHead className="w-16 text-center">TVA</TableHead>
                    <TableHead className="w-28 text-right">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedLines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {line.is_editable ? (
                          <Input
                            value={line.description}
                            onChange={(e) =>
                              updateLine(index, "description", e.target.value)
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {line.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(index, "quantity", e.target.value)
                          }
                          className="h-8 w-16 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {line.is_editable ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unit_price_ht}
                            onChange={(e) =>
                              updateLine(index, "unit_price_ht", e.target.value)
                            }
                            className="h-8 w-28 text-right"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {formatCurrency(line.unit_price_ht)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {line.tva_rate}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.total_ttc)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="space-y-3 pt-4">
              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatCurrency(totals.total_ht)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total TTC</span>
                <span>{formatCurrency(totals.total_ttc)}</span>
              </div>

              <div className="flex justify-between text-sm text-green-600">
                <span>Prime CEE</span>
                <span>- {formatCurrency(quote.cee_prime)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Reste a Charge</span>
                <span>{formatCurrency(calculatedRac)}</span>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Marge estimee
                </span>
                <span>
                  {formatCurrency(quote.margin_ht)} ({quote.margin_percent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !!error || !quote}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generer le devis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
