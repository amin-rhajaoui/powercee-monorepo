"use client";

import { use, useState, useEffect } from "react";
import React from "react";
import { notFound } from "next/navigation";
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
  ArrowLeft,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Download,
  MapPin,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import Link from "next/link";
import { getFolder, type Folder } from "@/lib/api/folders";
import { getClient, type Client } from "@/lib/api/clients";
import { getProperty, type Property } from "@/lib/api/properties";
import { getModuleById } from "@/lib/modules";
import { SizingDialog } from "@/components/sizing/sizing-dialog";
import { RecommendationsSheet } from "@/components/recommendations";
import { getRecommendation, type InstallationRecommendation } from "@/lib/api/recommendations";

// Import dynamique de la carte pour éviter les erreurs SSR
const PropertyMap = dynamic(
  () =>
    import("@/components/maps/location-picker-map").then(
      (mod) => mod.LocationPickerMap
    ),
  { ssr: false }
);

// ============================================================================
// Types
// ============================================================================

type FolderDetailPageProps = {
  params: Promise<{ folderId: string }>;
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

// Helper component to render emitters configuration
function EmittersConfigurationDisplay({
  emittersConfig,
}: {
  emittersConfig: unknown;
}) {
  if (!emittersConfig || !Array.isArray(emittersConfig) || emittersConfig.length === 0) {
    return null;
  }

  const configArray = emittersConfig as Array<{ level: number; emitters: string[] }>;

  return (
    <div className="mt-2">
      <span className="text-muted-foreground">
        Emetteurs par niveau:
      </span>
      <div className="mt-1 space-y-1">
        {configArray.map((config) => (
          <div key={config.level} className="flex gap-2 text-sm">
            <span className="font-medium">
              {LEVEL_LABELS[config.level]}:
            </span>
            <span>
              {config.emitters
                .map((e) => EMITTER_TYPE_LABELS[e] || e)
                .join(", ") || "Aucun"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FOLDER_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En cours",
  CLOSED: "Clos",
  ARCHIVED: "Archive",
};

const FOLDER_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  IN_PROGRESS: "default",
  CLOSED: "secondary",
  ARCHIVED: "outline",
};

// ============================================================================
// Info Row Component
// ============================================================================

function InfoRow({
  label,
  value,
  actionButton,
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
// MPR Color Badge Component
// ============================================================================

function MprColorBadge({ color }: { color: string | null | undefined }) {
  if (!color) return null;

  const colorConfig: Record<
    string,
    { bg: string; text: string; border: string; label: string }
  > = {
    Bleu: {
      bg: "bg-blue-50 dark:bg-blue-950",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      label: "Très Modeste",
    },
    Jaune: {
      bg: "bg-yellow-50 dark:bg-yellow-950",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-800",
      label: "Modeste",
    },
    Violet: {
      bg: "bg-purple-50 dark:bg-purple-950",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-200 dark:border-purple-800",
      label: "Intermédiaire",
    },
    Rose: {
      bg: "bg-pink-50 dark:bg-pink-950",
      text: "text-pink-700 dark:text-pink-300",
      border: "border-pink-200 dark:border-pink-800",
      label: "Classique",
    },
    Inconnu: {
      bg: "bg-gray-50 dark:bg-gray-950",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200 dark:border-gray-800",
      label: "Inconnu",
    },
  };

  const config = colorConfig[color] || colorConfig.Inconnu;

  return (
    <div className="flex justify-between py-1 items-center">
      <span className="text-muted-foreground">Couleur MPR</span>
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${config.bg} ${config.text} ${config.border} font-semibold`}
        >
          <div
            className={`w-3 h-3 rounded-full ${
              color === "Bleu"
                ? "bg-blue-500"
                : color === "Jaune"
                ? "bg-yellow-500"
                : color === "Violet"
                ? "bg-purple-500"
                : color === "Rose"
                ? "bg-pink-500"
                : "bg-gray-500"
            }`}
          />
          <span>{color}</span>
          <span className="text-xs opacity-75">({config.label})</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Emitter Type Badge Component
// ============================================================================

function EmitterTypeBadge({ emitterType }: { emitterType: string | null | undefined }): React.ReactNode {
  if (!emitterType) return null;

  const isBasseTemperature = emitterType === "BASSE_TEMPERATURE";

  return (
    <div className="mt-3 p-4 rounded-lg border-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isBasseTemperature
                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                : "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
            }`}
          >
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Type d'émetteur</p>
            <p className="font-semibold text-base">
              {isBasseTemperature
                ? "Basse température"
                : "Moyenne / Haute température"}
            </p>
          </div>
        </div>
        <Badge
          variant={isBasseTemperature ? "default" : "secondary"}
          className="text-xs"
        >
          {isBasseTemperature ? "Plancher chauffant" : "Radiateurs"}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// Climate Zone Info Row Component
// ============================================================================

function ClimateZoneInfoRow({ zone }: { zone: string }) {
  const zoneLabels: Record<string, string> = {
    h1: "Zone H1",
    h2: "Zone H2",
    h3: "Zone H3",
  };

  const zoneColors: Record<
    string,
    { bg: string; border: string; text: string; badge: string }
  > = {
    h1: {
      bg: "bg-orange-50 dark:bg-orange-950",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
      badge: "bg-orange-100 dark:bg-orange-900",
    },
    h2: {
      bg: "bg-amber-50 dark:bg-amber-950",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-100 dark:bg-amber-900",
    },
    h3: {
      bg: "bg-yellow-50 dark:bg-yellow-950",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-300",
      badge: "bg-yellow-100 dark:bg-yellow-900",
    },
  };

  const config =
    zoneColors[zone.toLowerCase()] ||
    zoneColors.h1;

  return (
    <div className="flex justify-between py-1 items-center">
      <span className="text-muted-foreground">Zone climatique</span>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`${config.border} ${config.bg} ${config.text} flex items-center gap-1.5 px-2.5 py-0.5`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="font-semibold">
            {zoneLabels[zone.toLowerCase()] || zone.toUpperCase()}
          </span>
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// Base Temperature Info Row Component
// ============================================================================

function BaseTemperatureInfoRow({ temperature }: { temperature: number }) {
  return (
    <div className="flex justify-between py-1 items-center">
      <span className="text-muted-foreground">Température extérieure de base</span>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1.5 px-2.5 py-0.5"
        >
          <Thermometer className="h-3.5 w-3.5" />
          <span className="font-semibold">
            {temperature > 0 ? `+${temperature}` : temperature}°C
          </span>
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// Document Status Row Component
// ============================================================================

function DocumentStatusRow({
  label,
  url,
  downloadLabel,
}: {
  label: string;
  url: string | null | undefined;
  downloadLabel: string;
}) {
  const isUploaded = !!url;

  return (
    <div className="flex justify-between py-2 items-center">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {isUploaded ? (
          <>
            <Badge
              variant="default"
              className="bg-green-500 hover:bg-green-600 text-white border-0 flex items-center gap-1.5 px-3 py-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Téléversé</span>
            </Badge>
            <DownloadButton
              href={url}
              label={downloadLabel}
            />
          </>
        ) : (
          <Badge
            variant="outline"
            className="border-gray-300 dark:border-gray-700 text-muted-foreground flex items-center gap-1.5 px-3 py-1"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Non fourni</span>
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function FolderDetailPageContent({ folderId }: { folderId: string }) {
  const [folder, setFolder] = useState<Folder | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizingDialogOpen, setSizingDialogOpen] = useState(false);
  const [recommendationsSheetOpen, setRecommendationsSheetOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<InstallationRecommendation | null>(null);

  // Load folder data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const folderData = await getFolder(folderId);
        setFolder(folderData);

        // Load client, property and recommendations in parallel
        const [clientData, propertyData, recommendationData] = await Promise.all([
          folderData.client_id ? getClient(folderData.client_id) : null,
          folderData.property_id ? getProperty(folderData.property_id) : null,
          getRecommendation(folderId).catch(() => null), // Ignore errors if no recommendation exists
        ]);

        setClient(clientData);
        setProperty(propertyData);
        setRecommendation(recommendationData);
      } catch (err) {
        console.error("Erreur lors du chargement du dossier:", err);
        setError("Dossier introuvable");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [folderId]);

  // Get module info
  const module = folder?.module_code
    ? getModuleById(folder.module_code)
    : null;

  // Extract data from folder
  const data: Record<string, unknown> = folder?.data || {};

  // Action button handlers (placeholders)
  const handleAddPhotos = () => {
    toast.info("Fonctionnalite 'Ajouter photos' a venir");
  };

  const handleInstallationRecommendations = () => {
    setRecommendationsSheetOpen(true);
  };

  const handleSizingNote = () => {
    if (!folder) {
      toast.error("Dossier non chargé");
      return;
    }
    setSizingDialogOpen(true);
  };

  const handleQuoteAndSignature = () => {
    window.location.href = `/app/folders/${folderId}/quote`;
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !folder) {
    notFound();
  }

  // TypeScript assertion: folder is guaranteed to be non-null after the check above
  const folderData: Folder = folder!;


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/dossiers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Dossier {client ? `${client.first_name} ${client.last_name}` : ""}
            </h1>
            <Badge variant={FOLDER_STATUS_VARIANTS[folderData.status]}>
              {FOLDER_STATUS_LABELS[folderData.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {folderData.module_code && (
              <Badge variant="outline" className="font-mono text-xs">
                {folderData.module_code}
              </Badge>
            )}
            {!folderData.module_code && (
              <Badge variant="secondary" className="text-xs">
                Dossier libre
              </Badge>
            )}
            {module && (
              <span className="text-sm text-muted-foreground">
                {module.title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Fiche Dossier</CardTitle>
          <CardDescription>
            Recapitulatif des informations et actions disponibles
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
              className={`h-auto py-4 flex flex-col gap-2 ${
                recommendation
                  ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900"
                  : ""
              }`}
              onClick={handleInstallationRecommendations}
            >
              <Settings className="h-6 w-6" />
              <span className="text-sm">Preconisations</span>
            </Button>
            <Button
              variant="outline"
              className={`h-auto py-4 flex flex-col gap-2 ${
                folderData.data?.sizing_validated
                  ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900"
                  : ""
              }`}
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
          <Accordion
            type="multiple"
            defaultValue={["foyer", "logement", "documents", "visite"]}
            className="w-full"
          >
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
                    <InfoRow
                      label="Nom"
                      value={`${client.first_name || ""} ${client.last_name || ""}`}
                    />
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
                    <InfoRow
                      label="Statut d'occupation"
                      value={
                        data.occupation_status
                          ? OCCUPATION_STATUS_LABELS[data.occupation_status as string]
                          : null
                      }
                    />
                    <InfoRow
                      label="Residence principale"
                      value={
                        data.is_principal_residence === true
                          ? "Oui"
                          : data.is_principal_residence === false
                          ? "Non"
                          : null
                      }
                    />
                    <MprColorBadge color={folderData.mpr_color} />
                  </div>
                ) : (
                  <p className="text-muted-foreground pl-7">
                    Aucun client selectionne
                  </p>
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
                        <InfoRow
                          label="Type"
                          value={PROPERTY_TYPE_LABELS[property.type]}
                        />
                        <InfoRow label="Adresse" value={property.address} />
                        <InfoRow
                          label="Code postal"
                          value={property.postal_code}
                        />
                        <InfoRow label="Ville" value={property.city} />
                        <InfoRow
                          label="Surface"
                          value={
                            property.surface_m2
                              ? `${property.surface_m2} m²`
                              : null
                          }
                        />
                        <InfoRow
                          label="Annee de construction"
                          value={property.construction_year}
                        />
                        <InfoRow
                          label="Altitude"
                          value={
                            property.altitude !== null &&
                            property.altitude !== undefined
                              ? `${Math.round(property.altitude)} m`
                              : null
                          }
                        />
                        {property.zone_climatique && (
                          <ClimateZoneInfoRow zone={property.zone_climatique} />
                        )}
                      </div>
                      {property.latitude && property.longitude
                        ? (
                          <div className="space-y-2">
                            <h4 className="font-medium">Localisation</h4>
                            <div className="w-full h-[300px] rounded-md overflow-hidden border">
                              <PropertyMap
                                lat={property.latitude}
                                lng={property.longitude}
                                onPositionChange={() => {}}
                                zoom={15}
                                height="300px"
                              />
                            </div>
                          </div>
                        )
                        : null}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Systeme de chauffage</h4>
                      <InfoRow
                        label="Type de chauffage"
                        value={
                          data.heating_system
                            ? HEATING_SYSTEM_LABELS[data.heating_system as string]
                            : null
                        }
                      />
                      <InfoRow
                        label="Marque ancienne chaudiere"
                        value={data.old_boiler_brand as string}
                      />
                      <InfoRow
                        label="Eau chaude liee au chauffage"
                        value={
                          data.is_water_heating_linked === true
                            ? "Oui"
                            : data.is_water_heating_linked === false
                            ? "Non"
                            : null
                        }
                      />
                      {data.is_water_heating_linked === false && (
                        <InfoRow
                          label="Type d'eau chaude"
                          value={
                            data.water_heating_type
                              ? WATER_HEATING_TYPE_LABELS[
                                  data.water_heating_type as string
                                ]
                              : null
                          }
                        />
                      )}
                      <InfoRow
                        label="Phase electrique"
                        value={data.electrical_phase as string}
                      />
                      <InfoRow
                        label="Puissance"
                        value={
                          data.power_kva ? `${data.power_kva} kVA` : null
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground pl-7">
                    Aucun logement selectionne
                  </p>
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
                <div className="space-y-3 pl-7">
                  <DocumentStatusRow
                    label="Avis d'imposition"
                    url={data.tax_notice_url as string | null | undefined}
                    downloadLabel="Télécharger l'avis d'imposition"
                  />
                  <DocumentStatusRow
                    label="Justificatif de domicile"
                    url={data.address_proof_url as string | null | undefined}
                    downloadLabel="Télécharger le justificatif de domicile"
                  />
                  <DocumentStatusRow
                    label="Taxe foncière / Acte de propriété"
                    url={data.property_proof_url as string | null | undefined}
                    downloadLabel="Télécharger la taxe foncière ou l'acte de propriété"
                  />
                  <DocumentStatusRow
                    label="Facture d'énergie"
                    url={data.energy_bill_url as string | null | undefined}
                    downloadLabel="Télécharger la facture d'énergie"
                  />
                  <InfoRow
                    label="Revenu fiscal de reference"
                    value={
                      data.reference_tax_income
                        ? `${(data.reference_tax_income as number).toLocaleString()} €`
                        : null
                    }
                  />
                  <InfoRow
                    label="Personnes dans le foyer"
                    value={data.household_size as number}
                  />
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
                    <InfoRow
                      label="Nombre de niveaux"
                      value={data.nb_levels as number}
                    />
                    <InfoRow
                      label="Hauteur sous plafond"
                      value={
                        data.avg_ceiling_height
                          ? `${data.avg_ceiling_height} m`
                          : null
                      }
                    />
                    <InfoRow
                      label="Temperature cible"
                      value={
                        data.target_temperature
                          ? `${data.target_temperature}°C`
                          : null
                      }
                    />
                    {property?.base_temperature !== null && property?.base_temperature !== undefined && (
                      <BaseTemperatureInfoRow temperature={property.base_temperature} />
                    )}

                    <EmittersConfigurationDisplay emittersConfig={data.emitters_configuration} />

                    {/* Puissance préconisée - Affichée uniquement si le dimensionnement est validé */}
                    {Boolean(data.sizing_validated) && Boolean(data.sizing_recommended_power_kw) && (
                      <div className="mt-4 pt-4 border-t">
                        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-full bg-primary/10 p-2">
                                <Zap className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Puissance préconisée
                                </p>
                                <p className="text-2xl font-bold text-primary mt-1">
                                  {Number(data.sizing_recommended_power_kw).toFixed(1)} kW
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Dimensionnement validé le{" "}
                                  {data.sizing_validated_at
                                    ? new Date(data.sizing_validated_at as string).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })
                                    : ""}
                                </p>
                              </div>
                              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
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
                      <span>
                        {data.attic_type
                          ? ATTIC_TYPE_LABELS[data.attic_type as string]
                          : "Non renseigne"}
                      </span>
                      {data.is_attic_isolated !== null &&
                        data.is_attic_isolated !== undefined && (
                          <span>
                            {" "}
                            -{" "}
                            {data.is_attic_isolated
                              ? `Isole (${data.attic_isolation_year || "annee inconnue"})`
                              : "Non isole"}
                          </span>
                        )}
                    </div>

                    {/* Plancher bas */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Plancher bas:{" "}
                      </span>
                      <span>
                        {data.floor_type
                          ? FLOOR_TYPE_LABELS[data.floor_type as string]
                          : "Non renseigne"}
                      </span>
                      {data.is_floor_isolated !== null &&
                        data.is_floor_isolated !== undefined && (
                          <span>
                            {" "}
                            -{" "}
                            {data.is_floor_isolated
                              ? `Isole (${data.floor_isolation_year || "annee inconnue"})`
                              : "Non isole"}
                          </span>
                        )}
                    </div>

                    {/* Murs */}
                    <div className="text-sm">
                      <span className="text-muted-foreground">Murs: </span>
                      <span>
                        {data.wall_isolation_type
                          ? WALL_ISOLATION_TYPE_LABELS[
                              data.wall_isolation_type as string
                            ]
                          : "Non renseigne"}
                      </span>
                      {data.wall_isolation_type === "INTERIEUR" &&
                        data.wall_isolation_year_interior
                        ? (
                          <span> ({String(data.wall_isolation_year_interior)})</span>
                        )
                        : null}
                      {data.wall_isolation_type === "EXTERIEUR" &&
                        data.wall_isolation_year_exterior
                        ? (
                          <span> ({String(data.wall_isolation_year_exterior)})</span>
                        )
                        : null}
                      {data.wall_isolation_type === "DOUBLE"
                        ? (
                          <span>
                            {data.wall_isolation_year_interior
                              ? ` ITI: ${String(data.wall_isolation_year_interior)}`
                              : null}
                            {data.wall_isolation_year_exterior
                              ? ` ITE: ${String(data.wall_isolation_year_exterior)}`
                              : null}
                          </span>
                        )
                        : null}
                    </div>
                  </div>

                  <Separator />

                  {/* Menuiseries */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Menuiseries</h4>
                    <InfoRow
                      label="Type de vitrage"
                      value={
                        data.joinery_type
                          ? JOINERY_TYPE_LABELS[data.joinery_type as string]
                          : null
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Dialog de dimensionnement */}
      <SizingDialog
        open={sizingDialogOpen}
        onOpenChange={setSizingDialogOpen}
        folder={folderData}
        property={property}
          onFolderUpdate={(updatedFolder) => {
            setFolder(updatedFolder);
          }}
        />

      {/* Sheet des preconisations */}
      <RecommendationsSheet
        open={recommendationsSheetOpen}
        onOpenChange={setRecommendationsSheetOpen}
        folderId={folderId}
        onRecommendationUpdate={(updatedRecommendation) => {
          setRecommendation(updatedRecommendation);
        }}
      />
    </div>
  );
}

export default function FolderDetailPage({ params }: FolderDetailPageProps) {
  const resolvedParams = use(params);
  return <FolderDetailPageContent folderId={resolvedParams.folderId} />;
}
