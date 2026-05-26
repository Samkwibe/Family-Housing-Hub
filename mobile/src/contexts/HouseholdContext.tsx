import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchHouseholdDashboard,
  toggleChoreComplete,
  addShoppingListItem,
  type ChoreItem,
  type ExpenseItem,
  type MaintenanceItem,
  type PackageItem,
  type DocumentItem,
  type SmartDeviceItem,
  type CreditSummary,
  type FinancialGoal,
  type UtilitySummary,
  type ChecklistItem,
  type HealthReminder,
  type EmergencyProfile,
  type CommunityPost,
  type SpendingAnomaly,
  type ForecastSummary,
  type SavingsPlan,
  type SubscriptionWasteFlag,
  type RentAffordability,
  type DocumentRiskItem,
  type GeofenceEvent,
  type HealthGapSummary,
  type PurchaseReadiness,
  type MoveoutEstimate,
  type RentMarketPrediction,
} from '@/src/services/householdService';
import {
  cacheDashboardOffline,
  cacheEmergencyProfile,
  flushOfflineQueue,
  isOnline,
  loadDashboardOffline,
  loadEmergencyProfileOffline,
  subscribeNetworkStatus,
} from '@/src/services/offlineService';
import { connectRealtime } from '@/src/services/realtimeService';

const EMPTY_CREDIT: CreditSummary = {
  estimatedScore: null,
  grade: '—',
  onTimeCount: 0,
  missedCount: 0,
  monthsReported: 0,
  ytdChange: 0,
  monthlyPayments: [],
  bureaus: { experian: true, transunion: false, equifax: false },
};

const EMPTY_UTILITY: UtilitySummary = {
  electricAvg: 0,
  waterAvg: 0,
  gasAvg: 0,
  energySpikePct: 0,
  readings: [],
};

const EMPTY_EMERGENCY: EmergencyProfile = {
  contactName: '',
  contactPhone: '',
  addressNotes: '',
  medicalNotes: '',
};

export type HouseholdAlert = {
  id: string;
  type: 'food' | 'finance' | 'maintenance' | 'energy' | 'package' | 'chore' | 'ai' | 'spending';
  title: string;
  body: string;
  urgency: 'low' | 'medium' | 'high';
  actionSlug?: string;
  aiPrompt?: string;
};

export type HouseholdMember = {
  id: string;
  name: string;
  role: 'owner' | 'renter' | 'family';
  initials: string;
  color: string;
  rentShare?: number;
  rentPaid?: boolean;
};

export type FoodItem = {
  id: string;
  name: string;
  location: 'fridge' | 'freezer' | 'pantry';
  expiresInDays: number;
  quantity: string;
};

export type HouseholdSnapshot = {
  healthScore: number;
  expiringFood: number;
  billsDue: number;
  unpaidRoommates: number;
  pendingTasks: number;
  packagesExpected: number;
  energySpikePct: number;
  savingsGoalPct: number;
  totalDueAmount?: number;
};

const EMPTY_SNAPSHOT: HouseholdSnapshot = {
  healthScore: 100,
  expiringFood: 0,
  billsDue: 0,
  unpaidRoommates: 0,
  pendingTasks: 0,
  packagesExpected: 0,
  energySpikePct: 0,
  savingsGoalPct: 0,
  totalDueAmount: 0,
};

