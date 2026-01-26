"use client";

import { use, useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  ClipboardList,
  Receipt,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getFolder, type Folder } from "@/lib/api/folders";
import {
  getFolderDocuments,
  downloadDocument,
  type Document,
  type DocumentType,
} from "@/lib/api/documents";

type DocumentsPageProps = {
  params: Promise<{ folderId: string }>;
};

const DOCUMENT_CONFIG: Record<
  DocumentType,
  { label: string; icon: typeof FileText; order: number }
> = {
  quote: { label: "Devis", icon: Receipt, order: 1 },
  sizing_note: { label: "Note de dimensionnement", icon: ClipboardList, order: 2 },
  tva_attestation: { label: "Attestation TVA", icon: FileCheck, order: 3 },
  cdc_cee: { label: "Cadre de contribution CEE", icon: ScrollText, order: 4 },
};

function DocumentsPageContent({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  // Dédupliquer les documents par type (garder le plus récent)
  const uniqueDocuments = useMemo(() => {
    const docMap = new Map<DocumentType, Document>();

    // Trier par date décroissante pour garder le plus récent
    const sorted = [...documents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const doc of sorted) {
      if (!docMap.has(doc.document_type)) {
        docMap.set(doc.document_type, doc);
      }
    }

    // Trier par ordre défini dans DOCUMENT_CONFIG
    return Array.from(docMap.values()).sort(
      (a, b) =>
        (DOCUMENT_CONFIG[a.document_type]?.order ?? 99) -
        (DOCUMENT_CONFIG[b.document_type]?.order ?? 99)
    );
  }, [documents]);

  // Document sélectionné
  const selectedDoc = useMemo(
    () => uniqueDocuments.find((d) => d.document_type === selectedDocType) ?? null,
    [uniqueDocuments, selectedDocType]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setPreviewUrls({});
      setPreviewErrors({});

      try {
        const [folderData, documentsData] = await Promise.all([
          getFolder(folderId),
          getFolderDocuments(folderId),
        ]);

        setFolder(folderData);
        setDocuments(documentsData);
      } catch (err) {
        console.error("Erreur chargement:", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement des données"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [folderId]);

  // Sélectionner le premier document par défaut
  useEffect(() => {
    if (uniqueDocuments.length > 0 && !selectedDocType) {
      setSelectedDocType(uniqueDocuments[0].document_type);
    }
  }, [uniqueDocuments, selectedDocType]);

  // Charger les previews
  useEffect(() => {
    if (uniqueDocuments.length === 0) return;

    blobUrlsRef.current.forEach((u) => window.URL.revokeObjectURL(u));
    blobUrlsRef.current = [];

    const urls: Record<string, string> = {};
    const errors: Record<string, string> = {};

    const loadPreviews = async () => {
      await Promise.all(
        uniqueDocuments.map(async (doc) => {
          try {
            const blob = await downloadDocument(doc.id);
            const url = window.URL.createObjectURL(blob);
            urls[doc.id] = url;
            blobUrlsRef.current.push(url);
          } catch (e) {
            errors[doc.id] =
              e instanceof Error ? e.message : "Impossible de charger l'aperçu";
          }
        })
      );
      setPreviewUrls((prev) => ({ ...prev, ...urls }));
      setPreviewErrors((prev) => ({ ...prev, ...errors }));
    };

    void loadPreviews();
    return () => {
      blobUrlsRef.current.forEach((u) => window.URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
    };
  }, [uniqueDocuments]);

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const filenameMap: Record<string, string> = {
        sizing_note: "note_dimensionnement.pdf",
        quote: "devis.pdf",
        tva_attestation: "attestation_tva.pdf",
        cdc_cee: "cdc_cee.pdf",
      };

      a.download = filenameMap[doc.document_type] || `${doc.document_type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Telechargement demarre");
    } catch (err) {
      console.error("Erreur telechargement:", err);
      toast.error("Erreur lors du telechargement");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      for (const doc of uniqueDocuments) {
        await handleDownload(doc);
        // Petit délai entre chaque téléchargement
        await new Promise((r) => setTimeout(r, 300));
      }
      toast.success("Tous les documents ont ete telecharges");
    } catch (err) {
      console.error("Erreur telechargement:", err);
      toast.error("Erreur lors du telechargement");
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/app/folders/${folderId}/quote/simulation`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">Documents du dossier</h1>
                  {folder?.quote_number && (
                    <Badge variant="secondary" className="font-mono">
                      {folder.quote_number}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {uniqueDocuments.length} document{uniqueDocuments.length > 1 ? "s" : ""} disponible{uniqueDocuments.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <Button
              onClick={handleDownloadAll}
              disabled={downloadingAll || uniqueDocuments.length === 0}
              className="hidden sm:flex"
            >
              {downloadingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Tout telecharger
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {uniqueDocuments.length === 0 ? (
        <div className="container mx-auto py-12 px-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun document genere pour ce dossier. Veuillez finaliser le dossier depuis
              la page de simulation.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Liste des documents */}
            <div className="lg:w-72 flex-shrink-0">
              <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
                <div className="p-3 border-b bg-muted/50">
                  <h2 className="font-medium text-sm text-muted-foreground">Documents</h2>
                </div>
                <div className="p-2">
                  {uniqueDocuments.map((doc) => {
                    const config = DOCUMENT_CONFIG[doc.document_type];
                    const Icon = config?.icon ?? FileText;
                    const isSelected = selectedDocType === doc.document_type;
                    const hasPreview = !!previewUrls[doc.id];
                    const hasError = !!previewErrors[doc.id];

                    return (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocType(doc.document_type)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            isSelected ? "bg-primary-foreground/20" : "bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {config?.label ?? doc.document_type}
                          </p>
                          <p
                            className={cn(
                              "text-xs truncate",
                              isSelected
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {hasError ? (
                              "Erreur de chargement"
                            ) : hasPreview ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Pret
                              </span>
                            ) : (
                              "Chargement..."
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Download all button mobile */}
              <Button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="w-full mt-4 lg:hidden"
              >
                {downloadingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Tout telecharger
              </Button>
            </div>

            {/* Main - Aperçu du document */}
            <div className="flex-1 min-w-0">
              {selectedDoc && (
                <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
                  {/* Document header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const config = DOCUMENT_CONFIG[selectedDoc.document_type];
                        const Icon = config?.icon ?? FileText;
                        return (
                          <>
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-medium">
                              {config?.label ?? selectedDoc.document_type}
                            </h3>
                          </>
                        );
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedDoc)}
                      disabled={downloading === selectedDoc.id}
                    >
                      {downloading === selectedDoc.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Telecharger
                    </Button>
                  </div>

                  {/* Document preview */}
                  <div className="aspect-[8.5/11] lg:aspect-auto lg:h-[calc(100vh-220px)] bg-muted/50">
                    {previewErrors[selectedDoc.id] ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-muted-foreground">
                        <div className="p-4 rounded-full bg-destructive/10">
                          <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-foreground">
                            Impossible de charger l&apos;apercu
                          </p>
                          <p className="text-sm mt-1">{previewErrors[selectedDoc.id]}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(selectedDoc)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Telecharger le fichier
                        </Button>
                      </div>
                    ) : previewUrls[selectedDoc.id] ? (
                      <iframe
                        src={previewUrls[selectedDoc.id]}
                        className="w-full h-full border-0"
                        title={
                          DOCUMENT_CONFIG[selectedDoc.document_type]?.label ??
                          selectedDoc.document_type
                        }
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Chargement de l&apos;apercu...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const resolvedParams = use(params);
  return <DocumentsPageContent folderId={resolvedParams.folderId} />;
}
