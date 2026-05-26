import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const PROVIDER_GOOGLE = 'google';

type MapViewProps = {
  style?: object;
  children?: ReactNode;
};

export default function MapView({ style, children }: MapViewProps) {
  return (
    <View style={[styles.map, style]}>
      <Text style={styles.label}>Map preview unavailable on web</Text>
      {children}
    </View>
  );
}

export function Marker({ children }: { children?: ReactNode }) {
  return children ?? null;
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1635',
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
