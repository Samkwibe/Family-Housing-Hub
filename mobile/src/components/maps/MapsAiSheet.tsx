import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAppStyles } from '@/src/hooks/useStyles';
import api from '@/src/services/api';
import type { Place } from '@/src/services/placesService';
import type { WeatherSummary } from '@/src/services/weatherService';

const QUICK_PROMPTS = [
  { label: 'Best rated nearby', query: 'What is the highest rated place near me right now?' },
  { label: 'Family restaurants', query: 'Recommend family-friendly restaurants nearby.' },
  { label: 'Open pharmacies', query: 'Which pharmacies are closest to me?' },
  { label: 'Cheapest gas', query: 'Where is the cheapest gas station near me?' },
  { label: 'Weather tips', query: 'Based on current weather, what should I plan for today nearby?' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  locationLabel: string;
  places: Place[];
  selectedPlace: Place | null;
  weather?: WeatherSummary | null;
  onRunSearch?: (query: string) => void;
};

function buildMapContext(
  locationLabel: string,
  places: Place[],
  selectedPlace: Place | null,
  weather?: WeatherSummary | null
): Record<string, unknown> {
  const topPlaces = places.slice(0, 10).map((p) => ({
    name: p.name,
    category: p.category,
    rating: p.rating,
    distance_km: p.distance,
    address: p.address,
  }));

  return {
    aiPersona: 'general',
    location: locationLabel,
    householdContext: {
      mapSession: {
        locationLabel,
        nearbyCount: places.length,
        topPlaces,
        selectedPlace: selectedPlace
          ? {
              name: selectedPlace.name,
              category: selectedPlace.category,
              rating: selectedPlace.rating,
              address: selectedPlace.address,
              distance_km: selectedPlace.distance,
            }
          : null,
        weather: weather?.current
          ? {
              description: weather.current.description,
              temperature: weather.current.temperature,
              feelsLike: weather.current.feelsLike,
              humidity: weather.current.humidity,
              precipitationProbability: weather.current.precipitationProbability,
              windSpeed: weather.current.windSpeed,
              alerts: (weather.alerts || []).slice(0, 2).map((a) => a.title),
              pollen: weather.pollen?.days?.[0]?.types?.[0]?.category,
            }
          : null,
      },
    },
  };
}

export default function MapsAiSheet({
  visible,
  onClose,
  locationLabel,
  places,
  selectedPlace,
  weather,
  onRunSearch,
}: Props) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setInput('');
      setResponse(null);
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  if (!visible) return null;

  const askAi = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await api.aiChat(trimmed, buildMapContext(locationLabel, places, selectedPlace, weather));
      setResponse(data.response || data.message || 'No response from AI.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not reach AI.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    void askAi(input);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={20} color={theme.colors.accentWarm} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Map AI</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {locationLabel}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptRow}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_PROMPTS.map((item) => (
            <Pressable
              key={item.label}
              style={styles.promptChip}
              onPress={() => {
                setInput(item.query);
                void askAi(item.query);
              }}
            >
              <Text style={styles.promptChipText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about places nearby…"
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onSubmit}
            returnKeyType="send"
            editable={!loading}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={onSubmit}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={theme.colors.textInverse} />
            )}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primaryLight} />
            <Text style={styles.loadingText}>Analyzing nearby places…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {response ? (
          <ScrollView style={styles.answerScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.answerText}>{response}</Text>
            {onRunSearch && selectedPlace?.name ? (
              <Pressable
                style={styles.searchLink}
                onPress={() => {
                  onRunSearch(selectedPlace.name!);
                  onClose();
                }}
              >
                <Ionicons name="search" size={16} color={theme.colors.primaryLight} />
                <Text style={styles.searchLinkText}>Search for {selectedPlace.name}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    paddingTop: theme.spacing.sm,
    maxHeight: '72%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.glowGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  promptRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: theme.spacing.md,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptChipText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryLight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderFocus,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,.12)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.danger,
    lineHeight: 20,
  },
  answerScroll: {
    maxHeight: 220,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  answerText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  searchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
  },
  searchLinkText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primaryLight,
  },
});
}
