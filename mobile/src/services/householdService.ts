import api from './api';
import type {
  FoodItem,
  HouseholdAlert,
  HouseholdMember,
  HouseholdSnapshot,
} from '@/src/contexts/HouseholdContext';

export type ChoreItem = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority: string;
};

export type ExpenseItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  splits: { name: string; share?: number; paid?: boolean }[];
  expectedLargePurchase?: boolean;
  spendingAnomaly?: SpendingAnomaly;
};

export type SpendingAnomaly = {
  id: string;
  expenseId: string;
  category: string;
  title: string;
  amount: number;
  avgAmount: number;
  pctAboveAvg: number;
  zScore: number;
  severity: 'warning' | 'alert';
  message: string;
  monthsOfHistory: number;
};

export type MaintenanceItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  status: string;
  priority: string;
  rating?: number | null;
  createdAt: string;
};

export type PackageItem = {
  id: string;
  title: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  eta: string;
  notes: string;
};

export type DocumentItem = {
  id: string;
  title: string;
  category: string;
  fileType: string;
  notes: string;
  expiresAt: string;
  createdAt: string;
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  hasFile?: boolean;
  downloadUrl?: string;
};

export type SmartDeviceItem = {
  id: string;
  name: string;
  deviceType: string;
  location: string;
  status: string;
  state: string;
  brand: string;
};

export type CreditSummary = {
  estimatedScore: number | null;
  grade: string;
  onTimeCount: number;
  missedCount: number;
  monthsReported: number;
  ytdChange: number;
  monthlyPayments: { label: string; paid: boolean; title: string }[];
  bureaus: { experian: boolean; transunion: boolean; equifax: boolean };
};

export type FinancialGoal = {
  id: string;
  title: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  progressPct: number;
};

export type ForecastSummary = {
  nextCriticalDate: string;
  nextCriticalNet: number;
  tightWeekCount: number;
  summary: string;
};

export type CashFlowWeek = {
  weekStart: string;
  weekEnd: string;
  income: number;
  bills: number;
  netCashFlow: number;
  runningBalance: number;
  isTight: boolean;
  tightLabel?: string | null;
  events: { name: string; projectedAmount: number; dueDate: string; category: string }[];
};

export type BillForecast = {
  setupRequired?: boolean;
  message?: string;
  summary?: string;
  startingBalance?: number;
  monthlyIncome?: number;
  weeks?: CashFlowWeek[];
  forecastSummary?: ForecastSummary | null;
};

export type SavingsAllocation = {
  goalId: string;
  title: string;
  monthlyAllocation: number;
  remaining: number;
  monthsToGoal?: number | null;
  targetDate: string;
};

export type SavingsPlan = {
  allocations: SavingsAllocation[];
  monthlySurplus: number;
  message: string;
};

export type SubscriptionWasteFlag = {
  id: string;
  title: string;
  monthlyAmount: number;
  monthsPaid: number;
  message: string;
};

export type RentAffordability = {
  configured: boolean;
  recommendedMax?: number | null;
  rule30Pct?: number;
  ruleDti?: number;
  message?: string;
  limitingMethod?: string;
};

export type UtilityReading = {
  id: string;
  utilityType: string;
  amount: number;
  period: string;
  usageKwh?: number | null;
};

export type UtilitySummary = {
  electricAvg: number;
  waterAvg: number;
  gasAvg: number;
  energySpikePct: number;
  readings: UtilityReading[];
};

export type ChecklistItem = {
  id: string;
  room: string;
  task: string;
  completed: boolean;
  checklistType: string;
  notes: string;
  photoKey?: string;
  hasPhoto?: boolean;
  photoUrl?: string;
};

export type HealthReminder = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  reminderType: string;
};

export type EmergencyProfile = {
  contactName: string;
  contactPhone: string;
  addressNotes: string;
  medicalNotes: string;
};

export type CommunityPost = {
  id: string;
  authorName: string;
  body: string;
  category: string;
  createdAt: string;
};

