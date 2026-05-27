import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchOwnerDashboard, switchPortal, type OwnerDashboard } from '@/src/services/portalService';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

export default function OwnerShell() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { userProfile, refreshProfile } = useAuth();
  const [data, setData] = useState<OwnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const dash = await fetchOwnerDashboard();
      setData(dash);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load owner portal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const backToRenter = async () => {
    await switchPortal({ activePortal: 'renter' });
    await refreshProfile();
  };

  return (
    <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Owner portal</Text>
          <Text style={styles.title}>Property portfolio</Text>
          <Text style={styles.subtitle}>
            {userProfile?.firstName ? `${userProfile.firstName}, ` : ''}manage properties, tenants, and rent collection.
          </Text>
        </View>

        {loading && !data ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {data ? (
          <View style={styles.grid}>
            <StatCard label="Properties" value={String(data.summary.propertyCount)} />
            <StatCard label="Units" value={String(data.summary.totalUnits)} />
            <StatCard label="Occupied" value={`${data.summary.occupancyRate}%`} />
            <StatCard label="Vacant" value={String(data.summary.vacantUnits)} />
          </View>
        ) : null}

        {data?.properties?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your properties</Text>
            {data.properties.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardMeta}>
                  {[p.address?.street, p.address?.city, p.address?.state].filter(Boolean).join(', ') || 'No address yet'}
                </Text>
                <Text style={styles.cardMeta}>
                  {p.unitCount} units · {p.vacantUnits} vacant · {p.occupancyStatus}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get started</Text>
            <Text style={styles.hint}>
              Add properties via the API or upcoming owner property screens. Tenants, leases, and rent collection come next.
            </Text>
          </View>
        )}

        {data?.aiRecommendations?.[0] ? (
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>Owner AI</Text>
            <Text style={styles.aiText}>{data.aiRecommendations[0]}</Text>
          </View>
        ) : null}

        <Text style={styles.link} onPress={backToRenter}>
          Switch to renter portal
        </Text>
        <Text style={styles.link} onPress={() => router.push('/(main)/settings')}>
          Settings
        </Text>
      </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 20 },
  kicker: { color: '#14B8A6', fontWeight: '700', fontSize: 13, textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: theme.colors.textMuted, marginTop: 8, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statValue: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  statLabel: { color: theme.colors.textMuted, marginTop: 4, fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  cardTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  cardMeta: { color: theme.colors.textMuted, marginTop: 4, fontSize: 13 },
  hint: { color: theme.colors.textMuted, lineHeight: 20 },
  aiCard: {
    marginTop: 24,
    backgroundColor: '#0F766E22',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#14B8A644',
  },
  aiLabel: { color: '#14B8A6', fontWeight: '700', marginBottom: 6 },
  aiText: { color: theme.colors.text, lineHeight: 20 },
  error: { color: theme.colors.danger, marginTop: 12 },
  link: { color: theme.colors.primary, marginTop: 20, fontWeight: '600' },
});
}
