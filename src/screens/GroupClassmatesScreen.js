import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { GroupService } from '../services/GroupService';
import { BlockService } from '../services/BlockService';

function Avatar({ name, size = 44 }) {
  const initials = name
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const bg = colors[initials.charCodeAt(0) % colors.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export default function GroupClassmatesScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { classId, code, title } = route.params;

  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [cm, blockedIds] = await Promise.all([
        GroupService.getClassmates(classId),
        BlockService.getBlockedUserIds(),
      ]);
      setClassmates(BlockService.filterClassmates(cm, blockedIds));
    } catch (e) {
      console.warn('[GroupClassmatesScreen] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderRow = ({ item }) => (
    <View style={styles.row}>
      <Avatar name={item.display_name} size={48} />
      <View style={styles.rowMeta}>
        <Text style={styles.rowName}>{item.display_name || 'Tidbit User'}</Text>
        {item.grad_year ? (
          <Text style={styles.rowYear}>Class of {item.grad_year}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>Classmates</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {code}{title ? ` · ${title}` : ''}
          </Text>
        </View>
        <View style={{ width: 56 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <FlatList
          data={classmates}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={styles.emptyTitle}>No classmates yet</Text>
              <Text style={styles.emptyBody}>Share Tidbit with your class to see others here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight,
    backgroundColor: theme.card,
  },
  backText: { fontSize: 16, fontWeight: '600', color: theme.primary, width: 56 },
  headerMeta: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  headerSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  rowMeta: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: theme.text },
  rowYear: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 6 },
  emptyBody: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
});