export type HouseholdDashboard = {
  snapshot: HouseholdSnapshot;
  alerts: HouseholdAlert[];
  spendingAnomalies?: SpendingAnomaly[];
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
  forecastSummary?: ForecastSummary | null;
  cashFlowSummary?: string;
  savingsPlan?: SavingsPlan;
  subscriptionWaste?: SubscriptionWasteFlag[];
  rentAffordability?: RentAffordability;
  topDocumentRisk?: DocumentRiskItem | null;
  documentExpiryRiskRankings?: DocumentRiskItem[];
  geofenceEvents?: GeofenceEvent[];
  memberRole?: string;
  healthGapSummary?: HealthGapSummary | null;
  purchaseReadiness?: { score: number; band: string; message: string; timelineMonths?: number | null } | null;
};

export type DocumentRiskItem = {
  id: string;
  title: string;
  category: string;
  daysUntilExpiry: number;
  severityWeight: number;
  riskScore: number;
  urgency: string;
  cardLevel?: 'red' | 'orange' | null;
  message?: string;
};

export type GeofenceEvent = {
  message: string;
  eventType: string;
  timestamp: string;
};

export type SafeZone = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

export type MemberPermissions = {
  userId: string;
  displayName: string;
  role: string;
  permissions: Record<string, boolean>;
};

export async function fetchHouseholdDashboard(): Promise<HouseholdDashboard> {
  return api.request<HouseholdDashboard>('/api/household/dashboard', { method: 'GET' });
}

