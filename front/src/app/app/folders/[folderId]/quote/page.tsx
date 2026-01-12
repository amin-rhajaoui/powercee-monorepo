"use client";

import { use, useState, useEffect, useMemo } from "react";
import { notFound, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getCompatiblePacs, type CompatiblePac } from "@/lib/api/sizing";
import { HeatPumpCard } from "@/components/products/heat-pump-card";
import { getFolder, type Folder } from "@/lib/api/folders";
import { getProperty, type Property } from "@/lib/api/properties";
import { isEligibleForMPR } from "@/lib/utils/mpr-eligibility";
import { toast } from "sonner";

type QuotePageProps = {
  params: Promise<{ folderId: string }>;
};

function QuotePageContent({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [pacs, setPacs] = useState<CompatiblePac[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // Load folder, property and PACs in parallel
        const [folderData, pacsResponse] = await Promise.all([
          getFolder(folderId),
          getCompatiblePacs(folderId).catch((err: unknown) => {
            const apiError = err as { status?: number; data?: { detail?: string } };
            if (apiError.status === 400) {
              throw new Error(
                apiError.data?.detail ||
                  "Le dimensionnement doit être validé avant de consulter les PAC compatibles."
              );
            } else if (apiError.status === 404) {
              notFound();
            } else {
              throw new Error("Erreur lors du chargement des pompes à chaleur compatibles.");
            }
          }),
        ]);

        setFolder(folderData);
        setPacs(pacsResponse.pacs);

        // Load property if available
        if (folderData.property_id) {
          try {
            const propertyData = await getProperty(folderData.property_id);
            setProperty(propertyData);
          } catch (err) {
            console.error("Erreur lors du chargement du logement:", err);
            // Continue without property data
          }
        }
      } catch (err: unknown) {
        console.error("Erreur lors du chargement des données:", err);
        const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des données.";
        setError(errorMessage);
        if (err instanceof Error && errorMessage.includes("dimensionnement")) {
          // Don't show toast for dimensionnement error, it's expected
        } else {
          toast.error("Erreur lors du chargement des données");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [folderId]);

  // Calculate MPR eligibility
  const isEligibleMPR = useMemo(() => {
    if (!folder) return false;
    const data: Record<string, unknown> = folder.data || {};
    return isEligibleForMPR(
      (data.occupation_status as string) || null,
      (data.is_principal_residence as boolean) ?? null,
      property?.construction_year ?? null
    );
  }, [folder, property?.construction_year]);

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
              <HeatPumpCard key={pac.id} pac={pac} isEligibleForMPR={isEligibleMPR} />
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
