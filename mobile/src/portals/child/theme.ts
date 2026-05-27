/** Child portal design system — bright, playful, separate from renter dark UI */

export type AvatarTheme = {
  emoji: string;
  ring: readonly [string, string];
  accent: string;
};

export type ColorTheme = {
  id: string;
  label: string;
  hero: readonly [string, string, string];
  accent: string;
  gradients: {
    points: readonly [string, string];
    wallet: readonly [string, string];
    chores: readonly [string, string];
    streak: readonly [string, string];
    level: readonly [string, string];
  };
};

export const AVATAR_OPTIONS: AvatarTheme[] = [
  { emoji: '🦊', ring: ['#FDE68A', '#FB923C'], accent: '#FB923C' },
  { emoji: '🐸', ring: ['#BBF7D0', '#34D399'], accent: '#34D399' },
  { emoji: '🦄', ring: ['#DDD6FE', '#A78BFA'], accent: '#8B5CF6' },
  { emoji: '🐻', ring: ['#FBCFE8', '#F472B6'], accent: '#EC4899' },
  { emoji: '🚀', ring: ['#BAE6FD', '#60A5FA'], accent: '#3B82F6' },
  { emoji: '🌟', ring: ['#FEF08A', '#FACC15'], accent: '#EAB308' },
  { emoji: '🦁', ring: ['#FED7AA', '#F97316'], accent: '#EA580C' },
  { emoji: '🐼', ring: ['#E2E8F0', '#94A3B8'], accent: '#64748B' },
];

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'purple',
    label: 'Magic purple',
    hero: ['#DDD6FE', '#BAE6FD', '#FFEDD5'],
    accent: '#7C3AED',
    gradients: {
      points: ['#FDE68A', '#FBBF24'],
      wallet: ['#6EE7B7', '#34D399'],
      chores: ['#93C5FD', '#60A5FA'],
      streak: ['#FBCFE8', '#F472B6'],
      level: ['#C4B5FD', '#8B5CF6'],
    },
  },
  {
    id: 'ocean',
    label: 'Ocean blue',
    hero: ['#BAE6FD', '#A5F3FC', '#E0F2FE'],
    accent: '#0284C7',
    gradients: {
      points: ['#FDE68A', '#FBBF24'],
      wallet: ['#67E8F9', '#06B6D4'],
      chores: ['#93C5FD', '#3B82F6'],
      streak: ['#FBCFE8', '#F472B6'],
      level: ['#7DD3FC', '#0EA5E9'],
    },
  },
  {
    id: 'sunset',
    label: 'Sunset glow',
    hero: ['#FECACA', '#FED7AA', '#FEF3C7'],
    accent: '#EA580C',
    gradients: {
      points: ['#FDE68A', '#F59E0B'],
      wallet: ['#6EE7B7', '#10B981'],
      chores: ['#FCA5A5', '#EF4444'],
      streak: ['#FBCFE8', '#EC4899'],
      level: ['#FDBA74', '#F97316'],
    },
  },
  {
    id: 'forest',
    label: 'Forest friend',
    hero: ['#BBF7D0', '#D9F99D', '#ECFCCB'],
    accent: '#059669',
    gradients: {
      points: ['#FDE68A', '#FBBF24'],
      wallet: ['#6EE7B7', '#34D399'],
      chores: ['#86EFAC', '#22C55E'],
      streak: ['#FBCFE8', '#F472B6'],
      level: ['#A7F3D0', '#10B981'],
    },
  },
];

const DEFAULT_THEME = COLOR_THEMES[0];

export const childTheme = {
  fonts: {
    title: 'DMSans_700Bold',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodyBold: 'DMSans_700Bold',
  },
  colors: {
    sky: '#E0F2FE',
    skyDeep: '#BAE6FD',
    cream: '#FFFBF5',
    white: '#FFFFFF',
    ink: '#1E293B',
    inkSoft: '#475569',
    inkMuted: '#64748B',
    purple: '#8B5CF6',
    purpleDeep: '#7C3AED',
    coral: '#FB7185',
    sun: '#FBBF24',
    sunDeep: '#F59E0B',
    mint: '#34D399',
    mintDeep: '#10B981',
    blue: '#60A5FA',
    blueDeep: '#3B82F6',
    pink: '#F472B6',
    lavender: '#C4B5FD',
    brandPurple: '#7C3AED',
    brandTeal: '#14B8A6',
    sos: '#F97316',
    sosRing: '#FDBA74',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
  shadow: {
    card: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },
    fab: {
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  gradients: {
    hero: DEFAULT_THEME.hero,
    points: DEFAULT_THEME.gradients.points,
    wallet: DEFAULT_THEME.gradients.wallet,
    chores: DEFAULT_THEME.gradients.chores,
    streak: DEFAULT_THEME.gradients.streak,
    level: DEFAULT_THEME.gradients.level,
    card: ['#FFFFFF', '#F8FAFC'] as const,
  },
};

/** @deprecated use resolveAvatarTheme */
export function pickAvatarTheme(seed: string): AvatarTheme {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 9973;
  return AVATAR_OPTIONS[hash % AVATAR_OPTIONS.length];
}

export function resolveAvatarTheme(emoji?: string | null, seed?: string): AvatarTheme {
  if (emoji) {
    const found = AVATAR_OPTIONS.find((a) => a.emoji === emoji);
    if (found) return found;
  }
  return pickAvatarTheme(seed || 'friend');
}

export function resolveColorTheme(themeId?: string | null): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0];
}

export function computeLevel(points: number): { level: number; xp: number; next: number; progress: number } {
  const level = Math.max(1, Math.floor(Math.sqrt(points / 10)) + 1);
  const prevThreshold = Math.pow(level - 1, 2) * 10;
  const nextThreshold = Math.pow(level, 2) * 10;
  const xp = points - prevThreshold;
  const span = nextThreshold - prevThreshold;
  return { level, xp, next: nextThreshold, progress: span > 0 ? Math.min(1, xp / span) : 0 };
}

export function dailyEncouragement(name: string, streak: number): string {
  const lines = streak >= 3
    ? [
        `${name}, you're on fire! ${streak}-day streak! 🔥`,
        'Superstar mode activated — keep going!',
        'Your family is proud of you today!',
      ]
    : [
        `Let's make today awesome, ${name}!`,
        'Small wins add up — you got this!',
        'Ready for an adventure today?',
      ];
  const day = new Date().getDate();
  return lines[day % lines.length];
}

export function buddyMessage(name: string, pendingChores: number, points: number): string {
  if (pendingChores === 0) {
    return `You're all caught up, ${name}! Time to explore rewards ⭐`;
  }
  if (points >= 25) {
    return `Nice stash of stars! ${pendingChores} mission${pendingChores === 1 ? '' : 's'} left today.`;
  }
  return `Hey ${name}! Complete a chore to earn stars and level up 🚀`;
}
