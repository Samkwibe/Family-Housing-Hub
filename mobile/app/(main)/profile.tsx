import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/src/contexts/AuthContext';
import { normalizeUserType, getRoleExperience, type UserType } from '@/src/config/userExperience';
import { RolePicker, UserRole } from '@/src/components/auth/AuthScreen';
import { Button, Input } from '@/src/components/ui';
import { updateProfile } from '@/src/services/authService';
import { theme } from '@/src/theme';

type AddressForm = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile, currentUser, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<UserType>('renter');
  const [address, setAddress] = useState<AddressForm>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    const addr = userProfile?.address as AddressForm | undefined;
    setFirstName(String(userProfile?.firstName || ''));
    setLastName(String(userProfile?.lastName || ''));
    setPhone(String(userProfile?.phone || ''));
    setUserType(normalizeUserType(String(userProfile?.userType || 'renter')));
    setAddress({
      street: String(addr?.street || ''),
      city: String(addr?.city || ''),
      state: String(addr?.state || ''),
      zipCode: String(addr?.zipCode || ''),
    });
  }, [userProfile]);

  const onSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Profile', 'First name is required');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        userType,
        address,
        profileComplete: true,
        onboardingComplete: true,
      });
      await refreshProfile();
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: unknown) {
      Alert.alert('Profile', (e as Error).message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const roleExp = getRoleExperience(userType);

  const rows = [
    { icon: 'envelope', label: 'Email', value: currentUser?.email },
    { icon: 'phone', label: 'Phone', value: phone || '—' },
    { icon: 'tag', label: 'Account type', value: roleExp.label },
    {
      icon: 'map-marker',
      label: 'Address',
      value: address.street
        ? `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`.trim()
        : '—',
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(firstName[0] || userProfile?.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
          <View style={[styles.roleBadge, { borderColor: `${roleExp.color}44` }]}>
            <Text style={[styles.role, { color: roleExp.color }]}>{roleExp.label}</Text>
          </View>
          <Text style={styles.roleSub}>{roleExp.heroSubtitle}</Text>
        </View>

        {editing ? (
          <View style={styles.card}>
            <Input label="First name" value={firstName} onChangeText={setFirstName} />
            <Input label="Last name" value={lastName} onChangeText={setLastName} />
            <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Text style={styles.section}>Account type</Text>
            <RolePicker value={userType as UserRole} onChange={setUserType} disabled={saving} />
            <Text style={styles.section}>Address</Text>
            <Input label="Street" value={address.street} onChangeText={(v) => setAddress((a) => ({ ...a, street: v }))} />
            <Input label="City" value={address.city} onChangeText={(v) => setAddress((a) => ({ ...a, city: v }))} />
            <Input label="State" value={address.state} onChangeText={(v) => setAddress((a) => ({ ...a, state: v }))} autoCapitalize="characters" />
            <Input label="ZIP" value={address.zipCode} onChangeText={(v) => setAddress((a) => ({ ...a, zipCode: v }))} keyboardType="number-pad" />
            <Button title="Save profile" onPress={onSave} loading={saving} style={{ marginTop: 8 }} />
            <Button title="Cancel" onPress={() => setEditing(false)} variant="ghost" />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              {rows.map((r) => (
                <View key={r.label} style={styles.row}>
                  <FontAwesome name={r.icon as 'envelope'} size={16} color={theme.colors.primary} style={styles.rowIcon} />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    <Text style={styles.rowValue}>{r.value}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.actions}>
              <Button title="Edit profile" onPress={() => setEditing(true)} />
              <Button title="Settings" onPress={() => router.push('/(main)/settings')} variant="secondary" />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: 32 },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadow.md,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(124,58,237,.1)',
  },
  role: { fontSize: 12, fontWeight: '700' },
  roleSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
  card: {
    margin: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  section: { ...theme.typography.label, color: theme.colors.text, marginTop: 8, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  rowIcon: { marginTop: 2, width: 24 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  rowValue: { fontSize: 15, color: theme.colors.text, marginTop: 4, lineHeight: 22 },
  actions: { paddingHorizontal: 16, gap: 8 },
});
