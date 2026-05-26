import { useCallback, useEffect, useState } from 'react';
import { fetchPlaceInsights, type PlaceInsights } from '@/src/services/weatherService';

export function usePlaceInsights(
  placeLat?: number | null,
  placeLng?: number | null,
  origin?: { lat: number; lng: number } | null,
  options?: { solar?: boolean }
) {
  const [insights, setInsights] = useState<PlaceInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (placeLat == null || placeLng == null) return;
    setLoading(true);
    try {
      const data = await fetchPlaceInsights(
        placeLat,
        placeLng,
        origin ?? undefined,
        options
      );
      setInsights(data);
    } catch {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [placeLat, placeLng, origin?.lat, origin?.lng, options?.solar]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { insights, loading, refresh };
}
