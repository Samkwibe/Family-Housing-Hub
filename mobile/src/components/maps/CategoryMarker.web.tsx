import type { Place } from '@/src/services/placesService';

type Props = {
  place: Place;
  selected?: boolean;
  onPress: (place: Place) => void;
};

export default function CategoryMarker(_props: Props) {
  return null;
}
