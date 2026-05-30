import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from '../services/AuthService';
import PremiumGate from '../components/PremiumGate';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_MAX_W = SCREEN_W - 80;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n, total) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function retentionForecast(pctCorrect) {
  // Simple model: high accuracy → longer retention
  if (pctCorrect >= 85) return '5–7 days';
  if (pctCorrect >= 70) return '2–4 days';
  if (pctCorrect >= 50) return '1–2 days';
  return 'Review today';
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function BarChart({ data, color = '#6366f1' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={barStyles.wrap}>
      {data.map((d, i) => (
        <View key={i} style={barStyles.col}>
          <View style={barStyles.barWrap}>
            <View style={[barStyles.bar, {
              height: Math.max((d.value / max) * 80, 2),
              backgroundColor: color,
            }]} />
          </View>
          <Text style={barStyles.label}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: 8 },
  col: { flex: 1, alignItems: 'center' },
  barWrap: { height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 4 },
  label: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
});

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ title, children }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Mastery bar ─────────────────────────────────────────────────────────────

function MasteryBar({ label, value, total, color }) {
  const p = pct(value, total);
  return (
    <View style={styles.masteryRow}>
      <Text style={styles.masteryLabel}>{label}</Text>
      <View style={styles.masteryTrack}>
        <View style={[styles.masteryFill, { width: `${p}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.masteryPct}>{p}%</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

function AdvancedStatsInner({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }
    const userId = AuthService.getUserId();
    if (!userId) { setLoading(false); return; }

    try {
      // 1. Overall user stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // 2. Card attempts for accuracy breakdown + daily activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: attempts } = await supabase
        .from('card_attempts')
        .select('was_correct, source, attempted_at')
        .eq('user_id', userId)
        .gte('attempted_at', thirtyDaysAgo.toISOString())
        .order('attempted_at', { ascending: false });

      // 3. AI generation log
      const { count: aiCount } = await supabase
        .from('ai_generation_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const allAttempts = attempts || [];
      const correct = allAttempts.filter(a => a.was_correct).length;
      const total = allAttempts.length;

      // Daily activity for past 7 days
      const dailyMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = 0;
      }
      allAttempts.forEach(a => {
        const day = a.attempted_at.slice(0, 10);
        if (dailyMap[day] !== undefined) dailyMap[day]++;
      });
      const dailyData = Object.entries(dailyMap).map(([date, value]) => ({
        label: new Date(date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
        value,
      }));

      // Source breakdown
      const bySource = {};
      allAttempts.forEach(a => {
        bySource[a.source] = (bySource[a.source] || 0) + 1;
      });

      setStats({
        tidbitsSeen: userStats?.tidbits_seen ?? 0,
        cardsMastered: userStats?.cards_mastered ?? 0,
        totalAttempts: total,
        correctAttempts: correct,
        accuracy: pct(correct, total),
        retention: retentionForecast(pct(correct, total)),
        dailyData,
        bySource,
        aiGenerations: aiCount ?? 0,
      });
    } catch (err) {
      console.warn('[AdvancedStats] load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color="#6366f1" /></View>
      </SafeAreaView>
    );
  }

  const s = stats;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.backText} onPress={() => navigation.goBack()}>← Back</Text>
        <Text style={styles.headerTitle}>Advanced Analytics</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Overview row */}
        <View style={styles.overviewRow}>
          {[
            { label: 'Tidbits seen', value: s.tidbitsSeen, emoji: '👁️' },
            { label: 'Cards mastered', value: s.cardsMastered, emoji: '🏆' },
            { label: 'Accuracy (30d)', value: `${s.accuracy}%`, emoji: '🎯' },
          ].map((item) => (
            <View key={item.label} style={styles.overviewCard}>
              <Text style={styles.overviewEmoji}>{item.emoji}</Text>
              <Text style={styles.overviewValue}>{item.value}</Text>
              <Text style={styles.overviewLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Retention forecast */}
        <StatCard title="⏱ Retention Forecast">
          <View style={styles.retentionWrap}>
            <Text style={styles.retentionValue}>{s.retention}</Text>
            <Text style={styles.retentionSub}>
              Based on your {s.accuracy}% accuracy over {s.totalAttempts} attempts in the last 30 days.
              {s.accuracy >= 70
                ? ' You\'re retaining material well.'
                : ' More practice will push this further.'}
            </Text>
          </View>
        </StatCard>

        {/* Daily activity chart */}
        <StatCard title="📅 Daily Activity (last 7 days)">
          {s.dailyData.every(d => d.value === 0) ? (
            <Text style={styles.emptyNote}>No attempts recorded in the last 7 days.</Text>
          ) : (
            <BarChart data={s.dailyData} color="#6366f1" />
          )}
        </StatCard>

        {/* Mastery breakdown */}
        <StatCard title="🧠 Answer Accuracy">
          <MasteryBar
            label="Correct"
            value={s.correctAttempts}
            total={s.totalAttempts}
            color="#4ade80"
          />
          <MasteryBar
            label="Incorrect"
            value={s.totalAttempts - s.correctAttempts}
            total={s.totalAttempts}
            color="#f87171"
          />
          <Text style={styles.attemptNote}>
            {s.totalAttempts} total attempts in the last 30 days
          </Text>
        </StatCard>

        {/* Study mode breakdown */}
        {Object.keys(s.bySource).length > 0 && (
          <StatCard title="📊 Activity by Mode">
            {Object.entries(s.bySource).map(([src, count]) => (
              <MasteryBar
                key={src}
                label={src.replace('_', ' ')}
                value={count}
                total={s.totalAttempts}
                color="#a78bfa"
              />
            ))}
          </StatCard>
        )}

        {/* AI usage */}
        <StatCard title="🤖 AI Generations">
          <Text style={styles.aiUsageText}>
            {s.aiGenerations} deck{s.aiGenerations !== 1 ? 's' : ''} generated with AI (all time)
          </Text>
        </StatCard>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function AdvancedStatsScreen({ navigation, route }) {
  return (
    <PremiumGate navigation={navigation} feature="Advanced Analytics">
      <AdvancedStatsInner navigation={navigation} route={route} />
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backText: { fontSize: 15, color: '#6366f1', fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 60 },

  overviewRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  overviewCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  overviewEmoji: { fontSize: 22, marginBottom: 6 },
  overviewValue: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 2 },
  overviewLabel: { fontSize: 10, color: '#9ca3af', textAlign: 'center', fontWeight: '600' },

  statCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statCardTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 12 },

  retentionWrap: {},
  retentionValue: { fontSize: 28, fontWeight: '900', color: '#6366f1', marginBottom: 6 },
  retentionSub: { fontSize: 13, color: '#6b7280', lineHeight: 20 },

  masteryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  masteryLabel: { fontSize: 12, color: '#6b7280', width: 70, fontWeight: '600', textTransform: 'capitalize' },
  masteryTrack: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  masteryFill: { height: 8, borderRadius: 4 },
  masteryPct: { fontSize: 12, color: '#374151', fontWeight: '700', width: 34, textAlign: 'right' },

  attemptNote: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  emptyNote: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  aiUsageText: { fontSize: 15, color: '#374151', fontWeight: '500' },
});
