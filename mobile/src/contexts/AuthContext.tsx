import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  AuthUser,
  loginUser,
  registerUser,
  logoutUser,
  fetchCurrentUser,
  updateProfile,
  oauthSignIn,
  getToken,
} from '../services/authService';
import { checkProfileComplete } from '../services/userService';
import { getCachedJson, setCachedJson, clearCacheKey } from '../utils/cache';
import { normalizeUSPhone } from '../utils/phone';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';

type UserProfile = AuthUser & Record<string, unknown>;

type AuthContextValue = {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  profileComplete: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  oauthLogin: (
    provider: 'google' | 'microsoft' | 'github' | 'apple',
    tokens: { idToken?: string; accessToken?: string }
  ) => Promise<void>;
  signup: (
    email: string,
    password: string,
    userData: Record<string, unknown>
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: (data: Record<string, unknown>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((user: AuthUser | null) => {
    if (user) {
      user.uid = user.id;
      user.displayName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    }
    setCurrentUser(user);
    setUserProfile(user);
    setProfileComplete(checkProfileComplete(user));
  }, []);

  const persistUserCache = useCallback(async (user: AuthUser) => {
    await setCachedJson(`profile_${user.id}`, user);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const cached = await getCachedJson<UserProfile>('session_user', 10 * 60 * 1000);
        if (cached && !cancelled) {
          applyUser(cached);
        }

        const user = await fetchCurrentUser();
        if (user && !cancelled) {
          applyUser(user);
          await persistUserCache(user);
          await setCachedJson('session_user', user);
          registerForPushNotificationsAsync().catch(err => {
            console.error('[push] Startup registration failed:', err);
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser, persistUserCache]);

  const login = async (identifier: string, password: string) => {
    const user = await loginUser(identifier, password);
    applyUser(user);
    await persistUserCache(user);
    await setCachedJson('session_user', user);
    try {
      await registerForPushNotificationsAsync();
    } catch (e) {
      console.error('[push] Login push registration failed:', e);
    }
  };

  const oauthLogin = async (
    provider: 'google' | 'microsoft' | 'github' | 'apple',
    tokens: { idToken?: string; accessToken?: string }
  ) => {
    const user = await oauthSignIn(provider, tokens);
    applyUser(user);
    await persistUserCache(user);
    await setCachedJson('session_user', user);
    try {
      await registerForPushNotificationsAsync();
    } catch (e) {
      console.error('[push] OAuth login push registration failed:', e);
    }
  };

  const signup = async (
    email: string,
    password: string,
    userData: Record<string, unknown>
  ) => {
    const phone = String(userData.phone || '');
    const digits = normalizeUSPhone(phone);
    const user = await registerUser({
      email: email.trim().toLowerCase(),
      password,
      firstName: String(userData.firstName || ''),
      lastName: String(userData.lastName || ''),
      phone: digits ? phone : undefined,
      userType: String(userData.userType || 'renter'),
      inviteToken: userData.inviteToken ? String(userData.inviteToken) : undefined,
      emailVerified: userData.emailVerified !== false,
      phoneVerified: userData.phoneVerified !== false,
    });
    applyUser(user);
    await persistUserCache(user);
    await setCachedJson('session_user', user);
    try {
      await registerForPushNotificationsAsync();
    } catch (e) {
      console.error('[push] Signup push registration failed:', e);
    }
    return user;
  };

  const logout = async () => {
    if (currentUser) {
      await clearCacheKey(`profile_${currentUser.id}`);
      await clearCacheKey('session_user');
    }
    await logoutUser();
    applyUser(null);
  };

  const refreshProfile = async () => {
    const user = await fetchCurrentUser();
    if (user) {
      applyUser(user);
      await persistUserCache(user);
      await setCachedJson('session_user', user);
    }
  };

  const completeOnboarding = async (data: Record<string, unknown>) => {
    if (!currentUser) return;
    const updated = await updateProfile({
      ...data,
      profileComplete: true,
      onboardingComplete: true,
    });
    applyUser(updated);
    await persistUserCache(updated);
    await setCachedJson('session_user', updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        profileComplete,
        loading,
        login,
        oauthLogin,
        signup,
        logout,
        refreshProfile,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
