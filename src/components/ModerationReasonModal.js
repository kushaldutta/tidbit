import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme/tokens';

export default function ModerationReasonModal({
  visible,
  title,
  description,
  confirmLabel = 'Remove',
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  useEffect(() => {
    if (visible) {
      setReason('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{description}</Text>

          <Text style={styles.label}>Reason (required)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. inappropriate language, spam, off-topic"
            placeholderTextColor={theme.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
            editable={!submitting}
            autoFocus
          />

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!reason.trim() || submitting) && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!reason.trim() || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.card, paddingHorizontal: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    flex: 1,
    marginRight: spacing.md,
  },
  cancelText: { fontSize: 16, color: theme.textSecondary, fontWeight: '500' },
  description: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 100,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.text,
    textAlignVertical: 'top',
    marginBottom: spacing.xxl,
  },
  confirmBtn: {
    backgroundColor: theme.danger,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
