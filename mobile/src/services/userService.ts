import { AuthUser, fetchCurrentUser, updateProfile as apiUpdateProfile } from './authService';
import { normalizeUSPhone } from '../utils/phone';

export type UserProfile = AuthUser & Record<string, unknown>;

export async function getUserProfile(_uid: string): Promise<UserProfile | null> {
  const user = await fetchCurrentUser();
  return user;
}

export async function createUserProfile(_uid: string, _data: Record<string, unknown>) {
  // Profile is created during registration on the backend
}

export async function updateUserProfile(_uid: string, data: Record<string, unknown>) {
  return apiUpdateProfile(data);
}

export async function findEmailByPhoneDigits(phoneDigits: string): Promise<string | null> {
  const { lookupEmailByPhone } = await import('./authService');
  return lookupEmailByPhone(phoneDigits);
}

export function checkProfileComplete(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;
  if (profile.onboardingComplete === true || profile.profileComplete === true) return true;
  const required = ['firstName', 'lastName', 'phone'] as const;
  return required.every((k) => Boolean(profile[k]));
}

export { normalizeUSPhone };
