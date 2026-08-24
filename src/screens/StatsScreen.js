import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from '../services/AuthService';
import { StreakService } from '../services/StreakService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import NavRow from '../components/NavRow';
import { spacing, radius, type, iconSize } from '../theme/tokens';

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
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingTop: spacing.sm },
  col: { flex: 1, alignItems: 'center' },
  barWrap: { height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', borderRadius: radius.sm / 2 },
});

/** One overview tile — same icon/value/label shape as the stat tiles on Home. */
function OverviewTile({ icon, value, label, tone, filled, styles }) {
  return (
    <View style={styles.overviewCard}>
      <Icon name={icon} size={iconSize.sm} color={tone} filled={filled} />
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, title, children, styles, theme }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <Icon name={icon} size={iconSize.md} color={theme.textSecondary} style={styles.statCardIcon} />
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>
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

export default function StatsScreen({ navigation }) {
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
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Last 30 days</Text>
          </View>
          <Text style={styles.emptyNote}>Analytics unavailable — sign in and try again.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const s = stats;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Last 30 days</Text>
        </View>

        <View style={styles.overviewRow}>
          <OverviewTile
            icon="streak"
            value={`${s.currentStreak || 0}d`}
            label="Streak"
            // A live streak burns warm; a zero stays quiet, same as on Home.
            tone={s.currentStreak > 0 ? theme.warning : theme.textMuted}
            filled={s.currentStreak > 0}
            styles={styles}
          />
          <OverviewTile
            icon="seen"
            value={String(s.tidbitsSeen)}
            label="Tidbits seen"
            tone={theme.primary}
            styles={styles}
          />
          <OverviewTile
            icon="mastered"
            value={String(s.cardsMastered)}
            label="Cards mastered"
            tone={theme.primary}
            styles={styles}
          />
          <OverviewTile
            icon="accuracy"
            value={`${s.accuracy}%`}
            label="Accuracy"
            tone={theme.primary}
            styles={styles}
          />
        </View>

        <StatCard icon="due" title="Retention Forecast" styles={styles} theme={theme}>
          <Text style={styles.retentionValue}>{s.retention}</Text>
          <Text style={styles.retentionSub}>
            From {s.accuracy}% accuracy across {s.totalAttempts} attempts in the last 30 days.
          </Text>
        </StatCard>

        <StatCard icon="stats" title="Daily Activity" styles={styles} theme={theme}>
          {s.dailyData.every(d => d.value === 0) ? (
            <Text style={styles.emptyNote}>No attempts in the last 7 days.</Text>
          ) : (
            <BarChart data={s.dailyData} color={theme.primary} labelStyle={styles.barLabel} />
          )}
        </StatCard>

        <StatCard icon="accuracy" title="Answer Accuracy" styles={styles} theme={theme}>
          <MasteryBar
            label="Correct"
            value={s.correctAttempts}
            total={s.totalAttempts}
            color={theme.success}
            styles={styles}
          />
          <MasteryBar
            label="Incorrect"
            value={s.totalAttempts - s.correctAttempts}
            total={s.totalAttempts}
            color={theme.danger}
            styles={styles}
          />
          <Text style={styles.attemptNote}>{s.totalAttempts} attempts in the last 30 days</Text>
        </StatCard>

        {Object.keys(s.bySource).length > 0 && (
          <StatCard icon="study" title="Activity by Mode" styles={styles} theme={theme}>
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

        <StatCard icon="ai" title="AI Generations" styles={styles} theme={theme}>
          <Text style={styles.aiUsageText}>
            {s.aiGenerations} deck{s.aiGenerations !== 1 ? 's' : ''} generated with AI (all time)
          </Text>
        </StatCard>

        <NavRow
          icon="insights"
          title="Study Insights"
          sub="Exam-day forecast & weak spots — Premium"
          onPress={() => navigation.navigate('Insights')}
          tone="accent"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  header: { marginBottom: spacing.xl },
  title: { fontSize: 42, fontWeight: 'bold', color: theme.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: theme.textSecondary },

  overviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  overviewCard: {
    flexGrow: 1,
    flexBasis: '44%',
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  overviewValue: { ...type.stat, color: theme.text },
  overviewLabel: {
    ...type.overline,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  statCard: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statCardIcon: { marginRight: spacing.sm },
  statCardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },

  retentionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.primary,
    marginBottom: spacing.xs,
  },
  retentionSub: { fontSize: 13, color: theme.textSecondary, lineHeight: 19 },

  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
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
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm / 2,
    overflow: 'hidden',
  },
  masteryFill: { height: 8, borderRadius: radius.sm / 2 },
  masteryPct: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '700',
    width: 34,
    textAlign: 'right',
  },

  attemptNote: { fontSize: 12, color: theme.textMuted, marginTop: spacing.xs },
  emptyNote: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  aiUsageText: { fontSize: 15, color: theme.text },
  barLabel: { fontSize: 10, color: theme.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
});
