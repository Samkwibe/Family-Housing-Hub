import { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { fetchVaccinationSchedule, fetchHealthTimeline, type VaccinationItem, type HealthTimelineItem } from '@/src/services/householdService';
import { ChildEmptyState } from '@/src/portals/child/components/ChildEmptyState';
import { childTheme } from '@/src/portals/child/theme';

export function ChildHealthScreen() {
  const { data: portalData } = useChildPortal();
  const profileId = portalData?.profile?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vaccines, setVaccines] = useState<VaccinationItem[]>([]);
  const [appointments, setAppointments] = useState<HealthTimelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (!profileId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [vacRes, timeRes] = await Promise.all([
        fetchVaccinationSchedule(profileId),
        fetchHealthTimeline(profileId)
      ]);
      setVaccines(vacRes.schedule || []);
      // Filter out only appointment kinds of timeline records
      const appts = (timeRes.timeline || []).filter(
        (t) => t.kind === 'record' && t.type !== 'vaccination'
      );
      setAppointments(appts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch health history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profileId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={childTheme.colors.purpleDeep} />
        <Text style={styles.loadingText}>Loading health tracker...</Text>
      </View>
    );
  }

  const upcomingVaccines = vaccines.filter((v) => v.status !== 'received');
  const receivedVaccines = vaccines.filter((v) => v.status === 'received');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={childTheme.colors.purpleDeep}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My health 🩺</Text>
        <Text style={styles.sub}>Check your upcoming appointments and vaccinations</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={24} color={childTheme.colors.coral} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Health Appointments Section */}
      <Text style={styles.sectionTitle}>Appointments & Checkups</Text>
      {appointments.length > 0 ? (
        appointments.map((appt) => (
          <View key={appt.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={20} color={childTheme.colors.blueDeep} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{appt.title}</Text>
              <Text style={styles.cardMeta}>
                {new Date(appt.date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <ChildEmptyState
          variant="warm"
          emoji="📅"
          title="No upcoming visits"
          message="When your parents schedule medical appointments, they'll appear here."
        />
      )}

      {/* Vaccination Schedule Section */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Vaccinations & Protection</Text>
      
      {upcomingVaccines.length > 0 ? (
        <View style={styles.scheduleGroup}>
          <Text style={styles.groupHeader}>Upcoming</Text>
          {upcomingVaccines.map((v, i) => (
            <View key={i} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="shield-outline" size={20} color={childTheme.colors.sunDeep} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{v.vaccine}</Text>
                <Text style={styles.cardMeta}>Dose: {v.dose}</Text>
              </View>
              <View style={[styles.statusBadge, v.status === 'overdue' ? styles.badgeOverdue : styles.badgeUpcoming]}>
                <Text style={[styles.badgeText, v.status === 'overdue' ? styles.textOverdue : styles.textUpcoming]}>
                  {v.status === 'overdue' ? 'Overdue' : 'Scheduled'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {receivedVaccines.length > 0 ? (
        <View style={styles.scheduleGroup}>
          <Text style={styles.groupHeader}>Received & Shielded</Text>
          {receivedVaccines.map((v, i) => (
            <View key={i} style={[styles.card, styles.cardCompleted]}>
              <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={22} color={childTheme.colors.mintDeep} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, styles.titleCompleted]}>{v.vaccine}</Text>
                <Text style={styles.cardMeta}>Dose: {v.dose} · Completed</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {vaccines.length === 0 && !error ? (
        <ChildEmptyState
          variant="playful"
          emoji="🛡️"
          title="All fully protected!"
          message="Your immunization record is up to date and you're good to go."
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: childTheme.colors.cream },
  content: { paddingHorizontal: childTheme.spacing.xl, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: childTheme.colors.cream },
  loadingText: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 16, color: childTheme.colors.inkMuted, marginTop: 12 },
  header: {
    paddingVertical: childTheme.spacing.xl,
  },
  title: { fontFamily: childTheme.fonts.title, fontSize: 28, fontWeight: '700', color: childTheme.colors.ink },
  sub: { fontFamily: childTheme.fonts.body, fontSize: 15, color: childTheme.colors.inkMuted, marginTop: 4 },
  sectionTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 18, color: childTheme.colors.ink, marginBottom: 12 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: childTheme.radius.sm,
    marginBottom: 20,
  },
  errorText: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 14, color: '#991B1B', flex: 1 },
  scheduleGroup: {
    marginBottom: 16,
  },
  groupHeader: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 12,
    color: childTheme.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.md,
    padding: childTheme.spacing.lg,
    marginBottom: childTheme.spacing.md,
    gap: childTheme.spacing.md,
    ...childTheme.shadow.card,
  },
  cardCompleted: {
    opacity: 0.85,
    backgroundColor: '#F8FAFC',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 16, color: childTheme.colors.ink },
  titleCompleted: { color: childTheme.colors.inkMuted, textDecorationLine: 'none' },
  cardMeta: { fontFamily: childTheme.fonts.body, fontSize: 13, color: childTheme.colors.inkMuted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: childTheme.radius.pill,
  },
  badgeUpcoming: { backgroundColor: '#EFF6FF' },
  badgeOverdue: { backgroundColor: '#FEF2F2' },
  textUpcoming: { color: childTheme.colors.blueDeep },
  textOverdue: { color: childTheme.colors.coral },
  badgeText: { fontFamily: childTheme.fonts.bodyBold, fontSize: 11 },
});
