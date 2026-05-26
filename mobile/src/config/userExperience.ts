import { FeatureCategory, FeatureEntry, FEATURE_REGISTRY } from '@/src/features/registry';

export type UserType = 'renter' | 'owner' | 'family';

export function normalizeUserType(raw?: string | null): UserType {
  if (raw === 'owner') return 'owner';
  if (raw === 'family') return 'family';
  return 'renter';
}

/** Features hidden per role — everything else is available */
const HIDDEN_BY_ROLE: Record<UserType, Set<string>> = {
  renter: new Set(['owner-portal']),
  owner: new Set([
    'rent-split',
    'credit-builder',
    'lease-renewal',
    'move-in-checklist',
    'house-search',
  ]),
  family: new Set(['owner-portal', 'credit-builder', 'lease-renewal', 'move-in-checklist']),
};

export const ROLE_EXPERIENCE: Record<
  UserType,
  {
    label: string;
    shortLabel: string;
    color: string;
    heroSubtitle: string;
    moreSubtitle: string;
    aiGreeting: string;
    categoryOrder: FeatureCategory[];
    dashboardQuick: string[];
    aiSuggestions: string[];
  }
> = {
  renter: {
    label: 'Renter',
    shortLabel: 'Renter',
    color: '#A78BFA',
    heroSubtitle: 'Rent, roommates, lease tools, and your full household OS',
    moreSubtitle: 'Rent & lease management mode',
    aiGreeting: 'I can help with rent splits, lease renewal, maintenance, and household planning.',
    categoryOrder: ['finance', 'home', 'food', 'family', 'smart', 'community', 'safety', 'command'],
    dashboardQuick: [
      'rent-split',
      'lease-renewal',
      'smart-fridge',
      'energy-utilities',
      'maintenance',
      'notifications',
    ],
    aiSuggestions: [
      'Who still owes rent?',
      'Help me negotiate my lease renewal',
      'Draft a maintenance request to my landlord',
      'Why is my electric bill higher?',
    ],
  },
  owner: {
    label: 'Property owner',
    shortLabel: 'Owner',
    color: '#14B8A6',
    heroSubtitle: 'Manage properties, tenants, maintenance, and household systems',
    moreSubtitle: 'Property & tenant management mode',
    aiGreeting: 'I can help with tenant issues, property maintenance, documents, and smart home ops.',
    categoryOrder: ['home', 'finance', 'smart', 'family', 'food', 'community', 'safety', 'command'],
    dashboardQuick: [
      'owner-portal',
      'maintenance',
      'document-vault',
      'energy-utilities',
      'subscriptions',
      'notifications',
    ],
    aiSuggestions: [
      'Summarize open maintenance requests',
      'Which subscriptions are costing the most?',
      'Draft a message to tenants about utilities',
      'Show energy usage trends for my property',
    ],
  },
  family: {
    label: 'Family member',
    shortLabel: 'Family',
    color: '#F59E0B',
    heroSubtitle: 'Food, chores, calendar, and everything your household shares',
    moreSubtitle: 'Shared household & family mode',
    aiGreeting: 'I can help with groceries, chores, meal plans, calendar, and family coordination.',
    categoryOrder: ['food', 'family', 'home', 'finance', 'smart', 'community', 'safety', 'command'],
    dashboardQuick: [
      'smart-fridge',
      'meal-planner',
      'chores',
      'calendar',
      'package-tracker',
      'notifications',
    ],
    aiSuggestions: [
      'What groceries are expiring?',
      'What should we cook tonight?',
      'Who has chores due this week?',
      'What\'s on our family calendar?',
    ],
  },
};

export function isFeatureForUser(slug: string, userType: UserType): boolean {
  return !HIDDEN_BY_ROLE[userType].has(slug);
}

export function featuresForUser(userType: UserType): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => isFeatureForUser(f.slug, userType));
}

export function featuresByCategoryForUser(
  category: FeatureCategory,
  userType: UserType
): FeatureEntry[] {
  return featuresForUser(userType).filter((f) => f.category === category);
}

export function getRoleExperience(userType: UserType) {
  return ROLE_EXPERIENCE[userType];
}
