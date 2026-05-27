import { sharedTokens, type ColorScheme } from './tokens';

const brand = {
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  accent: '#14B8A6',
  accentWarm: '#F59E0B',
  accentPink: '#EC4899',
  success: '#14B8A6',
  danger: '#EF4444',
  tabActive: '#F59E0B',
} as const;

function buildTheme(scheme: ColorScheme) {
  const isDark = scheme === 'dark';
  return {
    scheme,
    ...sharedTokens,
    colors: isDark
      ? {
          ...brand,
          background: '#07051E',
          backgroundAlt: '#0E0B2E',
          surface: '#0E0B2E',
          surfaceElevated: '#160F35',
          surfaceInset: '#131826',
          border: 'rgba(167, 139, 250, 0.12)',
          borderLight: 'rgba(167, 139, 250, 0.08)',
          borderFocus: 'rgba(124, 58, 237, 0.45)',
          text: '#EDE9FE',
          textSecondary: '#A99FD4',
          textMuted: '#8B7DB8',
          textInverse: '#FFFFFF',
          overlay: 'rgba(6, 4, 26, 0.75)',
          tabBar: '#0C0A26',
          tabInactive: '#6B5F9A',
          ctaYellow: '#FDE68A',
          authBg: '#06041A',
          authSurface: '#0E0B2E',
          inputBg: '#0E0B2E',
          headerBg: '#0E0B2E',
          glowPurple: 'rgba(124, 58, 237, 0.25)',
          glowGold: 'rgba(245, 158, 11, 0.15)',
          glowTeal: 'rgba(20, 184, 166, 0.15)',
          aiGradientStart: '#160F35',
          aiGradientEnd: '#0E0B2E',
        }
      : {
          ...brand,
          background: '#F4F2FA',
          backgroundAlt: '#EDE9FE',
          surface: '#FFFFFF',
          surfaceElevated: '#FFFFFF',
          surfaceInset: '#F1F5F9',
          border: 'rgba(124, 58, 237, 0.14)',
          borderLight: 'rgba(15, 23, 42, 0.08)',
          borderFocus: 'rgba(124, 58, 237, 0.45)',
          text: '#1E1B4B',
          textSecondary: '#475569',
          textMuted: '#64748B',
          textInverse: '#FFFFFF',
          overlay: 'rgba(15, 23, 42, 0.45)',
          tabBar: '#FFFFFF',
          tabInactive: '#94A3B8',
          ctaYellow: '#FDE68A',
          authBg: '#EDE9FE',
          authSurface: '#FFFFFF',
          inputBg: '#F8FAFC',
          headerBg: '#FFFFFF',
          glowPurple: 'rgba(124, 58, 237, 0.12)',
          glowGold: 'rgba(245, 158, 11, 0.12)',
          glowTeal: 'rgba(20, 184, 166, 0.12)',
          aiGradientStart: '#F5F3FF',
          aiGradientEnd: '#FFFFFF',
        },
    shadow: isDark
      ? {
          sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 2,
          },
          md: {
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 4,
          },
          lg: {
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 8,
          },
        }
      : {
          sm: {
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 2,
          },
          md: {
            shadowColor: '#94A3B8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.14,
            shadowRadius: 10,
            elevation: 3,
          },
          lg: {
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 20,
            elevation: 6,
          },
        },
  };
}

export const darkTheme = buildTheme('dark');
export const lightTheme = buildTheme('light');

export type AppTheme = typeof darkTheme;

export function themeForScheme(scheme: ColorScheme): AppTheme {
  return scheme === 'light' ? lightTheme : darkTheme;
}
