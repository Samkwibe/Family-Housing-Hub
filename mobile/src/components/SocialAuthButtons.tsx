import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  GITHUB_CLIENT_ID,
  GITHUB_DISCOVERY,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isOAuthConfigured,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_DISCOVERY,
  OAUTH_REDIRECT_URI,
} from '@/src/config/oauth';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

WebBrowser.maybeCompleteAuthSession();

const REMEMBER_KEY = 'auth_remember_identifier';

type Props = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  showDivider?: boolean;
  dividerLabel?: string;
  /** Login: full-width row. Register: same full-width Google button */
  layout?: 'grid' | 'compact' | 'full';
};

type ProviderId = 'google' | 'apple' | 'facebook' | 'microsoft' | 'github' | 'twitter';

type ProviderMeta = {
  id: ProviderId;
  label: string;
  icon: string;
  iconColor: string;
  brandColor: string;
};

// Social sign-in: Google only for now (Apple, Facebook, Microsoft, GitHub, X later)
const ACTIVE_PROVIDERS: ProviderMeta[] = [
  { id: 'google', label: 'Google', icon: 'google', iconColor: '#EA4335', brandColor: '#EDE9FE' },
];

type OAuthFinish = (
  provider: 'google' | 'microsoft' | 'github' | 'apple',
  tokens: { idToken?: string; accessToken?: string }
) => Promise<void>;

