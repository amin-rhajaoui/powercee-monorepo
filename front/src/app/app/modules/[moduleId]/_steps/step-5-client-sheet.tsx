"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/ui/download-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Home,
  FileText,
  Thermometer,
  Camera,
  Settings,
  Calculator,
  FileSignature,
  Loader2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useModuleDraft } from "../_hooks/use-module-draft";
import { getClient, type Client } from "@/lib/api/clients";
import { getProperty, type Property } from "@/lib/api/properties";
import Link from "next/link";

// Import dynamique de la carte pour éviter les erreurs SSR
const PropertyMap = dynamic(
  () => import("@/components/maps/location-picker-map").then((mod) => mod.LocationPickerMap),
  { ssr: false }
);

// ============================================================================
// Types
// ============================================================================

type Step5ClientSheetProps = {
  moduleId: string;
  moduleCode: string;
  draftId?: string | null;
  onPrevious: () => void;
};

// ============================================================================
// Labels pour les enums
// ============================================================================

const OCCUPATION_STATUS_LABELS: Record<string, string> = {
  PROPRIETAIRE: "Proprietaire",
  LOCATAIRE: "Locataire",
};

const HEATING_SYSTEM_LABELS: Record<string, string> = {
  FIOUL: "Fioul",
  GAZ: "Gaz",
  CHARBON: "Charbon",
  BOIS: "Bois",
  ELECTRIQUE: "Electrique",
};

const WATER_HEATING_TYPE_LABELS: Record<string, string> = {
  BALLON_ELECTRIQUE: "Ballon electrique",
  CHAUFFE_EAU_GAZ: "Chauffe-eau gaz",
  CHAUFFE_EAU_THERMODYNAMIQUE: "Chauffe-eau thermodynamique",
  AUTRE: "Autre",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  MAISON: "Maison",
  APPARTEMENT: "Appartement",
  BATIMENT_PRO: "Batiment professionnel",
  AUTRE: "Autre",
};

const ATTIC_TYPE_LABELS: Record<string, string> = {
  PERDUS: "Combles perdus",
  HABITES: "Combles amenages / habites",
};

const FLOOR_TYPE_LABELS: Record<string, string> = {
  CAVE: "Cave / Sous-sol",
  VIDE_SANITAIRE: "Vide sanitaire",
  TERRE_PLEIN: "Terre-plein (sur dalle)",
};

const WALL_ISOLATION_TYPE_LABELS: Record<string, string> = {
  AUCUNE: "Aucune isolation",
  INTERIEUR: "Isolation par l'interieur (ITI)",
  EXTERIEUR: "Isolation par l'exterieur (ITE)",
  DOUBLE: "Double isolation (ITI + ITE)",
};

const JOINERY_TYPE_LABELS: Record<string, string> = {
  SIMPLE: "Simple vitrage",
  DOUBLE_OLD: "Double vitrage ancien (avant 2000)",
  DOUBLE_RECENT: "Double vitrage recent (apres 2000)",
};

const EMITTER_TYPE_LABELS: Record<string, string> = {
  FONTE: "Radiateurs fonte",
  RADIATEURS: "Radiateurs (acier/alu)",
  PLANCHER_CHAUFFANT: "Plancher chauffant",
};

const LEVEL_LABELS: Record<number, string> = {
  0: "RDC",
  1: "R+1",
  2: "R+2",
  3: "R+3",
  4: "R+4",
};

// ============================================================================
// Info Row Component
// ============================================================================

