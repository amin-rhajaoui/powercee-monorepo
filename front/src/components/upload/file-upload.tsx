"use client";

import { useState, useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  value,
  onChange,
  onFileChange,
  disabled,
  label = "Choisir un fichier",
  accept = "application/pdf",
  maxSizeMB = 10,
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du type MIME
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    if (!acceptedTypes.some((type) => file.type === type || file.type.match(type.replace("*", ".*")))) {
      toast.error(`Type de fichier non supporté. Types acceptés : ${accept}`);
      return;
    }

    // Validation de la taille
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Le fichier est trop volumineux (max ${maxSizeMB}Mo).`);
      return;
    }

    setFileName(file.name);

    // Notifier le parent du fichier sélectionné
    if (onFileChange) {
      onFileChange(file);
    }

    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    setFileName(null);
    onChange("");
    if (onFileChange) {
      onFileChange(null);
    }
  };

  // Extraire le nom du fichier depuis l'URL S3 si disponible
  const displayName = fileName || (value ? decodeURIComponent(value.split("/").pop() || "Fichier") : null);
  const hasFile = !!displayName;

  return (
    <div className="flex flex-col gap-2">
      {hasFile ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <FileText className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">PDF</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className={cn(
              "p-1.5 rounded-full hover:bg-destructive/10 transition",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer",
            "hover:border-primary hover:bg-muted/50 transition",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">PDF, max {maxSizeMB}Mo</span>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
