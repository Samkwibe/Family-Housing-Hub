import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  getCategoryDef,
  resolvePlacePhotoUrl,
  type Place,
} from '@/src/services/placesService';

type Props = {
  place: Place;
  selected?: boolean;
  onPress: () => void;
  onDirections?: () => void;
};

export default function PlaceListItem({
  place, selected, onPress, onDirections }: Props) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const [photoFailed, setPhotoFailed] = useState(false);
  const cat = getCategoryDef(place.category);
  const photoUrl = resolvePlacePhotoUrl(place);
  const showPhoto = Boolean(photoUrl) && !photoFailed;

  const distance =
    place.distance != null
      ? place.distance < 1
        ? `${Math.round(place.distance * 1000)} m`
        : `${place.distance.toFixed(1)} km`
      : null;

  return (
    <Pressable
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photoUrl! }}
          style={styles.thumb}
          resizeMode="cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <View style={[styles.thumbPlaceholder, { backgroundColor: `${cat.color}22` }]}>
          <Text style={styles.thumbIcon}>{cat.icon}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {place.name || 'Place'}
        </Text>
        {place.address ? (
          <Text style={styles.address} numberOfLines={2}>
            {place.address}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {place.rating ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{Number(place.rating).toFixed(1)}</Text>
            </View>
          ) : null}
          {distance ? <Text style={styles.metaText}>{distance}</Text> : null}
          <Text style={styles.metaText}>{cat.label}</Text>
        </View>
      </View>

      {onDirections ? (
        <Pressable style={styles.goBtn} onPress={onDirections} hitSlop={8}>
          <Ionicons name="navigate-outline" size={24} color={theme.colors.primaryLight} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  rowSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(124,58,237,.12)' },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: theme.colors.borderLight,
  },
  thumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: { fontSize: 28 },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 21,
  },
  address: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  metaText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  goBtn: { padding: 6 },
});
}
