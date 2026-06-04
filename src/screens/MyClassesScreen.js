import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClassService } from '../services/ClassService';
import { ProfileService } from '../services/ProfileService';
import { useTheme } from '../context/ThemeContext';

export default function MyClassesScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [allClasses, setAllClasses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // classId being toggled
  const [query, setQuery] = useState('');
  const [schoolId, setSchoolId] = useState('uc-berkeley');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await ProfileService.getMyProfile();
      const sid = profile?.school_id || 'uc-berkeley';
      setSchoolId(sid);
      const [classes, ids] = await Promise.all([
        ClassService.listBySchool(sid),
        ClassService.getMyClassIds(),
      ]);
      setAllClasses(classes);
      setEnrolledIds(new Set(ids));
    } catch (e) {
      Alert.alert('Error loading classes', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allClasses;
    return allClasses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.subject || '').toLowerCase().includes(q)
    );
  }, [allClasses, query]);

  const enrolled = useMemo(
    () => allClasses.filter((c) => enrolledIds.has(c.id)),
    [allClasses, enrolledIds]
  );

  const sections = useMemo(() => {
    const grouped = {};
    filtered.forEach((c) => {
      const s = c.subject || 'Other';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(c);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const toggle = async (classItem) => {
    const id = classItem.id;
    const isEnrolled = enrolledIds.has(id);
    setSaving(id);
    try {
      if (isEnrolled) {
        await ClassService.leaveClass(id);
        setEnrolledIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      } else {
        await ClassService.joinClasses([id]);
        const next = new Set([...enrolledIds, id]);
        setEnrolledIds(next);
        // Auto-select the matching content category if one exists
        await ClassService.syncCategoriesToEnrollment([...next]);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not update class.');
    } finally {
      setSaving(null);
    }
  };

  const renderClassRow = ({ item }) => {
    const enrolled = enrolledIds.has(item.id);
    const isLoading = saving === item.id;
    return (
      <TouchableOpacity
        style={[styles.row, enrolled && styles.rowEnrolled]}
        onPress={() => toggle(item)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <Text style={[styles.rowCode, enrolled && styles.rowCodeEnrolled]}>
            {item.code}
          </Text>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : (
          <View style={[styles.checkbox, enrolled && styles.checkboxEnrolled]}>
            {enrolled && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Classes</Text>
        <Text style={styles.subtitle}>
          {schoolId === 'uc-berkeley' ? 'UC Berkeley' : 'High School (AP)'} · tap to add or remove
        </Text>
      </View>

      {/* Enrolled summary chips */}
      {!loading && enrolled.length > 0 && (
        <View style={styles.enrolledSection}>
          <Text style={styles.enrolledLabel}>
            Enrolled ({enrolled.length})
          </Text>
          <View style={styles.chipRow}>
            {enrolled.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.chip}
                onPress={() => toggle(c)}
                disabled={saving === c.id}
              >
                <Text style={styles.chipText}>{c.code}</Text>
                <Text style={styles.chipX}> ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search classes…"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Class list */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderClassRow}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>No classes found for "{query}"</Text>
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 15, color: '#6366f1', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  enrolledSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  enrolledLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  chipText: { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  chipX: { fontSize: 14, color: '#818cf8', fontWeight: '700' },

  searchWrapper: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: {
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.text,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowEnrolled: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  rowInfo: { flex: 1, marginRight: 12 },
  rowCode: { fontSize: 15, fontWeight: '600', color: theme.text },
  rowCodeEnrolled: { color: '#4338ca' },
  rowTitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxEnrolled: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
});
