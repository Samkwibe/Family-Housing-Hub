import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { childTheme } from '@/src/portals/child/theme';

type Props = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  subtitle?: string;
  onPress?: () => void;
};

export function ChildStatCard({ label, value, icon, gradient, subtitle, onPress }: Props) {
  const CardContent = (
    <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={childTheme.colors.white} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '30%',
    borderRadius: childTheme.radius.lg,
    padding: childTheme.spacing.lg,
    ...childTheme.shadow.card,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: childTheme.spacing.sm,
  },
  value: {
    fontFamily: childTheme.fonts.title,
    fontSize: 24,
    fontWeight: '700',
    color: childTheme.colors.white,
  },
  label: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  sub: {
    fontFamily: childTheme.fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
});
