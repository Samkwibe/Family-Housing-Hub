import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { usePlaceInsights } from '@/src/hooks/usePlaceInsights';
import {
  getCategoryDef,
  resolvePlacePhotoUrl,
  type Place,
} from '@/src/services/placesService';
import { streetViewProxyUrl } from '@/src/services/weatherService';
import { useTheme } from '@/src/contexts/ThemeContext';

type Props = {
  place: Place | null;
  onClose: () => void;
  origin?: { lat: number; lng: number } | null;
};

export default function PlaceBottomSheet({
  place, onClose, origin }: Props) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [streetFailed, setStreetFailed] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);

  const { insights, loading: insightsLoading } = usePlaceInsights(
    place?.lat ?? null,
    place?.lng ?? null,
    origin
  );

  useEffect(() => {
    setPhotoFailed(false);
    setStreetFailed(false);
    setShowStreetView(false);
  }, [place?.id, place?.photoUrl, place?.photoReference, place?.image_url]);

  if (!place) return null;

  const cat = getCategoryDef(place.category);
  const photoUrl = resolvePlacePhotoUrl(place);
  const showPhoto = Boolean(photoUrl) && !photoFailed;
  const streetUrl =
    place.lat != null && place.lng != null && insights?.streetViewAvailable
      ? streetViewProxyUrl(place.lat, place.lng)
      : null;
  const showStreet = showStreetView && streetUrl && !streetFailed;

  const distance =
    place.distance != null
      ? place.distance < 1
        ? `${Math.round(place.distance * 1000)} m`
        : `${place.distance.toFixed(1)} km`
      : null;

  const travel = insights?.travel;
  const drive = travel?.drive?.label;
  const walk = travel?.walk?.label;

  const openDirections = () => {
    if (!place.lat || !place.lng) return;
    const label = encodeURIComponent(place.name || 'Destination');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${label}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`http://maps.apple.com/?daddr=${place.lat},${place.lng}`);
    });
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {showStreet ? (
          <Image
            source={{ uri: streetUrl! }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setStreetFailed(true)}
          />
        ) : showPhoto ? (
          <Image
            key={place.id ?? place.name}
            source={{ uri: photoUrl! }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: cat.color + '22' }]}>
            <Text style={styles.photoPlaceholderIcon}>{cat.icon}</Text>
          </View>
        )}

        {streetUrl ? (
          <Pressable style={styles.viewToggle} onPress={() => setShowStreetView((v) => !v)}>
            <Ionicons name="camera-outline" size={16} color={theme.colors.primaryLight} />
            <Text style={styles.viewToggleText}>
              {showStreetView ? 'Show place photo' : 'Street View'}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: cat.color + '22' }]}>
            <Text style={styles.badgeIcon}>{cat.icon}</Text>
            <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.title}>{place.name || 'Place'}</Text>
        {distance ? <Text style={styles.distance}>{distance} away</Text> : null}

        {insightsLoading ? (
          <ActivityIndicator color={theme.colors.primaryLight} style={{ marginVertical: 8 }} />
        ) : drive || walk ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.travelRow}>
            {drive ? (
              <View style={styles.travelChip}>
                <Ionicons name="car-outline" size={16} color={theme.colors.accent} />
                <Text style={styles.travelText}>{drive} drive</Text>
              </View>
            ) : null}
            {walk ? (
              <View style={styles.travelChip}>
                <Ionicons name="walk-outline" size={16} color={theme.colors.accentWarm} />
                <Text style={styles.travelText}>{walk} walk</Text>
              </View>
            ) : null}
            {travel?.bicycle?.label ? (
              <View style={styles.travelChip}>
                <Ionicons name="bicycle-outline" size={16} color={theme.colors.primaryLight} />
                <Text style={styles.travelText}>{travel.bicycle.label} bike</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {place.address ? (
          <Text style={styles.address} numberOfLines={3}>
            {place.address}
          </Text>
        ) : null}
        {insights?.timezone?.timeZoneName ? (
          <Text style={styles.meta}>Local time zone: {insights.timezone.timeZoneName}</Text>
        ) : null}
        {place.rating ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.ratingVal}>{place.rating.toFixed(1)}</Text>
            <Text style={styles.ratingLabel}>Google rating</Text>
          </View>
        ) : null}
        {place.hours ? (
          <Text style={styles.meta} numberOfLines={2}>
            Hours: {place.hours}
          </Text>
        ) : null}
        {place.phone ? <Text style={styles.meta}>{place.phone}</Text> : null}
        <Pressable style={styles.directionsBtn} onPress={openDirections}>
          <Ionicons name="navigate" size={20} color={theme.colors.textInverse} />
          <Text style={styles.directionsText}>Get Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    paddingTop: theme.spacing.sm,
    maxHeight: '85%',
    ...theme.shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.borderLight,
  },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: { fontSize: 56 },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingVertical: 4,
  },
  viewToggleText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  distance: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryLight,
    marginBottom: 8,
  },
  travelRow: { marginBottom: 10, maxHeight: 40 },
  travelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    marginRight: 8,
  },
  travelText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  address: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ratingVal: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  ratingLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  meta: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 21,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
  },
  directionsText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
});
}
