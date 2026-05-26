import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Keyboard,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import type { SearchSuggestion } from '@/src/services/placesService';

type Props = {
  query: string;
  onChangeQuery: (q: string) => void;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  loading: boolean;
  visible: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSelectSuggestion: (item: SearchSuggestion | { name: string; type: 'recent' }) => void;
  onSuggest: (q: string) => void;
  onSubmitSearch: (q: string) => void;
  onClear: () => void;
  variant?: 'default' | 'floating';
};

export default function SearchAutocomplete({
  query,
  onChangeQuery,
  suggestions,
  recentSearches,
  loading,
  visible,
  onFocus,
  onBlur,
  onSelectSuggestion,
  onSuggest,
  onSubmitSearch,
  onClear,
  variant = 'default',
}: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    onChangeQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim()) onSuggest(text);
    }, 300);
  };

  const showPanel =
    visible &&
    (loading || suggestions.length > 0 || (query.length === 0 && recentSearches.length > 0));

  const floating = variant === 'floating';

  return (
    <View style={[styles.wrap, floating && styles.wrapFloating]}>
      <View style={[styles.bar, floating && styles.barFloating]}>
        <Ionicons name="search" size={20} color={floating ? theme.colors.primaryLight : theme.colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Search pizza, car repair, addresses…"
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={handleChange}
          onSubmitEditing={() => {
            Keyboard.dismiss();
            onSubmitSearch(query);
          }}
          returnKeyType="search"
          onFocus={onFocus}
          onBlur={onBlur}
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
        {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      {showPanel ? (
        <View style={[styles.panel, floating && styles.panelFloating]}>
          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelectSuggestion(item);
                  }}
                >
                  <Ionicons
                    name={item.type === 'keyword' ? 'flash-outline' : 'location-outline'}
                    size={18}
                    color={theme.colors.primary}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.address ? (
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          ) : loading ? null : (
            <>
              <Text style={styles.recentLabel}>Recent</Text>
              {recentSearches.map((q) => (
                <Pressable
                  key={q}
                  style={styles.row}
                  onPress={() => onSelectSuggestion({ name: q, type: 'recent' })}
                >
                  <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
                  <Text style={styles.rowTitle}>{q}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    zIndex: 20,
  },
  wrapFloating: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  barFloating: {
    backgroundColor: 'rgba(14, 11, 46, 0.92)',
    borderColor: theme.colors.borderFocus,
    paddingVertical: 10,
    ...theme.shadow.md,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 17,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  panel: {
    marginTop: 4,
    maxHeight: 280,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.md,
  },
  panelFloating: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderFocus,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  rowSub: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 3,
    lineHeight: 19,
  },
  recentLabel: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    textTransform: 'uppercase',
  },
});
