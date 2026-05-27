import { View, Text, StyleSheet } from 'react-native';
import type { FamilyMemory } from '@/src/services/memoryService';
import { familyTheme } from '@/src/portals/parent/theme';

type Props = { memory: FamilyMemory; compact?: boolean };

export function FamilyMemoryRow({
  memory, compact }: Props) {
  const date = formatMemoryDate(memory.occurredAt);
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{memory.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{memory.title}</Text>
        <Text style={styles.message} numberOfLines={compact ? 2 : 3}>
          {memory.message}
        </Text>
        {memory.childName && memory.type !== 'family_milestone' ? (
          <Text style={styles.meta}>{memory.childName}</Text>
        ) : null}
      </View>
      {date ? <Text style={styles.date}>{date}</Text> : null}
    </View>
  );
}

function formatMemoryDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  rowCompact: { paddingVertical: 12 },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  body: { flex: 1, gap: 4 },
  title: {
    fontFamily: familyTheme.fonts.bodyBold,
    fontSize: 15,
    color: familyTheme.colors.ink,
    lineHeight: 20,
  },
  message: {
    fontFamily: familyTheme.fonts.body,
    fontSize: 13,
    color: familyTheme.colors.inkSoft,
    lineHeight: 19,
  },
  meta: {
    fontFamily: familyTheme.fonts.body,
    fontSize: 12,
    color: familyTheme.colors.inkMuted,
    marginTop: 2,
  },
  date: {
    fontFamily: familyTheme.fonts.body,
    fontSize: 11,
    color: familyTheme.colors.inkMuted,
    paddingTop: 2,
  },
});
