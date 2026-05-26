import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { hasCompletedIntro, hasSkippedIntro } from '@/src/services/onboardingStorage';
import { theme } from '@/src/theme';

export default function Index() {
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

  if (userProfile?.role === 'child') {
    return <Redirect href="/(main)/(tabs)/dashboard" />;
  }

  if (!profileComplete) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(main)/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
