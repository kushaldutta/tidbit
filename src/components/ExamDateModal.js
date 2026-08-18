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
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { InsightsService } from '../services/InsightsService';
import { ContentService } from '../services/ContentService';
import { DeckService } from '../services/DeckService';

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
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [chosen, setChosen] = useState(() => new Set());

  useEffect(() => {
    if (visible) {
      setLabel(current?.label || 'Midterm');
      setDate(current?.date || addDays(14));
    }
  }, [visible, current?.date, current?.label]);

  // Load the class's sections so the user can say what the exam actually covers.
  useEffect(() => {
    if (!visible || !categoryId) return;
    let cancelled = false;
    setLoadingSections(true);
    (async () => {
      try {
        const deckId = await ContentService.getPresetDeckIdForSlug(categoryId);
        const list = deckId ? await DeckService.listSectionsWithCounts(deckId) : [];
        const withCards = list.filter((s) => s.cardCount > 0);
        if (cancelled) return;
        setSections(withCards);
        // No stored scope means "everything", which is also the right default
        // for a class being set up for the first time.
        setChosen(
          current?.sectionIds?.length
            ? new Set(current.sectionIds)
            : new Set(withCards.map((s) => s.id)),
        );
      } catch {
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setLoadingSections(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, categoryId, current?.sectionIds]);

  const allChosen = sections.length > 0 && chosen.size === sections.length;

  const toggleSection = (id) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setChosen(allChosen ? new Set() : new Set(sections.map((s) => s.id)));
  };

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (sections.length > 0 && chosen.size === 0) return; // nothing to forecast against
    setSaving(true);
    // Storing null for "all of it" keeps a final covering sections the deck
    // gains later, instead of freezing today's list.
    const sectionIds = allChosen || !sections.length ? null : [...chosen];
    const ok = await InsightsService.setExamDate(categoryId, date, label, sectionIds);
    setSaving(false);
    if (ok) onSaved?.({ date, label, sectionIds });
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
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.title}>
            {classCode ? `${classCode} exam` : 'Exam date'}
          </Text>
          <Text style={styles.sub}>
            Your exam-day forecast counts down toward this date.
          </Text>

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

          {loadingSections && (
            <ActivityIndicator style={{ marginVertical: 12 }} color="#4f46e5" />
          )}

          {!loadingSections && sections.length > 0 && (
            <>
              <View style={styles.scopeHeader}>
                <Text style={styles.fieldLabel}>What's on this exam?</Text>
                <TouchableOpacity onPress={toggleAll}>
                  <Text style={styles.selectAll}>
                    {allChosen ? 'Clear all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scopeList}>
                {sections.map((section) => {
                  const on = chosen.has(section.id);
                  return (
                    <TouchableOpacity
                      key={section.id}
                      style={styles.scopeRow}
                      onPress={() => toggleSection(section.id)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={styles.scopeTitle} numberOfLines={2}>
                        {section.title}
                      </Text>
                      <Text style={styles.scopeCount}>{section.cardCount}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.scopeNote}>
                {chosen.size === 0
                  ? 'Pick at least one section to forecast against.'
                  : allChosen
                    ? 'Covering the whole class.'
                    : `Forecasting against ${chosen.size} of ${sections.length} sections.`}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.saveBtn,
              (saving || (sections.length > 0 && chosen.size === 0)) && { opacity: 0.5 },
            ]}
            onPress={save}
            disabled={saving || (sections.length > 0 && chosen.size === 0)}
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
          </ScrollView>
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
    // Capped so a class with many sections cannot push the sheet off screen.
    maxHeight: '88%',
  },
  sheetContent: { padding: 22, paddingBottom: 36 },
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
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectAll: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  scopeList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  scopeTitle: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '600' },
  scopeCount: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  scopeNote: { fontSize: 12, color: '#6b7280', marginTop: 8 },
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
