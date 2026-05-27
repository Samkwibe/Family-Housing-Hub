import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FamilyMemoryRow } from '@/src/portals/shared/components/FamilyMemoryRow';
import { MemoryRecapCard } from '@/src/portals/shared/components/MemoryRecapCard';
import { familyTheme } from '@/src/portals/parent/theme';
import { fetchFamilyMemories, type FamilyMemory } from '@/src/services/memoryService';

type Props = {
  portal: 'parent' | 'child';
  childProfileId?: string;
  onOpenAll?: () => void;
};

/** Recent curated memories — sparse preview, not a feed */
export function FamilyMemoriesPreview({ portal, childProfileId, onOpenAll }: Props) {
  const [resurfaced, setResurfaced] = useState<FamilyMemory[]>([]);
  const [recent, setRecent] = useState<FamilyMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchFamilyMemories({
          limit: 4,
          childProfileId,
          resurface: true,
        });
        if (!active) return;
        setResurfaced(data.resurfaced ?? []);
        setRecent((data.memories ?? []).slice(0, 2));
      } catch {
        if (active) {
          setResurfaced([]);
          setRecent([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [childProfileId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={familyTheme.colors.accent} />
      </View>
    );
  }

  if (!resurfaced.length && !recent.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.heading}>
          {portal === 'child' ? 'Our story' : 'Family memories'}
        </Text>
        {onOpenAll ? (
          <Pressable onPress={onOpenAll} style={styles.link}>
            <Text style={styles.linkText}>See all</Text>
            <Ionicons name="chevron-forward" size={16} color={familyTheme.colors.accent} />
          </Pressable>
        ) : null}
      </View>

      {resurfaced[0] ? <MemoryRecapCard memory={resurfaced[0]} onPress={onOpenAll} /> : null}

      {recent.length > 0 ? (
        <View style={styles.card}>
          {recent.map((memory, idx) => (
            <View key={memory.id}>
              <FamilyMemoryRow memory={memory} compact />
              {idx < recent.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 16 },
  loading: { paddingVertical: 24, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontFamily: familyTheme.fonts.bodyBold,
    fontSize: 18,
    color: familyTheme.colors.ink,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: {
    fontFamily: familyTheme.fonts.bodyMedium,
    fontSize: 13,
    color: familyTheme.colors.accent,
  },
  card: {
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
});
