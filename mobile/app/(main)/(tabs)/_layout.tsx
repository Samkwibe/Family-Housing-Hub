import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BASE_HEIGHT } from '@/src/hooks/useTabScreenInsets';
import { theme } from '@/src/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.select({ android: 12, ios: 0, default: 8 }) ?? 8
  );
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: Platform.OS === 'android' ? 8 : 6,
          paddingBottom: bottomInset,
          ...(Platform.OS === 'android'
            ? { elevation: 12 }
            : theme.shadow.sm),
        },
        tabBarItemStyle: {
          paddingVertical: Platform.OS === 'android' ? 2 : 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: Platform.OS === 'android' ? 0 : 2,
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { fontWeight: '700', color: theme.colors.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Maps',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome name="map-marker" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <FontAwesome name="comments" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <FontAwesome name="magic" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <FontAwesome name="th-large" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
