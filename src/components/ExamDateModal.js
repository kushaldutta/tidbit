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
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { spacing, radius, iconSize } from '../theme/tokens';

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
  const { theme } = useTheme();
  const styles = makeStyles(theme);

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
            placeholderTextColor={theme.textMuted}
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
            <ActivityIndicator style={{ marginVertical: spacing.md }} color={theme.primary} />
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
                        {on ? <Icon name="check" size={iconSize.sm} color="#fff" /> : null}
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

const makeStyles = (theme) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    // Capped so a class with many sections cannot push the sheet off screen.
    maxHeight: '88%',
  },
  sheetContent: { padding: spacing.xxl, paddingBottom: spacing.xxxl },
  title: { fontSize: 20, fontWeight: '700', color: theme.text },
  sub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: theme.surfaceAlt,
  },
  chipOn: { backgroundColor: theme.primaryLight },
  chipText: { fontWeight: '700', color: theme.textSecondary },
  chipTextOn: { color: theme.primary },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: theme.text,
    marginBottom: spacing.sm,
  },
  quick: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickText: { fontWeight: '600', color: theme.textSecondary, fontSize: 13 },
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  selectAll: { fontSize: 13, fontWeight: '700', color: theme.primary },
  scopeList: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: theme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  scopeTitle: { flex: 1, fontSize: 14, color: theme.text, fontWeight: '600' },
  scopeCount: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  scopeNote: { fontSize: 12, color: theme.textSecondary, marginTop: spacing.sm },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  clear: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontWeight: '600',
    marginTop: spacing.md,
  },
});
