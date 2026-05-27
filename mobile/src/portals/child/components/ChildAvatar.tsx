import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { childTheme, type AvatarTheme } from '@/src/portals/child/theme';

type Props = {
  theme: AvatarTheme;
  name: string;
  level: number;
  size?: number;
};

export function ChildAvatar({ theme, name, level, size = 72 }: Props) {
  return (
    <View style={[styles.wrap, { width: size + 12, height: size + 12 }]}>
      <LinearGradient colors={[...theme.ring]} style={[styles.ring, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2 }]}>
        <View style={[styles.inner, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.emoji, { fontSize: size * 0.48 }]}>{theme.emoji}</Text>
        </View>
      </LinearGradient>
      <View style={[styles.levelBadge, { backgroundColor: theme.accent }]}>
        <Text style={styles.levelText}>Lv {level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { alignItems: 'center', justifyContent: 'center', padding: 3 },
  inner: {
    backgroundColor: childTheme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { textAlign: 'center' },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -2,
    borderRadius: childTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: childTheme.colors.white,
  },
  levelText: {
    color: childTheme.colors.white,
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 11,
    fontWeight: '700',
  },
});
