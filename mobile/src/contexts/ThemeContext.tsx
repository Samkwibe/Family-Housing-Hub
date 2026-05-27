import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile } from '@/src/services/authService';
import { useAuth } from '@/src/contexts/AuthContext';
import { darkTheme, lightTheme, themeForScheme, type AppTheme } from '@/src/theme/themes';
import type { ColorScheme } from '@/src/theme/tokens';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@familyhub/themePreference';

type ThemeContextValue = {
  theme: AppTheme;
  preference: ThemePreference;
  resolvedScheme: ColorScheme;
  setPreference: (next: ThemePreference) => Promise<void>;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parsePreference(raw: unknown): ThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const { userProfile } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) {
          setPreferenceState(parsePreference(stored));
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const profilePref = userProfile?.themePreference;
    if (profilePref) {
      const parsed = parsePreference(profilePref);
      setPreferenceState(parsed);
      void AsyncStorage.setItem(STORAGE_KEY, parsed);
    }
  }, [userProfile?.themePreference, userProfile?.id]);

  const resolvedScheme: ColorScheme = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return preference;
  }, [preference, systemScheme]);

  const theme = useMemo(() => themeForScheme(resolvedScheme), [resolvedScheme]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
    if (userProfile?.id) {
      try {
        await updateProfile({ themePreference: next });
      } catch {
        // local preference still applies
      }
    }
  }, [userProfile?.id]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      resolvedScheme,
      setPreference,
      isReady,
    }),
    [theme, preference, resolvedScheme, setPreference, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return darkTheme;
  }
  return ctx.theme;
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemeProvider');
  }
  return ctx;
}

/** Status bar style for renter/owner shells (not child portal). */
export function useStatusBarStyle(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  const scheme = ctx?.resolvedScheme ?? 'dark';
  return scheme === 'dark' ? 'light' : 'dark';
}

export { darkTheme, lightTheme };
