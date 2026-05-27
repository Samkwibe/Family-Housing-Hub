import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { resolveActivePortal } from '@/src/portals/resolvePortal';
import { useTheme } from '@/src/contexts/ThemeContext';
import { hasCompletedIntro, hasSkippedIntro } from '@/src/services/onboardingStorage';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

export default function Index() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { currentUser, profileComplete, loading, userProfile } = useAuth();
  const [gate, setGate] = useState<{ complete: boolean; skipped: boolean } | null>(null);

  useEffect(() => {
    Promise.all([hasCompletedIntro(), hasSkippedIntro()]).then(([complete, skipped]) => {
      setGate({ complete, skipped });
    });
  }, []);

  if (loading || gate === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!currentUser && !gate.complete && !gate.skipped) {
    return <Redirect href="/(auth)/intro" />;
  }

  if (!currentUser) {
    return <Redirect href="/(auth)/login" />;
  }

  const portal = resolveActivePortal(userProfile as Record<string, unknown> | null);

  if (portal === 'child') {
    return <Redirect href="/(main)" />;
  }

  if (!profileComplete) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(main)/(tabs)/dashboard" />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
}
