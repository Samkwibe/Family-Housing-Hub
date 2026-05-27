import { ReactElement, ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { FeatureShell } from '@/src/components/familyhub/FeatureShell';
import {
  FHCard,
  FHRowItem,
  FHTag,
  FHCta,
  FHDashedBtn,
  FHStatGrid,
  FHProgress,
} from '@/src/components/familyhub/ui';
import { STUB_FEATURES } from '@/src/constants/features';
import { getFeature } from '@/src/features/registry';
import { HOUSEHOLD_OS_SCREENS } from '@/src/features/HouseholdOsScreens';
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  searchProperties,
  addExpense,
  updateExpense,
  addMaintenanceRequest,
  updateMaintenanceRequest,
  addPackage,
  updatePackage,
  updateCreditSettings,
  addFinancialGoal,
  addUtilityReading,
  seedChecklist,
  toggleChecklistItem,
  attachChecklistPhoto,
  addHealthReminder,
  fetchHealthTimeline,
  fetchHealthMedications,
  fetchVaccinationSchedule,
  markMedicationDose,
  fetchPurchaseReadiness,
  fetchMoveoutEstimate,
  fetchRentMarket,
  type HealthMember,
  type HealthTimelineItem,
  type MedicationItem,
  type VaccinationItem,
  addCommunityPost,
  fetchBillForecast,
  setMemberIncome,
  proposeIncomeSplit,
  agreeIncomeSplit,
  fetchRentAffordability,
  type BillForecast,
} from '@/src/services/householdService';
import { getUploadUrl, uploadFileToPresignedUrl } from '@/src/services/storageService';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/src/contexts/ToastContext';
import { QuickAddForm } from '@/src/components/household/QuickAddForm';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { formatUserLocation, formatUserSearchQuery, formatUserZip } from '@/src/utils/formatAddress';
import { useTheme } from '@/src/contexts/ThemeContext';

type Props = { slug: string; onBack: () => void };

function askAi(router: ReturnType<typeof useRouter>, prompt: string) {
  router.push({ pathname: '/(main)/(tabs)/assistant', params: { prompt } });
}

function StubFeature({
  slug, onBack }: Props) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const registryFeature = getFeature(slug);
  const stubFeature = STUB_FEATURES.find((f) => f.slug === slug);
  if (!registryFeature && !stubFeature) return null;
  const title = registryFeature?.title ?? stubFeature?.title ?? slug;
  const summary = registryFeature?.summary ?? stubFeature?.summary ?? '';
  const tips = stubFeature?.tips ?? [
    'Use the AI assistant for personalized household guidance.',
    'Connect this feature to your household dashboard for proactive alerts.',
  ];
  const aiPrompt = registryFeature?.aiPrompt ?? stubFeature?.assistantPrompt ?? `Help me with ${title} in my household.`;
  return (
    <FeatureShell title={title} subtitle={summary} icon="home-outline" onBack={onBack}>
      <FHCard title="Quick tips">
        {tips.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </FHCard>
      <FHCta
        label="Ask AI about this"
        icon="sparkles"
        variant="ai"
        onPress={() => askAi(router, aiPrompt)}
      />
    </FeatureShell>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  const theme = useTheme();

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{title}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 }}>{body}</Text>
    </View>
  );
}

function RentSplitScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { expenses, members, snapshot, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'income'>('equal');
  const rentBills = expenses.filter((e) => ['rent', 'utility', 'other'].includes(e.category));
  const total = rentBills.reduce((s, e) => s + e.amount, 0);

  const saveIncome = async () => {
    const inc = parseFloat(incomeInput);
    if (!inc) return;
    await setMemberIncome(inc);
    setIncomeInput('');
    Alert.alert('Saved', 'Your income is stored privately. Other members cannot see the amount.');
  };

  return (
    <FeatureShell
      title="Rent Split"
      subtitle="Equal or income-proportional splits — income stays private."
      icon="people"
      onBack={onBack}
    >
      <FHStatGrid
        items={[
          { label: 'Total due', value: `$${total.toFixed(0)}`, color: '#A78BFA' },
          { label: 'Unpaid', value: String(snapshot.billsDue), color: '#EF4444' },
        ]}
      />
      <FHCard title={`Household (${members.length})`}>
        {members.length === 0 ? (
          <Text style={styles.emptyHint}>Your profile appears here once signed in.</Text>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} initials={m.initials} name={m.name} sub={m.role} you={m.id === members[0]?.id} paid={m.rentPaid !== false} pending={m.rentPaid === false} />
          ))
        )}
      </FHCard>
      <FHCard title="Split method">
        <View style={styles.tabRow}>
          <Pressable style={[styles.tabChip, splitMode === 'equal' && styles.tabChipActive]} onPress={() => setSplitMode('equal')}>
            <Text style={[styles.tabChipText, splitMode === 'equal' && styles.tabChipTextActive]}>Equal</Text>
          </Pressable>
          <Pressable style={[styles.tabChip, splitMode === 'income' && styles.tabChipActive]} onPress={() => setSplitMode('income')}>
            <Text style={[styles.tabChipText, splitMode === 'income' && styles.tabChipTextActive]}>By income</Text>
          </Pressable>
        </View>
        {splitMode === 'income' ? (
          <>
            <Text style={styles.emptyHint}>Enter your monthly income (private — never shared with roommates).</Text>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Your monthly income"
                placeholderTextColor="#6D5FA8"
                keyboardType="decimal-pad"
                value={incomeInput}
                onChangeText={setIncomeInput}
              />
              <Pressable onPress={saveIncome}><Text style={styles.markExpectedText}>Save</Text></Pressable>
            </View>
            <FHCta label="Propose income-proportional split" icon="people" onPress={async () => {
              await proposeIncomeSplit();
              Alert.alert('Proposed', 'All members must agree before the split locks in.');
            }} />
            <FHCta label="Agree to current split" icon="checkmark" onPress={async () => {
              await agreeIncomeSplit();
              await refreshHousehold();
            }} />
          </>
        ) : null}
      </FHCard>
      {showAdd ? (
        <QuickAddForm
          title="Add bill or rent"
          fields={[
            { key: 'title', label: 'Title', placeholder: 'May rent' },
            { key: 'amount', label: 'Amount ($)', placeholder: '1200', keyboardType: 'decimal-pad' },
            { key: 'dueDate', label: 'Due date', placeholder: 'Jun 1' },
          ]}
          submitLabel="Add bill"
          onSubmit={async (v) => {
            const amount = parseFloat(v.amount || '0');
            if (!v.title?.trim() || !amount) throw new Error('Title and amount are required');
            await addExpense({
              title: v.title.trim(),
              category: 'rent',
              amount,
              dueDate: v.dueDate?.trim() || '',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Bills & rent">
        {rentBills.length === 0 ? (
          <Text style={styles.emptyHint}>No bills yet. Add rent or utilities to track splits.</Text>
        ) : (
          rentBills.map((e) => (
            <Pressable
              key={e.id}
              onPress={async () => {
                await updateExpense(e.id, { paid: !e.paid });
                await refreshHousehold();
              }}
            >
              <FHRowItem icon="cash" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title={e.title} subtitle={`$${e.amount.toFixed(0)}${e.dueDate ? ` · due ${e.dueDate}` : ''} · tap to toggle paid`} right={<FHTag label={e.paid ? 'Paid' : 'Due'} variant={e.paid ? 'green' : 'amber'} />} />
            </Pressable>
          ))
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Add bill or rent'} icon={showAdd ? 'close' : 'add'} onPress={() => setShowAdd((s) => !s)} />
      <FHCta label="AI payment reminders" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Help me send friendly payment reminders for unpaid household bills.')} />
    </FeatureShell>
  );
}

function MemberRow({ initials, name, sub, you, paid, pending }: {
  initials: string; name: string; sub: string; you?: boolean; paid?: boolean; pending?: boolean;
}) {
  const styles = useAppStyles(createStyles);

  const bg = pending ? 'rgba(239,68,68,.12)' : you ? 'rgba(124,58,237,.2)' : 'rgba(245,158,11,.12)';
  const color = pending ? '#EF4444' : you ? '#A78BFA' : '#F59E0B';
  return (
    <View style={styles.memberRow}>
      <View style={[styles.initials, { backgroundColor: bg }]}>
        <Text style={[styles.initialsText, { color }]}>{initials}</Text>
      </View>
      <View style={styles.memberBody}>
        <Text style={styles.memberName}>
          {name}{you ? ' ' : ''}
          {you ? <Text style={styles.youBadge}>You</Text> : null}
        </Text>
        <Text style={styles.memberSub}>{sub}</Text>
      </View>
      {paid ? <FHTag label="Paid" variant="green" /> : null}
      {pending ? <FHTag label="Pending" variant="red" /> : null}
    </View>
  );
}

function CreditBuilderScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { creditSummary, refreshHousehold } = useHousehold();
  const { estimatedScore, grade, onTimeCount, missedCount, monthsReported, ytdChange, monthlyPayments, bureaus } = creditSummary;

  const toggleBureau = async (key: keyof typeof bureaus) => {
    await updateCreditSettings({ [key]: !bureaus[key] });
    await refreshHousehold();
  };

  const scoreDisplay = estimatedScore ?? '—';
  const changeHint = monthsReported === 0
    ? 'Add rent payments in Rent Split to start tracking'
    : ytdChange > 0
      ? `+${ytdChange} pts from on-time rent`
      : 'Based on your rent payment history';

  return (
    <FeatureShell
      title="Credit Builder"
      subtitle="Estimated score from your on-time rent payments in Rent Split."
      icon="ribbon"
      iconColor="#F59E0B"
      iconBg="rgba(245,158,11,.12)"
      onBack={onBack}
      headerExtra={
        <View style={styles.scoreCard}>
          <View>
            <Text style={styles.scoreLbl}>Est. credit score</Text>
            <Text style={styles.scoreVal}>{scoreDisplay}</Text>
            <Text style={styles.scoreHint}>{changeHint}</Text>
          </View>
          <Text style={styles.scoreGrade}>{grade}</Text>
        </View>
      }
    >
      {monthsReported === 0 ? (
        <Text style={styles.emptyHint}>No rent payment history yet. Mark rent as paid in Rent Split to build your credit profile.</Text>
      ) : null}
      <FHCard title="Payment reporting">
        <Pressable onPress={() => toggleBureau('experian')}>
          <FHRowItem icon="business" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title="Experian" subtitle={bureaus.experian ? 'Reporting enabled' : 'Not connected'} right={<Toggle on={bureaus.experian} />} />
        </Pressable>
        <Pressable onPress={() => toggleBureau('transunion')}>
          <FHRowItem icon="business" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title="TransUnion" subtitle={bureaus.transunion ? 'Reporting enabled' : 'Not connected'} right={<Toggle on={bureaus.transunion} />} />
        </Pressable>
        <Pressable onPress={() => toggleBureau('equifax')}>
          <FHRowItem icon="business" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title="Equifax" subtitle={bureaus.equifax ? 'Reporting enabled' : 'Not connected'} right={<Toggle on={bureaus.equifax} />} />
        </Pressable>
      </FHCard>
      <FHCard title="Rent payment history">
        {monthlyPayments.length === 0 ? (
          <Text style={styles.emptyHint}>Payment months appear here as you add rent in Rent Split.</Text>
        ) : (
          <>
            <View style={styles.monthGrid}>
              {monthlyPayments.map((m, i) => (
                <View key={`${m.label}-${i}`} style={[styles.monthCell, { backgroundColor: m.paid ? '#14B8A6' : '#EF4444' }]}>
                  <Text style={styles.monthText}>{m.label}</Text>
                </View>
              ))}
              {Array.from({ length: Math.max(0, 12 - monthlyPayments.length) }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.monthEmpty} />
              ))}
            </View>
            <Text style={styles.monthSummary}>
              {monthsReported}/12 months tracked · <Text style={{ color: '#14B8A6', fontWeight: '700' }}>{onTimeCount} on-time</Text>
              {missedCount > 0 ? <> · <Text style={{ color: '#EF4444', fontWeight: '700' }}>{missedCount} missed</Text></> : null}
            </Text>
          </>
        )}
      </FHCard>
      <FHCta label="AI credit improvement tips" icon="sparkles" variant="ai" onPress={() => askAi(router, 'How can I improve my credit score with on-time rent payments?')} />
    </FeatureShell>
  );
}

function FinancialGoalsScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const {
    financialGoals,
    expenses,
    spendingAnomalies,
    savingsPlan,
    subscriptionWaste,
    refreshHousehold,
  } = useHousehold();
  const [tab, setTab] = useState<'goals' | 'forecast' | 'subscriptions'>('goals');
  const [showAdd, setShowAdd] = useState(false);
  const [forecast, setForecast] = useState<BillForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const flaggedIds = new Set(spendingAnomalies.map((a) => a.expenseId));
  const monthlyBills = expenses.filter((e) => !e.paid);
  const resolveGoalIcon = (icon: string): keyof typeof Ionicons.glyphMap => {
    if (icon === 'home') return 'home';
    if (icon === 'car') return 'car';
    if (icon === 'business') return 'business';
    return 'flag';
  };

  useEffect(() => {
    if (tab !== 'forecast') return;
    setForecastLoading(true);
    fetchBillForecast()
      .then((r) => setForecast(r.forecast))
      .catch(() => setForecast(null))
      .finally(() => setForecastLoading(false));
  }, [tab]);

  const tabBtn = (id: typeof tab, label: string) => (
    <Pressable
      key={id}
      style={[styles.tabChip, tab === id && styles.tabChipActive]}
      onPress={() => setTab(id)}
    >
      <Text style={[styles.tabChipText, tab === id && styles.tabChipTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <FeatureShell
      title="Budget"
      subtitle="Goals, 90-day forecast, and subscription review."
      icon="flag"
      iconColor="#14B8A6"
      iconBg="rgba(20,184,166,.12)"
      onBack={onBack}
      headerExtra={
        <View style={styles.tabRow}>
          {tabBtn('goals', 'Goals')}
          {tabBtn('forecast', 'Forecast')}
          {tabBtn('subscriptions', 'Review')}
        </View>
      }
    >
      {tab === 'forecast' ? (
        forecastLoading ? (
          <ActivityIndicator color="#14B8A6" style={{ margin: 20 }} />
        ) : forecast?.setupRequired ? (
          <EmptyBlock title="Set up your forecast" body={forecast.message || 'Add recurring bills and income to see your 90-day cash flow.'} />
        ) : (
          <>
            <FHCard title="90-day outlook">
              <Text style={styles.forecastSummary}>{forecast?.summary}</Text>
              <Text style={styles.goalSub}>
                Starting balance ${forecast?.startingBalance?.toFixed(0)} · Income ${forecast?.monthlyIncome?.toFixed(0)}/mo
              </Text>
            </FHCard>
            {(forecast?.weeks || []).map((w) => (
              <View key={w.weekStart} style={[styles.weekCard, w.isTight && styles.weekCardTight]}>
                <Text style={styles.weekTitle}>
                  {w.weekStart} → {w.weekEnd}
                  {w.isTight ? ` · ${w.tightLabel}` : ''}
                </Text>
                <Text style={styles.goalSub}>
                  Net ${w.netCashFlow.toFixed(0)} · Balance ${w.runningBalance.toFixed(0)}
                </Text>
                {w.events.map((ev) => (
                  <Text key={`${ev.dueDate}-${ev.name}`} style={styles.weekEvent}>
                    {ev.name} ${ev.projectedAmount.toFixed(0)} · due {ev.dueDate}
                  </Text>
                ))}
              </View>
            ))}
          </>
        )
      ) : null}

      {tab === 'subscriptions' ? (
        <>
          <FHCard title="Review subscriptions">
            {subscriptionWaste.length === 0 ? (
              <Text style={styles.emptyHint}>No unused subscriptions detected.</Text>
            ) : (
              subscriptionWaste.map((s) => (
                <View key={s.id} style={styles.anomalyRow}>
                  <FHTag label={`$${s.monthlyAmount.toFixed(2)}/mo`} variant="amber" />
                  <Text style={styles.anomalyText}>{s.message}</Text>
                </View>
              ))
            )}
          </FHCard>
        </>
      ) : null}

      {tab === 'goals' ? (
        <>
      {showAdd ? (
        <QuickAddForm
          title="New savings goal"
          successMessage="Goal created"
          fields={[
            { key: 'title', label: 'Goal name', placeholder: 'Security deposit' },
            { key: 'targetAmount', label: 'Target ($)', placeholder: '3500', keyboardType: 'decimal-pad' },
            { key: 'savedAmount', label: 'Saved so far ($)', placeholder: '0', keyboardType: 'decimal-pad' },
            { key: 'targetDate', label: 'Target date', placeholder: 'Aug 2026' },
          ]}
          submitLabel="Create goal"
          onSubmit={async (v) => {
            if (!v.title?.trim()) throw new Error('Goal name is required');
            const target = parseFloat(v.targetAmount || '0');
            if (!target) throw new Error('Target amount is required');
            await addFinancialGoal({
              title: v.title.trim(),
              targetAmount: target,
              savedAmount: parseFloat(v.savedAmount || '0') || 0,
              targetDate: v.targetDate?.trim() || '',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      {spendingAnomalies.length > 0 ? (
        <FHCard title="Unusual spending">
          {spendingAnomalies.map((a) => (
            <View key={a.id} style={styles.anomalyRow}>
              <FHTag label={a.severity === 'alert' ? 'Alert' : 'Warning'} variant="amber" />
              <Text style={styles.anomalyText}>{a.message}</Text>
            </View>
          ))}
        </FHCard>
      ) : null}
      <FHCard title="This month's bills">
        {monthlyBills.length === 0 ? (
          <Text style={styles.emptyHint}>No unpaid bills this month.</Text>
        ) : (
          monthlyBills.map((e, i) => (
            <View key={e.id} style={[styles.billRow, i < monthlyBills.length - 1 && styles.goalBorder]}>
              <View style={styles.billHeader}>
                <Text style={styles.goalTitle}>{e.title}</Text>
                <Text style={styles.goalSaved}>${e.amount.toFixed(0)}</Text>
              </View>
              <Text style={styles.goalSub}>{e.category}{e.dueDate ? ` · due ${e.dueDate}` : ''}</Text>
              {e.spendingAnomaly || flaggedIds.has(e.id) ? (
                <View style={styles.anomalyInline}>
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <Text style={styles.anomalyInlineText}>
                    {(e.spendingAnomaly || spendingAnomalies.find((a) => a.expenseId === e.id))?.message}
                  </Text>
                </View>
              ) : null}
              {e.spendingAnomaly ? (
                <Pressable
                  style={styles.markExpectedBtn}
                  onPress={async () => {
                    await updateExpense(e.id, { expectedLargePurchase: true });
                    await refreshHousehold();
                  }}
                >
                  <Text style={styles.markExpectedText}>Mark as expected large purchase</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </FHCard>
      <FHCard title="Your goals">
        {financialGoals.length === 0 ? (
          <Text style={styles.emptyHint}>No goals yet. Set a target for your next housing milestone.</Text>
        ) : (
          financialGoals.map((g, i) => (
            <GoalRow
              key={g.id}
              icon={resolveGoalIcon(g.icon)}
              color="#14B8A6"
              title={g.title}
              goal={`$${g.targetAmount.toFixed(0)}`}
              saved={`$${g.savedAmount.toFixed(0)}`}
              pct={g.progressPct}
              hint={`${g.progressPct}%${g.targetDate ? ` · Target ${g.targetDate}` : ''}`}
              last={i === financialGoals.length - 1}
            />
          ))
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Add a new goal'} icon={showAdd ? 'close' : 'add'} color="#14B8A6" onPress={() => setShowAdd((s) => !s)} />
      {savingsPlan?.message ? (
        <FHCard title="Recommended allocation">
          <Text style={styles.anomalyText}>{savingsPlan.message}</Text>
          {savingsPlan.allocations.filter((a) => a.monthlyAllocation > 0).map((a) => (
            <Text key={a.goalId} style={styles.goalSub}>
              {a.title}: ${a.monthlyAllocation.toFixed(0)}/mo
              {a.monthsToGoal ? ` · ${a.monthsToGoal} mo to goal` : ''}
            </Text>
          ))}
        </FHCard>
      ) : null}
      <FHCta label="AI savings strategy" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Help me optimize my savings allocation across my housing goals.')} />
        </>
      ) : null}
    </FeatureShell>
  );
}

function GoalRow({ icon, color, title, goal, saved, pct, hint, last }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; title: string; goal: string; saved: string; pct: number; hint: string; last?: boolean;
}) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.goalRow, !last && styles.goalBorder]}>
      <View style={styles.goalHeader}>
        <View style={styles.goalLeft}>
          <View style={[styles.goalIcon, { backgroundColor: `${color}22` }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
          <View>
            <Text style={styles.goalTitle}>{title}</Text>
            <Text style={styles.goalSub}>Goal: {goal}</Text>
          </View>
        </View>
        <Text style={[styles.goalSaved, { color }]}>{saved}</Text>
      </View>
      <FHProgress pct={pct} color={color} />
      <Text style={styles.goalHint}>{hint}</Text>
    </View>
  );
}

function EnergyScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { utilitySummary, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const { electricAvg, waterAvg, gasAvg, energySpikePct, readings } = utilitySummary;
  const hasData = readings.length > 0;

  return (
    <FeatureShell
      title="Energy & Utilities"
      subtitle="Log your utility bills and track spending over time."
      icon="flash"
      iconColor="#14B8A6"
      iconBg="rgba(20,184,166,.12)"
      onBack={onBack}
      headerExtra={
        hasData ? (
          <View style={styles.utilGrid}>
            <UtilBox icon="flash" label="Electric avg" value={electricAvg ? `$${electricAvg.toFixed(0)}` : '—'} color="#14B8A6" />
            <UtilBox icon="water" label="Water avg" value={waterAvg ? `$${waterAvg.toFixed(0)}` : '—'} color="#A78BFA" />
            <UtilBox icon="flame" label="Gas avg" value={gasAvg ? `$${gasAvg.toFixed(0)}` : '—'} color="#F59E0B" />
          </View>
        ) : undefined
      }
    >
      {!hasData ? (
        <Text style={styles.emptyHint}>Log your first utility bill to start tracking energy and water costs.</Text>
      ) : null}
      {showAdd ? (
        <QuickAddForm
          title="Log utility bill"
          successMessage="Bill logged"
          fields={[
            { key: 'utilityType', label: 'Type', placeholder: 'electric, water, or gas' },
            { key: 'amount', label: 'Amount ($)', placeholder: '88', keyboardType: 'decimal-pad' },
            { key: 'period', label: 'Billing period', placeholder: 'May 2026' },
          ]}
          submitLabel="Save bill"
          onSubmit={async (v) => {
            const amount = parseFloat(v.amount || '0');
            if (!amount) throw new Error('Amount is required');
            await addUtilityReading({
              utilityType: v.utilityType?.trim() || 'electric',
              amount,
              period: v.period?.trim() || '',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      {hasData ? (
        <FHCard title="Recent bills">
          {readings.map((r) => (
            <FHRowItem key={r.id} icon={r.utilityType === 'water' ? 'water' : r.utilityType === 'gas' ? 'flame' : 'flash'} iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title={r.utilityType.charAt(0).toUpperCase() + r.utilityType.slice(1)} subtitle={r.period || 'Bill'} right={<FHTag label={`$${r.amount.toFixed(0)}`} variant="green" />} />
          ))}
          {energySpikePct !== 0 ? (
            <View style={styles.insight}>
              <Text style={styles.insightBold}>{energySpikePct > 0 ? `Up ${energySpikePct}%` : `Down ${Math.abs(energySpikePct)}%`}</Text>
              <Text style={styles.insightMuted}> vs your previous electric bill</Text>
            </View>
          ) : null}
        </FHCard>
      ) : null}
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Log utility bill'} icon={showAdd ? 'close' : 'add'} onPress={() => setShowAdd((s) => !s)} />
      <FHCta label="Get AI energy-saving tips" icon="sparkles" variant="ai" onPress={() => askAi(router, hasData ? `Review my utility bills and suggest savings. Electric avg $${electricAvg}, water $${waterAvg}, gas $${gasAvg}.` : 'Give me energy-saving tips for my apartment.')} />
    </FeatureShell>
  );
}

function MoveInScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);
  const theme = useTheme();

  const router = useRouter();
  const toast = useToast();
  const { checklistItems, refreshHousehold } = useHousehold();
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (checklistItems.length === 0) {
      setSeeding(true);
      seedChecklist('move-in').then(() => refreshHousehold()).finally(() => setSeeding(false));
    }
  }, []);

  const rooms = [...new Set(checklistItems.map((i) => i.room))];
  const done = checklistItems.filter((i) => i.completed).length;
  const total = checklistItems.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const toggleItem = async (id: string, completed: boolean) => {
    await toggleChecklistItem(id, !completed);
    await refreshHousehold();
  };

  const attachPhoto = async (id: string) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast.error('Camera permission is required');
        return;
      }
      const shot = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (shot.canceled || !shot.assets?.[0]) return;
      const asset = shot.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const filename = asset.fileName || `checklist-${id}.jpg`;
      const { uploadUrl, fileKey } = await getUploadUrl({
        filename,
        contentType: mimeType,
        folder: 'checklist',
      });
      await uploadFileToPresignedUrl(asset.uri, uploadUrl, mimeType);
      await attachChecklistPhoto(id, fileKey);
      await refreshHousehold();
      toast.success('Photo attached');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Could not attach photo');
    }
  };

  const openPhoto = async (url?: string) => {
    if (!url) {
      toast.error('No photo attached');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <FeatureShell
      title="Move-in Checklist"
      subtitle="Document your unit's condition before you move in."
      icon="checkbox"
      iconColor="#EC4899"
      iconBg="rgba(236,72,153,.1)"
      onBack={onBack}
    >
      {seeding ? <ActivityIndicator color={theme.colors.primary} style={{ margin: 16 }} /> : null}
      {total > 0 ? (
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{done} of {total} items complete</Text>
          <FHTag label={`${pct}%`} variant={pct >= 100 ? 'green' : 'amber'} />
        </View>
      ) : null}
      {rooms.map((room) => {
        const items = checklistItems.filter((i) => i.room === room);
        const roomDone = items.every((i) => i.completed);
        return (
          <RoomCard key={room} title={room} tag={roomDone ? 'Done' : 'In progress'} tagVariant={roomDone ? 'green' : 'amber'}>
            {items.map((item, idx) => (
              <View key={item.id}>
                <Pressable onPress={() => toggleItem(item.id, item.completed)}>
                  <CheckRow done={item.completed} title={item.task} sub={item.completed ? 'Completed' : 'Tap to mark done'} last={false} />
                </Pressable>
                <View style={styles.checklistActions}>
                  <Pressable onPress={() => attachPhoto(item.id)} style={styles.checklistActionBtn}>
                    <Text style={styles.checklistActionText}>{item.hasPhoto ? 'Retake photo' : 'Add photo'}</Text>
                  </Pressable>
                  {item.hasPhoto ? (
                    <Pressable onPress={() => openPhoto(item.photoUrl)} style={styles.checklistActionBtn}>
                      <Text style={styles.checklistActionText}>View photo</Text>
                    </Pressable>
                  ) : null}
                </View>
                {idx === items.length - 1 ? <View style={{ height: 4 }} /> : null}
              </View>
            ))}
          </RoomCard>
        );
      })}
      <FHCta label="AI checklist guidance" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Guide me through a move-in inspection checklist for renters.')} />
    </FeatureShell>
  );
}

function PackageScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { packages, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const expected = packages.filter((p) => p.status === 'expected');
  const received = packages.filter((p) => p.status === 'delivered');
  const missing = packages.filter((p) => p.status === 'missing');

  const handlePackagePress = (id: string, title: string, status: string) => {
    if (status === 'delivered') return;
    Alert.alert(title, 'Update delivery status', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark received',
        onPress: async () => {
          await updatePackage(id, { status: 'delivered' });
          await refreshHousehold();
        },
      },
      {
        text: 'Report missing',
        style: 'destructive',
        onPress: async () => {
          await updatePackage(id, { status: 'missing' });
          await refreshHousehold();
        },
      },
    ]);
  };

  return (
    <FeatureShell
      title="Package Tracker"
      subtitle="Log deliveries, mark received, and flag missing packages to your landlord."
      icon="cube"
      iconColor="#F59E0B"
      iconBg="rgba(245,158,11,.12)"
      onBack={onBack}
      headerExtra={
        <View style={styles.pkgStats}>
          <MiniStat value={String(expected.length)} label="Expected" color="#F59E0B" />
          <MiniStat value={String(received.length)} label="Received" color="#14B8A6" />
          <MiniStat value={String(missing.length)} label="Missing" color="#EF4444" />
        </View>
      }
    >
      {showAdd ? (
        <QuickAddForm
          title="Add package"
          fields={[
            { key: 'title', label: 'Description', placeholder: 'Amazon order #4921' },
            { key: 'carrier', label: 'Carrier', placeholder: 'UPS' },
            { key: 'trackingNumber', label: 'Tracking #', placeholder: 'Optional' },
            { key: 'eta', label: 'ETA', placeholder: 'May 27' },
          ]}
          submitLabel="Track package"
          onSubmit={async (v) => {
            if (!v.title?.trim()) throw new Error('Description is required');
            await addPackage({
              title: v.title.trim(),
              carrier: v.carrier?.trim() || '',
              trackingNumber: v.trackingNumber?.trim() || '',
              eta: v.eta?.trim() || '',
              status: 'expected',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Active deliveries">
        {expected.length === 0 && missing.length === 0 ? (
          <Text style={styles.emptyHint}>No active deliveries. Add a tracking number to get started.</Text>
        ) : null}
        {expected.map((p) => (
          <Pressable key={p.id} onPress={() => handlePackagePress(p.id, p.title, p.status)}>
            <FHRowItem icon="cube" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title={p.title} subtitle={[p.eta, p.carrier].filter(Boolean).join(' · ') || 'On the way'} right={<FHTag label="Expected" variant="amber" />} />
          </Pressable>
        ))}
        {missing.map((p) => (
          <Pressable key={p.id} onPress={() => handlePackagePress(p.id, p.title, p.status)}>
            <FHRowItem icon="cube-outline" iconColor="#EF4444" iconBg="rgba(239,68,68,.1)" title={p.title} subtitle={p.carrier || 'Marked missing'} right={<FHTag label="Missing" variant="red" />} />
          </Pressable>
        ))}
      </FHCard>
      <FHCard title="Recently received">
        {received.length === 0 ? (
          <Text style={styles.emptyHint}>Received packages will appear here.</Text>
        ) : (
          received.map((p) => (
            <FHRowItem key={p.id} icon="checkmark-circle" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title={p.title} subtitle={p.carrier || 'Delivered'} />
          ))
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Add tracking number'} icon={showAdd ? 'close' : 'add'} onPress={() => setShowAdd((s) => !s)} />
      {missing.length > 0 ? (
        <Pressable style={styles.dangerOutline} onPress={() => askAi(router, 'Help me draft a message to my landlord about a missing package.')}>
          <Ionicons name="warning" size={17} color="#EF4444" />
          <Text style={styles.dangerOutlineText}>Report missing to landlord</Text>
        </Pressable>
      ) : null}
    </FeatureShell>
  );
}

function LeaseRenewalScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { documents, expenses } = useHousehold();
  const { userProfile } = useAuth();
  const leaseDoc = documents.find((d) => d.category === 'lease');
  const rent = expenses.find((e) => e.category === 'rent');
  const [marketLine, setMarketLine] = useState<string | null>(null);
  const zip = (userProfile?.address as { zipCode?: string } | undefined)?.zipCode;

  useEffect(() => {
    if (!zip) return;
    fetchRentMarket(zip).then((r) => {
      if (r.rentMarket?.available && r.rentMarket.recommendation) setMarketLine(r.rentMarket.recommendation);
    }).catch(() => undefined);
  }, [zip]);

  return (
    <FeatureShell
      title="Lease Renewal AI"
      subtitle="Prepare for renewal using your saved lease and rent data."
      icon="document-text"
      onBack={onBack}
    >
      {marketLine ? (
        <FHCard title="Local rent trend">
          <Text style={styles.emptyHint}>{marketLine}</Text>
        </FHCard>
      ) : null}
      <FHCard title="Your lease details">
        {leaseDoc || rent ? (
          <>
            {leaseDoc ? (
              <FHRowItem icon="calendar" iconColor="#A78BFA" iconBg="transparent" title={leaseDoc.title} subtitle={leaseDoc.expiresAt ? `Expires ${leaseDoc.expiresAt.slice(0, 10)}` : 'Saved in Document Vault'} />
            ) : null}
            {rent ? (
              <FHRowItem icon="receipt" iconColor="#F59E0B" iconBg="transparent" title={`$${rent.amount.toFixed(0)} / month`} subtitle={rent.paid ? 'Currently paid' : 'Current rent — unpaid'} />
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyHint}>Add your lease in Document Vault and rent in Rent Split to unlock renewal prep.</Text>
        )}
      </FHCard>
      <FHCta label="AI full renewal strategy" icon="sparkles" variant="ai" onPress={() => askAi(router, leaseDoc || rent ? `Help me negotiate my lease renewal. Lease: ${leaseDoc?.title || 'unknown'}. Rent: ${rent ? `$${rent.amount}` : 'unknown'}.` : 'How should I prepare for a lease renewal as a renter?')} />
    </FeatureShell>
  );
}

function CommunityScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { communityPosts, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <FeatureShell
      title="Community Board"
      subtitle="Your household notes and neighborhood posts."
      icon="chatbubbles"
      onBack={onBack}
    >
      {showAdd ? (
        <QuickAddForm
          title="New post"
          successMessage="Post shared"
          fields={[
            { key: 'body', label: 'Message', placeholder: 'Block party, recommendation, lost item…' },
            { key: 'category', label: 'Category', placeholder: 'event, recommendation, general' },
          ]}
          submitLabel="Post"
          onSubmit={async (v) => {
            if (!v.body?.trim()) throw new Error('Message is required');
            await addCommunityPost(v.body.trim(), v.category?.trim() || 'general');
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Posts">
        {communityPosts.length === 0 ? (
          <Text style={styles.emptyHint}>No posts yet. Share events, recommendations, or notes for your household.</Text>
        ) : (
          communityPosts.map((p) => (
            <View key={p.id} style={styles.postSimple}>
              <Text style={styles.postAuthor}>{p.authorName}</Text>
              <Text style={styles.postBody}>{p.body}</Text>
              {p.category ? <FHTag label={p.category} variant="violet" /> : null}
            </View>
          ))
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Create post'} icon={showAdd ? 'close' : 'add'} onPress={() => setShowAdd((s) => !s)} />
      <FHCta label="AI — neighborhood ideas" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Suggest ways to connect with neighbors as a renter.')} />
    </FeatureShell>
  );
}

function DocumentSignScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { documents } = useHousehold();
  const pending = documents.filter((d) => d.category === 'lease' || d.notes?.toLowerCase().includes('sign'));

  return (
    <FeatureShell
      title="Sign Document"
      subtitle="E-signing connects to documents in your vault."
      icon="create"
      iconColor="#14B8A6"
      iconBg="rgba(20,184,166,.12)"
      onBack={onBack}
    >
      <FHCard title="Documents awaiting review">
        {pending.length === 0 ? (
          <Text style={styles.emptyHint}>No documents ready to sign. Add leases in Document Vault — full e-sign coming soon.</Text>
        ) : (
          pending.map((d) => (
            <FHRowItem key={d.id} icon="document-text" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title={d.title} subtitle={d.fileType || d.category} right={<FHTag label="Review" variant="amber" />} />
          ))
        )}
      </FHCard>
      <FHCta label="AI — review my lease" icon="sparkles" variant="ai" onPress={() => askAi(router, pending.length ? `Review these documents for red flags: ${pending.map((d) => d.title).join(', ')}` : 'What should I look for when signing a lease?')} />
    </FeatureShell>
  );
}

function NeighborhoodScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { userProfile } = useAuth();
  const location = [userProfile?.city, userProfile?.state].filter(Boolean).join(', ') || userProfile?.address || 'Your area';

  return (
    <FeatureShell
      title="Neighborhood"
      subtitle={`Explore services near ${location}`}
      icon="location"
      onBack={onBack}
    >
      <Text style={styles.emptyHint}>Walk scores and school ratings require a third-party data provider. Use Maps and AI to explore your neighborhood now.</Text>
      <FHCta label="Explore neighborhood on Maps" icon="map" onPress={() => router.push('/(main)/(tabs)/maps')} />
      <FHCta label="AI neighborhood insights" icon="sparkles" variant="ai" onPress={() => askAi(router, `Tell me about living in ${location} — safety, transit, schools, and amenities.`)} />
    </FeatureShell>
  );
}

function PurchaseReadinessScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const [data, setData] = useState<Awaited<ReturnType<typeof fetchPurchaseReadiness>>['purchaseReadiness'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseReadiness()
      .then((r) => setData(r.purchaseReadiness))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <FeatureShell title="Home Purchase Readiness" subtitle="Composite score from credit, savings, income, DTI, and rent history." icon="home" iconColor="#14B8A6" iconBg="rgba(20,184,166,.12)" onBack={onBack}>
      {loading ? (
        <ActivityIndicator color="#14B8A6" style={{ marginVertical: 24 }} />
      ) : data ? (
        <>
          <FHCard title={`${Math.round(data.score)}/100 — ${data.band}`}>
            <Text style={styles.emptyHint}>{data.message}</Text>
            <Text style={[styles.emptyHint, { marginTop: 8, color: '#14B8A6' }]}>{data.recommendation}</Text>
          </FHCard>
          <FHCard title="Factor breakdown">
            {data.factors.map((f) => (
              <FHRowItem
                key={f.key}
                icon="analytics"
                iconColor="#A78BFA"
                iconBg="rgba(124,58,237,.12)"
                title={f.label}
                subtitle={`${f.detail} · Weight ${f.weightPct}%`}
                right={<FHTag label={`${f.score}`} variant={f.score >= 70 ? 'green' : f.score >= 50 ? 'amber' : 'red'} />}
              />
            ))}
          </FHCard>
        </>
      ) : (
        <Text style={styles.emptyHint}>Add budget goals, income, and rent history to generate your readiness score.</Text>
      )}
    </FeatureShell>
  );
}

function HouseSearchScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { userProfile } = useAuth();
  const { rentAffordability } = useHousehold();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [affordFilterOn, setAffordFilterOn] = useState(true);
  const [tab, setTab] = useState<'search' | 'market'>('search');
  const [rentMarket, setRentMarket] = useState<Awaited<ReturnType<typeof fetchRentMarket>>['rentMarket'] | null>(null);
  const autoSearchDone = useRef(false);
  const maxRent = rentAffordability?.recommendedMax ?? null;
  const userZip = formatUserZip(userProfile?.address);

  useEffect(() => {
    const nextQuery = formatUserSearchQuery(userProfile?.address, userProfile?.city);
    if (nextQuery) setQuery(nextQuery);
  }, [userProfile]);

  useEffect(() => {
    if (tab !== 'market' || !userZip) return;
    fetchRentMarket(userZip).then((r) => setRentMarket(r.rentMarket)).catch(() => setRentMarket(null));
  }, [tab, userZip]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
      const filters: { maxRent?: number } = {};
      if (affordFilterOn && maxRent) filters.maxRent = maxRent;
      const res = await searchProperties(query.trim(), lat, lng, filters);
      setProperties(res.properties || []);
      setMessage(res.message || (res.properties?.length ? null : 'No listings found for this search.'));
    } catch (e) {
      setMessage((e as Error).message);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoSearchDone.current || tab !== 'search') return;
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    autoSearchDone.current = true;
    runSearch();
  }, [query, tab]);

  return (
    <FeatureShell
      title="House Search"
      subtitle="Live property search via real estate APIs."
      icon="search"
      onBack={onBack}
      headerExtra={
        <View style={styles.memberPickerRow}>
          {(['search', 'market'] as const).map((t) => (
            <Pressable key={t} style={[styles.memberChip, tab === t && styles.memberChipActive]} onPress={() => setTab(t)}>
              <Text style={[styles.memberChipText, tab === t && styles.memberChipTextActive]}>{t === 'search' ? 'Search' : 'Market'}</Text>
            </Pressable>
          ))}
        </View>
      }
    >
      {tab === 'market' ? (
        <FHCard title="Rent trend forecast">
          {!userZip ? (
            <Text style={styles.emptyHint}>Add your ZIP code in Profile to see local rent predictions.</Text>
          ) : rentMarket?.available ? (
            <>
              <FHRowItem icon="trending-up" iconColor="#F59E0B" iconBg="rgba(245,158,11,.12)" title={`ZIP ${rentMarket.zipCode}`} subtitle={rentMarket.message || ''} />
              <Text style={[styles.emptyHint, { marginTop: 8 }]}>{rentMarket.recommendation}</Text>
            </>
          ) : (
            <Text style={styles.emptyHint}>{rentMarket?.message || 'Loading market data…'}</Text>
          )}
        </FHCard>
      ) : (
        <>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#A78BFA" />
        <TextInput
          style={styles.searchInput}
          placeholder="City, ZIP, or address"
          placeholderTextColor="#6D5FA8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={runSearch}
          returnKeyType="search"
        />
        <Pressable onPress={runSearch} hitSlop={8}>
          {loading ? <ActivityIndicator size="small" color="#A78BFA" /> : <Ionicons name="arrow-forward-circle" size={22} color="#A78BFA" />}
        </Pressable>
      </View>
      {maxRent ? (
        <Pressable style={styles.affordRow} onPress={() => setAffordFilterOn((v) => !v)}>
          <Ionicons name={affordFilterOn ? 'checkbox' : 'square-outline'} size={18} color="#14B8A6" />
          <Text style={styles.affordText}>
            Affordability filter on — max ${maxRent.toLocaleString()}/mo ({rentAffordability?.limitingMethod})
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.emptyHint}>Set income in Budget to enable affordability filtering.</Text>
      )}
      <Text style={styles.resultsCount}>{properties.length} results</Text>
      {message ? <Text style={styles.emptyHint}>{message}</Text> : null}
      {properties.map((p, i) => {
        const price = p.price ?? p.rent ?? p.listPrice;
        const address = p.address ?? p.formattedAddress ?? p.streetAddress ?? 'Address unavailable';
        const beds = p.beds ?? p.bedrooms;
        const baths = p.baths ?? p.bathrooms;
        return (
          <View key={String(p.id || i)} style={styles.listingCard}>
            <View style={styles.listingBody}>
              <Text style={styles.listingPrice}>{price != null ? `$${String(price)}` : 'Price on request'}</Text>
              <Text style={styles.listingAddr}>{String(address)}</Text>
              <View style={styles.listingMeta}>
                {beds != null ? <Text style={styles.metaItem}>{String(beds)} bed</Text> : null}
                {baths != null ? <Text style={styles.metaItem}>{String(baths)} bath</Text> : null}
              </View>
            </View>
          </View>
        );
      })}
      {properties[0] ? (
        <FHCta label="AI — analyze top listing" icon="sparkles" variant="ai" onPress={() => askAi(router, `Analyze this property for my family: ${JSON.stringify(properties[0])}`)} />
      ) : null}
        </>
      )}
    </FeatureShell>
  );
}

function OwnerPortalScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const { expenses, maintenance, members } = useHousehold();
  const { userProfile } = useAuth();
  const isOwner = userProfile?.userType === 'owner' || userProfile?.role === 'owner';
  const rentExpenses = expenses.filter((e) => e.category === 'rent');
  const collected = rentExpenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
  const outstanding = rentExpenses.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0);
  const paidCount = rentExpenses.filter((e) => e.paid).length;
  const totalCount = rentExpenses.length;
  const openMaint = maintenance.filter((m) => m.status !== 'completed');
  const pct = totalCount ? Math.round((paidCount / totalCount) * 100) : 0;

  return (
    <FeatureShell
      title="Owner Portal"
      subtitle="Manage properties, tenants, and rent collection."
      icon="business"
      iconColor="#14B8A6"
      iconBg="rgba(20,184,166,.12)"
      onBack={onBack}
      headerExtra={
        <FHStatGrid items={[
          { label: 'Rent collected', value: totalCount ? `$${collected.toFixed(0)}` : '—', color: '#14B8A6' },
          { label: 'Outstanding', value: outstanding ? `$${outstanding.toFixed(0)}` : '—', color: '#EF4444' },
        ]} />
      }
    >
      {!isOwner ? (
        <Text style={styles.emptyHint}>Switch your profile to owner in settings to use landlord tools. You can still track rent and maintenance here.</Text>
      ) : null}
      <FHCard title="Rent collection">
        {rentExpenses.length === 0 ? (
          <Text style={styles.emptyHint}>No rent records yet. Tenants can add bills in Rent Split.</Text>
        ) : (
          <View style={styles.collection}>
            <View style={styles.collectionRow}>
              <Text style={styles.collectionLbl}>Collected</Text>
              <Text style={styles.collectionVal}>${collected.toFixed(0)}</Text>
            </View>
            <FHProgress pct={pct} color="#14B8A6" />
            <Text style={styles.collectionHint}>
              {paidCount} of {totalCount} paid
              {outstanding > 0 ? ` · $${outstanding.toFixed(0)} outstanding` : ''}
            </Text>
          </View>
        )}
      </FHCard>
      <FHCard title="Household members">
        {members.length === 0 ? (
          <Text style={styles.emptyHint}>No household members linked yet.</Text>
        ) : (
          members.map((m) => (
            <FHRowItem key={m.id} icon="person" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title={m.name} subtitle={m.role} />
          ))
        )}
      </FHCard>
      <FHCard title="Pending actions">
        {openMaint.length === 0 && rentExpenses.filter((e) => !e.paid).length === 0 ? (
          <Text style={styles.emptyHint}>No pending maintenance or overdue rent.</Text>
        ) : null}
        {openMaint.map((m) => (
          <FHRowItem key={m.id} icon="construct" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title={m.title} subtitle={m.location || 'Maintenance'} right={<FHTag label={m.priority === 'urgent' ? 'Urgent' : 'Open'} variant={m.priority === 'urgent' ? 'red' : 'amber'} />} />
        ))}
        {rentExpenses.filter((e) => !e.paid).map((e) => (
          <FHRowItem key={e.id} icon="receipt" iconColor="#EF4444" iconBg="rgba(239,68,68,.1)" title={`Overdue: ${e.title}`} subtitle={`$${e.amount.toFixed(0)}`} right={<FHTag label="Overdue" variant="red" />} />
        ))}
      </FHCard>
    </FeatureShell>
  );
}

function MaintenanceRatingScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { maintenance, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const active = maintenance.filter((m) => m.status !== 'completed');
  const completed = maintenance.filter((m) => m.status === 'completed');
  const rated = completed.filter((m) => m.rating);
  const avgRating = rated.length
    ? (rated.reduce((s, m) => s + (m.rating || 0), 0) / rated.length).toFixed(1)
    : '—';

  const statusTag = (status: string) => {
    if (status === 'completed') return { label: 'Done', variant: 'green' as const };
    if (status === 'scheduled') return { label: 'Scheduled', variant: 'violet' as const };
    if (status === 'in_progress') return { label: 'In progress', variant: 'amber' as const };
    return { label: 'Open', variant: 'amber' as const };
  };

  const rateRequest = async (id: string, rating: number) => {
    await updateMaintenanceRequest(id, { rating, status: 'completed' });
    await refreshHousehold();
  };

  const resolveRequest = (id: string, title: string) => {
    Alert.alert(title, 'Mark this repair as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark resolved',
        onPress: async () => {
          await updateMaintenanceRequest(id, { status: 'completed' });
          await refreshHousehold();
        },
      },
    ]);
  };

  return (
    <FeatureShell
      title="Maintenance"
      subtitle="Report issues, track repairs, and rate your landlord's response."
      icon="construct"
      iconColor="#F59E0B"
      iconBg="rgba(245,158,11,.1)"
      onBack={onBack}
      headerExtra={
        <FHStatGrid items={[
          { label: 'Open requests', value: String(active.length), color: '#F59E0B', hint: 'Active' },
          { label: 'Avg rating', value: avgRating, color: '#14B8A6', hint: rated.length ? `${rated.length} rated` : 'No ratings yet' },
        ]} />
      }
    >
      {showAdd ? (
        <QuickAddForm
          title="Submit maintenance request"
          fields={[
            { key: 'title', label: 'Issue', placeholder: 'Leaky kitchen faucet' },
            { key: 'location', label: 'Location', placeholder: 'Unit 2B · Kitchen' },
            { key: 'description', label: 'Details', placeholder: 'Optional description' },
          ]}
          submitLabel="Submit request"
          onSubmit={async (v) => {
            if (!v.title?.trim()) throw new Error('Issue title is required');
            await addMaintenanceRequest({
              title: v.title.trim(),
              location: v.location?.trim() || '',
              description: v.description?.trim() || '',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Active requests">
        {active.length === 0 ? (
          <Text style={styles.emptyHint}>No open requests. Submit one when something needs fixing.</Text>
        ) : (
          active.map((m) => {
            const tag = statusTag(m.status);
            return (
              <Pressable key={m.id} onPress={() => resolveRequest(m.id, m.title)}>
                <FHRowItem icon="construct" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title={m.title} subtitle={[m.location, m.createdAt?.slice(0, 10)].filter(Boolean).join(' · ') || 'Submitted'} right={<FHTag label={tag.label} variant={tag.variant} />} />
              </Pressable>
            );
          })
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Submit new request'} icon={showAdd ? 'close' : 'add'} color="#F59E0B" onPress={() => setShowAdd((s) => !s)} />
      <FHCard title="Rate completed repairs">
        {completed.length === 0 ? (
          <Text style={styles.emptyHint}>Completed repairs you rate will appear here.</Text>
        ) : (
          completed.map((m) => (
            <View key={m.id} style={[styles.ratingRow, styles.ratingBorder]}>
              <View style={styles.ratingLeft}>
                <Text style={styles.ratingTitle}>{m.title}</Text>
                <Text style={styles.ratingSub}>{m.location || 'Home'}</Text>
              </View>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => rateRequest(m.id, s)}>
                    <Ionicons name={s <= (m.rating || 0) ? 'star' : 'star-outline'} size={16} color="#F59E0B" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </FHCard>
      <FHCta label="AI — draft maintenance request" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Help me write a maintenance request for my landlord.')} />
    </FeatureShell>
  );
}

function HealthScreen({ onBack }: { onBack: () => void }) {
  const styles = useAppStyles(createStyles);

  const router = useRouter();
  const { refreshHousehold } = useHousehold();
  const [members, setMembers] = useState<HealthMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [timeline, setTimeline] = useState<HealthTimelineItem[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (memberId?: string) => {
    setLoading(true);
    try {
      const [tl, meds] = await Promise.all([
        fetchHealthTimeline(memberId),
        fetchHealthMedications(memberId),
      ]);
      setMembers(tl.members);
      if (!memberId && tl.members.length && !selectedMemberId) {
        setSelectedMemberId(tl.members[0].userId);
      }
      setTimeline(tl.timeline);
      setMedications(meds.medications);
      const child = tl.members.find((m) => m.role === 'family' && m.dateOfBirth);
      if (child) {
        try {
          const vax = await fetchVaccinationSchedule(child.userId);
          setVaccinations(vax.schedule.filter((v) => v.status !== 'upcoming').slice(0, 12));
        } catch {
          setVaccinations([]);
        }
      } else {
        setVaccinations([]);
      }
    } catch {
      setMembers([]);
      setTimeline([]);
      setMedications([]);
      setVaccinations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(selectedMemberId || undefined);
  }, [selectedMemberId]);

  const onMarkDose = async (medId: string) => {
    await markMedicationDose(medId, 'taken');
    await load(selectedMemberId || undefined);
    await refreshHousehold();
  };

  return (
    <FeatureShell
      title="Family Health"
      subtitle="Timeline, gaps, medications, and vaccinations."
      icon="heart"
      iconColor="#EC4899"
      iconBg="rgba(236,72,153,.1)"
      onBack={onBack}
    >
      {members.length > 1 ? (
        <FHCard title="Household member">
          <View style={styles.memberPickerRow}>
            {members.map((m) => (
              <Pressable
                key={m.userId}
                style={[styles.memberChip, selectedMemberId === m.userId && styles.memberChipActive]}
                onPress={() => setSelectedMemberId(m.userId)}
              >
                <Text style={[styles.memberChipText, selectedMemberId === m.userId && styles.memberChipTextActive]}>
                  {m.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
        </FHCard>
      ) : null}

      {loading ? (
        <ActivityIndicator color="#EC4899" style={{ marginVertical: 24 }} />
      ) : (
        <>
          <FHCard title="Health timeline">
            {timeline.length === 0 ? (
              <Text style={styles.emptyHint}>No health records yet.</Text>
            ) : (
              timeline.map((item) =>
                item.kind === 'gap' ? (
                  <FHRowItem
                    key={item.id}
                    icon="warning"
                    iconColor="#F59E0B"
                    iconBg="rgba(245,158,11,.12)"
                    title={item.title}
                    subtitle={item.message || 'Overdue check-up'}
                    right={<FHTag label="Gap" variant="amber" />}
                  />
                ) : (
                  <FHRowItem
                    key={item.id}
                    icon="medkit"
                    iconColor="#EC4899"
                    iconBg="rgba(236,72,153,.1)"
                    title={item.title}
                    subtitle={[item.memberName, item.date?.slice(0, 10)].filter(Boolean).join(' · ')}
                  />
                ),
              )
            )}
          </FHCard>

          {medications.length > 0 ? (
            <FHCard title="Medications">
              {medications.map((m) => (
                <View key={m.id} style={styles.medBlock}>
                  <FHRowItem
                    icon="medical"
                    iconColor="#14B8A6"
                    iconBg="rgba(20,184,166,.1)"
                    title={m.name}
                    subtitle={`${m.dosage} · ${m.frequency} · ${m.adherenceRate}% adherence`}
                    right={m.streakDays > 0 ? <FHTag label={`${m.streakDays}-day streak`} variant="green" /> : undefined}
                  />
                  <Text style={styles.medMeta}>Smart reminders: {m.smartReminderTimes.join(', ')}</Text>
                  <Pressable style={styles.doseBtn} onPress={() => onMarkDose(m.id)}>
                    <Text style={styles.doseBtnText}>Mark dose taken</Text>
                  </Pressable>
                </View>
              ))}
            </FHCard>
          ) : null}

          {vaccinations.length > 0 ? (
            <FHCard title="Child vaccination schedule">
              {vaccinations.map((v) => (
                <FHRowItem
                  key={`${v.vaccine}-${v.dose}`}
                  icon={v.status === 'received' ? 'checkmark-circle' : 'alert-circle'}
                  iconColor={v.status === 'received' ? '#14B8A6' : v.status === 'overdue' ? '#EF4444' : '#F59E0B'}
                  iconBg={v.status === 'received' ? 'rgba(20,184,166,.1)' : 'rgba(245,158,11,.12)'}
                  title={`${v.vaccine} (${v.dose})`}
                  subtitle={`Due ${v.dueDate}${v.receivedDate ? ` · Received ${v.receivedDate}` : ''}`}
                  right={
                    <FHTag
                      label={v.status === 'received' ? 'Done' : v.status === 'overdue' ? 'Overdue' : 'Due soon'}
                      variant={v.status === 'received' ? 'green' : v.status === 'overdue' ? 'red' : 'amber'}
                    />
                  }
                />
              ))}
            </FHCard>
          ) : null}
        </>
      )}

      <FHCard title="Emergency resources">
        <Pressable onPress={() => Linking.openURL('tel:911')}>
          <FHRowItem icon="call" iconColor="#EF4444" iconBg="rgba(239,68,68,.1)" title="911 — Emergency" subtitle="Police, fire, ambulance" />
        </Pressable>
        <Pressable onPress={() => Linking.openURL('tel:18002221222')}>
          <FHRowItem icon="call" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title="Poison Control" subtitle="1-800-222-1222" />
        </Pressable>
      </FHCard>
      <FHCta label="Find hospitals on Maps" icon="map" onPress={() => router.push('/(main)/(tabs)/maps')} />
    </FeatureShell>
  );
}

function ResourcesScreen({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  return (
    <FeatureShell
      title="Community Resources"
      subtitle="National housing and family support — find local offices on Maps."
      icon="heart-circle"
      iconColor="#14B8A6"
      iconBg="rgba(20,184,166,.12)"
      onBack={onBack}
    >
      <FHCard title="Housing assistance">
        <FHRowItem icon="home" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title="211 Helpline" subtitle="Dial 211 for local rent & utility assistance" right={<FHTag label="Free" variant="green" />} />
        <FHRowItem icon="document-text" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title="HUD resources" subtitle="hud.gov — tenant rights & housing programs" />
      </FHCard>
      <FHCard title="Food & essentials">
        <FHRowItem icon="restaurant" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title="Feeding America" subtitle="feedingamerica.org — find food banks near you" />
        <FHRowItem icon="cart" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title="SNAP info" subtitle="fns.usda.gov/snap — benefits enrollment" />
      </FHCard>
      <FHCard title="Utilities">
        <FHRowItem icon="flash" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title="LIHEAP" subtitle="Home energy bill assistance — search on Maps for local office" />
      </FHCard>
      <FHCta label="Find resources on Maps" icon="map" onPress={() => router.push('/(main)/(tabs)/maps')} />
      <FHCta label="AI — resources for my situation" icon="sparkles" variant="ai" onPress={() => askAi(router, 'What community resources help families with housing in my area?')} />
    </FeatureShell>
  );
}

function RoomCard({ title, tag, tagVariant, children }: {
  title: string; tag: string; tagVariant: 'green' | 'amber' | 'violet' | 'red';
  children: ReactNode;
}) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={styles.roomCard}>
      <View style={styles.roomHdr}>
        <Text style={styles.roomHdrText}>{title}</Text>
        <FHTag label={tag} variant={tagVariant} />
      </View>
      {children}
    </View>
  );
}

// Helpers
function Toggle({ on }: { on: boolean }) {
  const styles = useAppStyles(createStyles);

  return <View style={[styles.toggle, on && styles.toggleOn]}><View style={[styles.toggleKnob, on && styles.toggleKnobOn]} /></View>;
}

function UtilBox({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.utilBox, { borderColor: `${color}33` }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.utilVal, { color }]}>{value}</Text>
      <Text style={styles.utilLbl}>{label}</Text>
    </View>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.miniStat, { borderColor: `${color}33` }]}>
      <Text style={[styles.miniStatVal, { color }]}>{value}</Text>
      <Text style={styles.miniStatLbl}>{label}</Text>
    </View>
  );
}

function CheckRow({ done, title, sub, camera, pending, last }: { done?: boolean; title: string; sub: string; camera?: boolean; pending?: boolean; last?: boolean }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.checkRow, !last && styles.checkBorder]}>
      <View style={[styles.checkBox, done && styles.checkDone, !done && styles.checkEmpty]} />
      <View style={styles.checkBody}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkSub}>{sub}</Text>
      </View>
      {camera ? (
        <View style={[styles.camBtn, pending && { backgroundColor: 'rgba(124,58,237,.18)' }]}>
          <Ionicons name={pending ? 'camera' : 'camera-outline'} size={14} color={pending ? '#A78BFA' : '#6D5FA8'} />
        </View>
      ) : null}
    </View>
  );
}

function MarketCol({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={styles.marketCol}>
      <Text style={styles.marketLbl}>{label}</Text>
      <Text style={[styles.marketVal, { color }]}>{value}</Text>
    </View>
  );
}

function TalkingPoint({ color, title, text }: { color: string; title: string; text: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.talkingPoint, { borderLeftColor: color }]}>
      <Text style={styles.tpTitle}>{title}</Text>
      <Text style={styles.tpText}>{text}</Text>
    </View>
  );
}

function PostCard({ initials, name, time, tag, tagVariant, borderColor, body, likes, replies }: {
  initials: string; name: string; time: string; tag: string; tagVariant: 'amber' | 'red' | 'violet';
  borderColor: string; body: string; likes: number; replies: number;
}) {
  const styles = useAppStyles(createStyles);

  const avatarColor = tagVariant === 'red' ? '#EF4444' : tagVariant === 'amber' ? '#F59E0B' : '#A78BFA';
  return (
    <View style={[styles.post, { borderColor }]}>
      <View style={styles.postHeader}>
        <View style={[styles.postAvatar, { backgroundColor: `${avatarColor}22` }]}>
          <Text style={[styles.postInitials, { color: avatarColor }]}>{initials}</Text>
        </View>
        <View style={styles.postMeta}>
          <Text style={styles.postName}>{name}</Text>
          <Text style={styles.postTime}>{time}</Text>
        </View>
        <FHTag label={tag} variant={tagVariant} />
      </View>
      <Text style={styles.postBody}>{body}</Text>
      <View style={styles.postStats}>
        <Text style={styles.postStat}>❤️ {likes} likes</Text>
        <Text style={styles.postStat}>💬 {replies} replies</Text>
      </View>
    </View>
  );
}

function ChecklistItem({ done, text, muted }: { done?: boolean; text: string; muted?: boolean }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={styles.checklistItem}>
      <View style={[styles.checkBox, done && styles.checkDone, !done && styles.checkEmpty]} />
      <Text style={[styles.checklistText, muted && { color: '#6D5FA8' }]}>{text}</Text>
    </View>
  );
}

function ScoreMini({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={[styles.scoreMini, { borderColor: `${color}33` }]}>
      <Text style={styles.scoreMiniLbl}>{label}</Text>
      <Text style={[styles.scoreMiniVal, { color }]}>{value}</Text>
    </View>
  );
}

const RICH_SCREENS: Record<string, (p: { onBack: () => void }) => ReactElement> = {
  rent: RentSplitScreen,
  'rent-split': RentSplitScreen,
  'credit-builder': CreditBuilderScreen,
  budget: FinancialGoalsScreen,
  'financial-goals': FinancialGoalsScreen,
  energy: EnergyScreen,
  'energy-utilities': EnergyScreen,
  'move-in-checklist': MoveInScreen,
  'move-in': MoveInScreen,
  packages: PackageScreen,
  'package-tracker': PackageScreen,
  'lease-renewal': LeaseRenewalScreen,
  'community-board': CommunityScreen,
  community: CommunityScreen,
  documents: DocumentSignScreen,
  'document-signing': DocumentSignScreen,
  neighborhood: NeighborhoodScreen,
  'neighborhood-insights': NeighborhoodScreen,
  'house-search': HouseSearchScreen,
  'purchase-readiness': PurchaseReadinessScreen,
  'home-readiness': PurchaseReadinessScreen,
  'owner-portal': OwnerPortalScreen,
  maintenance: MaintenanceRatingScreen,
  health: HealthScreen,
  resources: ResourcesScreen,
  ...HOUSEHOLD_OS_SCREENS,
};

export function FeatureRenderer({ slug, onBack }: Props) {
  const styles = useAppStyles(createStyles);
  const Screen = RICH_SCREENS[slug];
  if (Screen) return <Screen onBack={onBack} />;
  return <StubFeature slug={slug} onBack={onBack} />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  emptyHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, padding: 14, lineHeight: 21 },
  memberPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  memberChipActive: { backgroundColor: 'rgba(236,72,153,.15)', borderColor: '#EC4899' },
  memberChipText: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  memberChipTextActive: { color: '#EC4899', fontFamily: theme.fonts.bodyBold },
  medBlock: { marginBottom: 8 },
  medMeta: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, paddingHorizontal: 14, marginBottom: 8 },
  doseBtn: {
    marginHorizontal: 14,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(20,184,166,.12)',
    alignItems: 'center',
  },
  doseBtnText: { fontFamily: theme.fonts.bodyBold, fontSize: theme.fontSize.sm, color: '#14B8A6' },
  tipRow: { flexDirection: 'row', padding: 14, gap: 8 },
  bullet: { color: theme.colors.primaryLight, fontSize: 16 },
  tipText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  initials: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 14, fontWeight: '700' },
  memberBody: { flex: 1 },
  memberName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  youBadge: { fontSize: 10, backgroundColor: 'rgba(245,158,11,.12)', color: '#F59E0B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, fontWeight: '700' },
  memberSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  scoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(245,158,11,.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,.2)', borderRadius: 14, padding: 14 },
  scoreLbl: { ...theme.typography.overline, color: theme.colors.textSecondary, marginBottom: 4 },
  scoreVal: { fontSize: 32, fontWeight: '800', color: '#F59E0B' },
  scoreHint: { fontSize: 11, fontWeight: '700', color: '#14B8A6', marginTop: 2 },
  scoreGrade: { fontSize: 10, color: theme.colors.textSecondary },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 12 },
  monthCell: { flex: 1, minWidth: '14%', height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  monthEmpty: { flex: 1, minWidth: '14%', height: 28, borderRadius: 4, backgroundColor: '#160F35', borderWidth: 1, borderColor: theme.colors.borderLight },
  monthText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  monthSummary: { fontSize: 11, color: theme.colors.textSecondary, paddingHorizontal: 14, paddingBottom: 12 },
  goalRow: { padding: 14 },
  goalBorder: { borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  goalIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  goalSub: { fontSize: 10, color: theme.colors.textSecondary },
  goalSaved: { fontSize: 13, fontWeight: '700' },
  goalHint: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  utilGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  utilBox: { flex: 1, backgroundColor: 'rgba(20,184,166,.1)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  utilVal: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  utilLbl: { ...theme.typography.overline, color: theme.colors.textSecondary, marginTop: 2 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60, padding: 12 },
  bar: { flex: 1, borderRadius: 4 },
  barLabels: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  barLabel: { flex: 1, fontSize: 9, color: theme.colors.textMuted, textAlign: 'center' },
  insight: { backgroundColor: '#0C2820', borderRadius: 8, padding: 8, margin: 12, borderWidth: 1, borderColor: 'rgba(20,184,166,.18)' },
  insightBold: { fontSize: 11, color: '#14B8A6', fontWeight: '700' },
  insightMuted: { fontSize: 11, color: theme.colors.textSecondary },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tabPill: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 11, padding: 8, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(236,72,153,.18)', borderColor: '#EC4899' },
  tabActiveText: { fontSize: 11, fontWeight: '700', color: '#EC4899' },
  tabInactiveText: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  pkgStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  miniStat: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 11, alignItems: 'center', borderWidth: 1 },
  miniStatVal: { fontSize: 20, fontWeight: '700' },
  miniStatLbl: { ...theme.typography.overline, color: theme.colors.textSecondary, marginTop: 2 },
  dangerOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: 'rgba(239,68,68,.25)', borderRadius: 12, height: 42 },
  dangerOutlineText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  marketRow: { flexDirection: 'row', padding: 12, gap: 10 },
  marketCol: { flex: 1 },
  marketLbl: { fontSize: 10, color: theme.colors.textSecondary, marginBottom: 4 },
  marketVal: { fontSize: 16, fontWeight: '700' },
  talkingPoint: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, padding: 10, marginHorizontal: 14, marginBottom: 8, borderLeftWidth: 3 },
  tpTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  tpText: { fontSize: 11, color: theme.colors.textSecondary },
  chipRow: { flexDirection: 'row', gap: 7, marginTop: 12, flexWrap: 'wrap' },
  chip: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
  post: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  postAvatar: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  postInitials: { fontSize: 12, fontWeight: '700' },
  postMeta: { flex: 1 },
  postName: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  postTime: { fontSize: 10, color: theme.colors.textSecondary },
  postBody: { fontSize: 13, color: theme.colors.text, lineHeight: 20, marginBottom: 6 },
  postStats: { flexDirection: 'row', gap: 12 },
  postStat: { fontSize: 11, color: theme.colors.textSecondary },
  docBox: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 14, margin: 14, borderWidth: 1, borderColor: theme.colors.borderLight },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  docTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  docSub: { fontSize: 11, color: theme.colors.textSecondary },
  docTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  checklistActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  checklistActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  checklistActionText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  checklistText: { fontSize: 12, color: theme.colors.text },
  signPad: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderLight },
  signLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  signArea: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, height: 70, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  signPlaceholder: { fontSize: 28 },
  signActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signClear: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(239,68,68,.2)', borderRadius: 9, height: 34 },
  signClearText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  signOr: { fontSize: 11, color: theme.colors.textSecondary },
  signBio: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, height: 34 },
  signBioText: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, height: 44, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(124,58,237,.3)', marginBottom: 10 },
  searchText: { flex: 1, fontSize: 13, color: theme.colors.text },
  searchInput: { flex: 1, fontSize: 13, color: theme.colors.text, paddingVertical: 0 },
  postSimple: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight, gap: 6 },
  postAuthor: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  resultsCount: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 10 },
  listingCard: { backgroundColor: theme.colors.surface, borderRadius: 18, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderLight },
  listingImage: { height: 150, backgroundColor: '#131826', justifyContent: 'flex-end', padding: 10 },
  listingBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: theme.colors.primary, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  listingBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  listingTags: { flexDirection: 'row', gap: 5 },
  listingBody: { padding: 14 },
  listingPrice: { fontSize: 20, fontWeight: '800', color: '#A78BFA', marginBottom: 2 },
  listingPer: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  listingAddr: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10 },
  listingMeta: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  metaItem: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  listingScores: { flexDirection: 'row', gap: 6 },
  scoreMini: { flex: 1, padding: 8, borderRadius: 12, borderWidth: 1, backgroundColor: theme.colors.surface },
  scoreMiniLbl: { fontSize: 9, color: theme.colors.textSecondary, marginBottom: 2 },
  scoreMiniVal: { fontSize: 13, fontWeight: '700' },
  collection: { padding: 12 },
  collectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  collectionLbl: { fontSize: 12, color: theme.colors.textSecondary },
  collectionVal: { fontSize: 14, fontWeight: '700', color: '#14B8A6' },
  collectionHint: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  toggle: { width: 40, height: 22, borderRadius: 11, backgroundColor: 'rgba(167,139,250,.15)', justifyContent: 'center', padding: 3 },
  toggleOn: { backgroundColor: theme.colors.primary, alignItems: 'flex-end' },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.textMuted },
  toggleKnobOn: { backgroundColor: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  checkBorder: { borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  checkBox: { width: 22, height: 22, borderRadius: 6 },
  checkDone: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkEmpty: { borderWidth: 1.5, borderColor: theme.colors.border },
  checkBody: { flex: 1 },
  checkTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  checkSub: { fontSize: 11, color: theme.colors.textSecondary },
  camBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  roomCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 10,
    overflow: 'hidden',
  },
  roomHdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  roomHdrText: { ...theme.typography.overline, color: theme.colors.textMuted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  ratingBorder: { borderTopWidth: 0.5, borderTopColor: theme.colors.borderLight },
  ratingLeft: { flex: 1 },
  ratingTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  ratingSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  anomalyRow: { padding: 14, gap: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  anomalyText: { fontSize: 12, color: theme.colors.text, lineHeight: 18 },
  billRow: { padding: 14 },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  anomalyInline: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' },
  anomalyInlineText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 16 },
  markExpectedBtn: { marginTop: 8, alignSelf: 'flex-start' },
  markExpectedText: { fontSize: 11, color: theme.colors.primaryLight, fontWeight: '600' },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  tabChipActive: { backgroundColor: 'rgba(20,184,166,.15)', borderColor: 'rgba(20,184,166,.4)' },
  tabChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabChipTextActive: { color: '#14B8A6' },
  forecastSummary: { fontSize: 13, color: theme.colors.text, lineHeight: 20, padding: 14 },
  weekCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  weekCardTight: { borderColor: 'rgba(239,68,68,.35)', backgroundColor: 'rgba(239,68,68,.08)' },
  weekTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  weekEvent: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  affordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  affordText: { flex: 1, fontSize: 12, color: '#14B8A6' },
});
}
