import * as Location from 'expo-location';
import { AppState, type AppStateStatus } from 'react-native';
import { fetchLocationSharing, pingLocation } from './householdService';

const PING_INTERVAL_MS = 5 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let watchSub: Location.LocationSubscription | null = null;
let sharingEnabled = false;

async function sendPing() {
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await pingLocation(loc.coords.latitude, loc.coords.longitude);
  } catch {
    // ignore transient GPS failures
  }
}

export async function refreshGeofenceSharingState() {
  try {
    const res = await fetchLocationSharing();
    sharingEnabled = res.locationSharingEnabled;
  } catch {
    sharingEnabled = false;
  }
  return sharingEnabled;
}

export async function startGeofenceBackgroundPings() {
  await stopGeofenceBackgroundPings();
  const enabled = await refreshGeofenceSharingState();
  if (!enabled) return;

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return;

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    intervalId = setInterval(sendPing, PING_INTERVAL_MS);
    await sendPing();
    return;
  }

  watchSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: PING_INTERVAL_MS,
      distanceInterval: 50,
    },
    (loc) => {
      pingLocation(loc.coords.latitude, loc.coords.longitude).catch(() => undefined);
    },
  );
  await sendPing();
}

export async function stopGeofenceBackgroundPings() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (watchSub) {
    watchSub.remove();
    watchSub = null;
  }
}

export function bindGeofenceAppState() {
  const onChange = (state: AppStateStatus) => {
    if (state === 'active' && sharingEnabled) {
      startGeofenceBackgroundPings().catch(() => undefined);
    }
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}

export async function setGeofenceSharingEnabled(enabled: boolean) {
  sharingEnabled = enabled;
  if (enabled) {
    await startGeofenceBackgroundPings();
  } else {
    await stopGeofenceBackgroundPings();
  }
}
