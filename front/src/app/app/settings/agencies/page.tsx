"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Building2, 
  Loader2, 
  MapPin, 
  MoreHorizontal, 
  Pencil, 
  Plus, 
  Trash2 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { AgencyDialog } from "@/components/agencies/agency-dialog";

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<any>(null);

  const fetchAgencies = async () => {
    try {
      const response = await api.get("agencies");
      const data = await response.json();
      setAgencies(data);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du chargement des agences.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  const handleEdit = (agency: any) => {
    setSelectedAgency(agency);
    setIsDialogOpen(true);
  };

  const handleDelete = async (agencyId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette agence ?")) return;

    try {
      await api.delete(`agencies/${agencyId}`);
      toast.success("Agence supprimée.");
      fetchAgencies();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression.");
    }
  };

  const handleAddNew = () => {
    setSelectedAgency(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agences</h1>
          <p className="text-muted-foreground">
            Gérez les agences physiques de votre entreprise.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle agence
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agencies.length === 0 ? (
          <Card className="col-span-full py-12">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <Building2 className="w-12 h-12 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-lg font-medium">Aucune agence</p>
                <p className="text-sm text-muted-foreground">
                  Commencez par ajouter votre première agence.
                </p>
              </div>
              <Button variant="outline" onClick={handleAddNew}>
                Ajouter une agence
              </Button>
            </CardContent>
          </Card>
        ) : (
          agencies.map((agency) => (
            <Card key={agency.id} className="relative group overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{agency.name}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {agency.address || "Adresse non renseignée"}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(agency)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(agency.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-4">
                  <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                    agency.is_active 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {agency.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AgencyDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSuccess={fetchAgencies}
        agency={selectedAgency}
      />
    </div>
  );
}

