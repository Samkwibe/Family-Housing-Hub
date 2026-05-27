import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { fetchSolarInsights } from '@/src/services/weatherService';
import { useTheme } from '@/src/contexts/ThemeContext';

type Props = {
  lat: number | null;
  lng: number | null;
};

export default function SolarInsightCard({
  lat, lng }: Props) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [panels, setPanels] = useState<number | null>(null);
  const [sunHours, setSunHours] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setError(false);
    fetchSolarInsights(lat, lng)
      .then((data) => {
        setPanels(typeof data.maxPanels === 'number' ? data.maxPanels : null);
        setSunHours(
          typeof data.sunshineHoursPerYear === 'number' ? data.sunshineHoursPerYear : null
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (lat == null || lng == null) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sunny" size={22} color={theme.colors.accentWarm} />
        <Text style={styles.title}>Solar potential</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.colors.primaryLight} style={{ marginVertical: 8 }} />
      ) : error ? (
        <Text style={styles.sub}>Solar data unavailable for this location.</Text>
      ) : (
        <View style={styles.stats}>
          {panels != null ? (
            <View style={styles.stat}>
              <Text style={styles.statVal}>{panels}</Text>
              <Text style={styles.statLabel}>Max panels</Text>
            </View>
          ) : null}
          {sunHours != null ? (
            <View style={styles.stat}>
              <Text style={styles.statVal}>{Math.round(sunHours)}</Text>
              <Text style={styles.statLabel}>Sun hrs/yr</Text>
            </View>
          ) : null}
        </View>
      )}
      <Text style={styles.hint}>Google Solar API — estimate roof solar for your property</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sub: { fontFamily: theme.fonts.body, fontSize: 14, color: theme.colors.textSecondary },
  stats: { flexDirection: 'row', gap: 24, marginVertical: 8 },
  stat: { alignItems: 'flex-start' },
  statVal: {
    fontFamily: theme.fonts.title,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.accentWarm,
  },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600', marginTop: 2 },
  hint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8, lineHeight: 17 },
});
}
