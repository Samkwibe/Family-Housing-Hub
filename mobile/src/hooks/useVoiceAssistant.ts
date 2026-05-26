import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Speech from 'expo-speech';

type SpeechRecognitionEventHandler = (...args: unknown[]) => void;

type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
};

const noopHook = (_event: string, _cb: SpeechRecognitionEventHandler) => {};

let ExpoSpeechRecognitionModule: SpeechRecognitionModule | null = null;
let useSpeechRecognitionEvent: (
  event: string,
  cb: SpeechRecognitionEventHandler
) => void = noopHook;

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  /* Expo Go — native speech recognition module not linked */
}

type UseVoiceAssistantOptions = {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
};

export function useVoiceAssistant({
  onTranscript,
  onInterimTranscript,
}: UseVoiceAssistantOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(true);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const pendingTranscript = useRef('');
  const listeningRef = useRef(false);

  useEffect(() => {
    if (!ExpoSpeechRecognitionModule) {
      setSpeechAvailable(false);
      return;
    }
    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      setSpeechAvailable(available);
    } catch {
      setSpeechAvailable(Platform.OS === 'web');
    }
  }, []);

  useSpeechRecognitionEvent('start', () => {
    listeningRef.current = true;
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    listeningRef.current = false;
    setIsListening(false);
    const text = pendingTranscript.current.trim();
    pendingTranscript.current = '';
    if (text) {
      onTranscript(text);
    }
  });

  useSpeechRecognitionEvent('result', (event: unknown) => {
    const e = event as {
      results?: { transcript?: string }[];
      isFinal?: boolean;
    };
    const text = e.results?.[0]?.transcript?.trim() ?? '';
    if (!text) return;
    pendingTranscript.current = text;
    onInterimTranscript?.(text);
    if (e.isFinal && listeningRef.current && ExpoSpeechRecognitionModule) {
      ExpoSpeechRecognitionModule.stop();
    }
  });

  useSpeechRecognitionEvent('error', (event: unknown) => {
    const e = event as { error?: string; message?: string };
    listeningRef.current = false;
    setIsListening(false);
    if (e.error === 'aborted' || e.error === 'no-speech') return;
    Alert.alert('Voice input', e.message || 'Could not recognize speech. Try again.');
  });

  const ensurePermissions = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule) return false;
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Microphone access needed',
        'Allow microphone and speech recognition so you can talk to FamilyHub AI.'
      );
      return false;
    }
    return true;
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceRepliesEnabled || !text.trim()) return;
      stopSpeaking();
      const cleaned = text.replace(/\s+/g, ' ').trim();
      setIsSpeaking(true);
      Speech.speak(cleaned, {
        language: 'en-US',
        rate: Platform.OS === 'ios' ? 0.95 : 1,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [stopSpeaking, voiceRepliesEnabled]
  );

  const startListening = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule || !speechAvailable) {
      Alert.alert(
        'Voice unavailable',
        'Voice input requires a development build. Text chat works in Expo Go — type your questions below.'
      );
      return;
    }
    const ok = await ensurePermissions();
    if (!ok) return;

    stopSpeaking();
    pendingTranscript.current = '';
    onInterimTranscript?.('');

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        addsPunctuation: true,
        iosVoiceProcessingEnabled: true,
      });
    } catch (e: unknown) {
      Alert.alert('Voice input', (e as Error).message || 'Could not start listening.');
    }
  }, [ensurePermissions, onInterimTranscript, speechAvailable, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (!listeningRef.current || !ExpoSpeechRecognitionModule) return;
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      return;
    }
    await startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule?.abort();
      } catch {
        /* noop */
      }
      Speech.stop();
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    voiceRepliesEnabled,
    setVoiceRepliesEnabled,
    speechAvailable,
    toggleListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
