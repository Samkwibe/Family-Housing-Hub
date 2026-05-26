import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FamilyHubBrand } from '@/src/components/auth/AuthForm';
import { IntroIllustration } from '@/src/components/onboarding/IntroIllustrations';
import type { UserRole } from '@/src/components/auth/AuthScreen';
import {
  markIntroComplete,
  markIntroSkipped,
  savePreSignupAnswers,
  type HouseholdSize,
  type OnboardingPriority,
  type PreSignupAnswers,
} from '@/src/services/onboardingStorage';
import { theme } from '@/src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IllustrationKind = 'home' | 'finance' | 'food' | 'maps' | 'family' | 'personalize';

type IntroSlideData = {
  id: string;
  kind: 'intro';
  illustration: IllustrationKind;
  titleBefore: string;
  titleHighlight: string;
  titleAfter?: string;
  subtitle: string;
};

type QuestionSlideData = {
  id: string;
  kind: 'question';
  illustration: IllustrationKind;
  titleBefore: string;
  titleHighlight: string;
  titleAfter?: string;
  subtitle: string;
  questionKey: 'role' | 'householdSize' | 'priorities';
};

type SlideData = IntroSlideData | QuestionSlideData;

const SLIDES: SlideData[] = [
  {
    id: 'welcome',
    kind: 'intro',
    illustration: 'home',
    titleBefore: 'All your home life in ',
    titleHighlight: 'one place',
    subtitle:
      'Manage your home, finances, tasks, groceries, and more — all in one smart app.',
  },
  {
    id: 'finance',
    kind: 'intro',
    illustration: 'finance',
    titleBefore: 'Smarter finances with ',
    titleHighlight: 'AI',
    subtitle:
      'Track expenses, split bills, set goals, and get AI tips to save more and stress less.',
  },
  {
    id: 'food',
    kind: 'intro',
    illustration: 'food',
    titleBefore: 'Smart ',
    titleHighlight: 'food management',
    subtitle:
      'Track groceries, get expiry alerts, discover recipes, and reduce food waste.',
  },
  {
    id: 'maps',
    kind: 'intro',
    illustration: 'maps',
    titleBefore: 'Find ',
    titleHighlight: 'everything',
    titleAfter: ' near you',
    subtitle:
      'Powerful maps help you discover nearby places, services, deals, and more.',
  },
  {
    id: 'connected',
    kind: 'intro',
    illustration: 'family',
    titleBefore: 'Your home. Your people. ',
    titleHighlight: 'Connected.',
    subtitle:
      'Stay connected with your household, assign tasks, share updates, and build better routines together.',
  },
  {
    id: 'role',
    kind: 'question',
    illustration: 'personalize',
    titleBefore: 'Who are ',
    titleHighlight: 'you',
    titleAfter: '?',
    subtitle: 'We will personalize FamilyHub for your living situation.',
    questionKey: 'role',
  },
  {
    id: 'household',
    kind: 'question',
    illustration: 'personalize',
    titleBefore: 'Your ',
    titleHighlight: 'household',
    titleAfter: ' size',
    subtitle: 'How many people will use FamilyHub with you?',
    questionKey: 'householdSize',
  },
  {
    id: 'priorities',
    kind: 'question',
    illustration: 'personalize',
    titleBefore: 'What matters ',
    titleHighlight: 'most',
    titleAfter: '?',
    subtitle: 'Pick the features you want to focus on first.',
    questionKey: 'priorities',
  },
];

const ROLE_OPTIONS: { id: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'renter', label: 'Renter', icon: 'key' },
  { id: 'owner', label: 'Homeowner', icon: 'home' },
  { id: 'family', label: 'Family / Roommates', icon: 'people' },
];

const HOUSEHOLD_OPTIONS: { id: HouseholdSize; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'solo', label: 'Just me', icon: 'person' },
  { id: 'couple', label: '2 people', icon: 'heart' },
  { id: 'family_small', label: '3–4 people', icon: 'people' },
  { id: 'family_large', label: '5+ people', icon: 'people-circle' },
];

const PRIORITY_OPTIONS: { id: OnboardingPriority; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'finances', label: 'Finances & bills', icon: 'wallet' },
  { id: 'food', label: 'Food & groceries', icon: 'nutrition' },
  { id: 'maps', label: 'Maps & nearby', icon: 'map' },
  { id: 'tasks', label: 'Tasks & chores', icon: 'checkbox' },
  { id: 'maintenance', label: 'Home maintenance', icon: 'construct' },
];

function SlideTitle({ slide }: { slide: SlideData }) {
  return (
    <Text style={styles.title}>
      {slide.titleBefore}
      <Text style={styles.titleHighlight}>{slide.titleHighlight}</Text>
      {slide.titleAfter ?? ''}
    </Text>
  );
}

type AnswersState = {
  role?: UserRole;
  householdSize?: HouseholdSize;
  priorities: OnboardingPriority[];
};