export async function addInventoryItem(item: {
  name: string;
  location?: string;
  quantity?: string;
  expiresInDays?: number;
}) {
  return api.request<{ item: FoodItem }>('/api/household/inventory', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function deleteInventoryItem(id: string) {
  return api.request(`/api/household/inventory/${id}`, { method: 'DELETE' });
}

export async function addChore(chore: {
  title: string;
  assignee?: string;
  dueDate?: string;
}) {
  return api.request<{ chore: ChoreItem }>('/api/household/chores', {
    method: 'POST',
    body: JSON.stringify(chore),
  });
}

export async function toggleChoreComplete(id: string, completed: boolean) {
  return api.request<{ chore: ChoreItem }>(`/api/household/chores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export async function addExpense(expense: {
  title: string;
  category?: string;
  amount: number;
  dueDate?: string;
  paid?: boolean;
  splits?: ExpenseItem['splits'];
}) {
  return api.request<{ expense: ExpenseItem }>('/api/household/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

export async function updateExpense(
  id: string,
  patch: Partial<Pick<ExpenseItem, 'paid' | 'title' | 'amount' | 'expectedLargePurchase'>>,
) {
  return api.request<{ expense: ExpenseItem }>(`/api/household/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function addMaintenanceRequest(req: {
  title: string;
  description?: string;
  location?: string;
  priority?: string;
}) {
  return api.request<{ maintenance: MaintenanceItem }>('/api/household/maintenance', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateMaintenanceRequest(
  id: string,
  patch: Partial<Pick<MaintenanceItem, 'status' | 'rating' | 'priority'>>
) {
  return api.request<{ maintenance: MaintenanceItem }>(`/api/household/maintenance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function addPackage(pkg: {
  title: string;
  carrier?: string;
  trackingNumber?: string;
  eta?: string;
  status?: string;
}) {
  return api.request<{ package: PackageItem }>('/api/household/packages', {
    method: 'POST',
    body: JSON.stringify(pkg),
  });
}

export async function updatePackage(
  id: string,
  patch: Partial<Pick<PackageItem, 'status' | 'eta' | 'notes'>>
) {
  return api.request<{ package: PackageItem }>(`/api/household/packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function addDocument(doc: {
  title: string;
  category?: string;
  fileType?: string;
  notes?: string;
  expiresInDays?: number;
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
}) {
  return api.request<{ document: DocumentItem }>('/api/household/documents', {
    method: 'POST',
    body: JSON.stringify(doc),
  });
}

export async function deleteDocument(id: string) {
  return api.request(`/api/household/documents/${id}`, { method: 'DELETE' });
}

export async function addSmartDevice(device: {
  name: string;
  deviceType?: string;
  location?: string;
  brand?: string;
  state?: string;
}) {
  return api.request<{ device: SmartDeviceItem }>('/api/household/smart-devices', {
    method: 'POST',
    body: JSON.stringify(device),
  });
}

export async function updateSmartDevice(
  id: string,
  patch: Partial<Pick<SmartDeviceItem, 'status' | 'state'>>
) {
  return api.request<{ device: SmartDeviceItem }>(`/api/household/smart-devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function updateCreditSettings(bureaus: Partial<CreditSummary['bureaus']>) {
  return api.request<{ bureaus: CreditSummary['bureaus'] }>('/api/household/credit-settings', {
    method: 'PATCH',
    body: JSON.stringify({ bureaus }),
  });
}

export async function addFinancialGoal(goal: {
  title: string;
  targetAmount: number;
  savedAmount?: number;
  targetDate?: string;
  icon?: string;
}) {
  return api.request<{ goal: FinancialGoal }>('/api/household/financial-goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
}

export async function updateFinancialGoal(id: string, patch: Partial<Pick<FinancialGoal, 'savedAmount' | 'targetAmount' | 'title'>>) {
  return api.request<{ goal: FinancialGoal }>(`/api/household/financial-goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function addUtilityReading(reading: {
  utilityType: string;
  amount: number;
  period?: string;
  usageKwh?: number;
}) {
  return api.request<{ utility: UtilityReading }>('/api/household/utilities', {
    method: 'POST',
    body: JSON.stringify(reading),
  });
}

export async function seedChecklist(type = 'move-in') {
  return api.request<{ items: ChecklistItem[] }>('/api/household/checklist', {
    method: 'POST',
    body: JSON.stringify({ seed: true, checklistType: type }),
  });
}

export async function toggleChecklistItem(id: string, completed: boolean) {
  return api.request<{ item: ChecklistItem }>(`/api/household/checklist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export async function attachChecklistPhoto(id: string, photoKey: string) {
  return api.request<{ item: ChecklistItem }>(`/api/household/checklist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ photoKey }),
  });
}

export async function addHealthReminder(reminder: {
  title: string;
  assignee?: string;
  dueDate?: string;
  reminderType?: string;
}) {
  return api.request<{ reminder: HealthReminder }>('/api/household/health-reminders', {
    method: 'POST',
    body: JSON.stringify(reminder),
  });
}

export async function updateEmergencyProfile(profile: Partial<EmergencyProfile>) {
  return api.request<{ profile: EmergencyProfile }>('/api/household/emergency-profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
}

export async function addCommunityPost(body: string, category = 'general') {
  return api.request<{ post: CommunityPost }>('/api/household/community-posts', {
    method: 'POST',
    body: JSON.stringify({ body, category }),
  });
}

export async function analyzeFoodImage(imageBase64: string) {
  return api.request<{ analysis: string; foodName?: string }>('/api/ai/analyze-image', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64 }),
  });
}

export function parseFoodNameFromAnalysis(analysis: string): string | null {
  try {
    const cleaned = analysis.replace(/```json\n?|\n?```/g, '').trim();
    const json = JSON.parse(cleaned) as { foodName?: string; name?: string };
    return json.foodName || json.name || null;
  } catch {
    const match = analysis.match(/foodName["'\s:]+([^"'\n,}]+)/i);
    return match?.[1]?.trim() || null;
  }
}

export async function generateMealPlan(pantry: { name: string; expiresInDays?: number }[], days = 7) {
  return api.request<{ meal_plan: string; pantryPriority?: { name: string; daysUntilExpiry: number }[] }>(
    '/api/meals/generate-plan',
    { method: 'POST', body: JSON.stringify({ preferences: {}, pantry, days }) },
  );
}

export async function fetchAutomationRules() {
  return api.request<{ rules: { id: string; name: string; enabled: boolean; lastFired?: string | null; ruleKey: string }[] }>(
    '/api/household/automation/rules',
  );
}

export async function toggleAutomationRule(id: string, enabled: boolean) {
  return api.request(`/api/household/automation/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function addShoppingListItem(name: string) {
  return api.request<{ item: { id: string; name: string } }>('/api/household/shopping-list', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function fetchShoppingList() {
  return api.request<{ items: { id: string; name: string; source: string; autoAdded?: boolean }[] }>(
    '/api/household/shopping-list',
  );
}

export async function fetchMaintenancePredictions() {
  return api.request<{ predictions: Record<string, unknown>[] }>('/api/household/maintenance-predictions');
}

export async function searchProperties(
  query: string,
  lat?: number,
  lng?: number,
  filters?: { maxRent?: number; applyAffordabilityFilter?: boolean },
) {
  return api.request<{
    properties?: Record<string, unknown>[];
    message?: string;
    fallbackUrl?: string;
    affordabilityFiltered?: boolean;
    maxRent?: number;
  }>('/api/properties/search', {
    method: 'POST',
    body: JSON.stringify({ query, lat, lng, filters: filters || {} }),
  });
}

export type HouseholdSummary = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  memberCount: number;
};

export type HouseholdInvitePreview = {
  token: string;
  householdName: string;
  inviterName: string;
  email: string;
  role: string;
  expiresAt?: string;
};

export async function fetchHouseholds() {
  return api.request<{ activeHouseholdId: string; households: HouseholdSummary[] }>(
    '/api/household/households',
  );
}

export async function createHousehold(name?: string) {
  return api.request<{ householdId: string; activeHouseholdId: string; households: HouseholdSummary[] }>(
    '/api/household/households',
    { method: 'POST', body: JSON.stringify({ name }) },
  );
}

export async function switchHousehold(householdId: string) {
  return api.request<{ activeHouseholdId: string; households: HouseholdSummary[] }>(
    '/api/household/households/switch',
    { method: 'POST', body: JSON.stringify({ householdId }) },
  );
}

export async function sendHouseholdInvite(email: string, role: 'renter' | 'family' = 'renter') {
  return api.request<{ invite: { email: string; inviteLink: string; role: string } }>(
    '/api/household/invites',
    { method: 'POST', body: JSON.stringify({ email, role }) },
  );
}

export async function fetchInvitePreview(token: string) {
  return api.request<{ invite: HouseholdInvitePreview }>(`/api/household/invites/${token}`);
}

export async function acceptHouseholdInvite(token: string) {
  return api.request<{ householdId: string; householdName: string; role: string }>(
    `/api/household/invites/${token}/accept`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function fetchBillForecast() {
  return api.request<{ forecast: BillForecast }>('/api/household/forecast');
}

export async function fetchSavingsPlan() {
  return api.request<{ savingsPlan: SavingsPlan }>('/api/household/savings-plan');
}

export async function updateFinancialProfile(profile: {
  monthlyGrossIncome?: number;
  currentBalance?: number;
  monthlySurplus?: number;
}) {
  return api.request('/api/household/financial-profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
}

export async function setMemberIncome(monthlyIncome: number) {
  return api.request('/api/household/member-income', {
    method: 'POST',
    body: JSON.stringify({ monthlyIncome }),
  });
}

export async function fetchIncomeSplit() {
  return api.request<{ incomeSplit: Record<string, unknown> }>('/api/household/income-split');
}

export async function proposeIncomeSplit() {
  return api.request('/api/household/income-split/propose', { method: 'POST', body: '{}' });
}

export async function agreeIncomeSplit() {
  return api.request('/api/household/income-split/agree', { method: 'POST', body: '{}' });
}

export async function fetchRentAffordability() {
  return api.request<{ rentAffordability: RentAffordability }>('/api/household/rent-affordability');
}

export async function fetchLocationSharing() {
  return api.request<{ locationSharingEnabled: boolean }>('/api/household/location-sharing');
}

export async function updateLocationSharing(locationSharingEnabled: boolean) {
  return api.request<{ locationSharingEnabled: boolean }>('/api/household/location-sharing', {
    method: 'PATCH',
    body: JSON.stringify({ locationSharingEnabled }),
  });
}

export async function pingLocation(lat: number, lng: number) {
  return api.request<{ events: GeofenceEvent[] }>('/api/household/location/ping', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
}

export async function fetchSafeZones() {
  return api.request<{ safeZones: SafeZone[] }>('/api/household/safe-zones');
}

export async function fetchHouseholdPermissions() {
  return api.request<{ members: MemberPermissions[]; dataTypes: string[] }>(
    '/api/household/permissions',
  );
}

export async function grantMemberPermission(targetUserId: string, dataType: string, allow: boolean) {
  return api.request('/api/household/permissions/grant', {
    method: 'POST',
    body: JSON.stringify({ targetUserId, dataType, allow }),
  });
}

export type HealthGap = {
  memberId: string;
  memberName: string;
  message: string;
  label: string;
  severity: string;
};

export type HealthTimelineItem = {
  id: string;
  kind: 'record' | 'gap';
  memberId: string;
  memberName: string;
  type: string;
  title: string;
  date: string;
  message?: string;
  severity?: string;
};

export type HealthMember = {
  userId: string;
  displayName: string;
  dateOfBirth?: string;
  age?: number;
  role: string;
};

export type MedicationItem = {
  id: string;
  memberId: string;
  memberName: string;
  name: string;
  dosage: string;
  frequency: string;
  smartReminderTimes: string[];
  adherenceRate: number;
  streakDays: number;
  dosesTaken: number;
  dosesDue: number;
};

export type VaccinationItem = {
  vaccine: string;
  dose: string;
  dueDate: string;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'received';
  receivedDate?: string | null;
};

export type HealthGapSummary = {
  totalGaps: number;
  message: string;
  topGap: HealthGap;
  gaps: HealthGap[];
};

export async function fetchHealthTimeline(memberId?: string) {
  const q = memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';
  return api.request<{
    timeline: HealthTimelineItem[];
    gaps: HealthGap[];
    members: HealthMember[];
  }>(`/api/household/health/timeline${q}`);
}

export async function fetchHealthMedications(memberId?: string) {
  const q = memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';
  return api.request<{ medications: MedicationItem[] }>(`/api/household/health/medications${q}`);
}

export async function fetchVaccinationSchedule(memberId: string) {
  return api.request<{ schedule: VaccinationItem[]; memberName: string; dateOfBirth: string }>(
    `/api/household/health/vaccinations/${memberId}`,
  );
}

export async function markMedicationDose(medicationId: string, status: 'taken' | 'missed') {
  return api.request(`/api/household/health/medications/${medicationId}/dose`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export type PurchaseReadiness = {
  score: number;
  band: string;
  message: string;
  timelineMonths?: number | null;
  monthlySavingsRate?: number;
  factors: { key: string; label: string; score: number; weightPct: number; detail: string; tip: string }[];
  recommendation: string;
};

export type MoveoutEstimate = {
  depositAmount: number;
  lowEstimate: number;
  midEstimate: number;
  highEstimate: number;
  fixableItems: string[];
  message: string;
};

export type RentMarketPrediction = {
  zipCode: string;
  available: boolean;
  currentMedianRent?: number;
  projectedRent6Mo?: number;
  confidenceInterval?: { low: number; high: number };
  trend?: string;
  trendPct6Mo?: number;
  recommendation?: string;
  message?: string;
};

export async function fetchPurchaseReadiness() {
  return api.request<{ purchaseReadiness: PurchaseReadiness }>('/api/household/purchase-readiness');
}

export async function fetchMoveoutEstimate() {
  return api.request<{ moveoutEstimate: MoveoutEstimate }>('/api/household/moveout-estimate');
}

export async function fetchRentMarket(zipCode?: string) {
  const q = zipCode ? `?zipCode=${encodeURIComponent(zipCode)}` : '';
  return api.request<{ rentMarket: RentMarketPrediction }>(`/api/household/rent-market${q}`);
}
