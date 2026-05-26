import { ReactNode, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppLogo } from '@/src/components/AppLogo';
import { theme } from '@/src/theme';

export function FamilyHubBrand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <AppLogo size={size} style={styles.brandRow} />;
}

export function AuthBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
    </Pressable>
  );
}

export function AuthHeroLogin() {
  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={['rgba(124,58,237,.35)', 'rgba(6,4,26,0)']}
        style={styles.heroGlow}
      />
      <View style={styles.heroHouse}>
        <LinearGradient colors={['#1a1240', '#0E0B2E']} style={styles.heroHouseBody}>
          <View style={styles.heroRoof} />
          <View style={styles.heroDoor} />
          <View style={styles.heroWindowRow}>
            <View style={styles.heroWindow} />
            <View style={styles.heroWindow} />
          </View>
        </LinearGradient>
        <View style={styles.heroCar} />
        <View style={styles.heroMoon} />
      </View>
    </View>
  );
}

export function AuthHeroRegister() {
  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={['rgba(124,58,237,.3)', 'rgba(6,4,26,0)']}
        style={styles.heroGlow}
      />
      <View style={styles.heroFamilyFrame}>
        <View style={styles.heroFamilyOutline} />
        <View style={styles.heroSofa}>
          <Ionicons name="people" size={28} color="#A78BFA" />
        </View>
        <View style={[styles.heroFloatIcon, { top: 8, left: 12 }]}>
          <Ionicons name="stats-chart" size={14} color="#14B8A6" />
        </View>
        <View style={[styles.heroFloatIcon, { top: 14, right: 10 }]}>
          <Ionicons name="cart" size={14} color="#F59E0B" />
        </View>
        <View style={[styles.heroFloatIcon, { bottom: 10, left: 16 }]}>
          <Ionicons name="shield-checkmark" size={14} color="#A78BFA" />
        </View>
      </View>
    </View>
  );
}

type AuthSegmentTabsProps = {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function AuthSegmentTabs({ tabs, value, onChange, disabled }: AuthSegmentTabsProps) {
  return (
    <View style={styles.segmentWrap}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            style={[styles.segmentTab, active && styles.segmentTabActive]}
            onPress={() => onChange(tab.id)}
            disabled={disabled}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type AuthFieldProps = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  showPasswordToggle?: boolean;
  prefix?: ReactNode;
};

export function AuthField({
  label,
  icon,
  error,
  showPasswordToggle,
  secureTextEntry,
  prefix,
  style,
  ...props
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const isSecure = showPasswordToggle ? !visible : secureTextEntry;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldRow, error && styles.fieldRowError]}>
        {prefix}
        {icon ? (
          <Ionicons name={icon} size={16} color={theme.colors.textMuted} style={styles.fieldIcon} />
        ) : null}
        <TextInput
          style={[styles.fieldInput, style]}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isSecure}
          {...props}
        />
        {showPasswordToggle ? (
          <Pressable onPress={() => setVisible((v) => !v)} style={styles.fieldToggle}>
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function PhonePrefix() {
  return (
    <View style={styles.phonePrefix}>
      <Text style={styles.phoneFlag}>🇺🇸</Text>
      <Text style={styles.phoneCode}>+1</Text>
      <View style={styles.phoneDivider} />
    </View>
  );
}

type AuthGradientButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AuthGradientButton({
  title,
  onPress,
  loading,
  disabled,
  style,
}: AuthGradientButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.ctaWrap, pressed && styles.ctaPressed, style]}
    >
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ctaGradient, (disabled || loading) && styles.ctaDisabled]}
      >
        <Text style={styles.ctaText}>{loading ? 'Please wait…' : title}</Text>
        {!loading ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function AuthCheckbox({
  checked,
  onToggle,
  label,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={onToggle} disabled={disabled}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecurityBanner() {
  return (
    <View style={styles.securityBanner}>
      <View style={styles.securityIcon}>
        <Ionicons name="shield-checkmark" size={18} color="#A78BFA" />
      </View>
      <View style={styles.securityBody}>
        <Text style={styles.securityTitle}>Your data is secure</Text>
        <Text style={styles.securitySub}>
          Bank-level encryption keeps your information and your home safe.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { marginBottom: 14 },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  backBtnPressed: { opacity: 0.85 },
  heroWrap: {
    height: 128,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0E0B2E',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: { ...StyleSheet.absoluteFillObject },
  heroHouse: { width: '80%', height: '85%', alignItems: 'center', justifyContent: 'flex-end' },
  heroHouseBody: {
    width: 120,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroRoof: {
    position: 'absolute',
    top: -18,
    width: 0,
    height: 0,
    borderLeftWidth: 68,
    borderRightWidth: 68,
    borderBottomWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#7C3AED',
  },
  heroDoor: {
    position: 'absolute',
    bottom: 8,
    width: 22,
    height: 28,
    borderRadius: 4,
    backgroundColor: 'rgba(245,158,11,.85)',
  },
  heroWindowRow: { flexDirection: 'row', gap: 16, marginTop: -6 },
  heroWindow: {
    width: 18,
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(167,139,250,.45)',
  },
  heroCar: {
    position: 'absolute',
    bottom: 8,
    left: 24,
    width: 36,
    height: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(20,184,166,.7)',
  },
  heroMoon: {
    position: 'absolute',
    top: 16,
    right: 28,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,.35)',
  },
  heroFamilyFrame: {
    width: 140,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFamilyOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(124,58,237,.55)',
    borderRadius: 18,
    transform: [{ rotate: '-2deg' }],
  },
  heroSofa: {
    width: 72,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,.3)',
  },
  heroFloatIcon: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(14,11,46,.9)',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  segmentLabelActive: { color: '#fff' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  fieldRowError: { borderColor: theme.colors.danger },
  fieldIcon: { marginRight: 8 },
  fieldInput: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 12,
  },
  fieldToggle: { padding: 4 },
  fieldError: { color: theme.colors.danger, fontSize: 11, marginTop: 4 },
  phonePrefix: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },
  phoneFlag: { fontSize: 14 },
  phoneCode: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    marginRight: 8,
  },
  phoneDivider: { width: 1, height: 20, backgroundColor: theme.colors.border },
  ctaWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  ctaPressed: { opacity: 0.92 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkBoxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  checkLabel: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  securityBanner: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(124,58,237,.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBody: { flex: 1 },
  securityTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 2,
  },
  securitySub: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});
