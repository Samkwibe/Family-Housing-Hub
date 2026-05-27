import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';

type TagVariant = 'violet' | 'green' | 'amber' | 'red';

const TAG: Record<TagVariant, { bg: string; border: string; color: string }> = {
  violet: { bg: 'rgba(124,58,237,.18)', border: 'rgba(167,139,250,.25)', color: '#A78BFA' },
  green: { bg: 'rgba(20,184,166,.12)', border: 'rgba(20,184,166,.25)', color: '#14B8A6' },
  amber: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', color: '#F59E0B' },
  red: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)', color: '#EF4444' },
};

export function FHTag({ label, variant='violet' }: { label: string; variant?: TagVariant }) {
  const styles = useAppStyles(createStyles);
  const t = TAG[variant];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.tagText, { color: t.color }]}>{label}</Text>
    </View>
  );
}

export function FHCard({ title, children, style }: { title?: string; children: ReactNode; style?: ViewStyle }) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardHdr}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function FHRowItem({ icon, iconColor, iconBg, title, subtitle, right, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useAppStyles(createStyles);

  const inner = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </>
  );
  if (onPress) {
    return (
      <Pressable style={styles.rowItem} onPress={onPress}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.rowItem}>{inner}</View>;
}

export function FHCta({ label, onPress, icon='arrow-forward', variant='primary' }: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'ai' | 'danger';
}) {
  const styles = useAppStyles(createStyles);
  const theme = useTheme();

  const isAi = variant === 'ai';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      style={[
        styles.cta,
        isAi && styles.ctaAi,
        isDanger && styles.ctaDanger,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isAi ? '#A78BFA' : isDanger ? '#EF4444' : theme.colors.ctaYellow}
      />
      <Text style={[styles.ctaText, isAi && styles.ctaAiText, isDanger && styles.ctaDangerText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FHDashedBtn({ label, icon, onPress, color='#A78BFA' }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
}) {
  const styles = useAppStyles(createStyles);

  return (
    <Pressable style={[styles.dashedBtn, { borderColor: `${color}44` }]} onPress={onPress}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.dashedText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function FHStatGrid({ items }: { items: { label: string; value: string; color: string; hint?: string }[] }) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.statGrid}>
      {items.map((s) => (
        <View key={s.label} style={[styles.statBox, { borderColor: `${s.color}33` }]}>
          <Text style={styles.statLbl}>{s.label}</Text>
          <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
          {s.hint ? <Text style={styles.statHint}>{s.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function FHProgress({ pct, color }: { pct: number; color?: string }) {
  const theme = useTheme();
  const resolvedColor = color ?? theme.colors.primary;

  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: resolvedColor }]} />
    </View>
  );
}

export function FHBackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useAppStyles(createStyles);
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [styles.backLink, pressed && styles.backLinkPressed]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.backIconWrap}>
        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
      </View>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  tagText: { fontSize: theme.fontSize.xs, fontWeight: '700' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHdr: {
    ...theme.typography.overline,
    color: theme.colors.textMuted,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text, lineHeight: 22 },
  rowSub: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 20 },
  cta: {
    backgroundColor: theme.colors.primary,
    borderRadius: 13,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ctaAi: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.35)',
    height: 44,
  },
  ctaDanger: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,.25)',
    height: 44,
  },
  ctaText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  ctaAiText: { color: '#A78BFA', fontSize: theme.fontSize.sm },
  ctaDangerText: { color: '#EF4444', fontSize: theme.fontSize.sm },
  dashedBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dashedText: { fontSize: theme.fontSize.sm, fontWeight: '700' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  statLbl: {
    ...theme.typography.overline,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  statVal: { ...theme.typography.stat },
  statHint: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  progressBar: {
    height: 7,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  backLinkPressed: { opacity: 0.85, backgroundColor: theme.colors.surface },
  backIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,.18)',
  },
  backText: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
});
}
