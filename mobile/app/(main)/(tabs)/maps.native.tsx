import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/src/services/api';
import { isGoogleMapsApiKeyConfigured } from '@/src/config/env';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTabScreenInsets } from '@/src/hooks/useTabScreenInsets';
import CategoryChips from '@/src/components/maps/CategoryChips';
import SearchAutocomplete from '@/src/components/maps/SearchAutocomplete';
import PlaceBottomSheet from '@/src/components/maps/PlaceBottomSheet';
import PlaceListItem from '@/src/components/maps/PlaceListItem';
import CategoryMarker from '@/src/components/maps/CategoryMarker';
import MapsAiSheet from '@/src/components/maps/MapsAiSheet';
import WeatherWidget from '@/src/components/weather/WeatherWidget';
import { useWeather } from '@/src/hooks/useWeather';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  DEFAULT_CATEGORIES,
  emptyMessageForCategories,
  fetchNearbyPlaces,
  fetchSearchResults,
  fetchSearchSuggestions,
  filterPlacesWithinRadius,
  enrichPlacesWithDistance,
  NEARBY_RADIUS_METERS,
  SEARCH_RADIUS_METERS,
  type Place,
  type SearchSuggestion,
} from '@/src/services/placesService';

const RECENT_SEARCHES_KEY = 'maps_recent_searches';
const MAX_RECENT = 8;
const PAN_DEBOUNCE_MS = 500;
const GPS_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
};

function regionFor(lat: number, lng: number, delta = 0.04): Region {
  return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
}

