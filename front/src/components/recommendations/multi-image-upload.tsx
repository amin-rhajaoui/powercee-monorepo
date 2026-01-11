"use client";

import { useState, useRef } from "react";
import { Camera, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { s3UrlToProxyUrl, api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function MultiImageUpload({
  value = [],
  onChange,
  disabled,
  maxImages = 10,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validation du nombre d'images
    if (value.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} photos autorisees.`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validation du type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image valide.`);
          continue;
        }

        // Validation de la taille (5Mo)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} est trop volumineux (max 5Mo).`);
          continue;
        }

        // Upload vers S3
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post("/upload", formData);
        const data = await response.json();

        if (data.url) {
          newUrls.push(data.url);
        }
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
        toast.success(`${newUrls.length} photo(s) ajoutee(s).`);
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload des photos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);

    // Clear error state for this image
    const newErrors = new Set(imageErrors);
    newErrors.delete(index);
    setImageErrors(newErrors);
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  return (
    <div className="space-y-4">
      {/* Grid de photos */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted/30 group"
            >
              {!imageErrors.has(index) ? (
                <img
                  src={s3UrlToProxyUrl(url)}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  Erreur
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className={cn(
                  "absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-destructive/90",
                  disabled && "cursor-not-allowed"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton d'ajout */}
      {value.length < maxImages && (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer",
            "hover:border-primary hover:bg-muted/50 transition",
            (disabled || uploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Upload en cours...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-muted-foreground" />
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">
                Ajouter des photos ({value.length}/{maxImages})
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, max 5Mo par photo
              </span>
            </>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled || uploading}
      />

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} photo(s) - Cliquez sur une photo pour la supprimer
        </p>
      )}
    </div>
  );
}
