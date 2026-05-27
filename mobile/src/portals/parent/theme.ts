/** Parent family hub — warm, premium, playful (shared palette with child portal) */
import { childTheme } from '@/src/portals/child/theme';

export const familyTheme = {
  ...childTheme,
  colors: {
    ...childTheme.colors,
    bg: '#FFF9F5',
    card: '#FFFFFF',
    accent: '#7C3AED',
    accentSoft: '#EDE9FE',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  gradients: {
    ...childTheme.gradients,
    header: ['#EDE9FE', '#FCE7F3', '#FFEDD5'] as const,
    familyCard: ['#FFFFFF', '#F5F3FF'] as const,
  },
};

export function childCardGradient(name: string): readonly [string, string] {
  const palettes: readonly [string, string][] = [
    ['#DDD6FE', '#C4B5FD'],
    ['#BAE6FD', '#93C5FD'],
    ['#FBCFE8', '#F9A8D4'],
    ['#A7F3D0', '#6EE7B7'],
    ['#FDE68A', '#FCD34D'],
  ];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  return palettes[idx];
}

export function childEmoji(name: string): string {
  const emojis = ['⭐', '🌟', '🦸', '🎨', '🚀', '🌈', '🐻', '🦁'];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % emojis.length;
  return emojis[idx];
}
