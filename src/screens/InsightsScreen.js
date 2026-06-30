import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import PremiumGate from '../components/PremiumGate';
import { InsightsService } from '../services/InsightsService';
import { ContentService } from '../services/ContentService';
import { useTheme } from '../context/ThemeContext';

function ReadinessCard({ item, styles }) {
  const color = item.score >= 75 ? '#16a34a' : item.score >= 50 ? '#ca8a04' : '#dc2626';
  return (
    <View style={styles.readinessCard}>
      <View style={styles.readinessHeader}>
        <Text style={styles.readinessName}>{item.name}</Text>
        <Text style={[styles.readinessScore, { color }]}>{item.score}%</Text>
      </View>
      <Text style={styles.readinessSub}>
        {item.masteryPct}% recall-ready · {item.overdue} overdue
        {item.accuracy7d != null ? ` · ${item.accuracy7d}% accuracy (7d)` : ''}
      </Text>
      {item.examDate && (
        <Text style={styles.examLine}>
          {item.examLabel || 'Exam'}: {new Date(item.examDate).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

function InsightsContent({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState([]);
  const [weakSpots, setWeakSpots] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, w] = await Promise.all([
        InsightsService.getAllReadiness(),
        InsightsService.getWeakSpots(8),
      ]);
      setReadiness(r);
      setWeakSpots(w);
    } catch (e) {
      console.warn('[Insights] load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Stats</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Exam Readiness</Text>
        <Text style={styles.sectionSub}>
          How prepared you are based on mastery, overdue reviews, and recent accuracy.
        </Text>
        {readiness.length === 0 ? (
          <Text style={styles.empty}>Enroll in a class to see readiness scores.</Text>
        ) : (
          readiness.map((item) => (
            <ReadinessCard key={item.categoryId} item={item} styles={styles} />
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Weak Spots</Text>
        <Text style={styles.sectionSub}>Cards to drill before your next exam.</Text>
        {weakSpots.length === 0 ? (
          <Text style={styles.empty}>No weak spots detected yet — keep studying!</Text>
        ) : (
          weakSpots.map((spot) => (
            <TouchableOpacity
              key={spot.tidbit.id}
              style={styles.weakRow}
              onPress={() => navigation.navigate('ReviewQueue')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.weakTerm} numberOfLines={1}>
                  {spot.tidbit.term || spot.tidbit.text}
                </Text>
                <Text style={styles.weakMeta}>
                  {ContentService.formatCategoryName(spot.tidbit.category)} · {spot.accuracy}% accuracy · {spot.lapses} lapse{spot.lapses !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.queueBtn}
          onPress={() => navigation.navigate('ReviewQueue')}
        >
          <Text style={styles.queueBtnText}>Open Review Queue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function InsightsScreen({ navigation }) {
  return (
    <PremiumGate navigation={navigation} feature="Study Insights">
      <InsightsContent navigation={navigation} />
    </PremiumGate>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight,
  },
  back: { fontSize: 16, color: theme.primary, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  scroll: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: theme.textSecondary, marginBottom: 14, lineHeight: 20 },
  empty: { fontSize: 14, color: theme.textSecondary, marginBottom: 12 },
  readinessCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  readinessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readinessName: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1 },
  readinessScore: { fontSize: 28, fontWeight: '900' },
  readinessSub: { fontSize: 13, color: theme.textSecondary, marginTop: 6 },
  examLine: { fontSize: 12, color: theme.primary, marginTop: 4, fontWeight: '600' },
  weakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  weakTerm: { fontSize: 15, fontWeight: '600', color: theme.text },
  weakMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  chevron: { fontSize: 20, color: theme.textSecondary },
  queueBtn: {
    marginTop: 20,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  queueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
