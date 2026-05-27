/**
 * App theme — use `useTheme()` from ThemeContext in components.
 * Static `theme` export is the dark palette (legacy fallback only).
 */
export type { AppTheme } from './themes';
export type { ColorScheme } from './tokens';
export { darkTheme, lightTheme, themeForScheme } from './themes';
export { sharedTokens } from './tokens';

import { darkTheme } from './themes';

/** @deprecated Use useTheme() — kept for type re-exports and migration */
export const theme = darkTheme;

export type Theme = typeof darkTheme;
