"use client";

import { use, useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getCompatiblePacs, type CompatiblePac } from "@/lib/api/sizing";
import { HeatPumpCard } from "@/components/products/heat-pump-card";
import { toast } from "sonner";

type QuotePageProps = {
  params: Promise<{ folderId: string }>;
};

function QuotePageContent({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [pacs, setPacs] = useState<CompatiblePac[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPacs() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getCompatiblePacs(folderId);
        setPacs(response.pacs);
      } catch (err: unknown) {
        console.error("Erreur lors du chargement des PAC:", err);
        const apiError = err as { status?: number; data?: { detail?: string } };
        if (apiError.status === 400) {
          setError(
            apiError.data?.detail ||
              "Le dimensionnement doit être validé avant de consulter les PAC compatibles."
          );
        } else if (apiError.status === 404) {
          notFound();
        } else {
          setError("Erreur lors du chargement des pompes à chaleur compatibles.");
          toast.error("Erreur lors du chargement des PAC");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadPacs();
  }, [folderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/app/folders/${folderId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Devis et signature</h1>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Impossible de charger les PAC</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => router.push(`/app/folders/${folderId}`)}
            >
              Retour au dossier
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/app/folders/${folderId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Devis et signature</h1>
          <p className="text-muted-foreground mt-1">
            Pompes à chaleur compatibles avec le dimensionnement
          </p>
        </div>
      </div>

      {/* PACs Grid */}
      {pacs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Aucune PAC compatible trouvée</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Aucune pompe à chaleur ne correspond aux critères de dimensionnement de ce dossier.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pacs.length} pompe{pacs.length > 1 ? "s" : ""} à chaleur compatible
              {pacs.length > 1 ? "s" : ""} trouvée{pacs.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacs.map((pac) => (
              <HeatPumpCard key={pac.id} pac={pac} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function QuotePage({ params }: QuotePageProps) {
  const resolvedParams = use(params);
  return <QuotePageContent folderId={resolvedParams.folderId} />;
}
