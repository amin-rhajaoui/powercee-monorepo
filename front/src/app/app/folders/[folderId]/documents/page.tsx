"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getFolder, type Folder } from "@/lib/api/folders";
import { getFolderDocuments, downloadDocument, type Document } from "@/lib/api/documents";

type DocumentsPageProps = {
  params: Promise<{ folderId: string }>;
};

const DOCUMENT_LABELS: Record<string, string> = {
  sizing_note: "Note de dimensionnement",
  quote: "Devis",
  tva_attestation: "Attestation TVA",
  cdc_cee: "Cadre de contribution CEE",
};

function DocumentsPageContent({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  /** URLs blob pour l'aperçu (évite Access Denied sur S3 privé) */
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

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

  /** Charge les PDF via l'API (proxy) et crée des blob URLs pour l'iframe (évite Access Denied S3). */
  useEffect(() => {
    if (documents.length === 0) return;

    blobUrlsRef.current.forEach((u) => window.URL.revokeObjectURL(u));
    blobUrlsRef.current = [];

    const urls: Record<string, string> = {};
    const errors: Record<string, string> = {};

    const loadPreviews = async () => {
      await Promise.all(
        documents.map(async (doc) => {
          try {
            const blob = await downloadDocument(doc.id);
            const url = window.URL.createObjectURL(blob);
            urls[doc.id] = url;
            blobUrlsRef.current.push(url);
          } catch (e) {
            errors[doc.id] = e instanceof Error ? e.message : "Impossible de charger l'aperçu";
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
  }, [documents]);

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Noms de fichiers standardisés (sans espaces, avec underscores)
      const filenameMap: Record<string, string> = {
        sizing_note: "note_dimensionnement.pdf",
        quote: "devis.pdf",
        tva_attestation: "attestation_tva.pdf",
        cdc_cee: "cdc_cee.pdf",
      };
      
      a.download = filenameMap[doc.document_type] || `${doc.document_type}.pdf`;
      const body = document.body;
      body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      body.removeChild(a);
      toast.success("Téléchargement démarré");
    } catch (err) {
      console.error("Erreur téléchargement:", err);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

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
            <Link href={`/app/folders/${folderId}/quote/simulation`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents du devis</h1>
            <p className="text-muted-foreground">
              {folder?.quote_number && (
                <>
                  Numéro de devis: <Badge variant="outline">{folder.quote_number}</Badge>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Alert>
          <AlertDescription>
            Aucun document généré pour ce dossier. Veuillez finaliser le dossier depuis la page de simulation.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-[8.5/11] border rounded-lg overflow-hidden bg-muted">
                  {previewErrors[doc.id] ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-muted-foreground">
                      <AlertCircle className="h-8 w-8" />
                      <span className="text-sm text-center">{previewErrors[doc.id]}</span>
                    </div>
                  ) : previewUrls[doc.id] ? (
                    <iframe
                      src={previewUrls[doc.id]}
                      className="w-full h-full"
                      title={DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const resolvedParams = use(params);
  return <DocumentsPageContent folderId={resolvedParams.folderId} />;
}
