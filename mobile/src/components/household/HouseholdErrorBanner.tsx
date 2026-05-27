import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

type Props = {
  onRetry?: () => void;
};

export function HouseholdErrorBanner({ onRetry }: Props) {
  const styles = useAppStyles(createStyles);
  const { error, refreshHousehold, loading } = useHousehold();
  if (!error) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={18} color="#EF4444" />
      <View style={styles.body}>
        <Text style={styles.title}>Could not load household data</Text>
        <Text style={styles.msg}>{error}</Text>
      </View>
      <Pressable
        style={styles.btn}
        disabled={loading}
        onPress={onRetry ?? refreshHousehold}
      >
        <Text style={styles.btnText}>{loading ? '…' : 'Retry'}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,.25)',
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: 12,
  },
  body: { flex: 1 },
  title: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: theme.fontSize.sm,
    color: '#EF4444',
  },
  msg: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: 'rgba(239,68,68,.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
  },
  btnText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    color: '#EF4444',
  },
});
}
