import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppTheme } from '@/src/theme';
import { useAppStyles } from '@/src/hooks/useStyles';
import { hapticForToast } from '@/src/portals/shared/haptics';
import { motion } from '@/src/portals/shared/motion';

type ToastKind = 'success' | 'error' | 'info';

type ToastOptions = {
  /** Softer parent-style toast — slower, quieter, no success haptic */
  ambient?: boolean;
};

type ToastState = {
  message: string;
  kind: ToastKind;
  ambient: boolean;
} | null;

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const styles = useAppStyles(createStyles);
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientRef = useRef(false);

  const hide = useCallback(() => {
    const timing = ambientRef.current ? motion.toastAmbient : motion.toast;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: timing.fadeOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: ambientRef.current ? motion.toastAmbient.translateIn : 8,
        duration: timing.fadeOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success', options?: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      const ambient = options?.ambient ?? false;
      ambientRef.current = ambient;
      const timing = ambient ? motion.toastAmbient : motion.toast;
      if (!ambient || kind === 'error') {
        void hapticForToast(kind);
      }
      setToast({ message, kind, ambient });
      translateY.setValue(ambient ? motion.toastAmbient.translateIn : 8);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: timing.fadeIn,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: timing.fadeIn,
          useNativeDriver: true,
        }),
      ]).start();
      timer.current = setTimeout(hide, timing.visibleMs);
    },
    [hide, opacity, translateY]
  );

  const value = useMemo(
    () => ({
      showToast,
      success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
      error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
      info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
    }),
    [showToast]
  );

  const icon =
    toast?.kind === 'error' ? 'alert-circle' : toast?.kind === 'info' ? 'information-circle' : 'checkmark-circle';
  const bg = toast?.ambient
    ? toast.kind === 'error'
      ? 'rgba(239,68,68,.92)'
      : toast.kind === 'info'
        ? 'rgba(124,58,237,.88)'
        : 'rgba(91,33,182,.82)'
    : toast?.kind === 'error'
      ? 'rgba(239,68,68,.95)'
      : toast?.kind === 'info'
        ? 'rgba(124,58,237,.95)'
        : 'rgba(20,184,166,.95)';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.wrap,
            toast.ambient && styles.wrapAmbient,
            { opacity, transform: [{ translateY }] },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={[styles.toast, toast.ambient && styles.toastAmbient, { backgroundColor: bg }]}
            onPress={hide}
          >
            <Ionicons name={icon} size={toast.ambient ? 16 : 18} color="#fff" />
            <Text style={[styles.text, toast.ambient && styles.textAmbient]}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const styles = useAppStyles(createStyles);
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  // Stable helpers — callers use toast.error/success/info (not only showToast).
  return {
    showToast: ctx.showToast,
    success: ctx.success ?? ((message: string, options?: ToastOptions) => ctx.showToast(message, 'success', options)),
    error: ctx.error ?? ((message: string, options?: ToastOptions) => ctx.showToast(message, 'error', options)),
    info: ctx.info ?? ((message: string, options?: ToastOptions) => ctx.showToast(message, 'info', options)),
  };
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    zIndex: 9999,
    alignItems: 'center',
  },
  wrapAmbient: {
    bottom: 108,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  toastAmbient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
  },
  textAmbient: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    opacity: 0.96,
  },
});
}
