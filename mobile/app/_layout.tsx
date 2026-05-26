import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { HouseholdProvider, useHousehold } from '@/src/contexts/HouseholdContext';
import { ToastProvider } from '@/src/contexts/ToastContext';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { View, StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { isOffline, isSyncing } = useHousehold();
  return (
    <View style={styles.root}>
      {(isOffline || isSyncing) ? <OfflineBanner syncing={isSyncing} /> : null}
      <View style={styles.flex}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="invite/[token]" />
          <Stack.Screen name="reset-password/[token]" />
        </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <HouseholdProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});
