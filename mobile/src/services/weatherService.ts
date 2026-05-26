import api from './api';
import { API_BASE_URL } from '@/src/config/env';

export type WeatherCurrent = {
  description?: string;
  conditionType?: string;
  iconUrl?: string;
  iconUrlDark?: string;
  temperature?: number;
  temperatureUnit?: string;
  feelsLike?: number;
  humidity?: number;
  uvIndex?: number;
  cloudCover?: number;
  isDaytime?: boolean;
  windSpeed?: number;
  windSpeedUnit?: string;
  windDirection?: string;
  precipitationProbability?: number;
  thunderstormProbability?: number;
};

export type WeatherDaily = {
  date?: { year?: number; month?: number; day?: number };
  maxTemperature?: number;
  minTemperature?: number;
  description?: string;
  iconUrl?: string;
  precipitationProbability?: number;
  humidity?: number;
  uvIndex?: number;
};

export type WeatherHourly = {
  time?: string;
  temperature?: number;
  description?: string;
  iconUrl?: string;
  precipitationProbability?: number;
};

export type WeatherAlert = {
  title?: string;
  description?: string;
  severity?: string;
  eventType?: string;
  startTime?: string;
  endTime?: string;
};

export type PollenDay = {
  date?: string;
  types?: Array<{
    type?: string;
    value?: number;
    category?: string;
    description?: string;
  }>;
};

export type WeatherSummary = {
  provider?: string;
  location?: { lat: number; lng: number };
  unitsSystem?: string;
  timeZone?: string;
  timezone?: { timeZoneId?: string; timeZoneName?: string };
  current?: WeatherCurrent;
  daily?: WeatherDaily[];
  hourly?: WeatherHourly[];
  alerts?: WeatherAlert[];
  pollen?: { days?: PollenDay[]; provider?: string } | null;
};

export type PlaceInsights = {
  provider?: string;
  streetViewAvailable?: boolean;
  timezone?: { timeZoneId?: string; timeZoneName?: string };
  travel?: Record<
    string,
    { seconds?: number; label?: string; distanceMeters?: number }
  >;
  solar?: {
    maxPanels?: number;
    sunshineHoursPerYear?: number;
    savingsHint?: unknown;
  };
};

export function streetViewProxyUrl(lat: number, lng: number, width = 640, height = 400): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/api/location/street-view?lat=${lat}&lng=${lng}&width=${width}&height=${height}`;
}

export function formatWeatherDayLabel(day?: WeatherDaily['date']): string {
  if (!day?.month || !day?.day) return '';
  const date = new Date(day.year ?? new Date().getFullYear(), day.month - 1, day.day);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function weatherIconUri(current?: WeatherCurrent | null): string | null {
  if (!current) return null;
  return current.iconUrlDark || current.iconUrl || null;
}

export async function fetchWeatherSummary(
  lat: number,
  lng: number,
  options?: { days?: number; hours?: number; units?: 'IMPERIAL' | 'METRIC' }
): Promise<WeatherSummary> {
  return api.getWeather(lat, lng, options);
}

export async function fetchPlaceInsights(
  lat: number,
  lng: number,
  origin?: { lat: number; lng: number },
  options?: { solar?: boolean }
): Promise<PlaceInsights> {
  return api.getPlaceInsights(lat, lng, origin, options);
}

export async function fetchSolarInsights(lat: number, lng: number) {
  return api.getSolarInsights(lat, lng);
}

export function topPollenLabel(pollen?: WeatherSummary['pollen']): string | null {
  const day = pollen?.days?.[0];
  const top = day?.types?.[0];
  if (!top) return null;
  const name = top.type || 'Pollen';
  const cat = top.category ? ` — ${top.category}` : '';
  return `${name}${cat}`;
}
