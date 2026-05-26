import { ReactNode, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { FHBackLink } from './ui';

type FeatureShellProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onBack?: () => void;
  backLabel?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  headerStyle?: ViewStyle;
};

export function FeatureShell({
  title,
  subtitle,
  icon,
  iconColor = '#A78BFA',
  iconBg = 'rgba(124,58,237,.18)',
  onBack,
  backLabel = 'Back',
  headerExtra,
  children,
  headerStyle,
}: FeatureShellProps) {
  useEffect(() => {
    if (!onBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {onBack ? (
        <View style={styles.backBar}>
          <FHBackLink label={backLabel} onPress={onBack} />
        </View>
      ) : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.hdr, headerStyle]}>
          {icon ? (
            <View style={[styles.iconBox, { backgroundColor: iconBg, borderColor: `${iconColor}44` }]}>
              <Ionicons name={icon} size={26} color={iconColor} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {headerExtra}
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  backBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  scroll: { paddingBottom: 32 },
  hdr: {
    backgroundColor: theme.colors.headerBg,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 4 },
  subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 22 },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: theme.colors.background,
  },
});
