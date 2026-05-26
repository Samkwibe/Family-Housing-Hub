import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/** iOS simulator cannot reach "localhost" on the host — use 127.0.0.1. */
function normalizeApiUrl(raw: string): string {
  const url = raw.trim().replace(/\/$/, '');
  if (url.includes('localhost:8000')) {
    return url.replace('localhost', '127.0.0.1');
  }
  return url;
}

export const API_BASE_URL = normalizeApiUrl(
  (process.env.EXPO_PUBLIC_API_URL as string) ||
    (extra.apiUrl as string) ||
    'https://family-housing-hub-production.up.railway.app'
);

/** Treat example/placeholder values from .env.example as unset. */
function resolveMapsApiKey(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  if (/^your[_-]/i.test(value)) return '';
  if (/placeholder|example|changeme|xxx/i.test(value)) return '';
  if (value.length < 20) return '';
  return value;
}

export const GOOGLE_MAPS_API_KEY =
  resolveMapsApiKey(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string) ||
  resolveMapsApiKey(extra.googleMapsApiKey as string) ||
  '';

export const isGoogleMapsApiKeyConfigured = GOOGLE_MAPS_API_KEY.length > 0;

export const SHOW_VERIFICATION_CODES =
  process.env.EXPO_PUBLIC_SHOW_VERIFICATION_CODES === 'true';
