"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText } from "lucide-react";
import type { QuoteDraft } from "@/lib/api/quote-drafts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DraftSidebarProps {
  drafts: QuoteDraft[];
  currentDraftId: string | null;
  onLoadDraft: (draft: QuoteDraft) => void;
  onDeleteDraft: (draftId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DraftSidebar({
  drafts,
  currentDraftId,
  onLoadDraft,
  onDeleteDraft,
}: DraftSidebarProps) {
  return (
    <Card className="h-fit sticky top-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Brouillons</CardTitle>
          <Badge variant="secondary">{drafts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {drafts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Aucun brouillon sauvegardé
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card
                  key={draft.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    currentDraftId === draft.id ? "border-primary bg-accent" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => onLoadDraft(draft)}
                      >
                        <p className="font-medium text-sm truncate">{draft.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(draft.updated_at)}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le brouillon</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer le brouillon "{draft.name}" ?
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteDraft(draft.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div
                      className="flex items-center justify-between text-xs"
                      onClick={() => onLoadDraft(draft)}
                    >
                      <span className="text-muted-foreground">
                        {draft.lines.length} ligne{draft.lines.length > 1 ? "s" : ""}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(draft.total_ttc)}
                      </span>
                    </div>
                    {currentDraftId === draft.id && (
                      <Badge variant="default" className="text-xs">
                        En cours
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
