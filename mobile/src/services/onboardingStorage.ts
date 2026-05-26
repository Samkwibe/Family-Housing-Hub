import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from '@/src/components/auth/AuthScreen';

const INTRO_COMPLETE_KEY = '@fhh_intro_complete';
const INTRO_SKIPPED_KEY = '@fhh_intro_skipped';
const INTRO_ANSWERS_KEY = '@fhh_intro_answers';

export type HouseholdSize = 'solo' | 'couple' | 'family_small' | 'family_large';
export type OnboardingPriority = 'finances' | 'food' | 'maps' | 'tasks' | 'maintenance';

export type PreSignupAnswers = {
  role?: UserRole;
  householdSize?: HouseholdSize;
  priorities?: OnboardingPriority[];
};

export async function hasCompletedIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INTRO_COMPLETE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/** User skipped intro to log in — allowed login, not signup, until full onboarding is done. */
export async function hasSkippedIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INTRO_SKIPPED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markIntroComplete(): Promise<void> {
  await AsyncStorage.multiSet([
    [INTRO_COMPLETE_KEY, 'true'],
    [INTRO_SKIPPED_KEY, 'false'],
  ]);
}

export async function markIntroSkipped(): Promise<void> {
  await AsyncStorage.setItem(INTRO_SKIPPED_KEY, 'true');
}

export async function savePreSignupAnswers(answers: PreSignupAnswers): Promise<void> {
  await AsyncStorage.setItem(INTRO_ANSWERS_KEY, JSON.stringify(answers));
}

export async function loadPreSignupAnswers(): Promise<PreSignupAnswers | null> {
  try {
    const raw = await AsyncStorage.getItem(INTRO_ANSWERS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreSignupAnswers;
  } catch {
    return null;
  }
}

export async function clearPreSignupAnswers(): Promise<void> {
  await AsyncStorage.multiRemove([INTRO_COMPLETE_KEY, INTRO_SKIPPED_KEY, INTRO_ANSWERS_KEY]);
}

/** Signup is only allowed after the full pre-signup questionnaire. */
export async function canAccessSignup(): Promise<boolean> {
  return hasCompletedIntro();
}
