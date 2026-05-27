import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RewardCelebration } from '@/src/portals/child/components/RewardCelebration';
import {
  AVATAR_OPTIONS,
  COLOR_THEMES,
  childTheme,
  type AvatarTheme,
  type ColorTheme,
} from '@/src/portals/child/theme';
import { hapticForCelebration } from '@/src/portals/shared/haptics';
import { motion } from '@/src/portals/shared/motion';
import type { ChildChore, ChildReward } from '@/src/services/portalService';

type Props = {
  displayName: string;
  chores: ChildChore[];
  rewards: ChildReward[];
  onComplete: (payload: { avatarEmoji: string; themeId: string; displayName: string }) => Promise<void>;
  onFinished?: () => void;
};

type Step = 'welcome' | 'avatar' | 'theme' | 'goal' | 'celebrate';

export function ChildWelcomeFlow({ displayName, chores, rewards, onComplete, onFinished }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState<AvatarTheme>(AVATAR_OPTIONS[0]);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(COLOR_THEMES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;
  const confetti = useRef(new Animated.Value(0)).current;

  const firstChore = chores.find((c) => !c.completed);
  const firstReward = rewards[0];
  const starterPoints = firstChore?.points || 10;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -6, duration: motion.duration.loop, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: motion.duration.loop, useNativeDriver: true }),
      ]),
    ).start();
  }, [bounce]);

  useEffect(() => {
    if (step !== 'welcome') return;
    confetti.setValue(0);
    Animated.timing(confetti, { toValue: 1, duration: motion.duration.gentle, useNativeDriver: true }).start();
  }, [step, confetti]);

  const finish = async () => {
    setSubmitting(true);
    try {
      await onComplete({
        avatarEmoji: avatar.emoji,
        themeId: colorTheme.id,
        displayName: name.trim() || displayName,
      });
      setShowCelebration(true);
      void hapticForCelebration('welcome_complete');
      setStep('celebrate');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 'welcome') setStep('avatar');
    else if (step === 'avatar') setStep('theme');
    else if (step === 'theme') setStep('goal');
    else if (step === 'goal') finish();
  };

  const canNext =
    step === 'welcome' ||
    (step === 'avatar' && name.trim().length > 0) ||
    step === 'theme' ||
    step === 'goal';

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...colorTheme.hero]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {step === 'welcome' && (
            <View style={styles.centerBlock}>
              <Animated.Text style={[styles.confettiRow, { opacity: confetti, transform: [{ translateY: bounce }] }]}>
                ✨
              </Animated.Text>
              <Text style={styles.kicker}>Your family invited you to</Text>
              <Text style={styles.heroTitle}>FamilyHub</Text>
              <Text style={styles.heroSub}>
                Hi {displayName}! This is your safe digital world — made just for you.
              </Text>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeCardEmoji}>🏡💜</Text>
                <Text style={styles.welcomeCardText}>
                  You're connected to your family. Earn stars, complete missions, and unlock rewards!
                </Text>
              </View>
            </View>
          )}

          {step === 'avatar' && (
            <View style={styles.block}>
              <Text style={styles.stepTitle}>Create your avatar</Text>
              <Text style={styles.stepSub}>Pick a friend who represents you in FamilyHub.</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your nickname"
                placeholderTextColor={childTheme.colors.inkMuted}
                maxLength={24}
              />
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((opt) => {
                  const selected = opt.emoji === avatar.emoji;
                  return (
                    <Pressable
                      key={opt.emoji}
                      onPress={() => setAvatar(opt)}
                      style={[styles.avatarPick, selected && { borderColor: opt.accent, borderWidth: 3 }]}
                    >
                      <Text style={styles.avatarEmoji}>{opt.emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 'theme' && (
            <View style={styles.block}>
              <Text style={styles.stepTitle}>Pick your colors</Text>
              <Text style={styles.stepSub}>Make your portal feel like yours.</Text>
              <View style={styles.themeList}>
                {COLOR_THEMES.map((t) => {
                  const selected = t.id === colorTheme.id;
                  return (
                    <Pressable key={t.id} onPress={() => setColorTheme(t)} style={[styles.themeCard, selected && styles.themeCardOn]}>
                      <LinearGradient colors={[...t.hero]} style={styles.themeSwatch} />
                      <Text style={styles.themeLabel}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 'goal' && (
            <View style={styles.block}>
              <Text style={styles.stepTitle}>Your first mission</Text>
              <Text style={styles.stepSub}>Here's how stars work — complete tasks, earn points, redeem rewards!</Text>
              <View style={styles.goalCard}>
                <Text style={styles.goalEmoji}>⭐</Text>
                <Text style={styles.goalTitle}>
                  {firstChore
                    ? `Complete "${firstChore.title}" to earn ${starterPoints} stars`
                    : `Complete your first chore to earn ${starterPoints} stars`}
                </Text>
                <Text style={styles.goalHint}>Tap a chore when you're done — your parent can assign more anytime.</Text>
              </View>
              {firstReward ? (
                <View style={[styles.goalCard, styles.rewardCard]}>
                  <Text style={styles.goalEmoji}>{firstReward.emoji || '🎁'}</Text>
                  <Text style={styles.goalTitle}>First reward waiting: {firstReward.title}</Text>
                  <Text style={styles.goalHint}>Costs {firstReward.cost} stars — you can do it!</Text>
                </View>
              ) : null}
              <View style={styles.badgePreview}>
                <Text style={styles.badgePreviewTitle}>You'll unlock right away:</Text>
                <Text style={styles.badgePreviewRow}>🎉 Welcome badge · 💜 Family member · 🔥 Day 1 streak</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {step !== 'celebrate' && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.cta, !canNext && styles.ctaDisabled]}
              onPress={next}
              disabled={!canNext || submitting}
            >
              <Text style={styles.ctaText}>
                {submitting ? 'Setting up…' : step === 'goal' ? 'Enter my world!' : 'Continue'}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <RewardCelebration
        visible={showCelebration}
        emoji={avatar.emoji}
        title={`Welcome, ${name.trim() || displayName}!`}
        message="You earned the Welcome and Family Member badges. Your adventure starts now!"
        celebrationType="welcome_complete"
        onClose={() => {
          setShowCelebration(false);
          onFinished?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: childTheme.spacing.xl, paddingTop: childTheme.spacing.xxl, paddingBottom: 120 },
  centerBlock: { alignItems: 'center', paddingTop: 40 },
  confettiRow: { fontSize: 36, marginBottom: childTheme.spacing.lg },
  kicker: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 16, color: childTheme.colors.inkSoft },
  heroTitle: { fontFamily: childTheme.fonts.title, fontSize: 42, fontWeight: '700', color: childTheme.colors.ink, marginTop: 4 },
  heroSub: { fontFamily: childTheme.fonts.body, fontSize: 17, color: childTheme.colors.inkSoft, textAlign: 'center', marginTop: 12, lineHeight: 26, maxWidth: 320 },
  welcomeCard: {
    marginTop: childTheme.spacing.xxl,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: childTheme.radius.lg,
    padding: childTheme.spacing.xl,
    alignItems: 'center',
    ...childTheme.shadow.card,
  },
  welcomeCardEmoji: { fontSize: 40, marginBottom: 8 },
  welcomeCardText: { fontFamily: childTheme.fonts.body, fontSize: 16, color: childTheme.colors.ink, textAlign: 'center', lineHeight: 24 },
  block: { paddingTop: 24 },
  stepTitle: { fontFamily: childTheme.fonts.title, fontSize: 30, fontWeight: '700', color: childTheme.colors.ink },
  stepSub: { fontFamily: childTheme.fonts.body, fontSize: 16, color: childTheme.colors.inkSoft, marginTop: 8, lineHeight: 24 },
  nameInput: {
    marginTop: childTheme.spacing.xl,
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 18,
    color: childTheme.colors.ink,
  },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: childTheme.spacing.xl, justifyContent: 'center' },
  avatarPick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: childTheme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...childTheme.shadow.card,
  },
  avatarEmoji: { fontSize: 36 },
  themeList: { marginTop: childTheme.spacing.xl, gap: 12 },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: childTheme.radius.lg,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardOn: { borderColor: childTheme.colors.purpleDeep },
  themeSwatch: { width: 56, height: 56, borderRadius: 16 },
  themeLabel: { fontFamily: childTheme.fonts.bodyBold, fontSize: 17, color: childTheme.colors.ink },
  goalCard: {
    marginTop: childTheme.spacing.xl,
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.lg,
    padding: childTheme.spacing.xl,
    alignItems: 'center',
    ...childTheme.shadow.card,
  },
  rewardCard: { marginTop: childTheme.spacing.lg, backgroundColor: '#FEF3C7' },
  goalEmoji: { fontSize: 44, marginBottom: 8 },
  goalTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 18, color: childTheme.colors.ink, textAlign: 'center', lineHeight: 26 },
  goalHint: { fontFamily: childTheme.fonts.body, fontSize: 14, color: childTheme.colors.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  badgePreview: { marginTop: childTheme.spacing.xxl, alignItems: 'center' },
  badgePreviewTitle: { fontFamily: childTheme.fonts.bodyBold, fontSize: 14, color: childTheme.colors.purpleDeep },
  badgePreviewRow: { fontFamily: childTheme.fonts.body, fontSize: 15, color: childTheme.colors.ink, marginTop: 8, textAlign: 'center' },
  footer: { paddingHorizontal: childTheme.spacing.xl, paddingBottom: childTheme.spacing.xl },
  cta: {
    backgroundColor: childTheme.colors.purpleDeep,
    borderRadius: childTheme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: childTheme.fonts.bodyBold, fontSize: 17, color: childTheme.colors.white },
});
