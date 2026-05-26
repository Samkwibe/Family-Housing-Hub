import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '@/src/theme';
import { useToast } from '@/src/contexts/ToastContext';

type Field = {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
};

type Props = {
  title: string;
  fields: Field[];
  submitLabel?: string;
  successMessage?: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function QuickAddForm({ title, fields, submitLabel = 'Save', successMessage, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
      setValues({});
      if (successMessage) showToast(successMessage, 'success');
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {fields.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            placeholder={f.placeholder}
            placeholderTextColor={theme.colors.textMuted}
            value={values[f.key] || ''}
            keyboardType={f.keyboardType || 'default'}
            onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
          />
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{submitLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  field: { marginBottom: theme.spacing.sm },
  label: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSize.md,
    minHeight: 48,
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginBottom: 8 },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontFamily: theme.fonts.bodyBold, fontSize: theme.fontSize.md },
});
