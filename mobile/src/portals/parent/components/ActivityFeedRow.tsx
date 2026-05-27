import { View, Text, StyleSheet } from 'react-native';
import type { ChildActivityItem } from '@/src/services/parentChildService';
import { familyTheme } from '@/src/portals/parent/theme';

type Props = { item: ChildActivityItem };

export function ActivityFeedRow({
  item }: Props) {
  const time = item.createdAt ? formatRelative(item.createdAt) : '';
  return (
    <View style={styles.row}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.childName} · {item.message}</Text>
      </View>
      {time ? <Text style={styles.time}>{time}</Text> : null}
    </View>
  );
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: familyTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  body: { flex: 1 },
  title: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 15, color: familyTheme.colors.ink },
  message: { fontFamily: familyTheme.fonts.body, fontSize: 13, color: familyTheme.colors.inkMuted, marginTop: 2 },
  time: { fontFamily: familyTheme.fonts.body, fontSize: 11, color: familyTheme.colors.inkMuted },
});
