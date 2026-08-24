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
import Icon from '../components/Icon';
import { spacing, radius, iconSize } from '../theme/tokens';
import { DEFAULT_SCHOOL_ID, getSchool } from '../config/schools';

function SubjectSection({ subject, classes, enrolledIds, saving, onToggle, query }) {
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
        <Text style={styles.deptName}>{subject}</Text>
        {enrolledCount > 0 && (
          <View style={styles.deptBadge}>
            <Text style={styles.deptBadgeText}>{enrolledCount}</Text>
          </View>
        )}
        <Icon
          name={isOpen ? 'collapse' : 'expand'}
          size={iconSize.md}
          color={theme.textMuted}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.catList}>
          {filtered.map((cls, i) => {
            const active = enrolledIds.has(cls.id);
            const isLoading = saving === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[
                  styles.catRow,
                  active && styles.catRowActive,
                  i === filtered.length - 1 && styles.catRowLast,
                ]}
                onPress={() => onToggle(cls)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, active && styles.catNameActive]}>{cls.code}</Text>
                  <Text style={styles.catDesc} numberOfLines={1}>{cls.title}</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : active ? (
                  <Icon name="check" size={iconSize.lg} color={theme.primary} filled />
                ) : (
                  <View style={styles.checkEmpty} />
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
        <Text style={styles.subtitle}>Enroll to get tidbits</Text>
      </View>

      <View style={styles.gutter}>
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
            {enrolledClasses.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.chip}
                onPress={() => toggle(c)}
                disabled={saving === c.id}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{c.code}</Text>
                <Icon name="close" size={iconSize.sm} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Icon name="search" size={iconSize.md} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={catalogSchool.searchPlaceholder}
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {showCatalogSpinner ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {enrolledIds.size === 0 && !query && (
            <View style={styles.emptyHint}>
              <Icon name="info" size={iconSize.md} color={theme.info} style={styles.emptyHintIcon} />
              <Text style={styles.emptyHintText}>
                Pick at least one class to start getting tidbits and join study groups.
              </Text>
            </View>
          )}

          {sections.map(([subject, classes]) => (
            <SubjectSection
              key={subject}
              subject={subject}
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

  /** Every band on this screen shares one gutter so the left edge is a straight line. */
  gutter: { paddingHorizontal: spacing.xl },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 42, fontWeight: 'bold', color: theme.text },
  subtitle: { fontSize: 16, color: theme.textSecondary, marginTop: spacing.xs },

  selectedSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  chipScroll: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.primaryLight,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  chipText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: theme.text,
  },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },

  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.infoBg,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.info,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emptyHintIcon: { marginRight: spacing.md },
  emptyHintText: { flex: 1, fontSize: 13, lineHeight: 19, color: theme.infoText },
  emptyCatalog: {
    textAlign: 'center',
    color: theme.textMuted,
    marginTop: spacing.xxl,
    fontSize: 14,
  },

  // ─── Subject sections ───────────────────────────────────────────────────
  deptSection: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  deptName: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.text },
  deptBadge: {
    backgroundColor: theme.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  deptBadgeText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },

  catList: { borderTopWidth: 1, borderTopColor: theme.border },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  catRowLast: { borderBottomWidth: 0 },
  catRowActive: { backgroundColor: theme.primaryLight },
  catInfo: { flex: 1, paddingRight: spacing.md },
  catName: { fontSize: 15, fontWeight: '600', color: theme.text },
  catNameActive: { color: theme.primary },
  catDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  checkEmpty: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: theme.borderStrong,
  },
});
