import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ClassService } from '../services/ClassService';
import { ProfileService } from '../services/ProfileService';
import { useTheme } from '../context/ThemeContext';
import CatalogSegmentedControl from '../components/CatalogSegmentedControl';
import { DEFAULT_SCHOOL_ID, getSchool, schoolIdForClassId } from '../config/schools';

export default function MyClassesScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [catalogSchoolId, setCatalogSchoolId] = useState(DEFAULT_SCHOOL_ID);
  const [profileSchoolId, setProfileSchoolId] = useState(DEFAULT_SCHOOL_ID);
  const [catalogClasses, setCatalogClasses] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [query, setQuery] = useState('');

  const catalogSchool = getSchool(catalogSchoolId);

  const loadEnrollments = useCallback(async () => {
    const ids = await ClassService.getMyClassIds();
    setEnrolledIds(new Set(ids));
    const enrolled = await ClassService.getClassesByIds(ids);
    setEnrolledClasses(enrolled);
  }, []);

  const loadCatalog = useCallback(async (schoolId) => {
    setCatalogLoading(true);
    try {
      const classes = await ClassService.listBySchool(schoolId);
      setCatalogClasses(classes);
    } catch (e) {
      Alert.alert('Error loading classes', e.message);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await ProfileService.getMyProfile();
      const defaultSchool = profile?.school_id || DEFAULT_SCHOOL_ID;
      setProfileSchoolId(defaultSchool);
      setCatalogSchoolId(defaultSchool);
      await Promise.all([loadEnrollments(), loadCatalog(defaultSchool)]);
    } catch (e) {
      Alert.alert('Error loading classes', e.message);
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadEnrollments]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCatalogChange = useCallback((schoolId) => {
    setCatalogSchoolId(schoolId);
    setQuery('');
    loadCatalog(schoolId);
  }, [loadCatalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogClasses;
    return catalogClasses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.subject || '').toLowerCase().includes(q)
    );
  }, [catalogClasses, query]);

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
        const next = new Set(enrolledIds);
        next.delete(id);
        setEnrolledIds(next);
        setEnrolledClasses((prev) => prev.filter((c) => c.id !== id));
        await ClassService.replaceCategoriesToEnrollment([...next]);
      } else {
        await ClassService.joinClasses([id]);
        const next = new Set([...enrolledIds, id]);
        setEnrolledIds(next);
        setEnrolledClasses((prev) => {
          if (prev.some((c) => c.id === id)) return prev;
          return [...prev, classItem];
        });
        await ClassService.replaceCategoriesToEnrollment([...next]);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not update class.');
      await loadEnrollments();
    } finally {
      setSaving(null);
    }
  };

  const renderClassRow = ({ item }) => {
    const enrolled = enrolledIds.has(item.id);
    const isLoading = saving === item.id;
    const hasContent = ClassService.hasTidbitContent(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, enrolled && styles.rowEnrolled]}
        onPress={() => toggle(item)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <View style={styles.rowTitleLine}>
            <Text style={[styles.rowCode, enrolled && styles.rowCodeEnrolled]}>
              {item.code}
            </Text>
            {!hasContent && (
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>Soon</Text>
              </View>
            )}
          </View>
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

  const showCatalogSpinner = loading || catalogLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Classes</Text>
        <Text style={styles.subtitle}>{catalogSchool.browseSubtitle}</Text>
      </View>

      <View style={styles.segmentWrap}>
        <CatalogSegmentedControl
          value={catalogSchoolId}
          onChange={handleCatalogChange}
          theme={theme}
          preferredSchoolId={profileSchoolId}
        />
      </View>

      {!loading && enrolledClasses.length > 0 && (
        <View style={styles.enrolledSection}>
          <Text style={styles.enrolledLabel}>
            Enrolled ({enrolledClasses.length})
          </Text>
          <View style={styles.chipRow}>
            {enrolledClasses.map((c) => {
              const school = getSchool(c.school_id || schoolIdForClassId(c.id));
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.chip}
                  onPress={() => toggle(c)}
                  disabled={saving === c.id}
                >
                  <Text style={styles.chipEmoji}>{school.emoji}</Text>
                  <Text style={styles.chipText}>{c.code}</Text>
                  <Text style={styles.chipX}> ×</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder={catalogSchool.searchPlaceholder}
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {showCatalogSpinner ? (
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

  segmentWrap: { paddingHorizontal: 16, paddingBottom: 12 },

  enrolledSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
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
  chipEmoji: { fontSize: 12, marginRight: 4 },
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
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowCode: { fontSize: 15, fontWeight: '600', color: theme.text },
  rowCodeEnrolled: { color: '#4338ca' },
  rowTitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  soonBadge: {
    backgroundColor: '#fef3c7', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  soonBadgeText: { fontSize: 10, fontWeight: '700', color: '#b45309' },

  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxEnrolled: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
});
