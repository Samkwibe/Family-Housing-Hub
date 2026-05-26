import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

export const OAUTH_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'familyhousinghub',
  path: 'oauth',
});

/** Treat .env placeholders as unset so Google button stays hidden until configured. */
function resolveOAuthClientId(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  if (/^PASTE_/i.test(value)) return '';
  if (/^your[_-]/i.test(value)) return '';
  if (/placeholder|example|changeme/i.test(value)) return '';
  return value;
}

export const GOOGLE_WEB_CLIENT_ID = resolveOAuthClientId(
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
);
export const GOOGLE_IOS_CLIENT_ID = resolveOAuthClientId(
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
);
export const GOOGLE_ANDROID_CLIENT_ID = resolveOAuthClientId(
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
);

export const MICROSOFT_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '';
export const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '';

export const MICROSOFT_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint:
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

export const GITHUB_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

export function isOAuthConfigured(provider: 'google' | 'microsoft' | 'github' | 'apple'): boolean {
  switch (provider) {
    case 'google':
      if (Platform.OS === 'ios') {
        return Boolean(GOOGLE_IOS_CLIENT_ID);
      }
      if (Platform.OS === 'android') {
        return Boolean(GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
      }
      return Boolean(GOOGLE_WEB_CLIENT_ID);
    case 'microsoft':
      return Boolean(MICROSOFT_CLIENT_ID);
    case 'github':
      return Boolean(GITHUB_CLIENT_ID);
    case 'apple':
      return Platform.OS === 'ios';
    default:
      return false;
  }
}