export function PreSignupOnboarding() {
  const router = useRouter();
  const listRef = useRef<FlatList<SlideData>>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersState>({ priorities: [] });

  const isLast = index === SLIDES.length - 1;
  const currentSlide = SLIDES[index];

  const canAdvance = useMemo(() => {
    if (currentSlide.kind === 'intro') return true;
    if (currentSlide.questionKey === 'role') return Boolean(answers.role);
    if (currentSlide.questionKey === 'householdSize') return Boolean(answers.householdSize);
    if (currentSlide.questionKey === 'priorities') return answers.priorities.length > 0;
    return true;
  }, [answers, currentSlide]);

  const finish = useCallback(
    async (payload: PreSignupAnswers, destination: 'register' | 'login') => {
      await savePreSignupAnswers(payload);
      await markIntroComplete();
      router.replace(destination === 'register' ? '/(auth)/register' : '/(auth)/login');
    },
    [router]
  );

  const onSkip = useCallback(async () => {
    await markIntroSkipped();
    router.replace('/(auth)/login');
  }, [router]);

  const goNext = useCallback(async () => {
    if (!canAdvance) return;

    if (isLast) {
      await finish(
        {
          role: answers.role,
          householdSize: answers.householdSize,
          priorities: answers.priorities,
        },
        'register'
      );
      return;
    }

    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, [answers, canAdvance, finish, index, isLast]);

  const togglePriority = (id: OnboardingPriority) => {
    setAnswers((prev) => {
      const has = prev.priorities.includes(id);
      return {
        ...prev,
        priorities: has
          ? prev.priorities.filter((p) => p !== id)
          : [...prev.priorities, id],
      };
    });
  };

  const renderQuestionOptions = (slide: QuestionSlideData) => {
    if (slide.questionKey === 'role') {
      return (
        <View style={styles.optionsCol}>
          {ROLE_OPTIONS.map((opt) => {
            const selected = answers.role === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => setAnswers((p) => ({ ...p, role: opt.id }))}
              >
                <Ionicons name={opt.icon} size={20} color={selected ? '#fff' : '#A78BFA'} />
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    if (slide.questionKey === 'householdSize') {
      return (
        <View style={styles.optionsGrid}>
          {HOUSEHOLD_OPTIONS.map((opt) => {
            const selected = answers.householdSize === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.optionTile, selected && styles.optionCardSelected]}
                onPress={() => setAnswers((p) => ({ ...p, householdSize: opt.id }))}
              >
                <Ionicons name={opt.icon} size={22} color={selected ? '#fff' : '#A78BFA'} />
                <Text style={[styles.optionTileLabel, selected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    return (
      <View style={styles.chipsWrap}>
        {PRIORITY_OPTIONS.map((opt) => {
          const selected = answers.priorities.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => togglePriority(opt.id)}
            >
              <Ionicons name={opt.icon} size={14} color={selected ? '#fff' : '#A78BFA'} />
              <Text style={[styles.chipLabel, selected && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderSlide = ({ item }: { item: SlideData }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideInner}>
        <IntroIllustration kind={item.illustration} />
        <SlideTitle slide={item} />
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        {item.kind === 'question' ? renderQuestionOptions(item) : null}
        {item.id === 'priorities' ? (
          <Text style={styles.footerHint}>Let&apos;s build your smarter home ✨</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0a0824', theme.colors.background, '#06041A']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <FamilyHubBrand size="lg" />
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          getItemLayout={(_, i) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * i,
            index: i,
          })}
        />

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {isLast ? (
            <Pressable
              style={[styles.getStartedBtn, !canAdvance && styles.getStartedDisabled]}
              onPress={goNext}
              disabled={!canAdvance}
            >
              <LinearGradient
                colors={canAdvance ? ['#7C3AED', '#6D28D9'] : ['#3D3270', '#2a2350']}
                style={styles.getStartedGradient}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.footerRow}>
              {currentSlide.kind === 'intro' ? (
                <Pressable onPress={onSkip} hitSlop={12} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Log in</Text>
                </Pressable>
              ) : (
                <View style={styles.skipBtn} />
              )}

              <View style={styles.dots}>
                {SLIDES.map((slide, i) => (
                  <View
                    key={slide.id}
                    style={[styles.dot, i === index && styles.dotActive]}
                  />
                ))}
              </View>

              <Pressable
                onPress={goNext}
                disabled={!canAdvance}
                style={[styles.nextBtn, !canAdvance && styles.nextBtnDisabled]}
              >
                <LinearGradient
                  colors={canAdvance ? ['#7C3AED', '#6D28D9'] : ['#3D3270', '#2a2350']}
                  style={styles.nextGradient}
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
  },
  slideInner: {
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.fonts.titleExtra,
    fontSize: 28,
    lineHeight: 34,
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.md,
  },
  titleHighlight: {
    color: theme.colors.primaryLight,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    maxWidth: 340,
  },
  footerHint: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: { minWidth: 56 },
  skipText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(167,139,250,0.25)',
  },
  dotActive: {
    width: 22,
    backgroundColor: theme.colors.primary,
  },
  nextBtn: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    ...theme.shadow.md,
  },
  nextBtnDisabled: { opacity: 0.55 },
  nextGradient: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedBtn: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.lg,
  },
  getStartedDisabled: { opacity: 0.6 },
  getStartedGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    fontFamily: theme.fonts.title,
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.2,
  },
  optionsCol: { gap: 10 },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  optionLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.text,
  },
  optionLabelSelected: { color: '#fff' },
  optionTile: {
    width: '47%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: 8,
  },
  optionTileLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
    textAlign: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  chipLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
});
