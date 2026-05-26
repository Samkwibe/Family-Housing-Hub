import api from './api';
import { API_BASE_URL } from '@/src/config/env';

export const NEARBY_RADIUS_METERS = 2000;
/** Text search uses a wider area so results are not dropped near the user */
export const SEARCH_RADIUS_METERS = 30000;

export type PlaceCategory =
  | 'grocery'
  | 'mall'
  | 'retail'
  | 'restaurant'
  | 'car_wash'
  | 'mechanic'
  | 'school'
  | 'cafe'
  | 'gas'
  | 'pharmacy'
  | 'park'
  | 'library'
  | 'gym'
  | 'movie_theater'
  | 'atm'
  | 'ev_charging'
  | 'other';

export type Place = {
  id?: string;
  name?: string;
  lat?: number;
  lng?: number;
  address?: string;
  distance?: number;
  rating?: number;
  category?: PlaceCategory | string;
  phone?: string;
  hours?: string;
  source?: string;
  photoReference?: string;
  photoUrl?: string;
  image_url?: string;
};

export type SearchSuggestion = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  category?: string;
  type?: 'keyword' | 'place';
};

export type CategoryDef = {
  id: PlaceCategory | 'all' | 'other';
  label: string;
  icon: string;
  color: string;
  group: 'default' | 'explore';
};

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'grocery', label: 'Grocery', icon: '🛒', color: '#059669', group: 'default' },
  { id: 'mall', label: 'Malls', icon: '🏬', color: '#7C3AED', group: 'default' },
  { id: 'retail', label: 'Retail', icon: '🏪', color: '#DB2777', group: 'default' },
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️', color: '#EA580C', group: 'default' },
  { id: 'car_wash', label: 'Car Wash', icon: '🚿', color: '#0284C7', group: 'default' },
  { id: 'mechanic', label: 'Mechanic', icon: '🔧', color: '#475569', group: 'default' },
  { id: 'school', label: 'Schools', icon: '🏫', color: '#2563EB', group: 'default' },
  { id: 'cafe', label: 'Cafes', icon: '☕', color: '#92400E', group: 'default' },
  { id: 'gas', label: 'Gas', icon: '⛽', color: '#DC2626', group: 'default' },
  { id: 'pharmacy', label: 'Pharmacy', icon: '💊', color: '#0891B2', group: 'default' },
];

export const EXPLORE_CATEGORIES: CategoryDef[] = [
  { id: 'park', label: 'Parks', icon: '🌳', color: '#16A34A', group: 'explore' },
  { id: 'library', label: 'Libraries', icon: '📚', color: '#4338CA', group: 'explore' },
  { id: 'gym', label: 'Gyms', icon: '💪', color: '#BE185D', group: 'explore' },
  { id: 'movie_theater', label: 'Movies', icon: '🎬', color: '#9333EA', group: 'explore' },
  { id: 'atm', label: 'ATMs', icon: '🏧', color: '#0D9488', group: 'explore' },
  { id: 'ev_charging', label: 'EV', icon: '⚡', color: '#CA8A04', group: 'explore' },
];

export const ALL_CATEGORY_DEFS = [...DEFAULT_CATEGORIES, ...EXPLORE_CATEGORIES];

const CATEGORY_LOOKUP = Object.fromEntries(
  ALL_CATEGORY_DEFS.map((c) => [c.id, c])
) as Record<string, CategoryDef>;

export function getCategoryDef(category?: string): CategoryDef {
  if (category && CATEGORY_LOOKUP[category]) {
    return CATEGORY_LOOKUP[category];
  }
  return { id: 'other', label: 'Place', icon: '📍', color: '#64748B', group: 'default' };
}

export function emptyMessageForCategories(categories: string[]): string {
  if (categories.length === 0 || categories.length >= DEFAULT_CATEGORIES.length) {
    return 'No places found nearby.';
  }
  if (categories.length === 1) {
    const def = getCategoryDef(categories[0]);
    return `No ${def.label.toLowerCase()} found nearby.`;
  }
  return 'No places found for selected categories.';
}

/** Haversine distance in km */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const r = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function enrichPlacesWithDistance(
  places: Place[],
  origin: { lat: number; lng: number } | null
): Place[] {
  if (!origin) return places;
  return places.map((p) => {
    if (p.lat == null || p.lng == null) return p;
    return {
      ...p,
      distance: Math.round(distanceKm(origin.lat, origin.lng, p.lat, p.lng) * 100) / 100,
    };
  });
}

/** Drop places outside the search radius (meters). */
export function filterPlacesWithinRadius(
  places: Place[],
  origin: { lat: number; lng: number },
  radiusMeters: number = NEARBY_RADIUS_METERS
): Place[] {
  const maxKm = radiusMeters / 1000;
  return enrichPlacesWithDistance(places, origin).filter((p) => {
    if (p.lat == null || p.lng == null) return false;
    return (p.distance ?? maxKm + 1) <= maxKm;
  });
}

function extractPhotoReferenceFromUrl(url: string): string | null {
  const match = url.match(/[?&]photoreference=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Backend proxy avoids mobile API-key restrictions on Google Place Photos. */
export function placePhotoProxyUrl(photoReference: string, maxwidth = 600): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/api/location/place-photo?ref=${encodeURIComponent(photoReference)}&maxwidth=${maxwidth}`;
}

export function resolvePlacePhotoUrl(place: Place): string | null {
  const ref =
    place.photoReference ||
    (place.photoUrl ? extractPhotoReferenceFromUrl(place.photoUrl) : null);
  if (ref) return placePhotoProxyUrl(ref);

  const imageUrl = place.image_url?.trim();
  if (imageUrl && !imageUrl.includes('maps.googleapis.com/maps/api/place/photo')) {
    return imageUrl;
  }

  const photoUrl = place.photoUrl?.trim();
  if (photoUrl && !photoUrl.includes('maps.googleapis.com/maps/api/place/photo')) {
    return photoUrl;
  }

  return null;
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  categories: string[],
  radius = NEARBY_RADIUS_METERS
): Promise<{ places: Place[]; provider?: string }> {
  const origin = { lat, lng };
  const payload =
    categories.length === 0
      ? { lat, lng, category: 'all', radius }
      : { lat, lng, categories, radius };
  const data = await api.getNearbyPlaces(payload);
  const raw = (data.places as Place[]) || [];
  return {
    places: filterPlacesWithinRadius(raw, origin, radius),
    provider: data.provider,
  };
}

export async function fetchSearchSuggestions(
  query: string,
  lat?: number,
  lng?: number,
  limit = 8
): Promise<SearchSuggestion[]> {
  const data = await api.searchPlaceSuggestions(query, lat, lng, limit);
  return (data.suggestions as SearchSuggestion[]) || [];
}

export async function fetchSearchResults(
  query: string,
  lat?: number,
  lng?: number,
  limit = 20
): Promise<Place[]> {
  const data = await api.searchPlaces(query, lat, lng, limit);
  return (data.results as Place[]) || [];
}
