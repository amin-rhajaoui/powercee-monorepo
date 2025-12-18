"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Correction des icônes Leaflet par défaut pour Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AgencyMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  zoom?: number;
}

// Composant interne pour recentrer la carte quand les props changent
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

// Composant interne pour gérer les clics sur la carte
function LocationMarker({ 
  lat, 
  lng, 
  onPositionChange 
}: { 
  lat: number; 
  lng: number; 
  onPositionChange: (lat: number, lng: number) => void 
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker 
      position={[lat, lng]} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onPositionChange(position.lat, position.lng);
        },
      }}
    />
  );
}

export default function AgencyMap({ lat, lng, onPositionChange, zoom = 13 }: AgencyMapProps) {
  // Nécessaire pour éviter les erreurs SSR de Leaflet
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-[300px] w-full bg-muted animate-pulse rounded-md" />;

  return (
    <div className="h-[300px] w-full rounded-md overflow-hidden border">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={lat} lng={lng} />
        <LocationMarker lat={lat} lng={lng} onPositionChange={onPositionChange} />
      </MapContainer>
    </div>
  );
}

