import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_CATEGORIES,
  EXPLORE_CATEGORIES,
  type CategoryDef,
} from '@/src/services/placesService';
import { theme } from '@/src/theme';

type Props = {
  selected: string[];
  showExplore: boolean;
  onToggleExplore: () => void;
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
};

function Chip({
  def,
  active,
  onPress,
}: {
  def: Pick<CategoryDef, 'id' | 'label' | 'icon'>;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={styles.chipIcon}>{def.icon}</Text>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{def.label}</Text>
    </Pressable>
  );
}

export default function CategoryChips({
  selected,
  showExplore,
  onToggleExplore,
  onToggleCategory,
  onSelectAll,
}: Props) {
  const allActive = selected.length === 0;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={[styles.chip, allActive && styles.chipActive]}
          onPress={onSelectAll}
        >
          <Text style={[styles.chipLabel, allActive && styles.chipLabelActive]}>All</Text>
        </Pressable>
        {DEFAULT_CATEGORIES.map((def) => (
          <Chip
            key={def.id}
            def={def}
            active={selected.includes(def.id)}
            onPress={() => onToggleCategory(def.id)}
          />
        ))}
        <Pressable style={styles.moreChip} onPress={onToggleExplore}>
          <Ionicons
            name={showExplore ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.colors.primary}
          />
          <Text style={styles.moreLabel}>More</Text>
        </Pressable>
      </ScrollView>
      {showExplore ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowExplore}
        >
          {EXPLORE_CATEGORIES.map((def) => (
            <Chip
              key={def.id}
              def={def}
              active={selected.includes(def.id)}
              onPress={() => onToggleCategory(def.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 8,
  },
  rowExplore: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipIcon: { fontSize: 16 },
  chipLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipLabelActive: { color: theme.colors.textInverse },
  moreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moreLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
