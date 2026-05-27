import { useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { resolveActivePortal } from '@/src/portals/resolvePortal';
import RenterShell from '@/src/portals/RenterShell';
import OwnerShell from '@/src/portals/OwnerShell';
import ChildShell from '@/src/portals/ChildShell';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';

/**
 * MasterAppShell — routes experienceType/activePortal to the correct portal shell.
 * Renter flows remain the default and unchanged internally.
 */
export default function MasterAppShell() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { userProfile, loading } = useAuth();

  const portal = useMemo(
    () => resolveActivePortal(userProfile as Record<string, unknown> | null),
    [userProfile],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (portal === 'owner') {
    return <OwnerShell />;
  }
  if (portal === 'child') {
    return <ChildShell />;
  }
  return <RenterShell />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
}
