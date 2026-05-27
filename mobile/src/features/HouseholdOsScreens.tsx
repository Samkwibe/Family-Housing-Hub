import { ReactElement, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { useToast } from '@/src/contexts/ToastContext';
import {
  addInventoryItem,
  generateMealPlan,
  addChore,
  addDocument,
  addSmartDevice,
  analyzeFoodImage,
  parseFoodNameFromAnalysis,
  updateEmergencyProfile,
  fetchSafeZones,
  fetchMoveoutEstimate,
  type MoveoutEstimate,
} from '@/src/services/householdService';
import { getUploadUrl, uploadFileToPresignedUrl } from '@/src/services/storageService';
import * as DocumentPicker from 'expo-document-picker';
import { QuickAddForm } from '@/src/components/household/QuickAddForm';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';

type ScreenProps = { onBack: () => void };

function askAi(router: ReturnType<typeof useRouter>, prompt: string) {
  router.push({ pathname: '/(main)/(tabs)/assistant', params: { prompt } });
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  const styles = useAppStyles(createStyles);
  const theme = useTheme();

  return (
    <View style={styles.emptyBlock}>
      <Ionicons name="albums-outline" size={28} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function SmartFridgeScreen({
  onBack }: ScreenProps) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { foodItems, refreshHousehold, loading } = useHousehold();
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [scanning, setScanning] = useState(false);
  const expiring = foodItems.filter((f) => f.expiresInDays <= 3).length;

  const scanPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast('Camera permission is required to scan food', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.65,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setScanning(true);
    try {
      const res = await analyzeFoodImage(result.assets[0].base64);
      const name = parseFoodNameFromAnalysis(res.analysis) || res.foodName;
      if (!name) {
        showToast('Could not identify food — add manually instead', 'info');
        setShowAdd(true);
        return;
      }
      await addInventoryItem({ name, location: 'fridge', quantity: '1', expiresInDays: 7 });
      await refreshHousehold();
      showToast(`Added ${name} to your fridge`, 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setScanning(false);
    }
  };

  return (
    <FeatureShell
      title="Smart Fridge"
      subtitle="Track groceries, scan food photos, and get expiry alerts."
      icon="snow"
      iconColor="#14B8A6"
      iconBg="rgba(20,184,166,.12)"
      onBack={onBack}
      headerExtra={
        <FHStatGrid items={[
          { label: 'Items tracked', value: String(foodItems.length), color: '#A78BFA' },
          { label: 'Expiring soon', value: String(expiring), color: '#EF4444' },
        ]} />
      }
    >
      <View style={styles.scanRow}>
        <Pressable style={styles.scanBtn} onPress={scanPhoto} disabled={scanning}>
          {scanning ? <ActivityIndicator color="#14B8A6" /> : <Ionicons name="camera" size={20} color="#14B8A6" />}
          <Text style={styles.scanLabel}>{scanning ? 'Analyzing…' : 'Scan food photo'}</Text>
        </Pressable>
        <Pressable style={styles.scanBtn} onPress={() => setShowAdd((s) => !s)}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={20} color="#A78BFA" />
          <Text style={styles.scanLabel}>{showAdd ? 'Cancel' : 'Add manually'}</Text>
        </Pressable>
      </View>
      {showAdd ? (
        <QuickAddForm
          title="Add grocery item"
          successMessage="Item added to your fridge"
          fields={[
            { key: 'name', label: 'Item name', placeholder: 'Milk, eggs, chicken…' },
            { key: 'location', label: 'Location', placeholder: 'fridge, freezer, or pantry' },
            { key: 'quantity', label: 'Quantity', placeholder: '1 gallon, 6 pack…' },
            { key: 'expiresInDays', label: 'Expires in (days)', placeholder: '7', keyboardType: 'numeric' },
          ]}
          submitLabel="Save item"
          onSubmit={async (v) => {
            if (!v.name?.trim()) throw new Error('Item name is required');
            await addInventoryItem({
              name: v.name.trim(),
              location: (v.location?.trim() || 'fridge') as 'fridge' | 'freezer' | 'pantry',
              quantity: v.quantity?.trim() || '1',
              expiresInDays: parseInt(v.expiresInDays || '7', 10) || 7,
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Inventory by zone">
        {loading ? <ActivityIndicator color={theme.colors.primary} style={{ margin: 16 }} /> : null}
        {!loading && foodItems.length === 0 ? (
          <EmptyBlock title="No groceries yet" body="Scan a food photo or add items manually to track expiry dates." />
        ) : null}
        {foodItems.map((f) => (
          <FHRowItem
            key={f.id}
            icon={f.location === 'freezer' ? 'snow' : f.location === 'pantry' ? 'basket' : 'nutrition'}
            iconColor={f.expiresInDays <= 2 ? '#EF4444' : '#14B8A6'}
            iconBg={f.expiresInDays <= 2 ? 'rgba(239,68,68,.1)' : 'rgba(20,184,166,.1)'}
            title={f.name}
            subtitle={`${f.location} · ${f.quantity || '—'}`}
            right={<FHTag label={f.expiresInDays <= 1 ? 'Soon' : `${f.expiresInDays}d`} variant={f.expiresInDays <= 2 ? 'red' : 'green'} />}
          />
        ))}
      </FHCard>
      <FHCta label="AI — what expires this week?" icon="sparkles" variant="ai" onPress={() => askAi(router, 'What groceries are expiring in my household this week?')} />
    </FeatureShell>
  );
}

export function MealPlannerScreen({
  onBack }: ScreenProps) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { foodItems } = useHousehold();
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = async () => {
    if (foodItems.length === 0) {
      setError('Add groceries in Smart Fridge first so AI can plan meals from your inventory.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await generateMealPlan(foodItems.map((f) => ({ name: f.name, expiresInDays: f.expiresInDays })), 7);
      setPlan(res.meal_plan || 'No plan returned.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (foodItems.length > 0) loadPlan();
  }, [foodItems.length]);

  return (
    <FeatureShell title="AI Meal Planner" subtitle="Meal plans generated from your real inventory." icon="restaurant" iconColor="#F59E0B" iconBg="rgba(245,158,11,.12)" onBack={onBack}>
      <FHCard title="Your meal plan">
        {loading ? <ActivityIndicator color={theme.colors.primary} style={{ margin: 16 }} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && !plan ? (
          <EmptyBlock title="No plan yet" body="Add inventory items, then generate a plan from what you have." />
        ) : null}
        {plan ? <Text style={styles.planText}>{plan}</Text> : null}
      </FHCard>
      <FHCta label={loading ? 'Generating…' : 'Regenerate from inventory'} icon="sparkles" variant="ai" onPress={loadPlan} />
    </FeatureShell>
  );
}

export function InventoryScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { foodItems } = useHousehold();
  const lowStock = foodItems.filter((f) => f.expiresInDays <= 5);
  return (
    <FeatureShell title="Household Inventory" subtitle="Groceries synced from your Smart Fridge inventory." icon="cube" iconColor="#A78BFA" iconBg="rgba(124,58,237,.18)" onBack={onBack}
      headerExtra={<FHStatGrid items={[{ label: 'Total items', value: String(foodItems.length), color: '#A78BFA' }, { label: 'Use soon', value: String(lowStock.length), color: '#F59E0B' }]} />}
    >
      <FHCard title="Your items">
        {foodItems.length === 0 ? (
          <EmptyBlock title="Inventory empty" body="Add items in Smart Fridge to see them here." />
        ) : (
          foodItems.map((f) => (
            <FHRowItem key={f.id} icon="nutrition" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title={f.name} subtitle={`${f.location} · ${f.quantity || '—'}`} />
          ))
        )}
      </FHCard>
      <FHCta label="AI refill predictions" icon="sparkles" variant="ai" onPress={() => askAi(router, 'What household items will we run out of soon based on my inventory?')} />
    </FeatureShell>
  );
}

export function ChoresScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { members, chores, refreshHousehold, isOffline } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});

  const displayChores = chores.map((c) => ({
    ...c,
    completed: localCompleted[c.id] ?? c.completed,
  }));

  const toggleChore = async (id: string, completed: boolean) => {
    const next = !completed;
    setLocalCompleted((prev) => ({ ...prev, [id]: next }));
    if (isOffline) {
      const { enqueueOfflineWrite } = await import('@/src/services/offlineService');
      await enqueueOfflineWrite({ type: 'chore_complete', choreId: id, completed: next });
      return;
    }
    const { toggleChoreComplete } = await import('@/src/services/householdService');
    await toggleChoreComplete(id, next);
    await refreshHousehold();
  };

  return (
    <FeatureShell title="Chores & Tasks" subtitle="Your household chore list." icon="checkmark-done" iconColor="#A78BFA" iconBg="rgba(124,58,237,.18)" onBack={onBack}>
      {showAdd ? (
        <QuickAddForm
          title="Add chore"
          fields={[
            { key: 'title', label: 'Task', placeholder: 'Take out trash' },
            { key: 'assignee', label: 'Assignee', placeholder: 'Optional name' },
            { key: 'dueDate', label: 'Due date', placeholder: 'Saturday' },
          ]}
          submitLabel="Add chore"
          onSubmit={async (v) => {
            if (!v.title?.trim()) throw new Error('Task title is required');
            await addChore({
              title: v.title.trim(),
              assignee: v.assignee?.trim() || '',
              dueDate: v.dueDate?.trim() || '',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Tasks">
        {displayChores.length === 0 ? (
          <EmptyBlock title="No chores yet" body="Chores you add will appear here for your household." />
        ) : (
          displayChores.map((c) => (
            <Pressable key={c.id} onPress={() => toggleChore(c.id, c.completed)}>
              <FHRowItem
                icon={c.completed ? 'checkmark-circle' : 'ellipse-outline'}
                iconColor={c.completed ? '#14B8A6' : '#F59E0B'}
                iconBg={c.completed ? 'rgba(20,184,166,.1)' : 'rgba(245,158,11,.1)'}
                title={c.title}
                subtitle={[c.assignee, c.dueDate].filter(Boolean).join(' · ') || 'Household'}
                right={<FHTag label={c.completed ? 'Done' : 'Pending'} variant={c.completed ? 'green' : 'amber'} />}
              />
            </Pressable>
          ))
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Add chore'} icon={showAdd ? 'close' : 'add'} onPress={() => setShowAdd((s) => !s)} />
      <FHCard title="Household">
        {members.map((m) => (
          <FHRowItem key={m.id} icon="person" iconColor={m.color} iconBg={`${m.color}22`} title={m.name} subtitle={m.role} />
        ))}
      </FHCard>
      <FHCta label="AI — assign chores fairly" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Assign this week\'s household chores fairly among members.')} />
    </FeatureShell>
  );
}

export function CalendarScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const { expenses, chores } = useHousehold();
  const events = [
    ...expenses.map((e) => ({ id: e.id, title: e.title, sub: e.dueDate ? `Due ${e.dueDate}` : 'Bill', icon: 'cash' as const })),
    ...chores.filter((c) => !c.completed).map((c) => ({ id: c.id, title: c.title, sub: c.dueDate ? `Due ${c.dueDate}` : 'Chore', icon: 'checkbox' as const })),
  ];
  return (
    <FeatureShell title="Family Calendar" subtitle="Bills and chores from your household data." icon="calendar" iconColor="#F59E0B" iconBg="rgba(245,158,11,.12)" onBack={onBack}>
      <FHCard title="Upcoming">
        {events.length === 0 ? (
          <EmptyBlock title="Nothing scheduled" body="Add bills or chores to see them on your calendar." />
        ) : (
          events.map((e) => (
            <FHRowItem key={e.id} icon={e.icon} iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title={e.title} subtitle={e.sub} />
          ))
        )}
      </FHCard>
    </FeatureShell>
  );
}

export function NotificationsScreen({
  onBack }: ScreenProps) {
  const theme = useTheme();

  const styles = useAppStyles(createStyles);
  const { alerts, dismissAlert } = useHousehold();
  const router = useRouter();
  return (
    <FeatureShell title="Smart Notifications" subtitle="Proactive alerts from your real household data." icon="notifications" iconColor="#F59E0B" iconBg="rgba(245,158,11,.12)" onBack={onBack}>
      {alerts.length === 0 ? (
        <EmptyBlock title="All clear" body="When food expires, bills are due, or packages arrive, alerts will show here." />
      ) : (
        alerts.map((a) => (
          <Pressable key={a.id} style={[styles.alertCard, a.urgency === 'high' && styles.alertHigh]} onPress={() => a.aiPrompt && askAi(router, a.aiPrompt)}>
            <View style={styles.alertTop}>
              <FHTag label={a.type} variant={a.urgency === 'high' ? 'red' : a.urgency === 'medium' ? 'amber' : 'violet'} />
              <Pressable onPress={() => dismissAlert(a.id)} hitSlop={8}><Ionicons name="close" size={16} color={theme.colors.textMuted} /></Pressable>
            </View>
            <Text style={styles.alertTitle}>{a.title}</Text>
            <Text style={styles.alertBody}>{a.body}</Text>
          </Pressable>
        ))
      )}
    </FeatureShell>
  );
}

export function AutomationsScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const [rules, setRules] = useState<Array<{ id: string; name: string; enabled: boolean; lastFired?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { fetchAutomationRules } = await import('@/src/services/householdService');
        const res = await fetchAutomationRules();
        setRules(res.rules || []);
      } catch {
        setRules([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    const { toggleAutomationRule } = await import('@/src/services/householdService');
    await toggleAutomationRule(id, !enabled);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)));
  };

  return (
    <FeatureShell title="Smart Automations" subtitle="Event-driven rules that run every hour for your household." icon="git-network" iconColor="#7C3AED" iconBg="rgba(124,58,237,.18)" onBack={onBack}>
      {loading ? <ActivityIndicator color="#7C3AED" style={{ margin: 16 }} /> : null}
      {rules.map((r) => (
        <Pressable key={r.id} style={styles.alertCard} onPress={() => toggle(r.id, r.enabled)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{r.name}</Text>
            <Text style={styles.alertBody}>{r.enabled ? 'Active' : 'Paused'}{r.lastFired ? ` · Last fired ${r.lastFired.slice(0, 10)}` : ''}</Text>
          </View>
          <FHTag label={r.enabled ? 'On' : 'Off'} variant={r.enabled ? 'green' : 'violet'} />
        </Pressable>
      ))}
      <FHCta label="AI suggest automations" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Suggest smart automations for my household based on our routines.')} />
    </FeatureShell>
  );
}

export function SubscriptionsScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { expenses } = useHousehold();
  const subs = expenses.filter((e) => ['subscription', 'utility', 'internet'].includes(e.category));
  const total = subs.reduce((s, e) => s + e.amount, 0);
  return (
    <FeatureShell title="Subscriptions & Bills" subtitle="Recurring expenses from your household account." icon="repeat" iconColor="#A78BFA" iconBg="rgba(124,58,237,.18)" onBack={onBack}
      headerExtra={<FHStatGrid items={[{ label: 'Monthly due', value: `$${total.toFixed(0)}`, color: '#F59E0B' }, { label: 'Items', value: String(subs.length), color: '#A78BFA' }]} />}
    >
      <FHCard title="Your bills">
        {subs.length === 0 ? (
          <EmptyBlock title="No bills tracked" body="Add rent, utilities, or subscriptions in Rent Split to track them here." />
        ) : (
          subs.map((e) => (
            <FHRowItem key={e.id} icon="card" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title={e.title} subtitle={`$${e.amount.toFixed(0)}/mo`} right={<FHTag label={e.paid ? 'Paid' : 'Due'} variant={e.paid ? 'green' : 'amber'} />} />
          ))
        )}
      </FHCard>
      <FHCta label="AI find savings" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Review my household bills and suggest savings.')} />
    </FeatureShell>
  );
}

export function SmartHomeScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const { smartDevices, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const online = smartDevices.filter((d) => d.status === 'online').length;

  const deviceIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'doorbell' || type === 'camera') return 'videocam';
    if (type === 'thermostat') return 'thermometer';
    if (type === 'lock') return 'lock-closed';
    if (type === 'lights') return 'bulb';
    return 'hardware-chip';
  };

  return (
    <FeatureShell title="Smart Home Hub" subtitle="Track devices you connect — Ring, Nest, Alexa, locks, and more." icon="home" iconColor="#14B8A6" iconBg="rgba(20,184,166,.12)" onBack={onBack}
      headerExtra={<FHStatGrid items={[{ label: 'Devices', value: String(smartDevices.length), color: '#14B8A6' }, { label: 'Online', value: String(online), color: '#A78BFA' }]} />}
    >
      {showAdd ? (
        <QuickAddForm
          title="Add device"
          fields={[
            { key: 'name', label: 'Device name', placeholder: 'Ring doorbell' },
            { key: 'deviceType', label: 'Type', placeholder: 'doorbell, thermostat, lock, lights' },
            { key: 'location', label: 'Location', placeholder: 'Front door' },
            { key: 'brand', label: 'Brand', placeholder: 'Ring, Nest, etc.' },
          ]}
          submitLabel="Save device"
          onSubmit={async (v) => {
            if (!v.name?.trim()) throw new Error('Device name is required');
            await addSmartDevice({
              name: v.name.trim(),
              deviceType: v.deviceType?.trim() || 'other',
              location: v.location?.trim() || '',
              brand: v.brand?.trim() || '',
              state: 'Connected',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Connected devices">
        {smartDevices.length === 0 ? (
          <EmptyBlock title="No devices yet" body="Add smart home devices manually until live integrations are connected." />
        ) : (
          smartDevices.map((d) => (
            <FHRowItem
              key={d.id}
              icon={deviceIcon(d.deviceType)}
              iconColor={d.status === 'online' ? '#14B8A6' : '#F59E0B'}
              iconBg={d.status === 'online' ? 'rgba(20,184,166,.1)' : 'rgba(245,158,11,.1)'}
              title={d.name}
              subtitle={[d.location, d.brand, d.state].filter(Boolean).join(' · ') || d.deviceType}
              right={<FHTag label={d.status === 'online' ? 'Online' : 'Offline'} variant={d.status === 'online' ? 'green' : 'amber'} />}
            />
          ))
        )}
      </FHCard>
      <FHDashedBtn label={showAdd ? 'Cancel' : 'Add device'} icon={showAdd ? 'close' : 'add'} onPress={() => setShowAdd((s) => !s)} />
    </FeatureShell>
  );
}

export function DocumentVaultScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const toast = useToast();
  const { documents, refreshHousehold } = useHousehold();
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'vault' | 'moveout'>('vault');
  const [moveout, setMoveout] = useState<MoveoutEstimate | null>(null);

  useEffect(() => {
    if (tab !== 'moveout') return;
    fetchMoveoutEstimate().then((r) => setMoveout(r.moveoutEstimate)).catch(() => setMoveout(null));
  }, [tab]);

  const docIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    if (category === 'lease') return 'document-text';
    if (category === 'receipt') return 'receipt';
    if (category === 'insurance') return 'shield';
    if (category === 'id') return 'card';
    return 'folder';
  };

  const uploadDocument = async () => {
    setUploading(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const mimeType = asset.mimeType || 'application/pdf';
      const filename = asset.name || 'document.pdf';
      const { uploadUrl, fileKey } = await getUploadUrl({
        filename,
        contentType: mimeType,
        folder: 'documents',
      });
      await uploadFileToPresignedUrl(asset.uri, uploadUrl, mimeType);
      const title = filename.replace(/\.[^.]+$/, '');
      await addDocument({
        title,
        category: mimeType.includes('pdf') ? 'lease' : 'other',
        fileType: mimeType.includes('pdf') ? 'PDF' : 'Image',
        notes: '',
        fileKey,
        fileName: filename,
        mimeType,
      });
      await refreshHousehold();
      toast.success('Document uploaded');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Upload failed. Check S3/R2 settings on the server.');
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: { downloadUrl?: string; title: string }) => {
    if (!doc.downloadUrl) {
      toast.error('No file attached or storage not configured');
      return;
    }
    await Linking.openURL(doc.downloadUrl);
  };

  return (
    <FeatureShell title="Document Vault" subtitle="Leases, IDs, receipts, warranties — searchable with AI." icon="folder-open" iconColor="#14B8A6" iconBg="rgba(20,184,166,.12)" onBack={onBack}>
      <View style={styles.memberPickerRow}>
        {(['vault', 'moveout'] as const).map((t) => (
          <Pressable key={t} style={[styles.memberChip, tab === t && styles.memberChipActive]} onPress={() => setTab(t)}>
            <Text style={[styles.memberChipText, tab === t && styles.memberChipTextActive]}>{t === 'vault' ? 'Documents' : 'Move-out'}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'moveout' ? (
        <FHCard title="Deposit deduction estimate">
          {moveout ? (
            <>
              <Text style={styles.emptyBodyInline}>{moveout.message}</Text>
              <FHStatGrid items={[
                { label: 'Low', value: `$${moveout.lowEstimate}`, color: '#F59E0B' },
                { label: 'Likely', value: `$${moveout.midEstimate}`, color: '#EF4444' },
                { label: 'High', value: `$${moveout.highEstimate}`, color: '#EF4444' },
              ]} />
              {moveout.fixableItems.length > 0 ? (
                <Text style={[styles.emptyBodyInline, { marginTop: 8 }]}>Fix before move-out: {moveout.fixableItems.join(', ')}</Text>
              ) : null}
            </>
          ) : (
            <EmptyBlock title="No estimate yet" body="Complete your move-in checklist and log tenant-caused maintenance to see deposit risk." />
          )}
        </FHCard>
      ) : (
        <>
      {showAdd ? (
        <QuickAddForm
          title="Add document"
          fields={[
            { key: 'title', label: 'Title', placeholder: 'Lease 2026' },
            { key: 'category', label: 'Category', placeholder: 'lease, receipt, insurance, id' },
            { key: 'fileType', label: 'File type', placeholder: 'PDF, photo, etc.' },
            { key: 'notes', label: 'Notes', placeholder: 'Optional details' },
          ]}
          submitLabel="Save metadata"
          onSubmit={async (v) => {
            if (!v.title?.trim()) throw new Error('Title is required');
            await addDocument({
              title: v.title.trim(),
              category: v.category?.trim() || 'other',
              fileType: v.fileType?.trim() || '',
              notes: v.notes?.trim() || '',
            });
            await refreshHousehold();
            setShowAdd(false);
          }}
        />
      ) : null}
      <FHCard title="Your documents">
        {documents.length === 0 ? (
          <EmptyBlock title="Vault empty" body="Upload a lease, insurance PDF, or inspection photo. Files are stored securely for your household." />
        ) : (
          documents.map((d) => (
            <Pressable key={d.id} onPress={() => openDocument(d)}>
              <FHRowItem
                icon={docIcon(d.category)}
                iconColor="#A78BFA"
                iconBg="rgba(124,58,237,.12)"
                title={d.title}
                subtitle={[d.hasFile ? 'File attached' : 'Metadata only', d.fileType, d.category].filter(Boolean).join(' · ')}
                right={d.hasFile ? <FHTag label="Open" variant="green" /> : undefined}
              />
            </Pressable>
          ))
        )}
      </FHCard>
      <FHDashedBtn label={uploading ? 'Uploading…' : 'Upload PDF or photo'} icon="cloud-upload" onPress={uploadDocument} />
      <FHDashedBtn label={showAdd ? 'Cancel metadata' : 'Add metadata only'} icon={showAdd ? 'close' : 'create'} onPress={() => setShowAdd((s) => !s)} />
      <FHCta label="AI — search documents" icon="sparkles" variant="ai" onPress={() => askAi(router, documents.length ? `Help me find information in my documents: ${documents.map((d) => d.title).join(', ')}` : 'What documents should I keep as a renter?')} />
        </>
      )}
    </FeatureShell>
  );
}

export function ShoppingScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { foodItems } = useHousehold();
  const [items, setItems] = useState<{ id: string; name: string; autoAdded?: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { fetchShoppingList } = await import('@/src/services/householdService');
        const res = await fetchShoppingList();
        setItems(res.items || []);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  const urgent = foodItems.filter((f) => f.expiresInDays <= 2);
  return (
    <FeatureShell title="Smart Shopping" subtitle="Auto-added staples and expiry-driven priorities." icon="cart" iconColor="#EC4899" iconBg="rgba(236,72,153,.1)" onBack={onBack}>
      <FHCard title="Shopping list">
        {items.length === 0 ? (
          <EmptyBlock title="List empty" body="Automation adds items when food expires or staples run low." />
        ) : (
          items.map((i) => (
            <FHRowItem key={i.id} icon="cart" iconColor="#EC4899" iconBg="rgba(236,72,153,.1)" title={i.name} subtitle={i.autoAdded ? 'Auto-added' : 'Manual'} />
          ))
        )}
      </FHCard>
      <FHCard title="Expiring soon">
        {urgent.length === 0 ? (
          <EmptyBlock title="Nothing urgent" body="Items expiring within 2 days will appear here as shopping priorities." />
        ) : (
          urgent.map((f) => (
            <FHRowItem key={f.id} icon="nutrition" iconColor="#EF4444" iconBg="rgba(239,68,68,.1)" title={f.name} subtitle={`Expires in ${f.expiresInDays}d`} right={<FHTag label="Priority" variant="red" />} />
          ))
        )}
      </FHCard>
      <FHCta label="AI optimize shopping trip" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Create a shopping list from my inventory and nearby stores.')} />
    </FeatureShell>
  );
}

export function SafetyScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { emergencyProfile, geofenceEvents, refreshHousehold } = useHousehold();
  const [editing, setEditing] = useState(false);
  const [safeZones, setSafeZones] = useState<{ id: string; name: string; type: string; radiusMeters: number }[]>([]);

  useEffect(() => {
    fetchSafeZones()
      .then((r) => setSafeZones(r.safeZones))
      .catch(() => setSafeZones([]));
  }, []);

  return (
    <FeatureShell title="Safety & Emergency" subtitle="Emergency contacts and household info you control." icon="shield" iconColor="#EF4444" iconBg="rgba(239,68,68,.1)" onBack={onBack}>
      <FHCard title="Safe zones">
        {safeZones.length === 0 ? (
          <EmptyBlock title="No safe zones yet" body="Add home, school, and work zones in Settings. Parents get silent alerts when a child enters or leaves." />
        ) : (
          safeZones.map((z) => (
            <FHRowItem
              key={z.id}
              icon={z.type === 'school' ? 'school' : z.type === 'work' ? 'briefcase' : 'home'}
              iconColor="#14B8A6"
              iconBg="rgba(20,184,166,.1)"
              title={z.name}
              subtitle={`${z.radiusMeters}m radius · ${z.type}`}
            />
          ))
        )}
        {geofenceEvents.length > 0 ? (
          <>
            <Text style={styles.emptyBodyInline}>Recent location alerts</Text>
            {geofenceEvents.slice(0, 3).map((e, i) => (
              <FHRowItem key={`${e.timestamp}-${i}`} icon="navigate" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title={e.message} subtitle={e.eventType === 'enter' ? 'Arrived' : 'Left'} />
            ))}
          </>
        ) : null}
      </FHCard>
      <Pressable style={styles.sosBtn} onPress={() => Linking.openURL('tel:911')}>
        <Ionicons name="warning" size={28} color="#fff" />
        <Text style={styles.sosText}>Call 911 — Emergency</Text>
      </Pressable>
      <FHCard title="Emergency contacts">
        <Pressable onPress={() => Linking.openURL('tel:911')}>
          <FHRowItem icon="call" iconColor="#EF4444" iconBg="rgba(239,68,68,.1)" title="911" subtitle="Police, fire, ambulance" />
        </Pressable>
        {emergencyProfile.contactName ? (
          <Pressable onPress={() => emergencyProfile.contactPhone && Linking.openURL(`tel:${emergencyProfile.contactPhone}`)}>
            <FHRowItem icon="people" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title={emergencyProfile.contactName} subtitle={emergencyProfile.contactPhone || 'No phone saved'} />
          </Pressable>
        ) : (
          <Text style={styles.emptyBodyInline}>Add a family contact below for quick access.</Text>
        )}
      </FHCard>
      {editing ? (
        <QuickAddForm
          title="Household emergency info"
          successMessage="Emergency info saved"
          fields={[
            { key: 'contactName', label: 'Family contact name', placeholder: 'Mom, partner, etc.' },
            { key: 'contactPhone', label: 'Phone', placeholder: '(555) 123-4567' },
            { key: 'addressNotes', label: 'Address & access notes', placeholder: 'Gate code, unit number…' },
            { key: 'medicalNotes', label: 'Medical notes', placeholder: 'Allergies, medications…' },
          ]}
          submitLabel="Save info"
          onSubmit={async (v) => {
            await updateEmergencyProfile({
              contactName: v.contactName?.trim() || '',
              contactPhone: v.contactPhone?.trim() || '',
              addressNotes: v.addressNotes?.trim() || '',
              medicalNotes: v.medicalNotes?.trim() || '',
            });
            await refreshHousehold();
            setEditing(false);
          }}
        />
      ) : null}
      <FHCard title="Household emergency info">
        {emergencyProfile.addressNotes || emergencyProfile.medicalNotes ? (
          <>
            {emergencyProfile.addressNotes ? (
              <FHRowItem icon="home" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title="Address & access" subtitle={emergencyProfile.addressNotes} />
            ) : null}
            {emergencyProfile.medicalNotes ? (
              <FHRowItem icon="medkit" iconColor="#F59E0B" iconBg="rgba(245,158,11,.1)" title="Medical notes" subtitle={emergencyProfile.medicalNotes} />
            ) : null}
          </>
        ) : (
          <EmptyBlock title="No info saved yet" body="Add address, gate codes, and medical notes your household may need in an emergency." />
        )}
      </FHCard>
      <FHDashedBtn label={editing ? 'Cancel edit' : 'Edit emergency info'} icon={editing ? 'close' : 'create'} onPress={() => setEditing((s) => !s)} />
      <FHCta label="Find hospitals on Maps" icon="map" onPress={() => router.push('/(main)/(tabs)/maps')} />
    </FeatureShell>
  );
}

export function SecurityScreen({ onBack }: ScreenProps) {
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const { smartDevices } = useHousehold();
  const locks = smartDevices.filter((d) => d.deviceType === 'lock' || d.deviceType === 'camera' || d.deviceType === 'doorbell');

  return (
    <FeatureShell title="Security" subtitle="Smart devices and account safety for your home." icon="lock-closed" iconColor="#A78BFA" iconBg="rgba(124,58,237,.18)" onBack={onBack}>
      <FHCard title="Home security devices">
        {locks.length === 0 ? (
          <EmptyBlock title="No security devices" body="Add locks, cameras, or doorbells in Smart Home to monitor them here." />
        ) : (
          locks.map((d) => (
            <FHRowItem key={d.id} icon={d.deviceType === 'lock' ? 'lock-closed' : 'videocam'} iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title={d.name} subtitle={[d.location, d.state].filter(Boolean).join(' · ')} right={<FHTag label={d.status === 'online' ? 'Online' : 'Offline'} variant={d.status === 'online' ? 'green' : 'amber'} />} />
          ))
        )}
      </FHCard>
      <FHCard title="Account safety">
        <FHRowItem icon="shield-checkmark" iconColor="#14B8A6" iconBg="rgba(20,184,166,.1)" title="Secure sign-in" subtitle="Your session is protected with encrypted tokens" right={<FHTag label="Active" variant="green" />} />
        <FHRowItem icon="finger-print" iconColor="#A78BFA" iconBg="rgba(124,58,237,.12)" title="Device biometrics" subtitle="Use Face ID or fingerprint on supported devices" />
      </FHCard>
      <FHCta label="AI security checklist" icon="sparkles" variant="ai" onPress={() => askAi(router, 'Give me a home security checklist for renters.')} />
    </FeatureShell>
  );
}

export const HOUSEHOLD_OS_SCREENS: Record<string, (p: ScreenProps) => ReactElement> = {
  'smart-fridge': SmartFridgeScreen,
  'meal-planner': MealPlannerScreen,
  inventory: InventoryScreen,
  chores: ChoresScreen,
  calendar: CalendarScreen,
  notifications: NotificationsScreen,
  automations: AutomationsScreen,
  subscriptions: SubscriptionsScreen,
  'smart-home': SmartHomeScreen,
  'document-vault': DocumentVaultScreen,
  shopping: ShoppingScreen,
  safety: SafetyScreen,
  security: SecurityScreen,
};

// Helpers
function ScanBtn({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={styles.scanBtn}>
      <Ionicons name={icon} size={20} color="#14B8A6" />
      <Text style={styles.scanLabel}>{label}</Text>
    </View>
  );
}

function ConnectPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const styles = useAppStyles(createStyles);

  return (
    <View style={styles.connectPill}>
      <Ionicons name={icon} size={16} color="#A78BFA" />
      <Text style={styles.connectText}>{label}</Text>
    </View>
  );
}

function AutoRule({ trigger, action, color, on }: { trigger: string; action: string; color: string; on: boolean }) {
  const styles = useAppStyles(createStyles);
  const theme = useTheme();

  return (
    <View style={styles.autoRule}>
      <View style={[styles.autoDot, { backgroundColor: on ? color : theme.colors.textMuted }]} />
      <View style={styles.autoBody}>
        <Text style={styles.autoTrigger}>If {trigger}</Text>
        <Text style={styles.autoAction}>→ {action}</Text>
      </View>
      <FHTag label={on ? 'On' : 'Off'} variant={on ? 'green' : 'violet'} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  scanRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  scanBtn: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.borderLight },
  scanLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, textAlign: 'center' },
  dietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  dietChip: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dietChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dietText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  dietTextActive: { color: '#fff' },
  mealHero: { padding: 14 },
  mealTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  mealSub: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10 },
  mealHint: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6 },
  points: { fontSize: 13, fontWeight: '800' },
  connectRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  connectPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.borderLight },
  connectText: { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  alertCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.borderLight },
  alertHigh: { borderColor: 'rgba(239,68,68,.25)' },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  alertBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  autoRule: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  autoDot: { width: 8, height: 8, borderRadius: 4 },
  autoBody: { flex: 1 },
  autoTrigger: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  autoAction: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  insight: { backgroundColor: '#0C2820', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(20,184,166,.18)' },
  insightBold: { fontSize: 11, color: '#14B8A6', fontWeight: '700' },
  insightMuted: { fontSize: 11, color: theme.colors.textSecondary },
  sosBtn: { backgroundColor: '#EF4444', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, marginBottom: 10 },
  sosText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  emptyBlock: { alignItems: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontFamily: theme.fonts.title, fontSize: theme.fontSize.lg, color: theme.colors.text, textAlign: 'center' },
  emptyBody: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  emptyBodyInline: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, padding: 14, lineHeight: 21 },
  memberPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  memberChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderLight },
  memberChipActive: { backgroundColor: 'rgba(20,184,166,.15)', borderColor: '#14B8A6' },
  memberChipText: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  memberChipTextActive: { color: '#14B8A6', fontFamily: theme.fonts.bodyBold },
  planText: { fontFamily: theme.fonts.body, fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 22, padding: 14 },
  errorText: { color: theme.colors.danger, fontSize: theme.fontSize.sm, padding: 14 },
});
}
