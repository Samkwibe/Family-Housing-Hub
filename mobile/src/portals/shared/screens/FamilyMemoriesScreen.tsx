import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FamilyMemoryRow } from '@/src/portals/shared/components/FamilyMemoryRow';
import { MemoryRecapCard } from '@/src/portals/shared/components/MemoryRecapCard';
import { familyTheme } from '@/src/portals/parent/theme';
import { childTheme } from '@/src/portals/child/theme';
import {
  fetchFamilyMemories,
  type FamilyMemoryGroup,
  type FamilyMemory,
} from '@/src/services/memoryService';

type Props = {
  portal: 'parent' | 'child';
  childProfileId?: string;
  onClose?: () => void;
};

/** Calm reflective timeline — curated family history, not an activity feed */
export function FamilyMemoriesScreen({ portal, childProfileId, onClose }: Props) {
  const theme = portal === 'child' ? childTheme : familyTheme;
  const [groups, setGroups] = useState<FamilyMemoryGroup[]>([]);
  const [resurfaced, setResurfaced] = useState<FamilyMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFamilyMemories({
        limit: 30,
        childProfileId,
        resurface: true,
      });
      setGroups(data.groups ?? []);
      setResurfaced(data.resurfaced ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load memories');
    } finally {
      setLoading(false);
    }
  }, [childProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const empty = !loading && groups.length === 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={portal === 'child' ? [...childTheme.gradients.card] : ['#FFF9F5', '#F5F3FF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          {onClose ? (
            <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.colors.ink }]}>Family memories</Text>
            <Text style={[styles.subtitle, { color: theme.colors.inkSoft }]}>
              Meaningful moments, preserved with care
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={(theme as any).colors.purpleDeep || (theme as any).colors.accent || '#8B5CF6'} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {resurfaced[0] ? (
              <View style={styles.section}>
                <MemoryRecapCard memory={resurfaced[0]} />
              </View>
            ) : null}

            {empty ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📖</Text>
                <Text style={[styles.emptyTitle, { color: theme.colors.ink }]}>Your story begins here</Text>
                <Text style={[styles.emptyText, { color: theme.colors.inkSoft }]}>
                  Milestones, firsts, and family wins will appear as meaningful moments unfold.
                </Text>
              </View>
            ) : (
              groups.map((group) => (
                <View key={group.month} style={styles.section}>
                  <Text style={styles.month}>{group.month}</Text>
                  <View style={styles.groupCard}>
                    {group.memories.map((memory, idx) => (
                      <View key={memory.id}>
                        <FamilyMemoryRow memory={memory} />
                        {idx < group.memories.length - 1 ? <View style={styles.divider} /> : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { paddingTop: 4 },
  backSpacer: { width: 32 },
  headerCopy: { flex: 1 },
  title: {
    fontFamily: familyTheme.fonts.title,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: familyTheme.fonts.body,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { fontFamily: familyTheme.fonts.body, color: familyTheme.colors.danger, textAlign: 'center' },
  retryBtn: { marginTop: 12, padding: 8 },
  retryText: { fontFamily: familyTheme.fonts.bodyBold, color: familyTheme.colors.accent },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  section: { marginBottom: 8 },
  month: {
    fontFamily: familyTheme.fonts.bodyBold,
    fontSize: 13,
    color: familyTheme.colors.inkMuted,
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: familyTheme.radius.lg,
    paddingHorizontal: 12,
    ...familyTheme.shadow.card,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 58,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: {
    fontFamily: familyTheme.fonts.title,
    fontSize: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: familyTheme.fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
