import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { childTheme } from '@/src/portals/child/theme';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  sending?: boolean;
};

/** Floating help button — opens parent-safe help modal */
export function SosHelpButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.fab} accessibilityLabel="Get help from family" onPress={onPress}>
      <LinearGradient colors={['#FB923C', '#F97316']} style={styles.fabGrad}>
        <Ionicons name="heart" size={26} color="#FFF" />
      </LinearGradient>
    </Pressable>
  );
}

export function SosHelpModal({ visible, onClose, onConfirm, sending }: ModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🛡️</Text>
          </View>
          <Text style={styles.title}>Need help?</Text>
          <Text style={styles.body}>
            Tap below and we'll let your parent know you need them. You're safe — help is on the way.
          </Text>
          <Pressable style={[styles.primaryBtn, sending && styles.primaryBtnDisabled]} onPress={onConfirm} disabled={sending}>
            <Text style={styles.primaryText}>{sending ? 'Sending…' : 'Tell my parent'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onClose} disabled={sending}>
            <Text style={styles.secondaryText}>I'm okay — go back</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    zIndex: 20,
    ...childTheme.shadow.fab,
  },
  fabGrad: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: childTheme.colors.white,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: childTheme.colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: childTheme.colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 36 },
  title: {
    fontFamily: childTheme.fonts.title,
    fontSize: 24,
    fontWeight: '700',
    color: childTheme.colors.ink,
  },
  body: {
    fontFamily: childTheme.fonts.body,
    fontSize: 16,
    color: childTheme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: childTheme.colors.sos,
    borderRadius: childTheme.radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryText: {
    fontFamily: childTheme.fonts.bodyBold,
    color: childTheme.colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: { marginTop: 14, padding: 12 },
  secondaryText: {
    fontFamily: childTheme.fonts.bodyMedium,
    color: childTheme.colors.inkMuted,
    fontSize: 15,
  },
});