function ProviderButton({ meta, loading, disabled, onPress, compact, fullWidth }: {
  meta: ProviderMeta;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const styles = useAppStyles(createStyles);

  if (fullWidth) {
    return (
      <Pressable
        style={[styles.fullBtn, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={`Continue with ${meta.label}`}
      >
        {loading ? (
          <ActivityIndicator size="small" color={meta.iconColor} />
        ) : (
          <>
            <FontAwesome name={meta.icon as 'google'} size={20} color={meta.iconColor} />
            <Text style={styles.fullLabel}>Continue with {meta.label}</Text>
          </>
        )}
      </Pressable>
    );
  }

  if (compact) {
    return (
      <Pressable
        style={[styles.compactBtn, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={meta.label}
      >
        {loading ? (
          <ActivityIndicator size="small" color={meta.iconColor} />
        ) : (
          <FontAwesome name={meta.icon as 'google'} size={17} color={meta.iconColor} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.gridBtn, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={meta.iconColor} />
      ) : (
        <>
          <FontAwesome name={meta.icon as 'google'} size={18} color={meta.iconColor} />
          <Text style={styles.gridLabel}>{meta.label}</Text>
        </>
      )}
    </Pressable>
  );
}

function GoogleAuthButton({ meta, busy, disabled, finishOAuth, setBusy, compact, fullWidth }: {
  meta: ProviderMeta;
  busy: string | null;
  disabled?: boolean;
  finishOAuth: OAuthFinish;
  setBusy: (v: string | null) => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const handledResponse = useRef<string | null>(null);
  const [googleRequest, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    redirectUri: OAUTH_REDIRECT_URI,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const sig = `google:${googleResponse.authentication?.accessToken || googleResponse.authentication?.idToken || ''}`;
    if (handledResponse.current === sig) return;
    handledResponse.current = sig;
    const idToken = googleResponse.authentication?.idToken ?? undefined;
    const accessToken = googleResponse.authentication?.accessToken ?? undefined;
    if (idToken || accessToken) {
      finishOAuth('google', { idToken, accessToken });
    }
  }, [googleResponse, finishOAuth]);

  const onPress = async () => {
    if (!googleRequest) {
      Alert.alert('Google', 'Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to mobile/.env');
      return;
    }
    handledResponse.current = null;
    setBusy('google');
    try {
      await googlePrompt();
    } catch {
      setBusy(null);
    }
  };

  return (
    <ProviderButton
      meta={meta}
      loading={busy === 'google'}
      disabled={Boolean(disabled || busy)}
      onPress={onPress}
      compact={compact}
      fullWidth={fullWidth}
    />
  );
}

function MicrosoftAuthButton({ meta, busy, disabled, finishOAuth, setBusy, compact, fullWidth }: {
  meta: ProviderMeta;
  busy: string | null;
  disabled?: boolean;
  finishOAuth: OAuthFinish;
  setBusy: (v: string | null) => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const handledResponse = useRef<string | null>(null);
  const [msRequest, msResponse, msPrompt] = AuthSession.useAuthRequest(
    {
      clientId: MICROSOFT_CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
      redirectUri: OAUTH_REDIRECT_URI,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    },
    MICROSOFT_DISCOVERY
  );

  useEffect(() => {
    if (msResponse?.type !== 'success') return;
    const accessToken = String(msResponse.authentication?.accessToken || msResponse.params?.access_token || '');
    const idToken = String(msResponse.authentication?.idToken || msResponse.params?.id_token || '');
    const sig = `microsoft:${accessToken || idToken}`;
    if (handledResponse.current === sig) return;
    handledResponse.current = sig;
    if (accessToken || idToken) {
      finishOAuth('microsoft', { accessToken: accessToken || undefined, idToken: idToken || undefined });
    }
  }, [msResponse, finishOAuth]);

  const onPress = async () => {
    if (!msRequest) {
      Alert.alert('Microsoft', 'Add EXPO_PUBLIC_MICROSOFT_CLIENT_ID to mobile/.env');
      return;
    }
    handledResponse.current = null;
    setBusy('microsoft');
    try {
      await msPrompt();
    } catch {
      setBusy(null);
    }
  };

  return (
    <ProviderButton
      meta={meta}
      loading={busy === 'microsoft'}
      disabled={Boolean(disabled || busy)}
      onPress={onPress}
      compact={compact}
    />
  );
}

function GitHubAuthButton({ meta, busy, disabled, finishOAuth, setBusy, compact, fullWidth }: {
  meta: ProviderMeta;
  busy: string | null;
  disabled?: boolean;
  finishOAuth: OAuthFinish;
  setBusy: (v: string | null) => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const handledResponse = useRef<string | null>(null);
  const [ghRequest, ghResponse, ghPrompt] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['read:user', 'user:email'],
      redirectUri: OAUTH_REDIRECT_URI,
    },
    GITHUB_DISCOVERY
  );

  useEffect(() => {
    if (ghResponse?.type !== 'success') return;
    const accessToken = String(ghResponse.authentication?.accessToken || ghResponse.params?.access_token || '');
    const sig = `github:${accessToken}`;
    if (handledResponse.current === sig) return;
    handledResponse.current = sig;
    if (accessToken) {
      finishOAuth('github', { accessToken });
    }
  }, [ghResponse, finishOAuth]);

  const onPress = async () => {
    if (!ghRequest) {
      Alert.alert('GitHub', 'Add EXPO_PUBLIC_GITHUB_CLIENT_ID to mobile/.env');
      return;
    }
    handledResponse.current = null;
    setBusy('github');
    try {
      await ghPrompt();
    } catch {
      setBusy(null);
    }
  };

  return (
    <ProviderButton
      meta={meta}
      loading={busy === 'github'}
      disabled={Boolean(disabled || busy)}
      onPress={onPress}
      compact={compact}
    />
  );
}

function AppleAuthButton({ meta, busy, disabled, finishOAuth, setBusy, compact, fullWidth }: {
  meta: ProviderMeta;
  busy: string | null;
  disabled?: boolean;
  finishOAuth: OAuthFinish;
  setBusy: (v: string | null) => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const onPress = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign In', 'Apple Sign In is available on iOS devices.');
      return;
    }
    try {
      setBusy('apple');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token');
      }
      await finishOAuth('apple', { idToken: credential.identityToken });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple Sign In', (e as Error).message || 'Could not sign in with Apple');
      setBusy(null);
    }
  };

  return (
    <ProviderButton
      meta={meta}
      loading={busy === 'apple'}
      disabled={Boolean(disabled || busy)}
      onPress={onPress}
      compact={compact}
    />
  );
}

function StubProviderButton({ meta, busy, disabled, setBusy, compact, fullWidth, message }: {
  meta: ProviderMeta;
  busy: string | null;
  disabled?: boolean;
  setBusy: (v: string | null) => void;
  compact?: boolean;
  fullWidth?: boolean;
  message: string;
}) {
  const onPress = () => {
    setBusy(meta.id);
    Alert.alert(meta.label, message);
    setBusy(null);
  };

  return (
    <ProviderButton
      meta={meta}
      loading={busy === meta.id}
      disabled={Boolean(disabled || busy)}
      onPress={onPress}
      compact={compact}
      fullWidth={fullWidth}
    />
  );
}

export function SocialAuthButtons({
  onSuccess,
  onError,
  disabled,
  showDivider = true,
  dividerLabel = 'or continue with Google',
  layout = 'full',
}: Props) {
  const styles = useAppStyles(createStyles);
  const { oauthLogin } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const compact = layout === 'compact';
  const fullWidth = layout === 'full' || ACTIVE_PROVIDERS.length === 1;

  const reportError = useCallback(
    (message: string) => {
      if (onError) onError(message);
      else Alert.alert('Sign in failed', message);
    },
    [onError]
  );

  const finishOAuth = useCallback<OAuthFinish>(
    async (provider, tokens) => {
      try {
        setBusy(provider);
        await oauthLogin(provider, tokens);
        onSuccess?.();
      } catch (e: unknown) {
        reportError((e as Error).message || 'Could not sign in');
      } finally {
        setBusy(null);
      }
    },
    [oauthLogin, onSuccess, reportError]
  );

  const renderProvider = (p: ProviderMeta) => {
    const common = { meta: p, busy, disabled, finishOAuth, setBusy, compact, fullWidth };
    if (p.id !== 'google') return null;
    return isOAuthConfigured('google') ? (
      <GoogleAuthButton key={p.id} {...common} />
    ) : (
      <StubProviderButton
        key={p.id}
        {...common}
        message={
          Platform.OS === 'ios'
            ? 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_CLIENT_ID to mobile/.env.'
            : 'Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to mobile/.env to enable Google login.'
        }
      />
    );
  };

  return (
    <View style={styles.wrap}>
      {showDivider ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{dividerLabel}</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : null}

      <View style={fullWidth ? styles.fullRow : compact ? styles.compactRow : styles.grid}>
        {ACTIVE_PROVIDERS.map(renderProvider)}
      </View>
    </View>
  );
}

export async function loadRememberedIdentifier(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
}

export async function saveRememberedIdentifier(identifier: string | null): Promise<void> {
  try {
    if (identifier) {
      await AsyncStorage.setItem(REMEMBER_KEY, identifier);
    } else {
      await AsyncStorage.removeItem(REMEMBER_KEY);
    }
  } catch {
    /* noop */
  }
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  wrap: { marginTop: theme.spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, gap: 8 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: theme.colors.borderLight },
  dividerText: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fullRow: { width: '100%' },
  fullBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    minHeight: 52,
  },
  fullLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  gridBtn: {
    width: '31%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    minHeight: 44,
  },
  gridLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  compactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  compactBtn: {
    width: 44,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
}

/** @deprecated use isOAuthConfigured per provider */
export { isOAuthConfigured };
