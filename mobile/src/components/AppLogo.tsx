import { Image, StyleSheet, View, ViewStyle } from 'react-native';

const LOGO = require('../../assets/LOGO.png');

type LogoSize = 'sm' | 'md' | 'lg';

const SIZES: Record<LogoSize, { width: number; height: number }> = {
  sm: { width: 132, height: 44 },
  md: { width: 168, height: 56 },
  lg: { width: 220, height: 74 },
};

type AppLogoProps = {
  size?: LogoSize;
  style?: ViewStyle;
};

/** Official FamilyHub wordmark from assets/LOGO.png */
export function AppLogo({ size = 'md', style }: AppLogoProps) {
  const dims = SIZES[size];
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={LOGO}
        style={[dims, styles.image]}
        resizeMode="contain"
        accessibilityLabel="FamilyHub"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  image: {
    maxWidth: '100%',
  },
});
