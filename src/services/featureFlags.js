import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import app from '../firebase/config';

const defaults = {
  magic_link_login_enabled: false,
  verification_whatsapp_fallback_enabled: false,
  verification_status_page_enabled: true,
};

let remoteConfig;
let initialized = false;

export async function initFeatureFlags() {
  if (initialized) return;
  initialized = true;
  try {
    remoteConfig = getRemoteConfig(app);
    remoteConfig.settings = {
      minimumFetchIntervalMillis: import.meta.env.DEV ? 0 : 60 * 60 * 1000,
      fetchTimeoutMillis: 10_000,
    };
    remoteConfig.defaultConfig = defaults;
    await fetchAndActivate(remoteConfig);
  } catch (err) {
    // Fallback to defaults silently
    // eslint-disable-next-line no-console
    console.warn('Remote Config not available; using defaults', err);
  }
}

export function isFeatureEnabled(flagKey) {
  if (!remoteConfig) {
    return Boolean(defaults[flagKey]);
  }
  try {
    return getValue(remoteConfig, flagKey).asBoolean();
  } catch {
    return Boolean(defaults[flagKey]);
  }
}

