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
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { HouseholdProvider, useHousehold } from '@/src/contexts/HouseholdContext';
import { ThemeProvider, useStatusBarStyle, useTheme } from '@/src/contexts/ThemeContext';
import { resolveActivePortal } from '@/src/portals/resolvePortal';
import { ToastProvider } from '@/src/contexts/ToastContext';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { View, StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const theme = useTheme();
  const statusBarStyle = useStatusBarStyle();
  const { userProfile } = useAuth();
  const { isOffline, isSyncing } = useHousehold();
  const portal = resolveActivePortal(userProfile);
  const showOfflineBanner = portal !== 'child' && (isOffline || isSyncing);
  const childPortal = portal === 'child';

  return (
    <View style={[styles.root, { backgroundColor: childPortal ? '#FFF7ED' : theme.colors.background }]}>
      {showOfflineBanner ? <OfflineBanner syncing={isSyncing} /> : null}
      <View style={styles.flex}>
        <StatusBar style={childPortal ? 'dark' : statusBarStyle} />
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
      <ThemeProvider>
        <HouseholdProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </HouseholdProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});
