import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';

/** Web / fallback — native maps live in maps.native.tsx */
export default function MapsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.card}>
        <Ionicons name="phone-portrait-outline" size={48} color={theme.colors.primaryLight} />
        <Text style={styles.title}>Maps run on your iPhone</Text>
        <Text style={styles.body}>
          The interactive map uses native Apple Maps and is not available in the browser preview.
          Open FamilyHub in Expo Go on your iPhone to test Maps.
        </Text>
        <View style={styles.steps}>
          <Text style={styles.step}>1. Install Expo Go from the App Store</Text>
          <Text style={styles.step}>2. Scan the QR code in your terminal (LAN mode)</Text>
          <Text style={styles.step}>3. Stay on the same Wi‑Fi as this Mac</Text>
        </View>
        <Pressable style={styles.btn} onPress={() => Linking.openURL('https://expo.dev/go')}>
          <Text style={styles.btnText}>Get Expo Go</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  steps: { marginTop: 8, gap: 6, alignSelf: 'stretch' },
  step: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  btn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  btnText: {
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
});