type HouseholdContextValue = {
  snapshot: HouseholdSnapshot;
  alerts: HouseholdAlert[];
  members: HouseholdMember[];
  foodItems: FoodItem[];
  chores: ChoreItem[];
  expenses: ExpenseItem[];
  maintenance: MaintenanceItem[];
  packages: PackageItem[];
  documents: DocumentItem[];
  smartDevices: SmartDeviceItem[];
  creditSummary: CreditSummary;
  financialGoals: FinancialGoal[];
  utilitySummary: UtilitySummary;
  checklistItems: ChecklistItem[];
  healthReminders: HealthReminder[];
  emergencyProfile: EmergencyProfile;
  communityPosts: CommunityPost[];
  aiRecommendations: string[];
  spendingAnomalies: SpendingAnomaly[];
  forecastSummary: ForecastSummary | null;
  cashFlowSummary: string;
  savingsPlan: SavingsPlan | null;
  subscriptionWaste: SubscriptionWasteFlag[];
  rentAffordability: RentAffordability | null;
  topDocumentRisk: DocumentRiskItem | null;
  geofenceEvents: GeofenceEvent[];
  healthGapSummary: HealthGapSummary | null;
  purchaseReadiness: { score: number; band: string; message: string; timelineMonths?: number | null } | null;
  isOffline: boolean;
  isSyncing: boolean;
  loading: boolean;
  error: string | null;
  dismissAlert: (id: string) => void;
  refreshHousehold: () => Promise<void>;
  buildAiContext: () => string;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot>(EMPTY_SNAPSHOT);
  const [alerts, setAlerts] = useState<HouseholdAlert[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [smartDevices, setSmartDevices] = useState<SmartDeviceItem[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary>(EMPTY_CREDIT);
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [utilitySummary, setUtilitySummary] = useState<UtilitySummary>(EMPTY_UTILITY);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [healthReminders, setHealthReminders] = useState<HealthReminder[]>([]);
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfile>(EMPTY_EMERGENCY);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [spendingAnomalies, setSpendingAnomalies] = useState<SpendingAnomaly[]>([]);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState('');
  const [savingsPlan, setSavingsPlan] = useState<SavingsPlan | null>(null);
  const [subscriptionWaste, setSubscriptionWaste] = useState<SubscriptionWasteFlag[]>([]);
  const [rentAffordability, setRentAffordability] = useState<RentAffordability | null>(null);
  const [topDocumentRisk, setTopDocumentRisk] = useState<DocumentRiskItem | null>(null);
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([]);
  const [healthGapSummary, setHealthGapSummary] = useState<HealthGapSummary | null>(null);
  const [purchaseReadiness, setPurchaseReadiness] = useState<{ score: number; band: string; message: string; timelineMonths?: number | null } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDashboardData = useCallback((data: Awaited<ReturnType<typeof fetchHouseholdDashboard>> & { shoppingList?: { id: string; name: string }[] }) => {
    setSnapshot(data.snapshot);
    setAlerts(data.alerts);
    setMembers(data.members);
    setFoodItems(data.foodItems as FoodItem[]);
    setChores(data.chores);
    setExpenses(data.expenses || []);
    setMaintenance(data.maintenance || []);
    setPackages(data.packages || []);
    setDocuments(data.documents || []);
    setSmartDevices(data.smartDevices || []);
    setCreditSummary(data.creditSummary || EMPTY_CREDIT);
    setFinancialGoals(data.financialGoals || []);
    setUtilitySummary(data.utilitySummary || EMPTY_UTILITY);
    setChecklistItems(data.checklistItems || []);
    setHealthReminders(data.healthReminders || []);
    setEmergencyProfile(data.emergencyProfile || EMPTY_EMERGENCY);
    setCommunityPosts(data.communityPosts || []);
    setAiRecommendations(data.aiRecommendations);
    setSpendingAnomalies(data.spendingAnomalies || []);
    setForecastSummary(data.forecastSummary || null);
    setCashFlowSummary(data.cashFlowSummary || '');
    setSavingsPlan(data.savingsPlan || null);
    setSubscriptionWaste(data.subscriptionWaste || []);
    setRentAffordability(data.rentAffordability || null);
    setTopDocumentRisk(data.topDocumentRisk || null);
    setGeofenceEvents(data.geofenceEvents || []);
    setHealthGapSummary(data.healthGapSummary || null);
    setPurchaseReadiness(data.purchaseReadiness || null);
    void cacheDashboardOffline({
      snapshot: data.snapshot,
      alerts: data.alerts,
      chores: data.chores,
      shoppingList: data.shoppingList || [],
      emergencyProfile: data.emergencyProfile || EMPTY_EMERGENCY,
      cachedAt: Date.now(),
    });
    void cacheEmergencyProfile(data.emergencyProfile || EMPTY_EMERGENCY);
  }, []);

  const refreshHousehold = useCallback(async () => {
    if (!currentUser) {
      setSnapshot(EMPTY_SNAPSHOT);
      setAlerts([]);
      setMembers([]);
      setFoodItems([]);
      setChores([]);
      setExpenses([]);
      setMaintenance([]);
      setPackages([]);
      setDocuments([]);
      setSmartDevices([]);
      setCreditSummary(EMPTY_CREDIT);
      setFinancialGoals([]);
      setUtilitySummary(EMPTY_UTILITY);
      setChecklistItems([]);
      setHealthReminders([]);
      setEmergencyProfile(EMPTY_EMERGENCY);
      setCommunityPosts([]);
      setAiRecommendations([]);
      setSpendingAnomalies([]);
      setForecastSummary(null);
      setCashFlowSummary('');
      setSavingsPlan(null);
      setSubscriptionWaste([]);
      setRentAffordability(null);
      setTopDocumentRisk(null);
      setGeofenceEvents([]);
      setHealthGapSummary(null);
      setPurchaseReadiness(null);
      setIsOffline(false);
      return;
    }

    const online = await isOnline();
    setIsOffline(!online);

    if (!online) {
      const cached = await loadDashboardOffline();
      if (cached) {
        setSnapshot(cached.snapshot as HouseholdSnapshot);
        setAlerts(cached.alerts as HouseholdAlert[]);
        setChores(cached.chores as ChoreItem[]);
        const ep = (await loadEmergencyProfileOffline()) || cached.emergencyProfile || EMPTY_EMERGENCY;
        setEmergencyProfile(ep);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchHouseholdDashboard();
      applyDashboardData(data as Awaited<ReturnType<typeof fetchHouseholdDashboard>> & { shoppingList?: { id: string; name: string }[] });
    } catch (e) {
      const cached = await loadDashboardOffline();
      if (cached) {
        setSnapshot(cached.snapshot as HouseholdSnapshot);
        setAlerts(cached.alerts as HouseholdAlert[]);
        setChores(cached.chores as ChoreItem[]);
        setEmergencyProfile((await loadEmergencyProfileOffline()) || cached.emergencyProfile || EMPTY_EMERGENCY);
        setIsOffline(true);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, applyDashboardData]);

  const syncAfterReconnect = useCallback(async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      await flushOfflineQueue({
        completeChore: async (id, completed) => {
          await toggleChoreComplete(id, completed);
        },
        addShoppingItem: async (name) => {
          await addShoppingListItem(name);
        },
      });
      await refreshHousehold();
    } finally {
      setIsSyncing(false);
      setIsOffline(false);
    }
  }, [currentUser, refreshHousehold]);

  useEffect(() => {
    refreshHousehold();
  }, [refreshHousehold]);

  useEffect(() => {
    if (!currentUser) return;
    return subscribeNetworkStatus((online) => {
      setIsOffline(!online);
      if (online) void syncAfterReconnect();
    });
  }, [currentUser, syncAfterReconnect]);

  useEffect(() => {
    if (!currentUser) return;
    let cleanup: (() => void) | undefined;
    void connectRealtime({
      onHouseholdUpdated: () => {
        void refreshHousehold();
      },
      onNotification: () => {
        void refreshHousehold();
      },
      onReconnect: () => {
        void refreshHousehold();
      },
    }).then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [currentUser, refreshHousehold]);

  useEffect(() => {
    if (!currentUser) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { refreshGeofenceSharingState, startGeofenceBackgroundPings, bindGeofenceAppState } =
        await import('@/src/services/geofenceLocation');
      const enabled = await refreshGeofenceSharingState();
      if (enabled) await startGeofenceBackgroundPings();
      cleanup = bindGeofenceAppState();
    })();
    return () => cleanup?.();
  }, [currentUser]);

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedIds.has(a.id)),
    [alerts, dismissedIds]
  );

  const dismissAlert = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const buildAiContext = useCallback(() => {
    const expiring = foodItems
      .filter((f) => f.expiresInDays <= 5)
      .map((f) => `${f.name} (${f.expiresInDays}d)`)
      .join(', ');
    const pendingChores = chores.filter((c) => !c.completed).map((c) => c.title).join(', ');
    const unpaid = expenses.filter((e) => !e.paid).map((e) => e.title).join(', ');
    const openMaint = maintenance.filter((m) => m.status !== 'completed').map((m) => m.title).join(', ');
    const incoming = packages.filter((p) => p.status === 'expected').map((p) => p.title).join(', ');
    return [
      'Household context for FamilyHub AI:',
      members.length ? `Members: ${members.map((m) => m.name).join(', ')}` : '',
      expiring ? `Expiring food: ${expiring}` : '',
      pendingChores ? `Pending chores: ${pendingChores}` : '',
      unpaid ? `Unpaid bills: ${unpaid}` : '',
      openMaint ? `Open maintenance: ${openMaint}` : '',
      incoming ? `Expected packages: ${incoming}` : '',
      `Health score: ${snapshot.healthScore}`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [foodItems, chores, expenses, maintenance, packages, members, snapshot.healthScore]);

  const value = useMemo(
    () => ({
      snapshot,
      alerts: visibleAlerts,
      members,
      foodItems,
      chores,
      expenses,
      maintenance,
      packages,
      documents,
      smartDevices,
      creditSummary,
      financialGoals,
      utilitySummary,
      checklistItems,
      healthReminders,
      emergencyProfile,
      communityPosts,
      aiRecommendations,
      spendingAnomalies,
      forecastSummary,
      cashFlowSummary,
      savingsPlan,
      subscriptionWaste,
      rentAffordability,
      topDocumentRisk,
      geofenceEvents,
      healthGapSummary,
      purchaseReadiness,
      isOffline,
      isSyncing,
      loading,
      error,
      dismissAlert,
      refreshHousehold,
      buildAiContext,
    }),
    [
      snapshot,
      visibleAlerts,
      members,
      foodItems,
      chores,
      expenses,
      maintenance,
      packages,
      documents,
      smartDevices,
      creditSummary,
      financialGoals,
      utilitySummary,
      checklistItems,
      healthReminders,
      emergencyProfile,
      communityPosts,
      aiRecommendations,
      spendingAnomalies,
      forecastSummary,
      cashFlowSummary,
      savingsPlan,
      subscriptionWaste,
      rentAffordability,
      topDocumentRisk,
      geofenceEvents,
      healthGapSummary,
      purchaseReadiness,
      isOffline,
      isSyncing,
      loading,
      error,
      dismissAlert,
      refreshHousehold,
      buildAiContext,
    ]
  );

  return (
    <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
