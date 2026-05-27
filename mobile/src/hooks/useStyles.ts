import { useMemo } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import type { AppTheme } from '@/src/theme';

/** Build StyleSheet from the active theme — re-computes when light/dark changes. */
export function useAppStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