function InfoRow({ 
  label, 
  value, 
  actionButton 
}: { 
  label: string; 
  value: string | number | null | undefined;
  actionButton?: React.ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1 items-center">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {actionButton}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Step5ClientSheet({
  moduleId,
  moduleCode,
  draftId,
  onPrevious,
}: Step5ClientSheetProps) {
  const { draft, isLoading: isDraftLoading } = useModuleDraft({
    moduleId,
    moduleCode,
    draftId,
  });

  const [client, setClient] = useState<Client | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load client and property data
  useEffect(() => {
    async function loadData() {
      if (!draft) return;

      setIsLoadingData(true);
      try {
        const [clientData, propertyData] = await Promise.all([
          draft.client_id ? getClient(draft.client_id) : null,
          draft.property_id ? getProperty(draft.property_id) : null,
        ]);
        setClient(clientData);
        setProperty(propertyData);
      } catch (error) {
        console.error("Erreur lors du chargement des donnees:", error);
        toast.error("Erreur lors du chargement des donnees");
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, [draft]);

  // Action button handlers (placeholders)
  const handleAddPhotos = () => {
    toast.info("Fonctionnalite 'Ajouter photos' a venir");
  };

  const handleInstallationRecommendations = () => {
    toast.info("Fonctionnalite 'Preconisations d'installations' a venir");
  };

  const handleSizingNote = () => {
    toast.info("Fonctionnalite 'Note de dimensionnement' a venir");
  };

  const handleQuoteAndSignature = () => {
    toast.info("Fonctionnalite 'Devis et signature' a venir");
  };

  if (isDraftLoading || isLoadingData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche Client</CardTitle>
        <CardDescription>
          Recapitulatif des informations collectees et actions disponibles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={handleAddPhotos}
          >
            <Camera className="h-6 w-6" />
            <span className="text-sm">Ajouter photos</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={handleInstallationRecommendations}
          >
            <Settings className="h-6 w-6" />
            <span className="text-sm">Preconisations</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={handleSizingNote}
          >
            <Calculator className="h-6 w-6" />
            <span className="text-sm">Dimensionnement</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={handleQuoteAndSignature}
          >
            <FileSignature className="h-6 w-6" />
            <span className="text-sm">Devis et signature</span>
          </Button>
        </div>

        <Separator />

        {/* Collapsible Sections */}
        <Accordion type="multiple" defaultValue={["foyer", "logement", "documents", "visite"]} className="w-full">
          {/* Section 1: Foyer (Client) */}
          <AccordionItem value="foyer">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Foyer</span>
                {client && (
                  <Badge variant="secondary" className="ml-2">
                    {client.first_name} {client.last_name}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {client ? (
                <div className="space-y-2 pl-7">
                  <InfoRow label="Nom" value={`${client.first_name || ""} ${client.last_name || ""}`} />
                  <InfoRow 
                    label="Email" 
                    value={client.email}
                    actionButton={
                      client.email ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          asChild
                        >
                          <Link href={`mailto:${client.email}`}>
                            <Mail className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                  <InfoRow 
                    label="Telephone" 
                    value={client.phone}
                    actionButton={
                      client.phone ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          asChild
                        >
                          <Link href={`tel:${client.phone}`}>
                            <Phone className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                  <InfoRow label="Statut d'occupation" value={draft?.occupation_status ? OCCUPATION_STATUS_LABELS[draft.occupation_status] : null} />
                  <InfoRow label="Residence principale" value={draft?.is_principal_residence ? "Oui" : draft?.is_principal_residence === false ? "Non" : null} />
                </div>
              ) : (
                <p className="text-muted-foreground pl-7">Aucun client selectionne</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Logement (Property) */}
          <AccordionItem value="logement">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                <span>Logement</span>
                {property && (
                  <Badge variant="secondary" className="ml-2">
                    {property.label}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {property ? (
                <div className="space-y-4 pl-7">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Informations generales</h4>
                      <InfoRow label="Type" value={PROPERTY_TYPE_LABELS[property.type]} />
                      <InfoRow label="Adresse" value={property.address} />
                      <InfoRow label="Code postal" value={property.postal_code} />
                      <InfoRow label="Ville" value={property.city} />
                      <InfoRow label="Surface" value={property.surface_m2 ? `${property.surface_m2} m²` : null} />
                      <InfoRow label="Annee de construction" value={property.construction_year} />
                    </div>
                    {property.latitude && property.longitude && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Localisation</h4>
                        <div className="w-full h-[300px] rounded-md overflow-hidden border">
                          <PropertyMap
                            lat={property.latitude}
                            lng={property.longitude}
                            onPositionChange={() => {}} // Désactivé en lecture seule
                            zoom={15}
                            height="300px"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Systeme de chauffage</h4>
                    <InfoRow label="Type de chauffage" value={draft?.heating_system ? HEATING_SYSTEM_LABELS[draft.heating_system] : null} />
                    <InfoRow label="Marque ancienne chaudiere" value={draft?.old_boiler_brand} />
                    <InfoRow label="Eau chaude liee au chauffage" value={draft?.is_water_heating_linked ? "Oui" : draft?.is_water_heating_linked === false ? "Non" : null} />
                    {draft?.is_water_heating_linked === false && (
                      <InfoRow label="Type d'eau chaude" value={draft?.water_heating_type ? WATER_HEATING_TYPE_LABELS[draft.water_heating_type] : null} />
                    )}
                    <InfoRow label="Phase electrique" value={draft?.electrical_phase} />
                    <InfoRow label="Puissance" value={draft?.power_kva ? `${draft.power_kva} kVA` : null} />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground pl-7">Aucun logement selectionne</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Documents */}
          <AccordionItem value="documents">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Documents administratifs</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-7">
                <InfoRow 
                  label="Avis d'imposition" 
                  value={draft?.tax_notice_url ? "Televerse" : "Non fourni"}
                  actionButton={
                    draft?.tax_notice_url ? (
                      <DownloadButton
                        href={draft.tax_notice_url}
                        label="Télécharger l'avis d'imposition"
                      />
                    ) : undefined
                  }
                />
                <InfoRow 
                  label="Justificatif de domicile" 
                  value={draft?.address_proof_url ? "Televerse" : "Non fourni"}
                  actionButton={
                    draft?.address_proof_url ? (
                      <DownloadButton
                        href={draft.address_proof_url}
                        label="Télécharger le justificatif de domicile"
                      />
                    ) : undefined
                  }
                />
                <InfoRow 
                  label="Taxe fonciere / Acte de propriete" 
                  value={draft?.property_proof_url ? "Televerse" : "Non fourni"}
                  actionButton={
                    draft?.property_proof_url ? (
                      <DownloadButton
                        href={draft.property_proof_url}
                        label="Télécharger la taxe foncière ou l'acte de propriété"
                      />
                    ) : undefined
                  }
                />
                <InfoRow 
                  label="Facture d'energie" 
                  value={draft?.energy_bill_url ? "Televerse" : "Non fourni"}
                  actionButton={
                    draft?.energy_bill_url ? (
                      <DownloadButton
                        href={draft.energy_bill_url}
                        label="Télécharger la facture d'énergie"
                      />
                    ) : undefined
                  }
                />
                <InfoRow label="Revenu fiscal de reference" value={draft?.reference_tax_income ? `${draft.reference_tax_income.toLocaleString()} €` : null} />
                <InfoRow label="Personnes dans le foyer" value={draft?.household_size} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Visite Technique */}
          <AccordionItem value="visite">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-primary" />
                <span>Visite Technique</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pl-7">
                {/* Chauffage */}
                <div className="space-y-2">
                  <h4 className="font-medium">Chauffage</h4>
                  <InfoRow label="Nombre de niveaux" value={draft?.nb_levels} />
                  <InfoRow label="Hauteur sous plafond" value={draft?.avg_ceiling_height ? `${draft.avg_ceiling_height} m` : null} />
                  <InfoRow label="Temperature cible" value={draft?.target_temperature ? `${draft.target_temperature}°C` : null} />

                  {/* Emitters by level */}
                  {draft?.emitters_configuration && Array.isArray(draft.emitters_configuration) && draft.emitters_configuration.length > 0 && (
                    <div className="mt-2">
                      <span className="text-muted-foreground">Emetteurs par niveau:</span>
                      <div className="mt-1 space-y-1">
                        {draft.emitters_configuration.map((config: { level: number; emitters: string[] }) => (
                          <div key={config.level} className="flex gap-2 text-sm">
                            <span className="font-medium">{LEVEL_LABELS[config.level]}:</span>
                            <span>{config.emitters.map(e => EMITTER_TYPE_LABELS[e] || e).join(", ") || "Aucun"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Enveloppe */}
                <div className="space-y-2">
                  <h4 className="font-medium">Enveloppe</h4>

                  {/* Combles */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Combles: </span>
                    <span>{draft?.attic_type ? ATTIC_TYPE_LABELS[draft.attic_type] : "Non renseigne"}</span>
                    {draft?.is_attic_isolated !== null && draft?.is_attic_isolated !== undefined && (
                      <span> - {draft.is_attic_isolated ? `Isole (${draft.attic_isolation_year || "annee inconnue"})` : "Non isole"}</span>
                    )}
                  </div>

                  {/* Plancher bas */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Plancher bas: </span>
                    <span>{draft?.floor_type ? FLOOR_TYPE_LABELS[draft.floor_type] : "Non renseigne"}</span>
                    {draft?.is_floor_isolated !== null && draft?.is_floor_isolated !== undefined && (
                      <span> - {draft.is_floor_isolated ? `Isole (${draft.floor_isolation_year || "annee inconnue"})` : "Non isole"}</span>
                    )}
                  </div>

                  {/* Murs */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Murs: </span>
                    <span>{draft?.wall_isolation_type ? WALL_ISOLATION_TYPE_LABELS[draft.wall_isolation_type] : "Non renseigne"}</span>
                    {draft?.wall_isolation_type === "INTERIEUR" && draft?.wall_isolation_year_interior && (
                      <span> ({draft.wall_isolation_year_interior})</span>
                    )}
                    {draft?.wall_isolation_type === "EXTERIEUR" && draft?.wall_isolation_year_exterior && (
                      <span> ({draft.wall_isolation_year_exterior})</span>
                    )}
                    {draft?.wall_isolation_type === "DOUBLE" && (
                      <span>
                        {draft.wall_isolation_year_interior && ` ITI: ${draft.wall_isolation_year_interior}`}
                        {draft.wall_isolation_year_exterior && ` ITE: ${draft.wall_isolation_year_exterior}`}
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Menuiseries */}
                <div className="space-y-2">
                  <h4 className="font-medium">Menuiseries</h4>
                  <InfoRow label="Type de vitrage" value={draft?.joinery_type ? JOINERY_TYPE_LABELS[draft.joinery_type] : null} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Precedent
          </Button>
          <div className="text-sm text-muted-foreground flex items-center">
            Utilisez les boutons d'action ci-dessus pour continuer
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
