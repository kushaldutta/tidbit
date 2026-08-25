import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';
import { ReportService } from '../services/ReportService';

const CATEGORY_LABELS = Object.fromEntries(
  ReportService.REPORT_CATEGORIES.map((c) => [c.id, c.label])
);

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ReportCard({ report, onDismiss, onResolve, busy }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const typeLabel = report.targetType === 'deck' ? 'Shared deck' : 'Feed post';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
        {report.groupCode ? (
          <Text style={styles.groupCode}>{report.groupCode}</Text>
        ) : null}
        <Text style={styles.time}>{relativeTime(report.createdAt)}</Text>
      </View>

      <Text style={styles.preview} numberOfLines={3}>
        {report.preview}
      </Text>

      <Text style={styles.meta}>
        Reported by {report.reporterName} ·{' '}
        {CATEGORY_LABELS[report.category] || report.category}
      </Text>
      {report.details ? (
        <Text style={styles.details} numberOfLines={4}>
          “{report.details}”
        </Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.dismissBtn, busy && styles.btnDisabled]}
          onPress={() => onDismiss(report.id)}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissBtnText}>Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resolveBtn, busy && styles.btnDisabled]}
          onPress={() => onResolve(report.id)}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.resolveBtnText}>Mark resolved</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ModerationReportsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await ReportService.getPendingReports();
      setReports(rows);
    } catch (e) {
      Alert.alert('Could not load reports', e.message || 'Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleStatus = async (reportId, status) => {
    setBusyId(reportId);
    try {
      await ReportService.updateReportStatus(reportId, status);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (e) {
      Alert.alert('Could not update report', e.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Report queue</Text>
        <Text style={styles.subtitle}>
          Review user reports, then remove content from the feed if needed.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary || '#6366f1'} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.primary || '#6366f1'}
            />
          }
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              busy={busyId === item.id}
              onDismiss={(id) => handleStatus(id, 'dismissed')}
              onResolve={(id) => handleStatus(id, 'resolved')}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="check" size={iconSize.hero} color={theme.success} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No pending reports</Text>
              <Text style={styles.emptyBody}>
                New user reports will show up here for you to review.
              </Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: theme.card,
  },
  backText: { fontSize: 16, color: theme.primary || '#6366f1', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4, lineHeight: 20 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  groupCode: { fontSize: 12, fontWeight: '700', color: theme.primary || '#6366f1' },
  time: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },
  preview: { fontSize: 15, color: theme.text, lineHeight: 22, marginBottom: 8 },
  meta: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
  details: {
    fontSize: 13,
    color: '#4b5563',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dismissBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  dismissBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  resolveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.primary || '#6366f1',
    alignItems: 'center',
  },
  resolveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 6 },
  emptyBody: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
});
