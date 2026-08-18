import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from '../services/AuthService';
import { StreakService } from '../services/StreakService';
import { useTheme } from '../context/ThemeContext';

function pct(n, total) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function retentionForecast(pctCorrect) {
  if (pctCorrect >= 85) return '5–7 days';
  if (pctCorrect >= 70) return '2–4 days';
  if (pctCorrect >= 50) return '1–2 days';
  return 'Review today';
}

function BarChart({ data, color, labelStyle }) {
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
          <Text style={labelStyle}>{d.label}</Text>
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
});

function StatCard({ title, children, styles }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function MasteryBar({ label, value, total, color, styles }) {
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

function AnalyticsContent({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setStats(null);
      setLoading(false);
      return;
    }
    const userId = AuthService.getUserId();
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Run all three independent queries concurrently instead of one after
      // another — cuts load time roughly to the slowest single query instead
      // of the sum of all three.
      const [{ data: userStats }, { data: attempts }, { count: aiCount }, learningStreak] = await Promise.all([
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('card_attempts')
          .select('was_correct, source, attempted_at')
          .eq('user_id', userId)
          .gte('attempted_at', thirtyDaysAgo.toISOString())
          .order('attempted_at', { ascending: false }),
        supabase
          .from('ai_generation_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        StreakService.getCurrentStreak(),
      ]);

      const allAttempts = attempts || [];
      const correct = allAttempts.filter(a => a.was_correct).length;
      const total = allAttempts.length;

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

      const bySource = {};
      allAttempts.forEach(a => {
        bySource[a.source] = (bySource[a.source] || 0) + 1;
      });

      setStats({
        tidbitsSeen: userStats?.tidbits_seen ?? 0,
        cardsMastered: userStats?.cards_mastered ?? 0,
        currentStreak: learningStreak,
        totalAttempts: total,
        correctAttempts: correct,
        accuracy: pct(correct, total),
        retention: retentionForecast(pct(correct, total)),
        dailyData,
        bySource,
        aiGenerations: aiCount ?? 0,
      });
    } catch (err) {
      console.warn('[StatsScreen] load error:', err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyNote}>Analytics unavailable — sign in and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const s = stats;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.overviewRow}>
          {[
            { label: 'Streak', value: `${s.currentStreak || 0}d`, emoji: '🔥' },
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

        <StatCard title="⏱ Retention Forecast" styles={styles}>
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

        <StatCard title="📅 Daily Activity (last 7 days)" styles={styles}>
          {s.dailyData.every(d => d.value === 0) ? (
            <Text style={styles.emptyNote}>No attempts recorded in the last 7 days.</Text>
          ) : (
            <BarChart data={s.dailyData} color={theme.primary} labelStyle={styles.barLabel} />
          )}
        </StatCard>

        <StatCard title="🧠 Answer Accuracy" styles={styles}>
          <MasteryBar
            label="Correct"
            value={s.correctAttempts}
            total={s.totalAttempts}
            color="#4ade80"
            styles={styles}
          />
          <MasteryBar
            label="Incorrect"
            value={s.totalAttempts - s.correctAttempts}
            total={s.totalAttempts}
            color="#f87171"
            styles={styles}
          />
          <Text style={styles.attemptNote}>
            {s.totalAttempts} total attempts in the last 30 days
          </Text>
        </StatCard>

        {Object.keys(s.bySource).length > 0 && (
          <StatCard title="📊 Activity by Mode" styles={styles}>
            {Object.entries(s.bySource).map(([src, count]) => (
              <MasteryBar
                key={src}
                label={src.replace('_', ' ')}
                value={count}
                total={s.totalAttempts}
                color={theme.accent}
                styles={styles}
              />
            ))}
          </StatCard>
        )}

        <TouchableOpacity
          style={styles.insightsCta}
          onPress={() => navigation.navigate('Insights')}
          activeOpacity={0.85}
        >
          <View style={styles.insightsCtaBody}>
            <View style={styles.insightsCtaTitleRow}>
              <Text style={styles.insightsCtaTitle}>Study Insights</Text>
              <Text style={styles.insightsCtaArrow}>›</Text>
            </View>
            <Text style={styles.insightsCtaSub}>Exam-day forecast & weak spots — Premium</Text>
          </View>
        </TouchableOpacity>

        <StatCard title="🤖 AI Generations" styles={styles}>
          <Text style={styles.aiUsageText}>
            {s.aiGenerations} deck{s.aiGenerations !== 1 ? 's' : ''} generated with AI (all time)
          </Text>
        </StatCard>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function StatsScreen({ navigation }) {
  return <AnalyticsContent navigation={navigation} />;
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight,
    backgroundColor: theme.background,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
  scroll: { padding: 20, paddingBottom: 60 },

  overviewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  overviewCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  overviewEmoji: { fontSize: 22, marginBottom: 6 },
  overviewValue: { fontSize: 22, fontWeight: '900', color: theme.text, marginBottom: 2 },
  overviewLabel: { fontSize: 10, color: theme.textSecondary, textAlign: 'center', fontWeight: '600' },

  statCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTitle: { fontSize: 13, fontWeight: '800', color: theme.text, marginBottom: 12 },

  retentionWrap: {},
  retentionValue: { fontSize: 28, fontWeight: '900', color: theme.primary, marginBottom: 6 },
  retentionSub: { fontSize: 13, color: theme.textSecondary, lineHeight: 20 },

  masteryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  masteryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    width: 70,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  masteryTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  masteryFill: { height: 8, borderRadius: 4 },
  masteryPct: { fontSize: 12, color: theme.text, fontWeight: '700', width: 34, textAlign: 'right' },

  attemptNote: { fontSize: 11, color: theme.textSecondary, marginTop: 6 },
  emptyNote: { fontSize: 13, color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  aiUsageText: { fontSize: 15, color: theme.text, fontWeight: '500' },
  barLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' },
  insightsCta: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  insightsCtaBody: { flex: 1 },
  insightsCtaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightsCtaTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  insightsCtaSub: { fontSize: 13, color: '#c7d2fe', marginTop: 4 },
  insightsCtaArrow: {
    fontSize: 20,
    color: '#c7d2fe',
    fontWeight: '700',
    marginLeft: 6,
    lineHeight: 20,
  },
});
