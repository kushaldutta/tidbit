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
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme/tokens';

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
  const { theme } = useTheme();
  const styles = makeStyles(theme);

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
              placeholderTextColor={theme.textMuted}
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

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.card },
  scrollContent: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
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
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: theme.primary },
  input: {
    minHeight: 96,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.text,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  confirmBtn: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.sm,
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