export default function MapsScreen() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const mapRef = useRef<MapView>(null);
  const { scrollBottomPadding } = useTabScreenInsets();
  const panTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const skipNextRegionFetchRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [placesOrigin, setPlacesOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [locationLabel, setLocationLabel] = useState('Your location');
  const [gpsUnavailable, setGpsUnavailable] = useState(false);
  const [manualLocationMode, setManualLocationMode] = useState(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showExplore, setShowExplore] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesProvider, setPlacesProvider] = useState<string | null>(null);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
  const [googleTilesConfigured] = useState(isGoogleMapsApiKeyConfigured);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);

  const showTileBanner = !googleTilesConfigured && !bannerDismissed;
  const tileBannerMessage =
    Platform.OS === 'android'
      ? 'Google Maps tiles need EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in mobile/.env and a dev client or EAS build (Expo Go shows blank tiles).'
      : 'Using Apple Maps tiles. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for Google tiles (optional).';
  const mapProvider =
    googleTilesConfigured && (Platform.OS === 'android' || Platform.OS === 'ios')
      ? PROVIDER_GOOGLE
      : undefined;

  const selectedCategoriesRef = useRef<string[]>([]);
  selectedCategoriesRef.current = selectedCategories;

  const activeCategories =
    selectedCategories.length > 0 ? selectedCategories : DEFAULT_CATEGORIES.map((c) => c.id);

  const weatherCoords = mapCenter ?? userLocation ?? placesOrigin;
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(
    weatherCoords?.lat ?? null,
    weatherCoords?.lng ?? null
  );

  const loadRecentSearches = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) setRecentSearches(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
      setRecentSearches(next);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    },
    [recentSearches]
  );

  const applyPlacesOrigin = useCallback((coords: { lat: number; lng: number }, label: string) => {
    placesOriginRef.current = coords;
    setPlacesOrigin(coords);
    setMapCenter(coords);
    setLocationLabel(label);
  }, []);

  const loadPlacesAt = useCallback(
    async (coords: { lat: number; lng: number }, categories: string[], label?: string) => {
      if (label) applyPlacesOrigin(coords, label);
      setLoading(true);
      setPlacesError(null);
      try {
        const { places: raw, provider } = await fetchNearbyPlaces(
          coords.lat,
          coords.lng,
          categories,
          NEARBY_RADIUS_METERS
        );
        const filtered = filterPlacesWithinRadius(raw, coords, NEARBY_RADIUS_METERS);
        setPlaces(filtered);
        setPlacesProvider(provider || null);
        setBackendReachable(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not load nearby places';
        setPlacesError(msg);
        setPlaces([]);
        if (msg.toLowerCase().includes('cannot reach api')) {
          setBackendReachable(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [applyPlacesOrigin]
  );

  const resolveGpsCoords = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    try {
      const loc = await Location.getCurrentPositionAsync(GPS_OPTIONS);
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          return { lat: last.coords.latitude, lng: last.coords.longitude };
        }
      } catch {
        // fall through
      }
    }
    return null;
  }, []);

  useEffect(() => {
    loadRecentSearches();
    api
      .healthCheck()
      .then(() => setBackendReachable(true))
      .catch(() => setBackendReachable(false));
  }, [loadRecentSearches]);

  useEffect(() => {
    (async () => {
      const coords = await resolveGpsCoords();
      if (coords) {
        setGpsUnavailable(false);
        setManualLocationMode(false);
        setUserLocation(coords);
        applyPlacesOrigin(coords, 'Your location');
        skipNextRegionFetchRef.current = true;
        setMapRegion(regionFor(coords.lat, coords.lng));
        initialLoadDoneRef.current = true;
        await loadPlacesAt(coords, DEFAULT_CATEGORIES.map((c) => c.id));
        return;
      }
      setGpsUnavailable(true);
      setManualLocationMode(true);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    return () => {
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
    };
  }, []);

  const onRegionChangeComplete = (region: Region) => {
    setMapRegion(region);
    const center = { lat: region.latitude, lng: region.longitude };
    setMapCenter(center);
    if (skipNextRegionFetchRef.current) {
      skipNextRegionFetchRef.current = false;
      return;
    }
    if (!initialLoadDoneRef.current && !manualLocationMode) return;
    if (panTimerRef.current) clearTimeout(panTimerRef.current);
    panTimerRef.current = setTimeout(() => {
      const cats =
        selectedCategoriesRef.current.length > 0
          ? selectedCategoriesRef.current
          : DEFAULT_CATEGORIES.map((c) => c.id);
      loadPlacesAt(center, cats, manualLocationMode ? 'Map area' : 'Nearby');
    }, PAN_DEBOUNCE_MS);
  };

  const onSearchLocation = () => {
    setSearchFocused(true);
  };

  const onUseMyLocation = async () => {
    const coords = await resolveGpsCoords();
    if (!coords) {
      Alert.alert(
        'Location unavailable',
        'Turn on location access in Settings, or search for an area below.'
      );
      return;
    }
    setGpsUnavailable(false);
    setManualLocationMode(false);
    setUserLocation(coords);
    const reg = regionFor(coords.lat, coords.lng);
    skipNextRegionFetchRef.current = true;
    setMapRegion(reg);
    mapRef.current?.animateToRegion(reg, 400);
    initialLoadDoneRef.current = true;
    await loadPlacesAt(coords, activeCategories, 'Your location');
  };

  const onToggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      const cats = next.length > 0 ? next : DEFAULT_CATEGORIES.map((c) => c.id);
      if (mapCenter) loadPlacesAt(mapCenter, cats);
      return next;
    });
  };

  const onSelectAll = () => {
    setSelectedCategories([]);
    if (mapCenter) loadPlacesAt(mapCenter, DEFAULT_CATEGORIES.map((c) => c.id));
  };

  const runSuggest = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const items = await fetchSearchSuggestions(q, userLocation?.lat, userLocation?.lng);
      setSuggestions(items);
      setBackendReachable(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const runFullSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setSearchLoading(true);
    setSuggestions([]);
    setSearchFocused(false);
    try {
      const bias = mapCenter ?? placesOrigin ?? userLocation ?? undefined;
      const results = await fetchSearchResults(q, bias?.lat, bias?.lng, 20);
      const origin = bias ?? (results[0]?.lat != null && results[0]?.lng != null
        ? { lat: results[0].lat!, lng: results[0].lng! }
        : null);

      let enriched = origin
        ? filterPlacesWithinRadius(results, origin, SEARCH_RADIUS_METERS)
        : results;
      if (enriched.length === 0 && results.length > 0) {
        enriched = enrichPlacesWithDistance(results, origin);
      }

      setPlaces(enriched);
      setPlacesProvider('search');
      setPlacesError(enriched.length === 0 ? `No results for "${q}". Try a different search.` : null);
      setLocationLabel(`Search: ${q}`);
      setManualLocationMode(true);
      initialLoadDoneRef.current = true;

      if (enriched.length === 1 && enriched[0].lat != null && enriched[0].lng != null) {
        moveMapTo(enriched[0].lat, enriched[0].lng, enriched[0].name || q);
        setSelectedPlace(enriched[0]);
      } else if (enriched.length > 0) {
        const first = enriched[0];
        if (first.lat != null && first.lng != null) {
          moveMapTo(first.lat, first.lng, q);
        }
        setSelectedPlace(null);
      }

      await saveRecentSearch(q);
      setSearchQuery(q);
      setBackendReachable(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed';
      setPlacesError(msg);
      setPlaces([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const moveMapTo = (lat: number, lng: number, label: string) => {
    const reg = regionFor(lat, lng);
    skipNextRegionFetchRef.current = true;
    setMapCenter({ lat, lng });
    setMapRegion(reg);
    setLocationLabel(label);
    mapRef.current?.animateToRegion(reg, 400);
  };

  const onSelectPlaceResult = async (item: Place, query?: string) => {
    if (item.lat == null || item.lng == null) return;
    const label = item.name || query || 'Selected place';
    setSearchFocused(false);
    setSuggestions([]);
    setSelectedPlace(item);
    setManualLocationMode(true);
    initialLoadDoneRef.current = true;
    moveMapTo(item.lat, item.lng, label);
    if (query) await saveRecentSearch(query);
    setPlaces([item, ...places.filter((p) => p.id !== item.id)]);
    setPlacesProvider('search');
    setLocationLabel(label);
  };

  const onSelectSuggestion = async (item: SearchSuggestion | { name: string; type: 'recent' }) => {
    const q = item.name;
    setSearchQuery(q);
    if ('type' in item && item.type === 'recent') {
      await runFullSearch(q);
      return;
    }
    if ('lat' in item && item.lat != null && item.lng != null) {
      await onSelectPlaceResult(
        { id: item.id, name: item.name, lat: item.lat, lng: item.lng, address: item.address },
        q
      );
      return;
    }
    if ('category' in item && item.category) {
      setSelectedCategories([item.category]);
      if (mapCenter) await loadPlacesAt(mapCenter, [item.category]);
    }
    await runFullSearch(q);
  };

  const onMarkerPress = (place: Place) => {
    setSelectedPlace(place);
    if (place.lat != null && place.lng != null) {
      mapRef.current?.animateToRegion(regionFor(place.lat, place.lng, 0.02), 300);
    }
  };

  const openDirections = (p: Place) => {
    if (!p.lat || !p.lng) return;
    const label = encodeURIComponent(p.name || 'Destination');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&destination_place_id=${label}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`http://maps.apple.com/?daddr=${p.lat},${p.lng}`);
    });
  };

  const filteredPlaces = places.filter((p) => {
    if (selectedCategories.length === 0) return true;
    return !p.category || selectedCategories.includes(p.category);
  });

  const emptyMessage =
    placesError || emptyMessageForCategories(selectedCategories.length ? selectedCategories : []);

  const providerLabel =
    placesProvider === 'google'
      ? 'Google Places'
      : placesProvider === 'openstreetmap'
        ? 'OpenStreetMap'
        : placesProvider === 'search'
          ? 'Search'
          : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <View style={styles.mapStage}>
          {mapRegion ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={mapProvider}
              region={mapRegion}
              onRegionChangeComplete={onRegionChangeComplete}
              showsUserLocation
              showsMyLocationButton={false}
              mapPadding={{ top: 120, right: 12, bottom: 24, left: 12 }}
            >
              {filteredPlaces.map((p, i) => (
                <CategoryMarker
                  key={p.id || `m-${i}`}
                  place={p}
                  selected={selectedPlace?.id === p.id}
                  onPress={onMarkerPress}
                />
              ))}
            </MapView>
          ) : gpsUnavailable ? (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.placeholderTitle}>Explore your area</Text>
              <Text style={styles.placeholderText}>Set a location to explore nearby places</Text>
              <Pressable style={styles.placeholderBtn} onPress={onSearchLocation}>
                <Text style={styles.placeholderBtnText}>Search location</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.placeholderText}>Getting your location…</Text>
            </View>
          )}

          <View style={styles.mapOverlayTop} pointerEvents="box-none">
            <View style={styles.mapHeader}>
              <View style={styles.mapHeaderText}>
                <Text style={styles.mapTitle}>Explore</Text>
                <Text style={styles.mapSubtitle} numberOfLines={1}>
                  {locationLabel}
                  {filteredPlaces.length > 0 ? ` · ${filteredPlaces.length} nearby` : ''}
                </Text>
              </View>
              <View style={styles.mapHeaderBadges}>
                <WeatherWidget
                  variant="compact"
                  weather={weather}
                  loading={weatherLoading}
                  error={weatherError}
                />
                {providerLabel ? (
                  <View style={styles.providerBadge}>
                    <Ionicons name="logo-google" size={12} color={theme.colors.accentWarm} />
                    <Text style={styles.providerBadgeText}>{providerLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <SearchAutocomplete
              variant="floating"
              query={searchQuery}
              onChangeQuery={setSearchQuery}
              suggestions={suggestions}
              recentSearches={recentSearches}
              loading={searchLoading}
              visible={searchFocused}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onSelectSuggestion={onSelectSuggestion}
              onSuggest={runSuggest}
              onSubmitSearch={runFullSearch}
              onClear={() => {
                setSearchQuery('');
                setSuggestions([]);
              }}
            />
          </View>

          {showTileBanner ? (
            <Pressable style={styles.floatingBanner} onPress={() => setBannerDismissed(true)}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.accentWarm} />
              <Text style={styles.configText} numberOfLines={2}>
                {tileBannerMessage}
              </Text>
              <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}

          {backendReachable === false ? (
            <View style={styles.floatingError}>
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {placesError || 'Cannot reach the API. Start the backend and check EXPO_PUBLIC_API_URL.'}
              </Text>
            </View>
          ) : null}

          {gpsUnavailable ? (
            <View style={styles.floatingGps}>
              <Ionicons name="location-outline" size={16} color={theme.colors.danger} />
              <Text style={styles.floatingGpsText} numberOfLines={2}>
                Location off — search or pan the map
              </Text>
              <Pressable style={styles.floatingGpsBtn} onPress={onSearchLocation}>
                <Text style={styles.floatingGpsBtnText}>Search</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.mapControls} pointerEvents="box-none">
            <Pressable style={styles.mapFab} onPress={onUseMyLocation} accessibilityLabel="My location">
              <Ionicons name="locate" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable
              style={[styles.mapFab, styles.mapFabAi]}
              onPress={() => setAiSheetOpen(true)}
              accessibilityLabel="Map AI"
            >
              <Ionicons name="sparkles" size={22} color={theme.colors.accentWarm} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
            </View>
          ) : null}
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.panelHandle} />
          <CategoryChips
            selected={selectedCategories}
            showExplore={showExplore}
            onToggleExplore={() => setShowExplore((v) => !v)}
            onToggleCategory={onToggleCategory}
            onSelectAll={onSelectAll}
          />
          {loading ? (
            <View style={styles.loadingList}>
              {[1, 2, 3].map((k) => (
                <View key={k} style={styles.skeletonRow}>
                  <View style={styles.skeletonThumb} />
                  <View style={styles.skeletonBody}>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonSub} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={filteredPlaces}
              keyExtractor={(item, i) => item.id || String(i)}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: scrollBottomPadding, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <PlaceListItem
                  place={item}
                  selected={selectedPlace?.id === item.id}
                  onPress={() => onMarkerPress(item)}
                  onDirections={() => openDirections(item)}
                />
              )}
              ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
            />
          )}
        </View>
      </View>

      <PlaceBottomSheet
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        origin={weatherCoords}
      />
      <MapsAiSheet
        visible={aiSheetOpen}
        onClose={() => setAiSheetOpen(false)}
        locationLabel={locationLabel}
        places={filteredPlaces}
        selectedPlace={selectedPlace}
        weather={weather}
        onRunSearch={runFullSearch}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  root: { flex: 1 },
  mapStage: {
    flex: 1,
    minHeight: 300,
    position: 'relative',
    backgroundColor: theme.colors.surfaceInset,
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    zIndex: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    gap: 8,
  },
  mapHeaderText: { flex: 1 },
  mapHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  mapTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mapSubtitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 2,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 11, 46, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  providerBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.bodyMedium,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  mapControls: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    gap: 10,
    zIndex: 8,
  },
  mapFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 11, 46, 0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.md,
  },
  mapFabAi: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(22, 15, 53, 0.95)',
  },
  floatingBanner: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(245,158,11,.15)',
    borderWidth: 1,
    borderColor: '#FDE68A',
    zIndex: 7,
  },
  configText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.body, color: '#FDE68A', lineHeight: 17 },
  floatingError: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 72,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(239,68,68,.15)',
    borderWidth: 1,
    borderColor: '#FECACA',
    zIndex: 7,
  },
  errorBannerText: { fontSize: 13, fontFamily: theme.fonts.body, color: theme.colors.danger, lineHeight: 18 },
  floatingGps: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(239,68,68,.12)',
    borderWidth: 1,
    borderColor: '#FECACA',
    zIndex: 7,
  },
  floatingGpsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.danger,
    lineHeight: 16,
  },
  floatingGpsBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
  },
  floatingGpsBtnText: { color: theme.colors.textInverse, fontSize: 11, fontWeight: '700' },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceInset,
    gap: 8,
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 8,
  },
  placeholderText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  placeholderBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  placeholderBtnText: { color: theme.colors.textInverse, fontWeight: '700', fontSize: 15 },
  mapLoading: {
    position: 'absolute',
    top: theme.spacing.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(14, 11, 46, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    zIndex: 6,
  },
  bottomPanel: {
    height: '42%',
    minHeight: 280,
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    ...theme.shadow.lg,
  },
  panelHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  loadingList: { paddingHorizontal: theme.spacing.md, paddingTop: 8 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  skeletonThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
  },
  skeletonBody: { flex: 1 },
  skeletonTitle: {
    height: 14,
    width: '60%',
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonSub: {
    height: 10,
    width: '40%',
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
  },
  list: { flex: 1 },
  empty: {
    padding: theme.spacing.lg,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
}
