import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

type IllustrationKind = 'home' | 'finance' | 'food' | 'maps' | 'family' | 'personalize';

type Props = {
  kind: IllustrationKind;
};

function FloatBadge({ icon, color, style }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: object;
}) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.floatBadge, style]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
  );
}

export function IntroIllustration({ kind }: Props) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(124,58,237,0.35)', 'rgba(6,4,26,0)']}
        style={styles.glow}
      />

      {kind === 'home' && (
        <View style={styles.scene}>
          <View style={styles.house}>
            <View style={styles.roof} />
            <LinearGradient colors={['#1a1240', '#120c30']} style={styles.houseBody}>
              <View style={styles.windowRow}>
                <View style={[styles.window, styles.windowLit]} />
                <View style={[styles.window, styles.windowLit]} />
              </View>
              <View style={styles.door} />
            </LinearGradient>
          </View>
          <View style={styles.groundFamily}>
            <Ionicons name="people" size={22} color="#A78BFA" />
          </View>
          <FloatBadge icon="home" color="#A78BFA" style={{ top: 20, left: 24 }} />
          <FloatBadge icon="cash" color="#14B8A6" style={{ top: 36, right: 28 }} />
          <FloatBadge icon="checkbox" color="#F59E0B" style={{ bottom: 28, right: 36 }} />
        </View>
      )}

      {kind === 'finance' && (
        <View style={styles.scene}>
          <View style={styles.phoneFrame}>
            <LinearGradient colors={['#160F35', '#0E0B2E']} style={styles.phoneScreen}>
              <View style={styles.chartRow}>
                <View style={[styles.bar, { height: 28 }]} />
                <View style={[styles.bar, { height: 42 }]} />
                <View style={[styles.bar, { height: 36 }]} />
                <View style={[styles.bar, { height: 50 }]} />
              </View>
              <View style={styles.balancePill}>
                <Ionicons name="wallet" size={12} color="#14B8A6" />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.aiOrb}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <FloatBadge icon="stats-chart" color="#14B8A6" style={{ top: 18, left: 20 }} />
          <FloatBadge icon="bulb" color="#A78BFA" style={{ bottom: 24, right: 24 }} />
        </View>
      )}

      {kind === 'food' && (
        <View style={styles.scene}>
          <View style={styles.groceryBag}>
            <LinearGradient colors={['#6D28D9', '#4C1D95']} style={styles.bagBody}>
              <Ionicons name="nutrition" size={28} color="#FDE68A" />
            </LinearGradient>
          </View>
          <View style={styles.fridgeCard}>
            <View style={styles.fridgeLine} />
            <View style={styles.fridgeLine} />
            <View style={styles.fridgeLineShort} />
          </View>
          <View style={styles.alertToast}>
            <Ionicons name="notifications" size={12} color="#F59E0B" />
          </View>
          <FloatBadge icon="cart" color="#F59E0B" style={{ top: 24, right: 22 }} />
        </View>
      )}

      {kind === 'maps' && (
        <View style={styles.scene}>
          <View style={styles.mapCard}>
            <View style={styles.mapPath} />
            <View style={styles.mapPin}>
              <Ionicons name="location" size={18} color="#fff" />
            </View>
          </View>
          <View style={styles.placeChip}>
            <Ionicons name="storefront" size={12} color="#14B8A6" />
          </View>
          <View style={[styles.placeChip, { right: 28, top: 48 }]}>
            <Ionicons name="medkit" size={12} color="#EC4899" />
          </View>
          <View style={[styles.placeChip, { left: 32, bottom: 32 }]}>
            <Ionicons name="car" size={12} color="#F59E0B" />
          </View>
        </View>
      )}

      {kind === 'family' && (
        <View style={styles.scene}>
          <View style={styles.familyFrame}>
            <View style={styles.familyOutline} />
            <View style={styles.sofa}>
              <Ionicons name="people" size={32} color="#A78BFA" />
            </View>
          </View>
          <FloatBadge icon="shield-checkmark" color="#A78BFA" style={{ top: 16, left: 18 }} />
          <FloatBadge icon="calendar" color="#14B8A6" style={{ top: 28, right: 20 }} />
          <FloatBadge icon="heart" color="#EC4899" style={{ bottom: 22, left: 28 }} />
        </View>
      )}

      {kind === 'personalize' && (
        <View style={styles.scene}>
          <View style={styles.personalizeOrb}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.personalizeGradient}>
              <Ionicons name="options" size={36} color="#fff" />
            </LinearGradient>
          </View>
          <FloatBadge icon="person" color="#A78BFA" style={{ top: 24, left: 30 }} />
          <FloatBadge icon="people" color="#14B8A6" style={{ top: 40, right: 26 }} />
          <FloatBadge icon="star" color="#F59E0B" style={{ bottom: 30, right: 40 }} />
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  wrap: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '50%',
    marginTop: -140,
  },
  scene: {
    width: 280,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatBadge: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 11, 46, 0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.md,
  },
  house: { alignItems: 'center' },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 70,
    borderRightWidth: 70,
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4C1D95',
    marginBottom: -4,
  },
  houseBody: {
    width: 120,
    height: 90,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  windowRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  window: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#1a1240',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  windowLit: { backgroundColor: 'rgba(124,58,237,0.45)' },
  door: {
    width: 28,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#6D28D9',
    alignSelf: 'center',
    marginTop: 8,
  },
  groundFamily: {
    marginTop: 12,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  phoneFrame: {
    width: 110,
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: '#0E0B2E',
  },
  phoneScreen: { flex: 1, padding: 14, justifyContent: 'flex-end' },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 12,
  },
  bar: {
    width: 14,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  balancePill: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(20,184,166,0.2)',
  },
  aiOrb: {
    position: 'absolute',
    right: 48,
    bottom: 36,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.lg,
  },
  groceryBag: {
    width: 90,
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  bagBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fridgeCard: {
    position: 'absolute',
    right: 32,
    top: 40,
    width: 100,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  fridgeLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(167,139,250,0.25)',
  },
  fridgeLineShort: {
    height: 8,
    width: '60%',
    borderRadius: 4,
    backgroundColor: 'rgba(245,158,11,0.35)',
  },
  alertToast: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  mapCard: {
    width: 220,
    height: 160,
    borderRadius: 20,
    backgroundColor: '#0a0820',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPath: {
    position: 'absolute',
    width: 140,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(124,58,237,0.6)',
    transform: [{ rotate: '-20deg' }],
  },
  mapPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.md,
  },
  placeChip: {
    position: 'absolute',
    left: 24,
    top: 36,
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  familyFrame: {
    width: 200,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyOutline: {
    position: 'absolute',
    width: 180,
    height: 140,
    borderWidth: 2,
    borderColor: 'rgba(124,58,237,0.5)',
    borderRadius: 24,
    transform: [{ rotate: '-3deg' }],
  },
  sofa: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  personalizeOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    ...theme.shadow.lg,
  },
  personalizeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
}
