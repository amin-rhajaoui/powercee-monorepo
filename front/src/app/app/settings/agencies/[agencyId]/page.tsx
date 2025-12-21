"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { AgencyUsersList } from "@/components/agencies/agency-users-list";

export default function AgencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agencyId = params.agencyId as string;

  const [agency, setAgency] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgency = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`agencies/${agencyId}`);
        const data = await response.json();
        setAgency(data);
      } catch (error: any) {
        const errorMessage = error.message || "Erreur lors du chargement de l'agence.";
        setError(errorMessage);
        toast.error(errorMessage);
        // Redirection après un court délai pour permettre à l'utilisateur de voir le message d'erreur
        setTimeout(() => {
          router.push("/app/settings/agencies");
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    if (agencyId) {
      fetchAgency();
    }
  }, [agencyId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="container py-10">
        <div className="mb-4">
          <Link href="/app/settings/agencies">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error || "Agence introuvable."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/settings/agencies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Détail de l'agence</h1>
      </div>

      {/* Agency Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{agency.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Adresse</p>
              <p className="text-base">{agency.address || "Adresse non renseignée"}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Statut</p>
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              agency.is_active 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-muted text-muted-foreground"
            }`}>
              {agency.is_active ? "Active" : "Inactive"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agency Users List */}
      <AgencyUsersList agencyId={agencyId} />
    </div>
  );
}

