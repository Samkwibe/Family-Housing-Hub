/** Module maturity tiers — shown in More tab per DEVELOPMENT_CHARTER. */
export type FeatureTier = 'core' | 'ready' | 'preview' | 'stub';

export const FEATURE_TIER_LABELS: Record<FeatureTier, string> = {
  core: 'Core',
  ready: 'Ready',
  preview: 'Preview',
  stub: 'Stub',
};

export const FEATURE_TIER_COLORS: Record<FeatureTier, string> = {
  core: '#14B8A6',
  ready: '#A78BFA',
  preview: '#F59E0B',
  stub: '#6B7280',
};

/** Slugs not listed default to `ready`. */
export const FEATURE_TIERS: Partial<Record<string, FeatureTier>> = {
  // Core — primary household flows
  'rent-split': 'core',
  maintenance: 'core',
  'package-tracker': 'core',
  chores: 'core',
  'smart-fridge': 'core',
  'financial-goals': 'core',
  'energy-utilities': 'core',
  'document-vault': 'core',
  notifications: 'core',
  health: 'core',
  safety: 'core',
  'community-board': 'core',

  // Ready — works with data / keys
  'meal-planner': 'ready',
  inventory: 'ready',
  shopping: 'ready',
  'credit-builder': 'ready',
  subscriptions: 'ready',
  'move-in-checklist': 'ready',
  'lease-renewal': 'ready',
  calendar: 'ready',
  automations: 'ready',
  'house-search': 'ready',
  security: 'ready',

  // Preview — partial or integration pending
  'smart-home': 'preview',
  'owner-portal': 'preview',
  'neighborhood-insights': 'preview',
  resources: 'preview',

  // Stub — tips / AI redirect only
  help: 'stub',
};

export function getFeatureTier(slug: string): FeatureTier {
  return FEATURE_TIERS[slug] ?? 'ready';
}
