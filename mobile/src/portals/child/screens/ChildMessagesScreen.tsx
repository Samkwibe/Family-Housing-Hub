import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useChildPortal } from '@/src/portals/child/ChildPortalContext';
import { listenToGroupChat, sendGroupMessage, listUserGroups, type ChatMessage } from '@/src/services/messaging';
import { ChildEmptyState } from '@/src/portals/child/components/ChildEmptyState';
import { childTheme } from '@/src/portals/child/theme';

export function ChildMessagesScreen() {
  const { currentUser, userProfile } = useAuth();
  const { refresh } = useChildPortal();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>('Family Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    async function initChat() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const groups = await listUserGroups(currentUser.uid);
        // Children should only ever see the default "Family Chat"
        const familyGroup = groups.find((g) => g.name === 'Family Chat') || groups[0];
        if (familyGroup) {
          setGroupId(familyGroup.id);
          setGroupName(familyGroup.name);
        } else {
          setError('No family chat group found.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load family chat');
      } finally {
        setLoading(false);
      }
    }
    initChat();
  }, [currentUser]);

  useEffect(() => {
    if (!groupId) return;
    return listenToGroupChat(groupId, (msgs) => {
      setMessages(msgs);
      // Trigger a silent refresh in portal data to update badges/chore indicators if message events triggered updates
      refresh().catch(() => {});
    });
  }, [groupId, refresh]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const onSend = async () => {
    if (!currentUser || !groupId || !text.trim()) return;
    setSending(true);
    try {
      await sendGroupMessage({
        groupId,
        senderId: currentUser.uid,
        senderName:
          currentUser.displayName ||
          `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() ||
          'Family Member',
        message: text.trim(),
      });
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={childTheme.colors.purpleDeep} />
        <Text style={styles.loadingText}>Opening chat...</Text>
      </View>
    );
  }

  if (error && !groupId) {
    return (
      <View style={styles.center}>
        <ChildEmptyState
          emoji="⚠️"
          title="Couldn't open chat"
          message={error}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{groupName}</Text>
        <Text style={styles.sub}>Messages from your family group only</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSystem = item.senderId === 'system';
          const mine = item.senderId === currentUser?.uid;

          if (isSystem) {
            return (
              <View style={styles.systemBubble}>
                <Text style={styles.systemText}>{item.message}</Text>
              </View>
            );
          }

          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {!mine && <Text style={styles.sender}>{item.senderName || 'Family Member'}</Text>}
              <Text style={[styles.messageText, mine ? styles.mineText : styles.theirsText]}>
                {item.message}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ flex: 1, paddingTop: 40 }}>
            <ChildEmptyState
              emoji="💬"
              title="No messages yet"
              message="Say hello to your family!"
            />
          </View>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message to your family..."
          placeholderTextColor={childTheme.colors.inkMuted}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={18} color={childTheme.colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: childTheme.colors.cream },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: childTheme.colors.cream, padding: 20 },
  loadingText: { fontFamily: childTheme.fonts.bodyMedium, fontSize: 16, color: childTheme.colors.inkMuted, marginTop: 12 },
  header: {
    paddingHorizontal: childTheme.spacing.xl,
    paddingTop: childTheme.spacing.xl,
    paddingBottom: childTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: childTheme.colors.cream,
  },
  title: { fontFamily: childTheme.fonts.title, fontSize: 26, fontWeight: '700', color: childTheme.colors.ink },
  sub: { fontFamily: childTheme.fonts.body, fontSize: 14, color: childTheme.colors.inkMuted, marginTop: 2 },
  list: { padding: childTheme.spacing.lg, paddingBottom: 40 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
    ...childTheme.shadow.card,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: childTheme.colors.purpleDeep,
    borderBottomRightRadius: 4,
    shadowColor: childTheme.colors.purpleDeep,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: childTheme.colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#64748B',
  },
  sender: {
    fontFamily: childTheme.fonts.bodyBold,
    fontSize: 12,
    color: childTheme.colors.purple,
    marginBottom: 4,
  },
  messageText: {
    fontFamily: childTheme.fonts.body,
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: childTheme.colors.white,
  },
  theirsText: {
    color: childTheme.colors.ink,
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: childTheme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 12,
    maxWidth: '90%',
  },
  systemText: {
    fontFamily: childTheme.fonts.bodyMedium,
    fontSize: 13,
    color: childTheme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: childTheme.spacing.md,
    backgroundColor: childTheme.colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: childTheme.colors.cream,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: childTheme.fonts.body,
    color: childTheme.colors.ink,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: childTheme.colors.purpleDeep,
    justifyContent: 'center',
    alignItems: 'center',
    ...childTheme.shadow.card,
    shadowColor: childTheme.colors.purpleDeep,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
});

