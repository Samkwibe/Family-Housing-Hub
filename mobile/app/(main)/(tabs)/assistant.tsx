import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useHousehold } from '@/src/contexts/HouseholdContext';
import { useVoiceAssistant } from '@/src/hooks/useVoiceAssistant';
import { getRoleExperience, normalizeUserType } from '@/src/config/userExperience';
import { useTabScreenInsets } from '@/src/hooks/useTabScreenInsets';
import api from '@/src/services/api';
import { theme } from '@/src/theme';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

const AI_PERSONAS = [
  { id: 'general', label: 'Household AI', icon: 'sparkles' as const, color: '#A78BFA' },
  { id: 'chef', label: 'Chef AI', icon: 'restaurant' as const, color: '#F59E0B' },
  { id: 'budget', label: 'Budget AI', icon: 'cash' as const, color: '#14B8A6' },
  { id: 'maintenance', label: 'Fix AI', icon: 'construct' as const, color: '#EF4444' },
  { id: 'wellness', label: 'Wellness AI', icon: 'heart' as const, color: '#EC4899' },
];

export default function AssistantScreen() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const { userProfile } = useAuth();
  const { buildAiContext } = useHousehold();
  const { scrollBottomPadding } = useTabScreenInsets();
  const userType = normalizeUserType(userProfile?.userType);
  const roleExp = getRoleExperience(userType);
  const suggestions = roleExp.aiSuggestions;
  const [persona, setPersona] = useState('general');
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: '0',
      role: 'assistant',
      text: `Hi! I'm FamilyHub AI — your household brain. ${roleExp.aiGreeting}`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const prompted = useRef(false);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const speakRef = useRef<(text: string) => void>(() => {});

  const onVoiceTranscript = useCallback((text: string) => {
    setInput(text);
    sendRef.current(text);
  }, []);

  const {
    isListening,
    isSpeaking,
    voiceRepliesEnabled,
    setVoiceRepliesEnabled,
    speechAvailable,
    toggleListening,
    speak,
    stopSpeaking,
  } = useVoiceAssistant({
    onTranscript: onVoiceTranscript,
    onInterimTranscript: setInput,
  });

  speakRef.current = speak;

  const send = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;
      setInput('');
      const userMsg: Msg = { id: Date.now().toString(), role: 'user', text };
      setMessages((m) => [...m, userMsg]);
      setLoading(true);
      try {
        const res = await api.aiChat(text, {
          userType: userProfile?.userType || 'renter',
          user_role: userProfile?.userType || 'renter',
          firstName: userProfile?.firstName,
          aiPersona: persona,
          householdContext: buildAiContext(),
        });
        const reply = res.response || res.message || 'No response from AI service.';
        const replyText = String(reply);
        setMessages((m) => [
          ...m,
          { id: Date.now() + '-a', role: 'assistant', text: replyText },
        ]);
        speakRef.current(replyText);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (e: unknown) {
        const errText = `Sorry, the assistant is unavailable: ${(e as Error).message}`;
        setMessages((m) => [
          ...m,
          { id: Date.now() + '-e', role: 'assistant', text: errText },
        ]);
        speakRef.current(errText);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, userProfile?.firstName, userProfile?.userType, persona, buildAiContext]
  );

  sendRef.current = send;

  useEffect(() => {
    if (prompt && typeof prompt === 'string' && !prompted.current) {
      prompted.current = true;
      send(prompt);
    }
  }, [prompt, send]);

  const renderMessage = ({ item }: { item: Msg }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
      {item.role === 'assistant' ? (
        <View style={styles.botHeader}>
          <View style={styles.botLabel}>
            <Ionicons name="sparkles" size={12} color="#A78BFA" />
            <Text style={styles.botLabelText}>AI</Text>
          </View>
          <Pressable
            style={styles.speakBtn}
            onPress={() => (isSpeaking ? stopSpeaking() : speak(item.text))}
            accessibilityLabel={isSpeaking ? 'Stop speaking' : 'Listen to response'}
          >
            <Ionicons
              name={isSpeaking ? 'stop-circle' : 'volume-high'}
              size={16}
              color="#A78BFA"
            />
          </Pressable>
        </View>
      ) : null}
      <Text style={item.role === 'user' ? styles.userText : styles.botText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.aiHeader}>
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles" size={22} color="#F59E0B" />
        </View>
        <View style={styles.aiHeaderText}>
          <Text style={styles.aiTitle}>FamilyHub AI</Text>
          <Text style={styles.aiSub}>Household brain · Voice + text</Text>
        </View>
        <Pressable
          style={[styles.voiceToggle, voiceRepliesEnabled && styles.voiceToggleOn]}
          onPress={() => {
            if (voiceRepliesEnabled && isSpeaking) stopSpeaking();
            setVoiceRepliesEnabled((v) => !v);
          }}
          accessibilityLabel={voiceRepliesEnabled ? 'Disable spoken replies' : 'Enable spoken replies'}
        >
          <Ionicons
            name={voiceRepliesEnabled ? 'volume-high' : 'volume-mute'}
            size={18}
            color={voiceRepliesEnabled ? '#F59E0B' : theme.colors.textMuted}
          />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.personaScroll} contentContainerStyle={styles.personaContent}>
        {AI_PERSONAS.map((p) => {
          const active = persona === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.personaChip, active && { borderColor: p.color, backgroundColor: `${p.color}18` }]}
              onPress={() => setPersona(p.id)}
            >
              <Ionicons name={p.icon} size={14} color={active ? p.color : theme.colors.textMuted} />
              <Text style={[styles.personaText, active && { color: p.color }]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {isListening ? (
          <View style={styles.listeningBar}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>Listening… speak your question</Text>
            <Pressable onPress={toggleListening} hitSlop={8}>
              <Text style={styles.listeningStop}>Done</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            messages.length <= 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {suggestions.map((s) => (
                  <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                    <Ionicons name="sparkles" size={12} color="#A78BFA" />
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null
          }
          renderItem={renderMessage}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primaryLight} />
            <Text style={styles.loadingText}>Thinking…</Text>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <Pressable
            style={[
              styles.micBtn,
              isListening && styles.micBtnActive,
              !speechAvailable && styles.micBtnDisabled,
            ]}
            onPress={toggleListening}
            disabled={loading || !speechAvailable}
            accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={22}
              color={isListening ? '#fff' : '#A78BFA'}
            />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={isListening ? 'Listening…' : 'Ask anything about housing…'}
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isListening}
          />
          <Pressable
            style={[styles.send, (loading || !input.trim()) && styles.sendDisabled]}
            onPress={() => send()}
            disabled={loading || !input.trim()}
          >
            <Ionicons name="arrow-forward" size={20} color={theme.colors.ctaYellow} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeaderText: { flex: 1 },
  aiTitle: { fontSize: 18, fontFamily: theme.fonts.title, fontWeight: '800', color: theme.colors.text },
  aiSub: { fontSize: 11, fontFamily: theme.fonts.body, color: theme.colors.textSecondary, marginTop: 2 },
  personaScroll: { maxHeight: 44, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  personaContent: { paddingHorizontal: 16, paddingVertical: 8 },
  personaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  personaText: { fontSize: 11, fontFamily: theme.fonts.bodyBold, color: theme.colors.textMuted },
  voiceToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceToggleOn: {
    borderColor: 'rgba(245,158,11,.35)',
    backgroundColor: 'rgba(245,158,11,.1)',
  },
  flex: { flex: 1 },
  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(124,58,237,.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.35)',
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  listeningText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#A78BFA' },
  listeningStop: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  list: { padding: 16, paddingBottom: 8 },
  chipsScroll: { marginBottom: 12, maxHeight: 40 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.28)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },
  bubble: { maxWidth: '88%', padding: 14, borderRadius: 16, marginBottom: 10 },
  user: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  botLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  botLabelText: { fontSize: 10, fontWeight: '700', color: '#A78BFA', letterSpacing: 0.5 },
  speakBtn: { padding: 2 },
  userText: { color: theme.colors.textInverse, lineHeight: 22, fontSize: 15 },
  botText: { color: theme.colors.text, lineHeight: 22, fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  loadingText: { fontSize: 12, color: theme.colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    backgroundColor: theme.colors.tabBar,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  micBtnDisabled: { opacity: 0.4 },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  send: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
