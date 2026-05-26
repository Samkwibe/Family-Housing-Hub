import { useCallback, useEffect, useState } from 'react';
import {
  fetchWeatherSummary,
  type WeatherSummary,
} from '@/src/services/weatherService';

export function useWeather(lat?: number | null, lng?: number | null) {
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeatherSummary(lat, lng, { days: 5, hours: 12 });
      setWeather(data);
    } catch (e: unknown) {
      setWeather(null);
      setError(e instanceof Error ? e.message : 'Weather unavailable');
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weather, loading, error, refresh };
}
