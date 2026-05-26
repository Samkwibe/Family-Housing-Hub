import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/theme';

type Props = {
  syncing?: boolean;
};

export function OfflineBanner({ syncing }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.text}>
        {syncing ? 'Syncing…' : "You're offline — showing last saved data."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
