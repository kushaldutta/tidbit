/**
 * ExamDateModal — set midterm/final per class (stored on profiles.exam_dates).
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { InsightsService } from '../services/InsightsService';

const LABELS = ['Midterm', 'Final', 'Exam'];

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function ExamDateModal({
  visible,
  onClose,
  categoryId,
  classCode,
  current,
  onSaved,
}) {
  const [label, setLabel] = useState(current?.label || 'Midterm');
  const [date, setDate] = useState(current?.date || addDays(14));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setLabel(current?.label || 'Midterm');
      setDate(current?.date || addDays(14));
    }
  }, [visible, current?.date, current?.label]);

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    setSaving(true);
    const ok = await InsightsService.setExamDate(categoryId, date, label);
    setSaving(false);
    if (ok) onSaved?.({ date, label });
    onClose();
  };

  const clear = async () => {
    setSaving(true);
    await InsightsService.clearExamDate(categoryId);
    setSaving(false);
    onSaved?.(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {classCode ? `${classCode} exam` : 'Exam date'}
          </Text>
          <Text style={styles.sub}>Readiness scores count down toward this date.</Text>

          <View style={styles.row}>
            {LABELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, label === l && styles.chipOn]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.chipText, label === l && styles.chipTextOn]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-10-15"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.row}>
            {[7, 14, 30].map((n) => (
              <TouchableOpacity key={n} style={styles.quick} onPress={() => setDate(addDays(n))}>
                <Text style={styles.quickText}>In {n} days</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
          {current?.date ? (
            <TouchableOpacity onPress={clear} disabled={saving}>
              <Text style={styles.clear}>Clear exam date</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.clear}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  chipOn: { backgroundColor: '#e0e7ff' },
  chipText: { fontWeight: '700', color: '#4b5563' },
  chipTextOn: { color: '#4338ca' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 10,
  },
  quick: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: { fontWeight: '600', color: '#374151', fontSize: 13 },
  saveBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  clear: { textAlign: 'center', color: '#6b7280', fontWeight: '600', marginTop: 14 },
});
