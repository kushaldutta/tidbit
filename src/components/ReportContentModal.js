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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReportService } from '../services/ReportService';

export default function ReportContentModal({
  visible,
  title = 'Report content',
  description = 'Tell us what is wrong. Reports are reviewed by the Tidbit team.',
  onClose,
  onSubmit,
}) {
  const [category, setCategory] = useState('inappropriate');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setCategory('inappropriate');
      setDetails('');
      setSubmitting(false);
    }
  }, [visible]);

  const needsDetails = category === 'other';
  const canSubmit = category && (!needsDetails || details.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ category, details: details.trim() || null });
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

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.description}>{description}</Text>

            <Text style={styles.label}>Why are you reporting this?</Text>
            <View style={styles.chips}>
              {ReportService.REPORT_CATEGORIES.map((item) => {
                const active = category === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCategory(item.id)}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>
              {needsDetails ? 'Details (required)' : 'Additional details (optional)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                needsDetails
                  ? 'Describe the issue…'
                  : 'Anything else we should know?'
              }
              placeholderTextColor="#9ca3af"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
              editable={!submitting}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmBtn, (!canSubmit || submitting) && styles.confirmBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Submit report</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
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
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  chipTextActive: { color: '#4338ca' },
  input: {
    minHeight: 96,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  confirmBtn: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
