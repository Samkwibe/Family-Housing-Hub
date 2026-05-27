import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ParentChildSummary } from '@/src/services/parentChildService';
import { childCardGradient, childEmoji, familyTheme } from '@/src/portals/parent/theme';

type Props = {
  child: ParentChildSummary;
  onPress: () => void;
};

export function ChildSummaryCard({
  child, onPress }: Props) {
  const gradient = childCardGradient(child.displayName);
  const emoji = childEmoji(child.displayName);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient colors={[...gradient]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{emoji}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.name}>{child.displayName}</Text>
            <Text style={styles.age}>{child.ageLabel || 'Family member'}</Text>
            {child.isManaged ? (
              <View style={styles.managedPill}>
                <Text style={styles.managedText}>Managed · no login</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={familyTheme.colors.inkMuted} />
        </View>

        <View style={styles.statsRow}>
          <StatPill icon="star" label={`${child.pointsBalance} pts`} />
          {child.streakDays > 0 ? <StatPill icon="flame" label={`${child.streakDays}d`} /> : null}
          <StatPill icon="checkbox-outline" label={`${child.pendingChores} left`} />
          {child.walletBalance > 0 ? <StatPill icon="wallet-outline" label={`$${child.walletBalance.toFixed(0)}`} /> : null}
        </View>

        {child.pendingChores === 0 && child.completedChores > 0 ? (
          <Text style={styles.cheer}>All chores done today! 🎉</Text>
        ) : child.pendingChores > 0 ? (
          <Text style={styles.hint}>{child.pendingChores} task{child.pendingChores === 1 ? '' : 's'} waiting</Text>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

function StatPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={familyTheme.colors.purpleDeep} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: familyTheme.spacing.lg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  card: {
    borderRadius: familyTheme.radius.lg,
    padding: familyTheme.spacing.lg,
    ...familyTheme.shadow.card,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26 },
  meta: { flex: 1 },
  name: { fontFamily: familyTheme.fonts.title, fontSize: 20, fontWeight: '700', color: familyTheme.colors.ink },
  age: { fontFamily: familyTheme.fonts.body, fontSize: 13, color: familyTheme.colors.inkSoft, marginTop: 2 },
  managedPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: familyTheme.radius.pill,
    marginTop: 6,
  },
  managedText: { fontFamily: familyTheme.fonts.bodyMedium, fontSize: 11, color: familyTheme.colors.purpleDeep },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: familyTheme.radius.pill,
  },
  pillText: { fontFamily: familyTheme.fonts.bodyBold, fontSize: 12, color: familyTheme.colors.purpleDeep },
  cheer: { fontFamily: familyTheme.fonts.bodyMedium, fontSize: 13, color: familyTheme.colors.mintDeep, marginTop: 10 },
  hint: { fontFamily: familyTheme.fonts.body, fontSize: 13, color: familyTheme.colors.inkMuted, marginTop: 10 },
});
