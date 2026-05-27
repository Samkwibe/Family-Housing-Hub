/** Shared design tokens — fonts, spacing, radius (mode-independent). */
export const sharedTokens = {
  fonts: {
    title: 'Syne_700Bold',
    titleExtra: 'Syne_800ExtraBold',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodyBold: 'DMSans_700Bold',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 26,
    hero: 32,
  },
  typography: {
    hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
    h1: { fontSize: 26, fontWeight: '800' as const },
    h2: { fontSize: 23, fontWeight: '800' as const },
    h3: { fontSize: 20, fontWeight: '700' as const },
    body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
    bodyMedium: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
    caption: { fontSize: 15, fontWeight: '500' as const, lineHeight: 21 },
    label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
    overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
    stat: { fontSize: 22, fontWeight: '800' as const },
  },
} as const;

export type ColorScheme = 'light' | 'dark';
