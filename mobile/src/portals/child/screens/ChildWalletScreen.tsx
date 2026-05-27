import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { ChildProgressBar } from '@/src/portals/child/components/ChildProgressBar';
import { ChildEmptyState } from '@/src/portals/child/components/ChildEmptyState';
import { childTheme } from '@/src/portals/child/theme';

type Props = {
  onClose: () => void;
};

export function ChildWalletScreen({ onClose }: Props) {
  const { data, colorTheme, refreshing, refresh } = useChildPortal();
  const walletBalance = data?.walletBalance ?? 0;
  const savingsGoal = data?.savingsGoal; // e.g. { title, targetAmount, savedAmount }
  const transactions = data?.walletTransactions ?? [];

  // Goal calculations
  const goalProgress = savingsGoal && savingsGoal.targetAmount > 0
    ? Math.min(1, walletBalance / savingsGoal.targetAmount)
    : 0;

  const remaining = savingsGoal
    ? Math.max(0, savingsGoal.targetAmount - walletBalance)
    : 0;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...colorTheme.gradients.wallet]} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="arrow-back" size={24} color={childTheme.colors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>My Wallet 💰</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>${walletBalance.toFixed(2)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={childTheme.colors.purpleDeep}
          />
        }
      >
        {/* Savings Goal Section */}
        <Text style={styles.sectionTitle}>My Savings Goal</Text>
        {savingsGoal ? (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalEmoji}>🎯</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>{savingsGoal.title}</Text>
                <Text style={styles.goalSub}>
                  Target: ${savingsGoal.targetAmount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>
                  {Math.round(goalProgress * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <ChildProgressBar progress={goalProgress} label="" />
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelLeft}>
                  Saved: ${walletBalance.toFixed(2)}
                </Text>
                <Text style={styles.progressLabelRight}>
                  {remaining > 0 ? `$${remaining.toFixed(2)} to go!` : 'Goal Reached! 🎉'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <ChildEmptyState
            variant="warm"
            emoji="✨"
            title="Set a Savings Goal!"
            message="Ask your parent to set a savings goal in their portal so you can track your progress together!"
          />
        )}

        {/* Transaction History Section */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Transaction History</Text>
        {transactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {transactions.map((tx) => {
              const isPositive = tx.amount >= 0;
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View
                    style={[
                      styles.txIconWrap,
                      { backgroundColor: isPositive ? '#ECFDF5' : '#FEF2F2' },
                    ]}
                  >
                    <Ionicons
                      name={isPositive ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={18}
                      color={isPositive ? childTheme.colors.mintDeep : childTheme.colors.coral}
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txDescription}>{tx.description}</Text>
                    {tx.createdAt ? (
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.txAmountWrap}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isPositive ? childTheme.colors.mintDeep : childTheme.colors.coral },
                      ]}
                    >
                      {isPositive ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <ChildEmptyState
            variant="playful"
            emoji="🧾"
            title="No transactions yet"
            message="Logs of pocket money additions, rewards redemptions, and tasks completed will appear here."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: childTheme.colors.cream },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...childTheme.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: childTheme.spacing.lg,
    paddingTop: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: childTheme.fonts.title,
    fontSize: 22,
    fontWeight: '700',
    color: childTheme.colors.white,
  },
  balanceContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  balanceLabel: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontFamily: childTheme.fonts.title,
    fontSize: 42,
    fontWeight: '800',
    color: childTheme.colors.white,
    marginTop: 4,
  },
  scroll: { flex: 1 },
  content: { padding: childTheme.spacing.xl, paddingBottom: 60 },
  sectionTitle: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 18,
    color: childTheme.colors.ink,
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.md,
    padding: childTheme.spacing.lg,
    ...childTheme.shadow.card,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 17,
    color: childTheme.colors.ink,
  },
  goalSub: {
    fontFamily: childTheme.fonts.body,
    fontSize: 13,
    color: childTheme.colors.inkMuted,
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: childTheme.radius.sm,
  },
  percentText: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 14,
    color: childTheme.colors.blueDeep,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabelLeft: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 12,
    color: childTheme.colors.inkSoft,
  },
  progressLabelRight: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 12,
    color: childTheme.colors.mintDeep,
  },
  transactionsList: {
    backgroundColor: childTheme.colors.white,
    borderRadius: childTheme.radius.md,
    paddingVertical: 6,
    ...childTheme.shadow.card,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 14,
    color: childTheme.colors.ink,
  },
  txDate: {
    fontFamily: childTheme.fonts.body,
    fontSize: 11,
    color: childTheme.colors.inkMuted,
    marginTop: 2,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 15,
  },
});
