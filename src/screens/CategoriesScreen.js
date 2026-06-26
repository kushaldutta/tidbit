import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ClassService } from '../services/ClassService';
import { ProfileService } from '../services/ProfileService';
import { useTheme } from '../context/ThemeContext';
import CatalogSegmentedControl from '../components/CatalogSegmentedControl';
import { DEFAULT_SCHOOL_ID, getSchool, schoolIdForClassId } from '../config/schools';

const SUBJECT_EMOJI = {
  'Computer Science':  '💻',
  'Mathematics':       '📐',
  'Data Science':      '📊',
  'Statistics':        '📊',
  'Economics':         '📈',
  'Physics':           '⚛️',
  'Chemistry':         '🧪',
  'Biology':           '🔬',
  'EECS':              '⚡',
  'Molecular Biology': '🔬',
  'Psychology':        '🧠',
  'Nuclear Engineering': '☢️',
  'Classics':          '🏛️',
  'History':           '📜',
  'English':           '📚',
  'Language':          '🌍',
  'Geography':         '🌎',
  'Social Studies':    '🌍',
  'Science':           '🔬',
  'Art':               '🎨',
  'Books':             '📖',
  'Life Skills':       '🌱',
  'Languages':         '🗣️',
  'Philosophy':        '💭',
  'General Knowledge': '🧠',
  'Technology':        '💻',
  'Business':          '💼',
};

function SubjectSection({ subject, emoji, classes, enrolledIds, saving, onToggle, query }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [open, setOpen] = useState(false);

  const filtered = query
    ? classes.filter(
        (c) =>
          c.code.toLowerCase().includes(query.toLowerCase()) ||
          c.title.toLowerCase().includes(query.toLowerCase())
      )
    : classes;

  if (filtered.length === 0) return null;

  const enrolledCount = filtered.filter((c) => enrolledIds.has(c.id)).length;
  const isOpen = open || !!query;

  return (
    <View style={styles.deptSection}>
      <TouchableOpacity style={styles.deptHeader} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Text style={styles.deptEmoji}>{emoji}</Text>
        <Text style={styles.deptName}>{subject}</Text>
        {enrolledCount > 0 && (
          <View style={styles.deptBadge}>
            <Text style={styles.deptBadgeText}>{enrolledCount}</Text>
          </View>
        )}
        <Text style={styles.chevron}>{isOpen ? '›' : '›'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.catList}>
          {filtered.map((cls) => {
            const active = enrolledIds.has(cls.id);
            const isLoading = saving === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.catRow, active && styles.catRowActive]}
                onPress={() => onToggle(cls)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.catInfo}>
                  <View style={styles.catTitleRow}>
                    <Text style={[styles.catName, active && styles.catNameActive]}>{cls.code}</Text>
                  </View>
                  <Text style={styles.catDesc} numberOfLines={1}>{cls.title}</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <View style={[styles.check, active && styles.checkActive]}>
                    {active && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function CategoriesScreen() {
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
    const myIds = await ClassService.getMyClassIds();
    setEnrolledIds(new Set(myIds));
    const enrolled = await ClassService.getClassesByIds(myIds);
    setEnrolledClasses(enrolled);
    return myIds;
  }, []);

  const loadCatalog = useCallback(async (schoolId, { silent = false } = {}) => {
    if (!silent) setCatalogLoading(true);
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
      await loadEnrollments();
      await ClassService.ensureCategoriesSyncedToEnrollments();
      await loadCatalog(defaultSchool, { silent: true });
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

  const toggle = useCallback(async (cls) => {
    const isEnrolled = enrolledIds.has(cls.id);
    setSaving(cls.id);
    try {
      if (isEnrolled) {
        await ClassService.leaveClass(cls.id);
        const next = new Set(enrolledIds);
        next.delete(cls.id);
        setEnrolledIds(next);
        setEnrolledClasses((prev) => prev.filter((c) => c.id !== cls.id));
        await ClassService.replaceCategoriesToEnrollment([...next]);
      } else {
        await ClassService.joinClasses([cls.id]);
        const next = new Set([...enrolledIds, cls.id]);
        setEnrolledIds(next);
        setEnrolledClasses((prev) => {
          if (prev.some((c) => c.id === cls.id)) return prev;
          return [...prev, cls];
        });
        await ClassService.replaceCategoriesToEnrollment([...next]);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not update class.');
      await loadEnrollments();
    } finally {
      setSaving(null);
    }
  }, [enrolledIds, loadEnrollments]);

  const sections = useMemo(() => {
    const grouped = {};
    catalogClasses.forEach((c) => {
      const s = c.subject || 'Other';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(c);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [catalogClasses]);

  const showCatalogSpinner = loading || catalogLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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

      {enrolledClasses.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedLabel}>Enrolled ({enrolledClasses.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {enrolledClasses.map((c) => {
              const school = getSchool(c.school_id || schoolIdForClassId(c.id));
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.chip}
                  onPress={() => toggle(c)}
                  disabled={saving === c.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{school.emoji}</Text>
                  <Text style={styles.chipText}>{c.code}</Text>
                  <Text style={styles.chipX}> ×</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.searchWrap}>
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {enrolledIds.size === 0 && !query && (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintEmoji}>☝️</Text>
              <Text style={styles.emptyHintText}>
                Pick at least one class to start receiving tidbits and join study groups
              </Text>
            </View>
          )}

          {sections.map(([subject, classes]) => (
            <SubjectSection
              key={subject}
              subject={subject}
              emoji={SUBJECT_EMOJI[subject] || '📖'}
              classes={classes}
              enrolledIds={enrolledIds}
              saving={saving}
              onToggle={toggle}
              query={query}
            />
          ))}

          {sections.length === 0 && (
            <Text style={styles.emptyCatalog}>No classes found.</Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },

  segmentWrap: { paddingHorizontal: 16, paddingBottom: 12 },

  selectedSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  chipScroll: { flexDirection: 'row', gap: 6, paddingRight: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eef2ff', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 13,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  chipEmoji: { fontSize: 12, marginRight: 4 },
  chipText: { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  chipX: { fontSize: 14, color: '#818cf8', fontWeight: '700' },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    backgroundColor: theme.card, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: theme.text,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  emptyHint: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: theme.card, borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  emptyHintEmoji: { fontSize: 30, marginBottom: 8 },
  emptyHintText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  emptyCatalog: { textAlign: 'center', color: theme.textSecondary, marginTop: 24, fontSize: 14 },

  deptSection: {
    backgroundColor: theme.card, borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    marginBottom: 10, overflow: 'hidden',
  },
  deptHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  deptEmoji: { fontSize: 20 },
  deptName: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.text },
  deptBadge: {
    backgroundColor: '#6366f1', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  deptBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  chevron: { fontSize: 22, color: '#9ca3af', fontWeight: '700' },

  catList: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
    backgroundColor: theme.background,
  },
  catRowActive: { backgroundColor: '#f5f3ff' },
  catInfo: { flex: 1, paddingRight: 12 },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catName: { fontSize: 14, fontWeight: '600', color: theme.text },
  catNameActive: { color: '#4338ca' },
  catDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
