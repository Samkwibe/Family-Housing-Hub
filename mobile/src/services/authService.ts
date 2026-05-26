import api from './api';
import { clearToken, getToken, setToken } from './tokenStorage';

export type AuthUser = {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  role?: string;
  phone?: string;
  phoneDigits?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileComplete?: boolean;
  onboardingComplete?: boolean;
  address?: Record<string, unknown>;
  createdAt?: string;
  lastLogin?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

type MeResponse = {
  user: AuthUser;
};

export async function registerUser(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  userType?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}): Promise<AuthUser> {
  const res = await api.request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await setToken(res.token);
  return res.user;
}

export async function loginUser(identifier: string, password: string): Promise<AuthUser> {
  const res = await api.request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  await setToken(res.token);
  return res.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await api.request<MeResponse>('/api/auth/me', { method: 'GET' });
    return res.user;
  } catch {
    await clearToken();
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await api.request('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore network errors on logout
  }
  await clearToken();
}

export async function updateProfile(data: Record<string, unknown>): Promise<AuthUser> {
  const res = await api.request<MeResponse>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.user;
}

export async function oauthSignIn(
  provider: 'google' | 'microsoft' | 'github' | 'apple',
  tokens: { idToken?: string; accessToken?: string }
): Promise<AuthUser> {
  const res = await api.request<AuthResponse>(`/api/auth/oauth/${provider}`, {
    method: 'POST',
    body: JSON.stringify({
      provider,
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
    }),
  });
  await setToken(res.token);
  return res.user;
}

export async function lookupEmailByPhone(phoneDigits: string): Promise<string | null> {
  try {
    const res = await api.request<{ email: string }>(
      `/api/auth/lookup-email?phone=${encodeURIComponent(phoneDigits)}`,
      { method: 'GET' }
    );
    return res.email;
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<{ devResetLink?: string }> {
  return api.request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export { getToken, setToken, clearToken };
