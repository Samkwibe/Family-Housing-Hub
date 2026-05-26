import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button, EmptyState } from '@/src/components/ui';
import { useTabScreenInsets } from '@/src/hooks/useTabScreenInsets';
import { theme } from '@/src/theme';
import { createGroup, listUserGroups, type MessageGroup } from '@/src/services/messaging';

function formatTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const { scrollBottomPadding } = useTabScreenInsets();

  const load = useCallback(async () => {
    if (!currentUser?.uid) return;
    try {
      const list = await listUserGroups(currentUser.uid);
      setGroups(list);
    } catch (e: unknown) {
      Alert.alert('Messages', (e as Error).message || 'Could not load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.uid]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openChat = (group: MessageGroup) => {
    router.push({
      pathname: '/(main)/group-chat',
      params: { groupId: group.id, groupName: group.name },
    });
  };

  const onCreateGroup = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const group = await createGroup(name);
      setShowNew(false);
      setNewName('');
      await load();
      openChat(group);
    } catch (e: unknown) {
      Alert.alert('New group', (e as Error).message || 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Family & group conversations</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => setShowNew(true)}>
          <FontAwesome name="plus" size={16} color="#fff" />
        </Pressable>
      </View>

      {loading && groups.length === 0 ? (
        <Text style={styles.loadingText}>Loading conversations…</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          contentContainerStyle={
            groups.length === 0
              ? [styles.emptyList, { paddingBottom: scrollBottomPadding }]
              : [styles.list, { paddingBottom: scrollBottomPadding }]
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openChat(item)}>
              <View style={styles.avatar}>
                <FontAwesome name="users" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <Text style={styles.rowPreview} numberOfLines={1}>
                  {item.lastMessagePreview || 'No messages yet'}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={theme.colors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title="No conversations yet"
              message="Pull to refresh or create a group to start chatting with your household."
            />
          }
        />
      )}

      <Modal visible={showNew} transparent animationType="fade" onRequestClose={() => setShowNew(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNew(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Roommates, Landlord"
              placeholderTextColor={theme.colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Button title="Create" onPress={onCreateGroup} loading={creating} disabled={!newName.trim()} />
            <Button title="Cancel" onPress={() => setShowNew(false)} variant="ghost" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  title: { ...theme.typography.h2, color: theme.colors.text },
  subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  loadingText: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 24 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  rowTime: { fontSize: 12, color: theme.colors.textMuted },
  rowPreview: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 20,
    ...theme.shadow.lg,
  },
  modalTitle: { ...theme.typography.h3, color: theme.colors.text, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.inputBg,
  },
});
