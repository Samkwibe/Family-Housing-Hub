import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Base tab bar content height (icons + labels), excluding system inset */
export const TAB_BAR_BASE_HEIGHT = 52;

export function useTabScreenInsets() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.select({ android: 12, ios: 0, default: 8 }) ?? 8
  );
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomInset;

  return {
    bottomInset,
    tabBarHeight,
    scrollBottomPadding: tabBarHeight + 12,
  };
}

/** @alias useTabScreenInsets */
export const useTabBarInsets = useTabScreenInsets;
