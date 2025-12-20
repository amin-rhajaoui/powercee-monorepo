export interface GeocodingResult {
  label: string;
  latitude: number;
  longitude: number;
}

/**
 * Recherche une adresse via l'API adresse.data.gouv.fr
 */
export async function searchAddress(query: string): Promise<GeocodingResult | null> {
  if (!query || query.length < 3) return null;

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la recherche d'adresse");
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lon, lat] = feature.geometry.coordinates;
      return {
        label: feature.properties.label,
        latitude: lat,
        longitude: lon,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Recherche plusieurs suggestions d'adresses via l'API adresse.data.gouv.fr
 * @param query Requête de recherche
 * @param limit Nombre maximum de résultats (par défaut: 3)
 * @returns Liste des suggestions d'adresses
 */
export async function searchAddressSuggestions(
  query: string,
  limit: number = 3
): Promise<GeocodingResult[]> {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la recherche d'adresses");
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features.map((feature: any) => {
        const [lon, lat] = feature.geometry.coordinates;
        return {
          label: feature.properties.label,
          latitude: lat,
          longitude: lon,
        };
      });
    }

    return [];
  } catch (error) {
    console.error("Geocoding suggestions error:", error);
    return [];
  }
}

