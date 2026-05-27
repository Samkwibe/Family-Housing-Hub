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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { listenToGroupChat, sendGroupMessage, type ChatMessage } from '@/src/services/messaging';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function GroupChatScreen() {
  const theme = useTheme();
  const styles = useAppStyles(createStyles);
  const { groupId, groupName, draft } = useLocalSearchParams<{
    groupId: string;
    groupName?: string;
    draft?: string;
  }>();
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState(draft || '');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!groupId) return;
    return listenToGroupChat(groupId, setMessages);
  }, [groupId]);

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
          'Member',
        message: text.trim(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSystem = item.senderId === 'system';
          const mine = item.senderId === currentUser?.uid;
          return (
            <View
              style={[
                styles.bubble,
                isSystem ? styles.system : mine ? styles.mine : styles.theirs,
              ]}
            >
              {!mine && !isSystem ? (
                <Text style={styles.sender}>{item.senderName || 'Member'}</Text>
              ) : null}
              <Text
                style={
                  isSystem ? styles.systemText : mine ? styles.mineText : styles.theirsText
                }
              >
                {item.message}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No messages yet in {groupName || 'group'}.</Text>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Pressable style={[styles.send, sending && styles.sendDisabled]} onPress={onSend} disabled={sending}>
          <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.border },
  system: {
    alignSelf: 'center',
    backgroundColor: `${theme.colors.primary}14`,
    maxWidth: '95%',
  },
  sender: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 },
  mineText: { color: theme.colors.textInverse, lineHeight: 20 },
  theirsText: { color: theme.colors.text, lineHeight: 20 },
  systemText: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  send: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.6 },
  sendText: { color: theme.colors.textInverse, fontWeight: '700' },
});
}
