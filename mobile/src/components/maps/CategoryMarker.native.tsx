import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { getCategoryDef, type Place } from '@/src/services/placesService';

type Props = {
  place: Place;
  selected?: boolean;
  onPress: (place: Place) => void;
};

export default function CategoryMarker({ place, selected, onPress }: Props) {
  if (place.lat == null || place.lng == null) return null;

  const cat = getCategoryDef(place.category);
  const size = selected ? 44 : 36;

  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      onPress={() => onPress(place)}
      tracksViewChanges={false}
    >
      <View
        style={[
          styles.marker,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: cat.color,
            borderWidth: selected ? 3 : 2,
          },
        ]}
      >
        <Text style={styles.icon}>{cat.icon}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  icon: { fontSize: 16 },
});
