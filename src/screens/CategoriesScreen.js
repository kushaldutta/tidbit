import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '../services/StorageService';
import { ContentService } from '../services/ContentService';
import { NotificationService } from '../services/NotificationService';
import { ClassService } from '../services/ClassService';

// ─── Department map ────────────────────────────────────────────────────────────
// Maps department display name → array of category IDs from ContentService.
// Adding a category here is all that's needed to have it show up.

const DEPARTMENTS = [
  {
    name: 'Computer Science',
    emoji: '💻',
    ids: ['cs-61a', 'cs61b', 'cs61c', 'cs70', 'cs161', 'cs188'],
  },
  {
    name: 'Mathematics',
    emoji: '📐',
    ids: ['math51', 'math52', 'math53', 'math-54', 'math128a'],
  },
  {
    name: 'Data Science',
    emoji: '📊',
    ids: ['data-8', 'data100'],
  },
  {
    name: 'Economics',
    emoji: '📈',
    ids: ['econ-1', 'econ100a', 'econ100b'],
  },
  {
    name: 'Physics',
    emoji: '⚛️',
    ids: ['physics137a'],
  },
  {
    name: 'Nuclear Engineering',
    emoji: '☢️',
    ids: ['nuc150', 'nuc155'],
  },
  {
    name: 'Classics / Humanities',
    emoji: '🏛️',
    ids: ['agrs28'],
  },
  {
    name: 'General',
    emoji: '🌐',
    ids: ['history', 'science', 'berkeley-fun-facts', 'miscellaneous'],
  },
];

// ─── Collapsible department section ───────────────────────────────────────────

function DeptSection({ dept, allCategories, selected, onToggle, query }) {
  const [open, setOpen] = useState(false);
  const rotAnim = React.useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(rotAnim, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen((v) => !v);
  };

  const cats = dept.ids
    .map((id) => allCategories.find((c) => c.id === id))
    .filter(Boolean)
    .filter((c) =>
      query ? c.name.toLowerCase().includes(query.toLowerCase()) ||
              c.description?.toLowerCase().includes(query.toLowerCase()) : true
    );

  if (cats.length === 0) return null;

  const selectedCount = cats.filter((c) => selected.has(c.id)).length;
  const chevronRotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  // Auto-open if there's a search query
  const isOpen = open || !!query;

  return (
    <View style={styles.deptSection}>
      <TouchableOpacity style={styles.deptHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.deptEmoji}>{dept.emoji}</Text>
        <Text style={styles.deptName}>{dept.name}</Text>
        {selectedCount > 0 && (
          <View style={styles.deptBadge}>
            <Text style={styles.deptBadgeText}>{selectedCount}</Text>
          </View>
        )}
        <Animated.Text style={[styles.chevron, { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }]}>
          ›
        </Animated.Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.catList}>
          {cats.map((cat) => {
            const active = selected.has(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catRow, active && styles.catRowActive]}
                onPress={() => onToggle(cat.id)}
                activeOpacity={0.7}
              >
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, active && styles.catNameActive]}>
                    {cat.name}
                  </Text>
                  {cat.description ? (
                    <Text style={styles.catDesc} numberOfLines={1}>{cat.description}</Text>
                  ) : null}
                </View>
                <View style={[styles.check, active && styles.checkActive]}>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CategoriesScreen({ navigation }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [allCategories, setAllCategories] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const available = ContentService.getAvailableCategories();
    setAllCategories(available);

    const saved = await StorageService.getSelectedCategories();
    // Validate — only keep IDs that exist
    const validIds = available.map((c) => c.id);
    const valid = saved.filter((id) => validIds.includes(id));
    if (valid.length !== saved.length) {
      await StorageService.setSelectedCategories(valid);
    }
    setSelectedIds(new Set(valid));
  };

  const toggle = useCallback(async (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // Persist immediately
      const arr = [...next];
      StorageService.setSelectedCategories(arr);
      NotificationService.updateCategoryPreferences?.(arr).catch?.(() => {});
      return next;
    });
  }, []);

  const selectedList = allCategories.filter((c) => selectedIds.has(c.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Feed</Text>
        <Text style={styles.subtitle}>
          Select classes to receive tidbits and study materials.
        </Text>
      </View>

      {/* Selected chips */}
      {selectedList.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedLabel}>Selected ({selectedList.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {selectedList.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.chip}
                onPress={() => toggle(c.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{c.name}</Text>
                <Text style={styles.chipX}> ×</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
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

      {/* Department sections */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {selectedIds.size === 0 && !query && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintEmoji}>☝️</Text>
            <Text style={styles.emptyHintText}>
              Pick at least one class to start receiving tidbits
            </Text>
          </View>
        )}

        {DEPARTMENTS.map((dept) => (
          <DeptSection
            key={dept.name}
            dept={dept}
            allCategories={allCategories}
            selected={selectedIds}
            onToggle={toggle}
            query={query}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  selectedSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  chipText: { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  chipX: { fontSize: 14, color: '#818cf8', fontWeight: '700' },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#111827',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  emptyHint: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  emptyHintEmoji: { fontSize: 30, marginBottom: 8 },
  emptyHintText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 },

  deptSection: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    marginBottom: 10, overflow: 'hidden',
  },
  deptHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  deptEmoji: { fontSize: 20 },
  deptName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
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
    backgroundColor: '#fafafa',
  },
  catRowActive: { backgroundColor: '#f5f3ff' },
  catInfo: { flex: 1, paddingRight: 12 },
  catName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  catNameActive: { color: '#4338ca' },
  catDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
