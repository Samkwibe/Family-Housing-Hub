import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { FamilyMemory } from '@/src/services/memoryService';
import { familyTheme } from '@/src/portals/parent/theme';

type Props = {
  memory: FamilyMemory;
  onPress?: () => void;
};

/** Anniversary / milestone recap — calm reflective card */
export function MemoryRecapCard({ memory, onPress }: Props) {
  const yearsAgo = memory.yearsAgo;
  const kicker =
    memory.resurfaceReason === 'anniversary' && yearsAgo && yearsAgo > 0
      ? `${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago today`
      : 'A moment worth remembering';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient colors={['#EDE9FE', '#FCE7F3']} style={styles.card}>
        <Text style={styles.kicker}>{kicker}</Text>
        <View style={styles.row}>
          <Text style={styles.emoji}>{memory.emoji}</Text>
          <View style={styles.body}>
            <Text style={styles.title}>{memory.title}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {memory.message}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  pressed: { opacity: 0.92 },
  card: {
    borderRadius: familyTheme.radius.lg,
    padding: 18,
    gap: 10,
  },
  kicker: {
    fontFamily: familyTheme.fonts.bodyMedium,
    fontSize: 12,
    color: familyTheme.colors.accent,
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 28 },
  body: { flex: 1, gap: 4 },
  title: {
    fontFamily: familyTheme.fonts.bodyBold,
    fontSize: 16,
    color: familyTheme.colors.ink,
  },
  message: {
    fontFamily: familyTheme.fonts.body,
    fontSize: 13,
    color: familyTheme.colors.inkSoft,
    lineHeight: 19,
  },
});
