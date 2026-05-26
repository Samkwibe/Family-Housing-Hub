import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  FEATURE_CATEGORIES,
  FeatureCategory,
} from '@/src/features/registry';
import {
  featuresByCategoryForUser,
  featuresForUser,
  getRoleExperience,
  normalizeUserType,
} from '@/src/config/userExperience';
import { useTabScreenInsets } from '@/src/hooks/useTabScreenInsets';
import { theme } from '@/src/theme';

export default function MoreScreen() {
  const router = useRouter();
  const { userProfile, logout } = useAuth();
  const { scrollBottomPadding } = useTabScreenInsets();
  const userType = normalizeUserType(userProfile?.userType);
  const roleExp = getRoleExperience(userType);
  const categoryOrder = roleExp.categoryOrder;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.profileCard} onPress={() => router.push('/(main)/profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(userProfile?.firstName?.[0] || userProfile?.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.firstName} {userProfile?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{userProfile?.email}</Text>
            <View style={styles.profileRoleRow}>
              <View style={[styles.rolePill, { borderColor: `${roleExp.color}44` }]}>
                <Text style={[styles.rolePillText, { color: roleExp.color }]}>{roleExp.shortLabel}</Text>
              </View>
              <Text style={styles.profileRole}>{roleExp.moreSubtitle}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable style={styles.aiBanner} onPress={() => router.push('/(main)/(tabs)/assistant')}>
          <Ionicons name="sparkles" size={22} color="#F59E0B" />
          <View style={styles.aiBannerBody}>
            <Text style={styles.aiBannerTitle}>FamilyHub AI</Text>
            <Text style={styles.aiBannerSub}>Voice + text household brain</Text>
          </View>
          <Ionicons name="mic" size={18} color="#A78BFA" />
        </Pressable>

        {categoryOrder.map((cat) => {
          const items = featuresByCategoryForUser(cat, userType);
          if (items.length === 0) return null;
          const meta = FEATURE_CATEGORIES[cat];
          return (
            <View key={cat}>
              <Text style={styles.groupLabel}>{meta.label}</Text>
              <Text style={styles.groupDesc}>{meta.description}</Text>
              <View style={styles.menuGroup}>
                {items.map((item, index) => (
                  <Pressable
                    key={item.slug}
                    style={[styles.menuItem, index === items.length - 1 && styles.menuItemLast]}
                    onPress={() => router.push(`/(main)/feature/${item.slug}`)}
                  >
                    <View style={[styles.toolIcon, { backgroundColor: `${item.color}18` }]}>
                      <Ionicons name={item.icon} size={17} color={item.color} />
                    </View>
                    <View style={styles.menuBody}>
                      <Text style={styles.menuText}>{item.label}</Text>
                      {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={styles.groupLabel}>Account</Text>
        <View style={styles.menuGroup}>
          {(
            [
              { icon: 'person' as const, label: 'Profile', route: '/(main)/profile' as const },
              { icon: 'settings' as const, label: 'Settings', route: '/(main)/settings' as const },
              { icon: 'map' as const, label: 'Maps', route: '/(main)/(tabs)/maps' as const },
              { icon: 'chatbubbles' as const, label: 'Messages', route: '/(main)/(tabs)/messages' as const },
            ] as const
          ).map((item, index, arr) => (
            <Pressable
              key={item.label}
              style={[styles.menuItem, index === arr.length - 1 && styles.menuItemLast]}
              onPress={() => router.push(item.route)}
            >
              <Ionicons name={item.icon} size={18} color={theme.colors.primaryLight} />
              <Text style={[styles.menuText, { flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.logoutBtn}
          onPress={() => logout().then(() => router.replace('/(auth)/login'))}
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.footer}>
          {featuresForUser(userType).length} modules for {roleExp.shortLabel.toLowerCase()}s · FamilyHub OS
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: 16, paddingBottom: 32 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: theme.fonts.titleExtra },
  profileInfo: { marginLeft: 14, flex: 1 },
  profileName: { fontSize: 18, fontFamily: theme.fonts.title, color: theme.colors.text },
  profileEmail: { fontSize: 13, fontFamily: theme.fonts.body, color: theme.colors.textSecondary, marginTop: 2 },
  profileRoleRow: { marginTop: 6, gap: 4 },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(124,58,237,.1)',
  },
  rolePillText: { fontSize: 9, fontFamily: theme.fonts.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  profileRole: { fontSize: 11, fontFamily: theme.fonts.body, color: theme.colors.textSecondary },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.28)',
  },
  aiBannerBody: { flex: 1 },
  aiBannerTitle: { fontFamily: theme.fonts.title, fontSize: 15, color: theme.colors.text },
  aiBannerSub: { fontFamily: theme.fonts.body, fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  groupLabel: {
    ...theme.typography.overline,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.textMuted,
    marginBottom: 4,
    marginLeft: 4,
  },
  groupDesc: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  menuItemLast: { borderBottomWidth: 0 },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuText: { fontSize: 15, fontFamily: theme.fonts.bodyMedium, color: theme.colors.text },
  badge: {
    fontSize: 9,
    fontFamily: theme.fonts.bodyBold,
    color: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  logoutBtn: {
    padding: 16,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,.35)',
    backgroundColor: 'rgba(239,68,68,.08)',
  },
  logoutText: { color: theme.colors.danger, fontFamily: theme.fonts.bodyBold },
  footer: {
    textAlign: 'center',
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 16,
  },
});
