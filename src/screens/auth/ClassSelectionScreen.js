import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClassService } from '../../services/ClassService';
import { StorageService } from '../../services/StorageService';

export default function ClassSelectionScreen({ route, navigation }) {
  const schoolId = route?.params?.schoolId || 'uc-berkeley';

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await ClassService.listBySchool(schoolId);
        setClasses(data);
        // Pre-check any classes the user already joined (e.g. re-entering onboarding)
        const existing = await ClassService.getMyClassIds();
        setSelectedIds(new Set(existing));
      } catch (e) {
        console.warn('[ClassSelection] load error:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.subject || '').toLowerCase().includes(q)
    );
  }, [classes, query]);

  // Group by subject for cleaner display
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const s = c.subject || 'Other';
      if (!map[s]) map[s] = [];
      map[s].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const completeOnboarding = async (classIds) => {
    setSaving(true);
    try {
      if (classIds.length > 0) {
        await ClassService.joinClasses(classIds);
        const allIds = await ClassService.getMyClassIds();
        await ClassService.replaceCategoriesToEnrollment(allIds);
      }
      // Move to notification setup — PermissionRequestScreen will mark onboarding done.
      navigation.navigate('FrequencySelection');
    } catch (e) {
      Alert.alert('Could not save classes', e.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (selectedIds.size === 0) {
      Alert.alert(
        'No classes selected',
        'Select at least one class, or tap "Skip for now".',
      );
      return;
    }
    completeOnboarding([...selectedIds]);
  };

  const handleSkip = () => completeOnboarding([]);

  const renderItem = ({ item }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.classRow, selected && styles.classRowSelected]}
        onPress={() => toggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.classInfo}>
          <Text style={[styles.classCode, selected && styles.classCodeSelected]}>
            {item.code}
          </Text>
          <Text style={styles.classTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  // Build flat list data with section headers
  const listData = useMemo(() => {
    const items = [];
    grouped.forEach(([subject, rows]) => {
      items.push({ type: 'header', key: `h-${subject}`, subject });
      rows.forEach((r) => items.push({ type: 'item', key: r.id, ...r }));
    });
    return items;
  }, [grouped]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your classes</Text>
        <Text style={styles.subtitle}>
          Select the classes you're taking this semester. We'll connect you with
          classmates and tailor your study decks.
        </Text>
      </View>

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

      {/* Selected count badge */}
      {selectedIds.size > 0 && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>
            {selectedIds.size} selected
          </Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={styles.sectionHeader}>{item.subject}</Text>
            ) : (
              renderItem({ item })
            )
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>No classes found for "{query}"</Text>
          }
        />
      )}

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, saving && styles.disabled]}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueText}>
              Continue{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  searchWrapper: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },

  selectedBadge: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  selectedBadgeText: { fontSize: 13, color: '#4338ca', fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
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

  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  classRowSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  classInfo: { flex: 1, marginRight: 12 },
  classCode: { fontSize: 15, fontWeight: '600', color: '#111827' },
  classCodeSelected: { color: '#4338ca' },
  classTitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 40,
    fontSize: 14,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  continueButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: '#6b7280', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
