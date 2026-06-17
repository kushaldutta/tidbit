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
            placeholderTextColor="#9ca3af"
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1, marginRight: 12 },
  cancelText: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  description: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 100,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  confirmBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
