"use client";

import { useState, useRef, useEffect } from "react";
import { s3UrlToProxyUrl } from "@/lib/api";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, onFileChange, disabled }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Reset image error when value changes
  useEffect(() => {
    setImageError(false);
    // Réinitialiser previewUrl si une nouvelle valeur arrive de l'extérieur
    if (value && !previewUrlRef.current) {
      setPreviewUrl(null);
    }
  }, [value, previewUrlRef]);

  // Nettoyer l'URL de prévisualisation lors du démontage
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation locale basique
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5Mo).");
      return;
    }

    // Nettoyer l'ancienne URL de prévisualisation si elle existe
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    // Créer une nouvelle URL de prévisualisation
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);

    // Notifier le parent du fichier sélectionné
    if (onFileChange) {
      onFileChange(file);
    }

    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    // Nettoyer l'URL de prévisualisation
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    onChange("");
    if (onFileChange) {
      onFileChange(null);
    }
  };

  // Utiliser l'URL de prévisualisation si disponible, sinon l'URL S3 existante
  const imageSrc = previewUrl || (value ? s3UrlToProxyUrl(value) : null);

  return (
    <div className="flex flex-col items-center gap-4">
      {imageSrc ? (
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border">
          {!imageError ? (
            <img
              src={imageSrc || ""}
              alt="Logo preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error("Erreur de chargement de l'image:", imageSrc, e);
                setImageError(true);
              }}
              onLoad={() => {
                setImageError(false);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
              Erreur de chargement
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            w-40 h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer
            hover:border-primary transition bg-muted/50
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Choisir un logo</span>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

