"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyDialog } from "@/app/app/properties/_components/property-dialog";
import { listClientProperties, getProperty, type Property } from "@/lib/api/properties";
import { toast } from "sonner";

type PropertySelectorProps = {
  clientId: string | null;
  value: string | null;
  onChange: (propertyId: string | null) => void;
};

export function PropertySelector({ clientId, value, onChange }: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Charger la liste des logements du client
  useEffect(() => {
    async function loadProperties() {
      if (!clientId) {
        setProperties([]);
        setSelectedProperty(null);
        return;
      }

      setIsLoading(true);
      try {
        const data = await listClientProperties(clientId, {
          page: 1,
          pageSize: 100,
          isActive: true,
        });
        setProperties(data.items);
      } catch (error) {
        console.error("Erreur lors du chargement des logements:", error);
        toast.error("Impossible de charger les logements");
      } finally {
        setIsLoading(false);
      }
    }
    loadProperties();
  }, [clientId]);

  // Charger le logement sélectionné
  useEffect(() => {
    async function loadSelectedProperty() {
      if (!value) {
        setSelectedProperty(null);
        return;
      }

      try {
        const property = await getProperty(value);
        setSelectedProperty(property);
      } catch (error) {
        console.error("Erreur lors du chargement du logement:", error);
        setSelectedProperty(null);
      }
    }
    loadSelectedProperty();
  }, [value]);

  const handlePropertySelect = (propertyId: string) => {
    onChange(propertyId);
  };

  const handlePropertyCreated = async () => {
    if (!clientId) return;

    // Recharger la liste des logements
    try {
      const data = await listClientProperties(clientId, {
        page: 1,
        pageSize: 100,
        isActive: true,
      });
      setProperties(data.items);
      // Sélectionner le dernier logement créé
      if (data.items.length > 0) {
        const latestProperty = data.items[0];
        onChange(latestProperty.id);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors du rechargement des logements:", error);
    }
  };

  if (!clientId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Veuillez d&apos;abord sélectionner un client
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={value || undefined}
          onValueChange={handlePropertySelect}
          disabled={isLoading || !clientId}
        >
          <SelectTrigger className="flex-1">
            <SelectValue
              placeholder={
                isLoading ? "Chargement..." : properties.length === 0 ? "Aucun logement" : "Sélectionner un logement"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          disabled={!clientId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau
        </Button>
      </div>

      {selectedProperty && (
        <Card>
          <CardHeader>
            <CardTitle>Logement sélectionné</CardTitle>
            <CardDescription>Informations du logement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Label :</span> {selectedProperty.label}
              </div>
              <div>
                <span className="font-medium">Type :</span> {selectedProperty.type}
              </div>
              <div>
                <span className="font-medium">Adresse :</span> {selectedProperty.address}
              </div>
              {selectedProperty.city && (
                <div>
                  <span className="font-medium">Ville :</span> {selectedProperty.city}
                  {selectedProperty.postal_code && ` (${selectedProperty.postal_code})`}
                </div>
              )}
              {selectedProperty.surface_m2 && (
                <div>
                  <span className="font-medium">Surface :</span> {selectedProperty.surface_m2} m²
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <PropertyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handlePropertyCreated}
        clientId={clientId}
        clientType="PARTICULIER"
      />
    </div>
  );
}

