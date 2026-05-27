import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { childTheme } from '@/src/portals/child/theme';
import { motion } from '@/src/portals/shared/motion';

export type ChildTabId = 'home' | 'tasks' | 'health' | 'rewards' | 'messages' | 'settings';

type Tab = {
  id: ChildTabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { id: 'tasks', label: 'Tasks', icon: 'checkbox-outline', iconActive: 'checkbox' },
  { id: 'health', label: 'Health', icon: 'heart-outline', iconActive: 'heart' },
  { id: 'rewards', label: 'Rewards', icon: 'star-outline', iconActive: 'star' },
  { id: 'messages', label: 'Chat', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { id: 'settings', label: 'Me', icon: 'person-outline', iconActive: 'person' },
];

type Props = {
  active: ChildTabId;
  onChange: (tab: ChildTabId) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabButton({ tab, active, onPress }: { tab: Tab; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.tab, anim]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(motion.scale.tabPress, motion.reanimated.tabPress); }}
      onPressOut={() => { scale.value = withSpring(1, motion.reanimated.tabPress); }}
    >
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Ionicons
          name={active ? tab.iconActive : tab.icon}
          size={22}
          color={active ? childTheme.colors.white : childTheme.colors.inkMuted}
        />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
    </AnimatedPressable>
  );
}

export function ChildTabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  return (
    <View style={[styles.bar, { paddingBottom: bottom }]}>
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          active={active === tab.id}
          onPress={() => onChange(tab.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: childTheme.colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    paddingHorizontal: 8,
    ...childTheme.shadow.card,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: childTheme.colors.purpleDeep },
  label: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 10,
    color: childTheme.colors.inkMuted,
    marginTop: 2,
  },
  labelActive: { color: childTheme.colors.purpleDeep },
});
