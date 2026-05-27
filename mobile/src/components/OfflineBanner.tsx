import { StyleSheet, Text, View } from 'react-native';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

type Props = {
  syncing?: boolean;
};

export function OfflineBanner({ syncing }: Props) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.text}>
        {syncing ? 'Syncing…' : "You're offline — showing last saved data."}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  banner: {
    backgroundColor: '#92400e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fffbeb',
    fontSize: 13,
    fontWeight: '600',
  },
});
}
