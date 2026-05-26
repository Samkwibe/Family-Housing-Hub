import { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppLogo } from '@/src/components/AppLogo';
import { theme } from '@/src/theme';

type AuthScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
  centerContent?: boolean;
};

export function AuthScreen({ children, footer, centerContent }: AuthScreenProps) {
  return (
    <View style={styles.root}>
      <View style={styles.glowTop} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, centerContent && styles.scrollCentered]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

type AuthHeaderProps = {
  title: string;
  subtitle: string;
  showBrand?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  headerExtra?: ReactNode;
};

export function AuthHeader({
  title,
  subtitle,
  showBrand = true,
  icon = 'business',
  iconColor = '#A78BFA',
  headerExtra,
}: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      {showBrand ? <AppLogo size="sm" style={styles.brandLogo} /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {headerExtra}
    </View>
  );
}

export function AuthCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FormErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

type AuthFooterLinkProps = {
  text: string;
  linkText: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AuthFooterLink({ text, linkText, onPress, disabled }: AuthFooterLinkProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.footerLink, pressed && styles.footerPressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="link"
      hitSlop={8}
    >
      <Text style={styles.footerText}>
        {text}{' '}
        <Text style={styles.footerBold}>{linkText}</Text>
      </Text>
    </Pressable>
  );
}

export type UserRole = 'renter' | 'owner' | 'family';

const ROLES: { id: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'renter', label: 'Renter', icon: 'home' },
  { id: 'owner', label: 'Owner', icon: 'key' },
  { id: 'family', label: 'Family', icon: 'people' },
];

export function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.roleRow}>
      {ROLES.map((role) => {
        const active = value === role.id;
        return (
          <Pressable
            key={role.id}
            style={[styles.rolePill, active && styles.rolePillActive]}
            onPress={() => onChange(role.id)}
            disabled={disabled}
          >
            <Ionicons name={role.icon} size={17} color={active ? '#A78BFA' : theme.colors.textMuted} />
            <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{role.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#EF4444', '#F59E0B', '#A78BFA', '#14B8A6'];
  const idx = Math.min(score, 3);
  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              { backgroundColor: i <= idx ? colors[idx] : theme.colors.surfaceElevated },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthText, { color: colors[idx] }]}>{labels[idx]}</Text>
    </View>
  );
}

export function PasswordMatchHint({ match }: { match: boolean | null }) {
  if (match === null) return null;
  return (
    <Text style={[styles.matchHint, { color: match ? '#14B8A6' : '#EF4444' }]}>
      {match ? '✓ Passwords match' : 'Passwords do not match'}
    </Text>
  );
}

export function TermsCheckbox({
  checked,
  onToggle,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={styles.termsRow} onPress={onToggle} disabled={disabled}>
      <View style={[styles.termsBox, checked && styles.termsBoxChecked]}>
        {checked ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
      </View>
      <Text style={styles.termsText}>
        I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
    </Pressable>
  );
}

export function AuthDivider({ label = 'or sign up with' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

type StepProgressProps = {
  steps: string[];
  currentIndex: number;
};

export function StepProgress({ steps, currentIndex }: StepProgressProps) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / steps.length) * 100}%` },
          ]}
        />
      </View>
      <View style={styles.progressLabels}>
        {steps.map((label, i) => (
          <View key={label} style={styles.progressStep}>
            <View
              style={[
                styles.stepDot,
                i <= currentIndex && styles.stepDotActive,
                i < currentIndex && styles.stepDotDone,
              ]}
            >
              {i < currentIndex ? (
                <Ionicons name="checkmark" size={12} color={theme.colors.textInverse} />
              ) : (
                <Text style={[styles.stepNum, i <= currentIndex && styles.stepNumActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, i <= currentIndex && styles.stepLabelActive]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.authBg },
  glowTop: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(245,158,11,.09)',
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl + 8,
    flexGrow: 1,
  },
  scrollCentered: { justifyContent: 'center', minHeight: '100%' },
  header: { marginBottom: theme.spacing.xl },
  brandLogo: { marginBottom: 14 },
  title: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18, maxWidth: 320 },
  card: {
    backgroundColor: theme.colors.authSurface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,.25)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  footerLink: {
    marginTop: theme.spacing.xxl,
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  footerPressed: { opacity: 0.7 },
  footerText: { fontSize: 15, color: theme.colors.textSecondary },
  footerBold: { color: theme.colors.primaryLight, fontWeight: '700' },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 16 },
  rolePill: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  rolePillActive: {
    backgroundColor: 'rgba(124,58,237,.18)',
    borderColor: theme.colors.primary,
  },
  roleLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  roleLabelActive: { color: '#A78BFA' },
  strengthWrap: { marginTop: -4, marginBottom: 10 },
  strengthBars: { flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  matchHint: { fontSize: 10, fontWeight: '600', marginTop: 5 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  termsBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsBoxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  termsText: { flex: 1, fontSize: 11, color: theme.colors.textSecondary, lineHeight: 18 },
  termsLink: { color: '#A78BFA', fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.lg, gap: 8 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: theme.colors.borderLight },
  dividerText: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
  progressWrap: { marginBottom: theme.spacing.xxl },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStep: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(124,58,237,.18)',
  },
  stepDotDone: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepNum: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  stepNumActive: { color: theme.colors.primaryLight },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  stepLabelActive: { color: theme.colors.text },
});
