import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { validateUSPhone } from '@/src/utils/phone';
import { Button, Input } from '@/src/components/ui';
import {
  AuthHeader,
  AuthCard,
  FormErrorBanner,
  StepProgress,
} from '@/src/components/auth/AuthScreen';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';

const STEPS = ['Contact', 'Address'];

export default function OnboardingScreen() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { completeOnboarding, userProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState(String(userProfile?.phone || ''));
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async () => {
    setError(null);
    const pv = validateUSPhone(phone);
    if (!pv.isValid) {
      setError(pv.message);
      return;
    }
    if (!street.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError('Please complete your home address.');
      return;
    }
    try {
      setLoading(true);
      await completeOnboarding({
        phone: pv.formatted,
        phoneDigits: pv.digitsOnly,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zip.trim(),
          country: 'USA',
        },
      });
      router.replace('/(main)/(tabs)/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setError(null);
    if (step === 0) {
      const pv = validateUSPhone(phone);
      if (!pv.isValid) {
        setError(pv.message);
        return;
      }
      setStep(1);
      return;
    }
    onFinish();
  };

  const goBack = () => {
    setError(null);
    setStep(0);
  };

  const firstName = userProfile?.firstName?.trim() || 'there';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader
              title={`Hi, ${firstName}`}
              subtitle="A few details help us personalize maps, messages, and your dashboard."
            />

            <StepProgress steps={STEPS} currentIndex={step} />

            <AuthCard>
              <FormErrorBanner message={error} />

              {step === 0 ? (
                <>
                  <View style={styles.stepIntro}>
                    <Ionicons name="call-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.stepTitle}>How can we reach you?</Text>
                  </View>
                  <Text style={styles.stepHint}>
                    Used for account recovery and important housing updates.
                  </Text>
                  <Input
                    label="Mobile number"
                    placeholder="555-123-4567"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={phone}
                    onChangeText={setPhone}
                    editable={!loading}
                  />
                </>
              ) : (
                <>
                  <View style={styles.stepIntro}>
                    <Ionicons name="location-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.stepTitle}>Where do you live?</Text>
                  </View>
                  <Text style={styles.stepHint}>
                    Powers neighborhood maps and local housing resources near you.
                  </Text>
                  <Input
                    label="Street address"
                    placeholder="123 Main St"
                    autoComplete="street-address"
                    value={street}
                    onChangeText={setStreet}
                    editable={!loading}
                  />
                  <Input
                    label="City"
                    placeholder="Manchester"
                    value={city}
                    onChangeText={setCity}
                    editable={!loading}
                  />
                  <View style={styles.addressRow}>
                    <View style={styles.stateField}>
                      <Input
                        label="State"
                        placeholder="NH"
                        value={state}
                        onChangeText={setState}
                        autoCapitalize="characters"
                        maxLength={2}
                        editable={!loading}
                      />
                    </View>
                    <View style={styles.zipField}>
                      <Input
                        label="ZIP code"
                        placeholder="03101"
                        keyboardType="number-pad"
                        value={zip}
                        onChangeText={setZip}
                        maxLength={10}
                        editable={!loading}
                      />
                    </View>
                  </View>
                </>
              )}

              <Button
                title={step === 0 ? 'Continue' : 'Finish setup'}
                onPress={nextStep}
                loading={loading}
                style={styles.cta}
              />
              {step > 0 ? (
                <Button title="Back" onPress={goBack} variant="ghost" disabled={loading} />
              ) : null}
            </AuthCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl + 8,
  },
  stepIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  stepTitle: { ...theme.typography.h3, color: theme.colors.text },
  stepHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  addressRow: { flexDirection: 'row', gap: theme.spacing.md },
  stateField: { flex: 0.4 },
  zipField: { flex: 0.6 },
  cta: { marginTop: theme.spacing.xs },
});
}
