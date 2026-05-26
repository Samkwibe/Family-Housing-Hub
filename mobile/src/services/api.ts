import { API_BASE_URL } from '../config/env';
import { getToken } from './tokenStorage';

function networkErrorHint(baseUrl: string): string {
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return 'Start the backend (cd backend && python app.py) and set EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 in mobile/.env for the iOS simulator.';
  }
  return 'Check EXPO_PUBLIC_API_URL and your network connection.';
}

class ApiService {
  private baseUrl = API_BASE_URL.replace(/\/$/, '');

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network request failed';
      throw new Error(`Cannot reach API at ${this.baseUrl}: ${msg}. ${networkErrorHint(this.baseUrl)}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const apiErr = (data as { error?: string }).error;
      throw new Error(apiErr || `API error ${res.status} on ${endpoint}`);
    }
    return data as T;
  }

  healthCheck() {
    return this.request<{ status?: string }>('/api/health', { method: 'GET' });
  }

  aiChat(message: string, context: Record<string, unknown> = {}) {
    return this.request<{ response?: string; message?: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, use_gemini: true }),
    });
  }

  getNearbyPlaces(
    payload: { lat: number; lng: number; category?: string; categories?: string[]; radius?: number }
  ) {
    return this.request<{ places?: unknown[]; provider?: string }>('/api/location/nearby-places', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  searchPlaces(query: string, lat?: number, lng?: number, limit = 10) {
    return this.request<{ results?: unknown[]; provider?: string }>('/api/location/search', {
      method: 'POST',
      body: JSON.stringify({ q: query, lat, lng, limit }),
    });
  }

  searchPlaceSuggestions(query: string, lat?: number, lng?: number, limit = 8) {
    return this.request<{ suggestions?: unknown[] }>('/api/location/search', {
      method: 'POST',
      body: JSON.stringify({ q: query, lat, lng, limit, suggest: true }),
    });
  }

  geocodeAddress(address: string) {
    return this.request<{ lat?: number; lng?: number; display_name?: string }>(
      '/api/location/geocode',
      {
        method: 'POST',
        body: JSON.stringify({ address }),
      }
    );
  }

  getWeather(
    lat: number,
    lng: number,
    options?: { days?: number; hours?: number; units?: 'IMPERIAL' | 'METRIC' }
  ) {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      units: options?.units ?? 'IMPERIAL',
      days: String(options?.days ?? 5),
      hours: String(options?.hours ?? 12),
    });
    return this.request<import('./weatherService').WeatherSummary>(`/api/weather?${params}`, {
      method: 'GET',
    });
  }

  getPlaceInsights(
    lat: number,
    lng: number,
    origin?: { lat: number; lng: number },
    options?: { solar?: boolean }
  ) {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });
    if (origin?.lat != null && origin?.lng != null) {
      params.set('origin_lat', String(origin.lat));
      params.set('origin_lng', String(origin.lng));
    }
    if (options?.solar) params.set('solar', 'true');
    return this.request<import('./weatherService').PlaceInsights>(
      `/api/location/place-insights?${params}`,
      { method: 'GET' }
    );
  }

  getSolarInsights(lat: number, lng: number) {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    return this.request<{ maxPanels?: number; sunshineHoursPerYear?: number }>(
      `/api/location/solar?${params}`,
      { method: 'GET' }
    );
  }

  sendEmailVerification(email: string, code: string) {
    return this.request('/api/verification/send-email', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        type: 'email_verification',
        website: '',
      }),
    });
  }

  listMessageGroups() {
    return this.request<{ groups: unknown[] }>('/api/messages/groups', { method: 'GET' });
  }

  sendSmsVerification(phone: string, code: string) {
    return this.request('/api/verification/send-sms', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        code,
        type: 'phone_verification',
        website: '',
      }),
    });
  }
}

export default new ApiService();
