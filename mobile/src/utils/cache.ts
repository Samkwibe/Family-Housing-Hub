import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'fhh_cache_';

export async function getCachedJson<T>(key: string, maxAgeMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { _cacheTime: number; data: T };
    if (Date.now() - (parsed._cacheTime || 0) > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(
    PREFIX + key,
    JSON.stringify({ _cacheTime: Date.now(), data })
  );
}

export async function clearCacheKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}
