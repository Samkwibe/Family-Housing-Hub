import { Ionicons } from '@expo/vector-icons';

export type FeatureCategory =
  | 'command'
  | 'food'
  | 'finance'
  | 'home'
  | 'family'
  | 'community'
  | 'smart'
  | 'safety';

export type FeatureEntry = {
  slug: string;
  label: string;
  title: string;
  summary: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  category: FeatureCategory;
  aiPrompt?: string;
  badge?: string;
};

export const FEATURE_CATEGORIES: Record<
  FeatureCategory,
  { label: string; description: string }
> = {
  command: { label: 'Command Center', description: 'Dashboard, search, alerts' },
  food: { label: 'Food & Kitchen', description: 'Fridge, meals, groceries' },
  finance: { label: 'Money', description: 'Rent, goals, credit, bills' },
  home: { label: 'Home', description: 'Maintenance, energy, packages, docs' },
  family: { label: 'Family', description: 'Chores, calendar, health' },
  community: { label: 'Community', description: 'Board, neighborhood, search' },
  smart: { label: 'Smart Home', description: 'Devices, automations, subscriptions' },
  safety: { label: 'Safety', description: 'Emergency, security, wellness' },
};

export const FEATURE_REGISTRY: FeatureEntry[] = [
  // Food OS
  {
    slug: 'smart-fridge',
    label: 'Smart Fridge',
    title: 'Smart Fridge',
    summary: 'Scan groceries, track expiration, and sync household food inventory.',
    icon: 'snow',
    color: '#14B8A6',
    category: 'food',
    badge: 'New',
    aiPrompt: 'What groceries are expiring in my household this week?',
  },
  {
    slug: 'meal-planner',
    label: 'Meal Planner',
    title: 'AI Meal Planner',
    summary: 'Recipes from your inventory, meal plans, and dietary preferences.',
    icon: 'restaurant',
    color: '#F59E0B',
    category: 'food',
    aiPrompt: 'What should we cook tonight with what we have?',
  },
  {
    slug: 'inventory',
    label: 'Inventory',
    title: 'Household Inventory',
    summary: 'Groceries, cleaning supplies, medicine, pet supplies, and more.',
    icon: 'cube',
    color: '#A78BFA',
    category: 'food',
    aiPrompt: 'What household items are running low?',
  },
  {
    slug: 'shopping',
    label: 'Shopping',
    title: 'Smart Shopping',
    summary: 'AI-optimized lists, store comparisons, and delivery integrations.',
    icon: 'cart',
    color: '#EC4899',
    category: 'food',
    aiPrompt: 'Create a smart shopping list for my household.',
  },
  // Finance
  {
    slug: 'rent-split',
    label: 'Rent Split',
    title: 'Rent Split',
    summary: 'Split rent and bills fairly among household members.',
    icon: 'people',
    color: '#A78BFA',
    category: 'finance',
    aiPrompt: 'Who still owes rent or utilities this month?',
  },
  {
    slug: 'credit-builder',
    label: 'Credit',
    title: 'Credit Builder',
    summary: 'On-time rent payments building your credit score.',
    icon: 'ribbon',
    color: '#F59E0B',
    category: 'finance',
  },
  {
    slug: 'financial-goals',
    label: 'Goals',
    title: 'Financial Goals',
    summary: 'Save for deposits, moving costs, or your first home.',
    icon: 'flag',
    color: '#14B8A6',
    category: 'finance',
    aiPrompt: 'Help me create a savings strategy for my housing goals.',
  },
  {
    slug: 'subscriptions',
    label: 'Subscriptions',
    title: 'Subscription Manager',
    summary: 'Track recurring bills, detect duplicates and cost increases.',
    icon: 'repeat',
    color: '#A78BFA',
    category: 'finance',
    aiPrompt: 'Find unused subscriptions my household could cancel.',
  },
  // Home
  {
    slug: 'energy-utilities',
    label: 'Energy',
    title: 'Energy & Utilities',
    summary: 'Track electric, gas, water usage and AI savings tips.',
    icon: 'flash',
    color: '#14B8A6',
    category: 'home',
    aiPrompt: 'Why is my electric bill higher this month?',
  },
  {
    slug: 'maintenance',
    label: 'Maintenance',
    title: 'Maintenance',
    summary: 'Report issues, track repairs, rate landlord response.',
    icon: 'construct',
    color: '#F59E0B',
    category: 'home',
    aiPrompt: 'Draft a maintenance request for my landlord.',
  },
  {
    slug: 'move-in-checklist',
    label: 'Move-in',
    title: 'Move-in Checklist',
    summary: 'Photo-documented condition reports tied to your lease.',
    icon: 'checkbox',
    color: '#EC4899',
    category: 'home',
  },
  {
    slug: 'package-tracker',
    label: 'Packages',
    title: 'Package Tracker',
    summary: 'Log deliveries, mark received, flag missing packages.',
    icon: 'cube-outline',
    color: '#F59E0B',
    category: 'home',
  },
  {
    slug: 'lease-renewal',
    label: 'Lease AI',
    title: 'Lease Renewal AI',
    summary: 'Market data, negotiation prep, and draft emails.',
    icon: 'document-text',
    color: '#A78BFA',
    category: 'home',
    aiPrompt: 'Help me negotiate my lease renewal.',
  },
  {
    slug: 'document-vault',
    label: 'Documents',
    title: 'Document Vault',
    summary: 'Leases, IDs, receipts, warranties — AI searchable.',
    icon: 'folder-open',
    color: '#14B8A6',
    category: 'home',
    aiPrompt: 'Find my pet policy in my lease documents.',
  },
  {
    slug: 'owner-portal',
    label: 'Owner Portal',
    title: 'Owner Portal',
    summary: 'Manage properties, tenants, and rent collection.',
    icon: 'business',
    color: '#14B8A6',
    category: 'home',
  },
  // Family
  {
    slug: 'chores',
    label: 'Chores',
    title: 'Chores & Tasks',
    summary: 'Recurring chores, assignments, reminders, and rewards.',
    icon: 'checkmark-done',
    color: '#A78BFA',
    category: 'family',
    aiPrompt: 'Assign this week\'s household chores fairly.',
  },
  {
    slug: 'calendar',
    label: 'Calendar',
    title: 'Family Calendar',
    summary: 'Bills, appointments, deliveries, and shared events.',
    icon: 'calendar',
    color: '#F59E0B',
    category: 'family',
    aiPrompt: 'What important dates should go on our family calendar?',
  },
  {
    slug: 'health',
    label: 'Health',
    title: 'Family Health',
    summary: 'Medication reminders, wellness, and emergency resources.',
    icon: 'heart',
    color: '#EC4899',
    category: 'family',
  },
  // Community
  {
    slug: 'community-board',
    label: 'Community',
    title: 'Community Board',
    summary: 'Neighborhood feed, events, recommendations, marketplace.',
    icon: 'chatbubbles',
    color: '#EC4899',
    category: 'community',
  },
  {
    slug: 'neighborhood-insights',
    label: 'Neighborhood',
    title: 'Neighborhood Insights',
    summary: 'Walk score, schools, safety, and local highlights.',
    icon: 'location',
    color: '#A78BFA',
    category: 'community',
  },
  {
    slug: 'house-search',
    label: 'Search',
    title: 'House Search',
    summary: 'Find homes with AI property analysis.',
    icon: 'search',
    color: '#7C3AED',
    category: 'community',
    aiPrompt: 'What should I look for when searching for a family home?',
  },
  {
    slug: 'resources',
    label: 'Resources',
    title: 'Community Resources',
    summary: 'Local help for housing, food, and utilities.',
    icon: 'heart-circle',
    color: '#14B8A6',
    category: 'community',
  },
  // Smart
  {
    slug: 'automations',
    label: 'Automations',
    title: 'Smart Automations',
    summary: 'Zapier-style rules for your household.',
    icon: 'git-network',
    color: '#7C3AED',
    category: 'smart',
    aiPrompt: 'Suggest automations for my household.',
  },
  {
    slug: 'smart-home',
    label: 'Smart Home',
    title: 'Smart Home Hub',
    summary: 'Ring, Nest, Alexa, locks, thermostats, and lights.',
    icon: 'home',
    color: '#14B8A6',
    category: 'smart',
  },
  {
    slug: 'notifications',
    label: 'Alerts',
    title: 'Smart Notifications',
    summary: 'AI-generated proactive alerts across all systems.',
    icon: 'notifications',
    color: '#F59E0B',
    category: 'smart',
  },
  // Safety
  {
    slug: 'safety',
    label: 'Safety',
    title: 'Safety & Emergency',
    summary: 'SOS, emergency contacts, weather alerts, evacuation.',
    icon: 'shield',
    color: '#EF4444',
    category: 'safety',
  },
  {
    slug: 'security',
    label: 'Security',
    title: 'Security',
    summary: 'Locks, alarms, cameras, and account safety.',
    icon: 'lock-closed',
    color: '#A78BFA',
    category: 'safety',
  },
  {
    slug: 'help',
    label: 'Help',
    title: 'Help Center',
    summary: 'Get answers about using FamilyHub.',
    icon: 'help-circle',
    color: '#6D5FA8',
    category: 'command',
  },
];

export function getFeature(slug: string): FeatureEntry | undefined {
  return FEATURE_REGISTRY.find((f) => f.slug === slug);
}

export function featuresByCategory(category: FeatureCategory): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => f.category === category);
}

export const DASHBOARD_QUICK_FEATURES = [
  'smart-fridge',
  'meal-planner',
  'rent-split',
  'chores',
  'energy-utilities',
  'notifications',
] as const;
