"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus } from "lucide-react";
import { ModuleDraft } from "@/lib/api/modules";

type DraftResumeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDraft: ModuleDraft | null;
  onResume: () => void;
  onNew: () => void;
};

export function DraftResumeDialog({
  open,
  onOpenChange,
  existingDraft,
  onResume,
  onNew,
}: DraftResumeDialogProps) {
  if (!existingDraft) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Brouillon existant trouvé
          </DialogTitle>
          <DialogDescription>
            Un brouillon existe déjà pour ce client et ce module. Que souhaitez-vous faire ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Étape actuelle :</span>{" "}
                <span className="text-muted-foreground">
                  Étape {existingDraft.current_step}
                </span>
              </div>
              <div>
                <span className="font-medium">Dernière modification :</span>{" "}
                <span className="text-muted-foreground">
                  {formatDate(existingDraft.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onNew}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau brouillon
          </Button>
          <Button
            type="button"
            onClick={onResume}
            className="flex-1 sm:flex-initial"
          >
            <FileText className="mr-2 h-4 w-4" />
            Reprendre le brouillon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

