"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("upload", formData);
      const data = await response.json();
      onChange(data.url);
      toast.success("Image uploadée avec succès.");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erreur lors de l'upload de l'image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {value ? (
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border">
          <Image
            src={value}
            alt="Logo preview"
            fill
            className="object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`
            w-40 h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer
            hover:border-primary transition bg-muted/50
            ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Choisir un logo</span>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}

