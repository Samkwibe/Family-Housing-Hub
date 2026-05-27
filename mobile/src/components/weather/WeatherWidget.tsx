import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  formatWeatherDayLabel,
  topPollenLabel,
  weatherIconUri,
  type WeatherSummary,
} from '@/src/services/weatherService';

type Props = {
  weather: WeatherSummary | null;
  loading?: boolean;
  error?: string | null;
  variant?: 'compact' | 'card';
  onPress?: () => void;
};

function Temp({ value, unit }: { value?: number; unit?: string }) {
  const styles = useAppStyles(createStyles);

  if (value == null) return <Text style={styles.tempDash}>—</Text>;
  return (
    <Text style={styles.tempMain}>
      {Math.round(value)}
      <Text style={styles.tempUnit}>°{unit === 'C' ? 'C' : 'F'}</Text>
    </Text>
  );
}

export default function WeatherWidget({
  weather,
  loading,
  error,
  variant = 'card',
  onPress,
}: Props) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const [sheetOpen, setSheetOpen] = useState(false);
  const current = weather?.current;
  const iconUri = weatherIconUri(current);
  const hasAlert = (weather?.alerts?.length ?? 0) > 0;

  const openSheet = () => {
    if (onPress) {
      onPress();
      return;
    }
    setSheetOpen(true);
  };

  if (variant === 'compact') {
    return (
      <>
        <Pressable
          style={styles.compactChip}
          onPress={openSheet}
          disabled={loading && !weather}
        >
          {loading && !weather ? (
            <ActivityIndicator size="small" color={theme.colors.accentWarm} />
          ) : iconUri ? (
            <Image source={{ uri: iconUri }} style={styles.compactIcon} resizeMode="contain" />
          ) : (
            <Ionicons name="partly-sunny" size={18} color={theme.colors.accentWarm} />
          )}
          <Text style={styles.compactTemp}>
            {current?.temperature != null ? `${Math.round(current.temperature)}°` : '--'}
          </Text>
          {hasAlert ? <View style={styles.alertDot} /> : null}
        </Pressable>

        <WeatherDetailSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          weather={weather}
          loading={loading}
          error={error}
        />
      </>
    );
  }

  return (
    <>
      <Pressable style={styles.card} onPress={openSheet}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardLabel}>Local weather</Text>
            <Text style={styles.cardDesc} numberOfLines={1}>
              {loading && !current
                ? 'Loading…'
                : error
                  ? 'Weather unavailable'
                  : current?.description || 'Current conditions'}
            </Text>
          </View>
          {iconUri ? (
            <Image source={{ uri: iconUri }} style={styles.cardIcon} resizeMode="contain" />
          ) : (
            <Ionicons name="cloud-outline" size={36} color={theme.colors.primaryLight} />
          )}
        </View>

        <View style={styles.cardMain}>
          {loading && !current ? (
            <ActivityIndicator color={theme.colors.primaryLight} />
          ) : (
            <>
              <Temp value={current?.temperature} unit={current?.temperatureUnit} />
              <View style={styles.cardMeta}>
                {current?.feelsLike != null ? (
                  <Text style={styles.metaLine}>Feels like {Math.round(current.feelsLike)}°</Text>
                ) : null}
                {current?.humidity != null ? (
                  <Text style={styles.metaLine}>Humidity {current.humidity}%</Text>
                ) : null}
                {current?.windSpeed != null ? (
                  <Text style={styles.metaLine}>
                    Wind {Math.round(current.windSpeed)} {current.windSpeedUnit || 'mph'}{' '}
                    {current.windDirection || ''}
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </View>

        {weather?.daily && weather.daily.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dailyRow}>
            {weather.daily.slice(0, 5).map((day, i) => (
              <View key={`${day.date?.month}-${day.date?.day}-${i}`} style={styles.dayCol}>
                <Text style={styles.dayLabel}>{i === 0 ? 'Today' : formatWeatherDayLabel(day.date)}</Text>
                {day.iconUrl ? (
                  <Image source={{ uri: day.iconUrl }} style={styles.dayIcon} resizeMode="contain" />
                ) : null}
                <Text style={styles.dayHigh}>
                  {day.maxTemperature != null ? `${Math.round(day.maxTemperature)}°` : '--'}
                </Text>
                <Text style={styles.dayLow}>
                  {day.minTemperature != null ? `${Math.round(day.minTemperature)}°` : '--'}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {hasAlert ? (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color={theme.colors.accentWarm} />
            <Text style={styles.alertBannerText} numberOfLines={2}>
              {weather?.alerts?.[0]?.title || 'Weather alert active'}
            </Text>
          </View>
        ) : null}
        {topPollenLabel(weather?.pollen) ? (
          <View style={styles.pollenBanner}>
            <Ionicons name="flower-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.pollenText} numberOfLines={2}>
              Pollen: {topPollenLabel(weather?.pollen)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <WeatherDetailSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        weather={weather}
        loading={loading}
        error={error}
      />
    </>
  );
}

function WeatherDetailSheet({ visible, onClose, weather, loading, error }: {
  visible: boolean;
  onClose: () => void;
  weather: WeatherSummary | null;
  loading?: boolean;
  error?: string | null;
}) {
  const styles = useAppStyles(createStyles);
  const theme = useTheme();

  const current = weather?.current;
  const iconUri = weatherIconUri(current);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Weather</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {loading && !current ? (
            <ActivityIndicator color={theme.colors.primaryLight} style={{ marginVertical: 24 }} />
          ) : error ? (
            <Text style={styles.sheetError}>{error}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sheetCurrent}>
                {iconUri ? (
                  <Image source={{ uri: iconUri }} style={styles.sheetIcon} resizeMode="contain" />
                ) : null}
                <Temp value={current?.temperature} unit={current?.temperatureUnit} />
                <Text style={styles.sheetDesc}>{current?.description}</Text>
              </View>

              <View style={styles.statsGrid}>
                {[
                  { label: 'Feels like', value: current?.feelsLike != null ? `${Math.round(current.feelsLike)}°` : '—' },
                  { label: 'Humidity', value: current?.humidity != null ? `${current.humidity}%` : '—' },
                  { label: 'UV index', value: current?.uvIndex != null ? String(current.uvIndex) : '—' },
                  {
                    label: 'Wind',
                    value:
                      current?.windSpeed != null
                        ? `${Math.round(current.windSpeed)} ${current.windSpeedUnit || 'mph'}`
                        : '—',
                  },
                  {
                    label: 'Rain chance',
                    value:
                      current?.precipitationProbability != null
                        ? `${current.precipitationProbability}%`
                        : '—',
                  },
                  {
                    label: 'Cloud cover',
                    value: current?.cloudCover != null ? `${current.cloudCover}%` : '—',
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.statCell}>
                    <Text style={styles.statLabel}>{item.label}</Text>
                    <Text style={styles.statValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              {weather?.hourly && weather.hourly.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Next hours</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {weather.hourly.slice(0, 12).map((hour, i) => (
                      <View key={hour.time || i} style={styles.hourCol}>
                        <Text style={styles.hourTime}>
                          {hour.time
                            ? new Date(hour.time).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                              })
                            : '--'}
                        </Text>
                        {hour.iconUrl ? (
                          <Image source={{ uri: hour.iconUrl }} style={styles.hourIcon} resizeMode="contain" />
                        ) : null}
                        <Text style={styles.hourTemp}>
                          {hour.temperature != null ? `${Math.round(hour.temperature)}°` : '--'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {weather?.alerts?.map((alert, i) => (
                <View key={alert.title || i} style={styles.alertBox}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertBody}>{alert.description}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 11, 46, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactIcon: { width: 22, height: 22 },
  compactTemp: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accentWarm,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardDesc: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 4,
    maxWidth: 220,
  },
  cardIcon: { width: 52, height: 52 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  tempMain: {
    fontFamily: theme.fonts.title,
    fontSize: 42,
    fontWeight: '800',
    color: theme.colors.text,
  },
  tempUnit: { fontSize: 22, fontWeight: '700' },
  tempDash: { fontSize: 32, color: theme.colors.textMuted },
  cardMeta: { flex: 1, gap: 4 },
  metaLine: { fontFamily: theme.fonts.body, fontSize: 13, color: theme.colors.textSecondary },
  dailyRow: { marginTop: 14 },
  dayCol: { alignItems: 'center', width: 58, marginRight: 8 },
  dayLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  dayIcon: { width: 28, height: 28, marginVertical: 4 },
  dayHigh: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  dayLow: { fontSize: 12, color: theme.colors.textSecondary },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.glowGold,
  },
  alertBannerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.ctaYellow,
    fontWeight: '600',
  },
  pollenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.glowTeal,
  },
  pollenText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  sheet: {
    maxHeight: '78%',
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sheetTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sheetError: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.danger,
    paddingVertical: 20,
  },
  sheetCurrent: { alignItems: 'center', marginBottom: theme.spacing.lg },
  sheetIcon: { width: 72, height: 72 },
  sheetDesc: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  statCell: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: 15, color: theme.colors.text, fontWeight: '700', marginTop: 4 },
  sectionTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  hourCol: { alignItems: 'center', width: 56, marginRight: 8 },
  hourTime: { fontSize: 11, color: theme.colors.textMuted },
  hourIcon: { width: 26, height: 26, marginVertical: 4 },
  hourTemp: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  alertBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(245,158,11,.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,.35)',
  },
  alertTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accentWarm,
    marginBottom: 6,
  },
  alertBody: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
});
}
