/**
 * Pick or create a discussion section within a class group.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { GroupService } from '../services/GroupService';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme/tokens';

export default function SectionPickerModal({
  visible,
  onClose,
  classId,
  classCode,
  onChanged,
}) {
  const [sections, setSections] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const load = async () => {
    setLoading(true);
    try {
      const [list, my] = await Promise.all([
        GroupService.listSections(classId),
        GroupService.getMySection(classId),
      ]);
      setSections(list);
      setMine(my);
    } catch (e) {
      console.warn('[SectionPicker]', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setCreating(false);
      setName('');
      load();
    }
  }, [visible, classId]);

  const join = async (groupId) => {
    setBusy(true);
    try {
      await GroupService.joinSection(groupId);
      await load();
      onChanged?.();
    } catch (e) {
      Alert.alert('Couldn’t join', e.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const id = await GroupService.createSection(classId, trimmed);
      if (id) await GroupService.joinSection(id);
      setCreating(false);
      setName('');
      await load();
      onChanged?.();
    } catch (e) {
      Alert.alert('Couldn’t create section', e.message || 'Try a different name.');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await GroupService.leaveSection(classId);
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{classCode} sections</Text>
          <Text style={styles.sub}>Join your discussion section so you study with the people in the room.</Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: spacing.xl }} />
          ) : (
            <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
              {sections.length === 0 && !creating && (
                <Text style={styles.empty}>No sections yet — create yours (e.g. Section 103).</Text>
              )}
              {sections.map((s) => {
                const isMine = mine?.groupId === s.groupId;
                return (
                  <TouchableOpacity
                    key={s.groupId}
                    style={[styles.row, isMine && styles.rowMine]}
                    onPress={() => !isMine && join(s.groupId)}
                    disabled={busy || isMine}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{s.name}</Text>
                      <Text style={styles.rowSub}>
                        {s.memberCount} member{s.memberCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={styles.rowAction}>{isMine ? 'Yours' : 'Join'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {creating ? (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={styles.input}
                placeholder="Section 103"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, (!name.trim() || busy) && { opacity: 0.4 }]}
                onPress={create}
                disabled={!name.trim() || busy}
              >
                <Text style={styles.saveText}>Create & join</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCreating(false)}>
                <Text style={styles.clear}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.createBtn} onPress={() => setCreating(true)}>
              <Text style={styles.createText}>+ Create a section</Text>
            </TouchableOpacity>
          )}

          {mine && !creating && (
            <TouchableOpacity onPress={leave} disabled={busy}>
              <Text style={styles.clear}>Leave {mine.name}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.done}>Done</Text>
          </TouchableOpacity>
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
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.text },
  sub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  empty: { fontSize: 14, color: theme.textSecondary, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: theme.surfaceAlt,
    marginBottom: spacing.sm,
  },
  rowMine: {
    backgroundColor: theme.primaryLight,
    borderWidth: 1.5,
    borderColor: theme.primary,
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  rowSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  rowAction: { fontWeight: '700', color: theme.primary },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.sm,
    color: theme.text,
  },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  createBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  createText: { color: theme.primary, fontWeight: '700', fontSize: 15 },
  clear: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  done: {
    textAlign: 'center',
    color: theme.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
    fontSize: 16,
  },
});
