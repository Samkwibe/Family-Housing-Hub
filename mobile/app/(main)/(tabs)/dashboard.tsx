import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '@/src/contexts/AuthContext';
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { HouseholdErrorBanner } from '@/src/components/household/HouseholdErrorBanner';
import WeatherWidget from '@/src/components/weather/WeatherWidget';
import SolarInsightCard from '@/src/components/weather/SolarInsightCard';
import { useWeather } from '@/src/hooks/useWeather';
import {
  getFeature,
} from '@/src/features/registry';
import {
  featuresForUser,
  getRoleExperience,
  normalizeUserType,
} from '@/src/config/userExperience';
import { useTabScreenInsets } from '@/src/hooks/useTabScreenInsets';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function DashboardScreen() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { userProfile, refreshProfile } = useAuth();
  const { snapshot, alerts, aiRecommendations, forecastSummary, topDocumentRisk, geofenceEvents, healthGapSummary, purchaseReadiness, refreshHousehold, error } = useHousehold();
  const router = useRouter();
  const { scrollBottomPadding } = useTabScreenInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { weather, loading: weatherLoading, error: weatherError, refresh: refreshWeather } =
    useWeather(coords?.lat ?? null, coords?.lng ?? null);

  const userType = normalizeUserType(userProfile?.userType);
  const roleExp = getRoleExperience(userType);
  const quickFeatures = roleExp.dashboardQuick;
  const allModules = featuresForUser(userType).filter(
    (f) => !quickFeatures.includes(f.slug)
  );

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17) setGreeting('Good evening');
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        // ignore — weather card stays hidden until coords exist
      }
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), refreshHousehold(), refreshWeather()]);
    setRefreshing(false);
  };

  const name = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : userProfile?.email?.split('@')[0];

  const topAlerts = alerts.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primaryLight} />
        }
        contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[theme.colors.aiGradientStart, theme.colors.background]}
          style={styles.hero}
        >
          <View style={styles.heroGlowGold} />
          <View style={styles.heroGlowPurple} />
          <View style={styles.roleBadgeRow}>
            <View style={[styles.roleBadge, { borderColor: `${roleExp.color}55` }]}>
              <Text style={[styles.roleBadgeText, { color: roleExp.color }]}>{roleExp.label}</Text>
            </View>
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.heroSub}>{roleExp.heroSubtitle}</Text>

          <HouseholdErrorBanner />

          <Pressable
            style={styles.searchBar}
            onPress={() =>
              router.push({
                pathname: '/(main)/(tabs)/assistant',
                params: { prompt: 'Search my household: ' },
              })
            }
          >
            <Ionicons name="search" size={18} color="#A78BFA" />
            <Text style={styles.searchPlaceholder}>Ask anything about your home…</Text>
            <Ionicons name="mic" size={18} color="#F59E0B" />
          </Pressable>

          <View style={styles.healthRow}>
            <View style={styles.healthScore}>
              <Text style={styles.healthLabel}>Household health</Text>
              <Text style={styles.healthVal}>{snapshot.healthScore}</Text>
            </View>
            <StatPill label="Expiring" value={snapshot.expiringFood} color="#EF4444" />
            <StatPill label="Bills" value={snapshot.billsDue} color="#F59E0B" />
            <StatPill label="Tasks" value={snapshot.pendingTasks} color="#A78BFA" />
          </View>
        </LinearGradient>

        <Pressable style={styles.familyHubCard} onPress={() => router.push('/(main)/my-children')}>
          <Text style={styles.familyHubEmoji}>👨‍👩‍👧‍👦</Text>
          <View style={styles.familyHubBody}>
            <Text style={styles.familyHubTitle}>My Children</Text>
            <Text style={styles.familyHubSub}>Manage chores, rewards & family activity</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#7C3AED" />
        </Pressable>

        {coords ? (
          <View style={styles.weatherWrap}>
            <WeatherWidget
              weather={weather}
              loading={weatherLoading}
              error={weatherError}
              variant="card"
            />
            {userType === 'owner' ? (
              <SolarInsightCard lat={coords.lat} lng={coords.lng} />
            ) : null}
          </View>
        ) : null}

        {forecastSummary ? (
          <Pressable
            style={styles.forecastCard}
            onPress={() => router.push('/(main)/feature/budget')}
          >
            <Ionicons name="calendar" size={16} color="#EF4444" />
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>Cash flow alert</Text>
              <Text style={styles.alertSub}>{forecastSummary.summary}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}

        {purchaseReadiness ? (
          <Pressable
            style={styles.readinessCard}
            onPress={() => router.push('/(main)/feature/purchase-readiness')}
          >
            <Ionicons name="home" size={16} color="#14B8A6" />
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>Home readiness {Math.round(purchaseReadiness.score)}/100</Text>
              <Text style={styles.alertSub}>{purchaseReadiness.message}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}

        {healthGapSummary ? (
          <Pressable
            style={styles.healthGapCard}
            onPress={() => router.push('/(main)/feature/health')}
          >
            <Ionicons name="medkit" size={16} color="#F59E0B" />
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>Health check-up gaps ({healthGapSummary.totalGaps})</Text>
              <Text style={styles.alertSub}>{healthGapSummary.message}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}

        {topDocumentRisk && topDocumentRisk.cardLevel ? (
          <Pressable
            style={[
              styles.docRiskCard,
              topDocumentRisk.cardLevel === 'red' ? styles.docRiskRed : styles.docRiskOrange,
            ]}
            onPress={() => router.push('/(main)/feature/document-vault')}
          >
            <Ionicons name="document-text" size={16} color={topDocumentRisk.cardLevel === 'red' ? '#EF4444' : '#F59E0B'} />
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>Document expiring soon</Text>
              <Text style={styles.alertSub}>{topDocumentRisk.message || topDocumentRisk.title}</Text>
              <Text style={styles.docRiskScore}>Risk score {Math.round(topDocumentRisk.riskScore)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}

        {geofenceEvents.length > 0 ? (
          <View style={styles.geofenceWrap}>
            <Text style={styles.sectionLabel}>LOCATION UPDATES</Text>
            {geofenceEvents.slice(0, 2).map((e, i) => (
              <View key={`${e.timestamp}-${i}`} style={styles.geofenceCard}>
                <Ionicons name={e.eventType === 'enter' ? 'log-in' : 'log-out'} size={14} color="#14B8A6" />
                <Text style={styles.geofenceText}>{e.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>PROACTIVE AI ALERTS</Text>
        {topAlerts.map((a) => (
          <Pressable
            key={a.id}
            style={[
              styles.alertCard,
              a.type === 'spending' && styles.alertSpending,
              a.urgency === 'high' && a.type !== 'spending' && styles.alertHigh,
            ]}
            onPress={() => {
              if (a.aiPrompt) {
                router.push({ pathname: '/(main)/(tabs)/assistant', params: { prompt: a.aiPrompt } });
              } else if (a.actionSlug) {
                router.push(`/(main)/feature/${a.actionSlug}`);
              }
            }}
          >
            <View style={[styles.alertIcon, a.type === 'spending' && styles.alertIconSpending]}>
              <Ionicons name={a.type === 'spending' ? 'trending-up' : 'sparkles'} size={14} color="#F59E0B" />
            </View>
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>{a.title}</Text>
              <Text style={styles.alertSub}>{a.body}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
          </Pressable>
        ))}
        <Pressable style={styles.viewAll} onPress={() => router.push('/(main)/feature/notifications')}>
          <Text style={styles.viewAllText}>View all alerts</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>AI RECOMMENDATIONS</Text>
        <View style={styles.recCard}>
          {aiRecommendations.slice(0, 3).map((r) => (
            <Pressable
              key={r}
              style={styles.recRow}
              onPress={() => router.push({ pathname: '/(main)/(tabs)/assistant', params: { prompt: r } })}
            >
              <Ionicons name="bulb" size={16} color="#14B8A6" />
              <Text style={styles.recText}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          {userType === 'owner' ? 'PROPERTY TOOLS' : userType === 'family' ? 'FAMILY TOOLS' : 'RENTER TOOLS'}
        </Text>
        <View style={styles.systemGrid}>
          {quickFeatures.map((slug) => {
            const f = getFeature(slug);
            if (!f) return null;
            return (
              <Pressable
                key={slug}
                style={styles.systemTile}
                onPress={() => router.push(`/(main)/feature/${slug}`)}
              >
                <View style={[styles.systemIcon, { backgroundColor: `${f.color}18` }]}>
                  <Ionicons name={f.icon} size={20} color={f.color} />
                </View>
                <Text style={styles.systemLabel}>{f.label}</Text>
                {f.badge ? <Text style={styles.systemBadge}>{f.badge}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>MORE FOR YOU</Text>
        <View style={styles.moduleList}>
          {allModules.slice(0, 8).map((f) => (
            <Pressable
              key={f.slug}
              style={styles.moduleRow}
              onPress={() => router.push(`/(main)/feature/${f.slug}`)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: `${f.color}15` }]}>
                <Ionicons name={f.icon} size={16} color={f.color} />
              </View>
              <View style={styles.moduleBody}>
                <Text style={styles.moduleTitle}>{f.label}</Text>
                <Text style={styles.moduleSub} numberOfLines={1}>{f.summary}</Text>
              </View>
              <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.aiCta}
          onPress={() => router.push('/(main)/(tabs)/assistant')}
        >
          <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.aiCtaGrad}>
            <Ionicons name="sparkles" size={22} color="#FDE68A" />
            <View style={styles.aiCtaBody}>
              <Text style={styles.aiCtaTitle}>FamilyHub AI</Text>
              <Text style={styles.aiCtaSub}>Voice + text · Your household brain</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#FDE68A" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.statPill, { borderColor: `${color}33` }]}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { paddingBottom: 16 },
  familyHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: theme.spacing.lg,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.18)',
  },
  familyHubEmoji: { fontSize: 32 },
  familyHubBody: { flex: 1 },
  familyHubTitle: { fontFamily: theme.fonts.title, fontSize: 16, fontWeight: '700', color: '#1E1B4B' },
  familyHubSub: { fontFamily: theme.fonts.body, fontSize: 12, color: '#6B7280', marginTop: 2 },
  weatherWrap: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: -8,
  },
  roleBadgeRow: { marginBottom: 8 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(124,58,237,.12)',
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  heroGlowGold: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.glowGold,
  },
  heroGlowPurple: {
    position: 'absolute',
    left: -40,
    bottom: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.glowPurple,
  },
  greeting: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: theme.fonts.titleExtra,
    fontSize: theme.fontSize.hero,
    color: theme.colors.text,
    marginTop: 4,
  },
  heroSub: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.35)',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  healthRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  healthScore: {
    flex: 1.2,
    backgroundColor: 'rgba(20,184,166,.1)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,.25)',
  },
  healthLabel: {
    ...theme.typography.overline,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.textSecondary,
  },
  healthVal: {
    fontFamily: theme.fonts.titleExtra,
    fontSize: 28,
    color: '#14B8A6',
    marginTop: 2,
  },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statVal: { fontFamily: theme.fonts.title, fontSize: theme.fontSize.xl, fontWeight: '800' },
  statLbl: {
    ...theme.typography.overline,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    ...theme.typography.overline,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.textMuted,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  alertHigh: { borderColor: 'rgba(239,68,68,.3)' },
  alertSpending: {
    borderColor: 'rgba(245,158,11,.45)',
    backgroundColor: 'rgba(245,158,11,.08)',
  },
  alertIconSpending: { backgroundColor: 'rgba(245,158,11,.2)' },
  forecastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(239,68,68,.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,.25)',
  },
  readinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(20,184,166,.1)',
    borderColor: 'rgba(20,184,166,.35)',
  },
  healthGapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(245,158,11,.1)',
    borderColor: 'rgba(245,158,11,.35)',
  },
  docRiskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  docRiskRed: {
    backgroundColor: 'rgba(239,68,68,.1)',
    borderColor: 'rgba(239,68,68,.35)',
  },
  docRiskOrange: {
    backgroundColor: 'rgba(245,158,11,.1)',
    borderColor: 'rgba(245,158,11,.35)',
  },
  docRiskScore: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  geofenceWrap: { marginTop: 8 },
  geofenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  geofenceText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: { flex: 1 },
  alertTitle: { fontFamily: theme.fonts.bodyBold, fontSize: theme.fontSize.md, color: theme.colors.text },
  alertSub: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 20 },
  viewAll: { alignItems: 'center', marginTop: 4, marginBottom: 4 },
  viewAllText: { fontFamily: theme.fonts.bodyBold, fontSize: theme.fontSize.sm, color: '#A78BFA' },
  recCard: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  recText: { flex: 1, fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 21 },
  systemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  systemTile: {
    width: '30%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  systemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  systemLabel: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
  systemBadge: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: theme.fontSize.xs,
    color: '#F59E0B',
    marginTop: 4,
  },
  moduleList: { paddingHorizontal: 16, gap: 8 },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleBody: { flex: 1 },
  moduleTitle: { fontFamily: theme.fonts.bodyBold, fontSize: theme.fontSize.md, color: theme.colors.text },
  moduleSub: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 20 },
  aiCta: { marginHorizontal: 16, marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  aiCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
  },
  aiCtaBody: { flex: 1 },
  aiCtaTitle: { fontFamily: theme.fonts.title, fontSize: theme.fontSize.lg, color: '#fff' },
  aiCtaSub: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: 'rgba(255,255,255,.85)', marginTop: 2 },
});
}
