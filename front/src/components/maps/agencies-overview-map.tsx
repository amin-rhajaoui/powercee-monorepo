"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Créer des icônes personnalisées pour les marqueurs colorés
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="5"/>
      </svg>
    `,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41],
  });
};

// Icône pour agences actives (couleur primaire rouge)
const ActiveIcon = createCustomIcon("#701a2a"); // hsl(349 62% 27%)

// Icône pour agences inactives (gris)
const InactiveIcon = createCustomIcon("#808080");

interface Agency {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

interface AgenciesOverviewMapProps {
  agencies: Agency[];
}

// Composant interne pour ajuster les bounds de la carte
function FitBounds({ agencies }: { agencies: Agency[] }) {
  const map = useMap();

  useEffect(() => {
    if (agencies.length === 0) return;

    if (agencies.length === 1) {
      // Une seule agence : centrer avec zoom fixe
      const agency = agencies[0];
      map.setView([agency.latitude, agency.longitude], 13);
    } else {
      // Plusieurs agences : calculer les bounds
      const bounds = L.latLngBounds(
        agencies.map((agency) => [agency.latitude, agency.longitude])
      );

      // Vérifier si toutes les agences sont au même endroit
      const isSameLocation = bounds.getNorth() === bounds.getSouth() && 
                            bounds.getEast() === bounds.getWest();
      
      if (isSameLocation) {
        // Zoom minimum si toutes au même endroit
        map.setView([agencies[0].latitude, agencies[0].longitude], 15);
      } else {
        // Ajuster les bounds avec padding
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
        });
      }
    }
  }, [agencies, map]);

  return null;
}

export default function AgenciesOverviewMap({ agencies }: AgenciesOverviewMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filtrer les agences avec des coordonnées valides
  const validAgencies = agencies.filter(
    (agency) =>
      agency.latitude != null &&
      agency.longitude != null &&
      !isNaN(agency.latitude) &&
      !isNaN(agency.longitude)
  );

  if (!isMounted) {
    return <div className="h-[400px] w-full bg-muted animate-pulse rounded-md" />;
  }

  if (validAgencies.length === 0) {
    return null;
  }

  // Calculer le centre initial (moyenne des coordonnées ou première agence)
  const initialCenter =
    validAgencies.length === 1
      ? [validAgencies[0].latitude, validAgencies[0].longitude]
      : [
          validAgencies.reduce((sum, a) => sum + a.latitude, 0) / validAgencies.length,
          validAgencies.reduce((sum, a) => sum + a.longitude, 0) / validAgencies.length,
        ];

  return (
    <div className="h-[400px] w-full rounded-md overflow-hidden border relative agencies-overview-map" style={{ zIndex: 0, isolation: 'isolate' }}>
      <MapContainer
        center={initialCenter as [number, number]}
        zoom={validAgencies.length === 1 ? 13 : 5}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds agencies={validAgencies} />
        {validAgencies.map((agency) => (
          <Marker
            key={agency.id}
            position={[agency.latitude, agency.longitude]}
            icon={agency.is_active ? ActiveIcon : InactiveIcon}
          >
            {/* Optionnel : ajouter un popup avec le nom de l'agence */}
            {/* <Popup>{agency.name}</Popup> */}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

