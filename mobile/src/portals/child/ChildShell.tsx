import { useState } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import * as Location from 'expo-location';
import { ChildPortalProvider, useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { ChildTabBar, type ChildTabId } from '@/src/portals/child/components/ChildTabBar';
import { ChildWelcomeFlow } from '@/src/portals/child/components/ChildWelcomeFlow';
import { SosHelpButton, SosHelpModal } from '@/src/portals/child/components/SosHelp';
import { ChildHomeScreen } from '@/src/portals/child/screens/ChildHomeScreen';
import { ChildTasksScreen } from '@/src/portals/child/screens/ChildTasksScreen';
import { ChildHealthScreen } from '@/src/portals/child/screens/ChildHealthScreen';
import { ChildRewardsScreen } from '@/src/portals/child/screens/ChildRewardsScreen';
import { ChildMessagesScreen } from '@/src/portals/child/screens/ChildMessagesScreen';
import { ChildSettingsScreen } from '@/src/portals/child/screens/ChildSettingsScreen';
import { useToast } from '@/src/contexts/ToastContext';
import { sendChildSos } from '@/src/services/portalService';
import { childTheme } from '@/src/portals/child/theme';
import { RealtimeCelebrationLayer } from '@/src/portals/shared/RealtimeCelebrationLayer';

function ChildShellInner() {
  const { showToast } = useToast();
  const {
    data,
    loading,
    displayName,
    needsProfile,
    needsWelcomeOnboarding,
    completeOnboarding,
    refresh,
  } = useChildPortal();
  const [tab, setTab] = useState<ChildTabId>('home');
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [welcomeActive, setWelcomeActive] = useState(false);

  const showWelcome = !loading && !needsProfile && (needsWelcomeOnboarding || welcomeActive);

  const handleSos = async () => {
    setSosSending(true);
    let coords: { lat: number; lng: number } | undefined = undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch (e) {
      console.log('[SOS] Geolocation permission/capture skipped or failed:', e);
    }

    try {
      await sendChildSos(coords);
      setSosOpen(false);
      showToast('Help is on the way — your parent was notified', 'success');
    } catch (e) {
      Alert.alert('Could not send alert', e instanceof Error ? e.message : 'Please try again or find a parent.');
    } finally {
      setSosSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        {tab === 'home' && <ChildHomeScreen />}
        {tab === 'tasks' && <ChildTasksScreen />}
        {tab === 'health' && <ChildHealthScreen />}
        {tab === 'rewards' && <ChildRewardsScreen />}
        {tab === 'messages' && <ChildMessagesScreen />}
        {tab === 'settings' && <ChildSettingsScreen />}
      </View>
      {!showWelcome ? (
        <>
          <SosHelpButton onPress={() => setSosOpen(true)} />
          <ChildTabBar active={tab} onChange={setTab} />
        </>
      ) : null}
      <SosHelpModal
        visible={sosOpen}
        onClose={() => !sosSending && setSosOpen(false)}
        onConfirm={handleSos}
        sending={sosSending}
      />
      {showWelcome ? (
        <ChildWelcomeFlow
          displayName={displayName}
          chores={data?.chores ?? []}
          rewards={data?.rewards ?? []}
          onComplete={async (payload) => {
            setWelcomeActive(true);
            await completeOnboarding(payload);
          }}
          onFinished={() => setWelcomeActive(false)}
        />
      ) : null}
      <RealtimeCelebrationLayer portal="child" onRefresh={refresh} />
    </View>
  );
}

export default function ChildShell() {
  return (
    <ChildPortalProvider>
      <ChildShellInner />
    </ChildPortalProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: childTheme.colors.cream },
  screen: { flex: 1 },
});
