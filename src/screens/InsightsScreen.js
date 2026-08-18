import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import PremiumGate from '../components/PremiumGate';
import ExamDateModal from '../components/ExamDateModal';
import ForecastChart from '../components/ForecastChart';
import { InsightsService } from '../services/InsightsService';
import { ForecastService } from '../services/ForecastService';
import { TopicService } from '../services/TopicService';
import { ContentService } from '../services/ContentService';
import { useTheme } from '../context/ThemeContext';

function shortDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * The headline is the whole point of this card: one sentence naming the number
 * the student actually cares about, and what closes the gap.
 */
function forecastHeadline(f) {
  const target = f.examLabel || 'the exam';
  if (!f.examDate || f.examPassed) {
    return `Studying nothing new, you'd recall ${f.finals.stop}% of ${f.name} a month from now. Set an exam date to forecast against the real deadline.`;
  }
  if (!f.achievable) {
    return `Even at full tilt you'd reach about ${f.finals.recommended}% by ${target} — there's more material here than days left. Prioritise: the weak spots below are worth the most.`;
  }
  if (f.idle) {
    return `You haven't studied ${f.name} in two weeks. Walk in now and you'd recall ${f.finals.stop}% — ${f.recommendedPace} cards a day gets you to ${f.targetPct}%.`;
  }
  if (f.finals.current >= f.targetPct) {
    return `You're on track. Hold this pace and you'll walk into ${target} recalling ${f.finals.current}% of the material.`;
  }
  return `At your current pace you'll walk into ${target} recalling ${f.finals.current}% of ${f.name}. ${f.recommendedPace} cards a day gets you to ${f.targetPct}%.`;
}

function LegendRow({ color, label, sub, value, styles }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.legendLabel}>{label}</Text>
        {sub ? <Text style={styles.legendSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.legendValue, { color }]}>{value}%</Text>
    </View>
  );
}

function ForecastCard({ forecast: f, styles, theme, navigation, onPressExam }) {
  if (f.empty) return null;

  const hasExam = !!f.examDate && !f.examPassed;
  const series = [
    {
      key: 'recommended',
      points: f.series.recommended,
      color: theme.success,
      emphasis: true,
    },
    ...(f.idle
      ? []
      : [{ key: 'current', points: f.series.current, color: theme.primary, emphasis: true }]),
    { key: 'stop', points: f.series.stop, color: theme.danger },
  ];

  const xLabels = hasExam
    ? ['Today', `${f.examLabel || 'Exam'} · ${shortDate(f.examDate)}`]
    : ['Today', `+${f.horizon} days`];

  return (
    <View style={styles.forecastCard}>
      <View style={styles.forecastHeader}>
        <Text style={styles.forecastName}>{f.name}</Text>
        <TouchableOpacity onPress={onPressExam} activeOpacity={0.8}>
          <Text style={styles.forecastChip}>
            {hasExam
              ? `${f.examLabel || 'Exam'} · ${f.daysUntilExam === 0 ? 'today' : `${f.daysUntilExam}d left`}`
              : '+ Set exam date'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.forecastHeadline}>{forecastHeadline(f)}</Text>

      <ForecastChart
        series={series}
        maxDay={f.horizon}
        target={f.targetPct}
        theme={theme}
        xLabels={xLabels}
      />

      <View style={styles.legend}>
        <LegendRow
          color={theme.success}
          label="Recommended pace"
          sub={`${f.recommendedPace} cards/day`}
          value={f.finals.recommended}
          styles={styles}
        />
        {!f.idle && (
          <LegendRow
            color={theme.primary}
            label="Your current pace"
            sub={`${f.currentPace} cards/day, measured over 2 weeks`}
            value={f.finals.current}
            styles={styles}
          />
        )}
        <LegendRow
          color={theme.danger}
          label={f.idle ? 'Your current pace (none)' : 'If you stop now'}
          sub={f.idle ? 'no reviews in the last 2 weeks' : 'no more reviews in this class'}
          value={f.finals.stop}
          styles={styles}
        />
      </View>

      <Text style={styles.forecastMeta}>
        {f.studiedCards} of {f.totalCards} cards studied · {f.accuracy}% accuracy · today you'd
        recall {f.today}%
      </Text>

      <TouchableOpacity
        style={styles.forecastCta}
        onPress={() => navigation.navigate('ReviewQueue')}
        activeOpacity={0.85}
      >
        <Text style={styles.forecastCtaText}>
          Study {f.recommendedPace} card{f.recommendedPace !== 1 ? 's' : ''} today
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/** Which sections start open, and where that choice is remembered. */
const SECTION_STATE_KEY = '@tidbit:insights_open_sections';
const DEFAULT_OPEN = {
  forecast: true,
  readiness: false,
  topics: false,
  weak: false,
};

/**
 * A section that can be folded away.
 *
 * The header keeps a one-line summary visible while collapsed — a section you
 * cannot see into is worse than one you have to scroll past, so the number that
 * would make you open it stays on screen either way.
 */
function CollapsibleSection({ title, subtitle, summary, open, onToggle, styles, theme, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${summary ? `, ${summary}` : ''}`}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {summary ? (
          <Text style={[styles.sectionSummary, !open && styles.sectionSummaryClosed]}>
            {summary}
          </Text>
        ) : null}
        <Text style={[styles.sectionCaret, { color: theme.textSecondary }]}>
          {open ? '\u25BE' : '\u25B8'}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.sectionBody}>
          {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
          {children}
        </View>
      )}
    </View>
  );
}

/**
 * Colour bands for the topic grid.
 * `danger` is deliberately absent: per the theme tokens, a low score here is a
 * prompt to study, not an error state. Amber means "go here next".
 */
function topicBand(topic, theme) {
  switch (TopicService.bandFor(topic)) {
    case 'strong':
      return { bg: theme.successBg, fg: theme.successText, edge: theme.success };
    case 'weak':
      return { bg: theme.warningBg, fg: theme.warningText, edge: theme.warning };
    case 'untouched':
      return { bg: theme.surfaceAlt, fg: theme.textMuted, edge: theme.border, dashed: true };
    default:
      return { bg: theme.surfaceAlt, fg: theme.text, edge: theme.borderStrong };
  }
}

function TopicTile({ topic, styles, theme, onPress }) {
  const band = topicBand(topic, theme);
  return (
    <TouchableOpacity
      style={[
        styles.topicTile,
        {
          backgroundColor: band.bg,
          borderColor: band.edge,
          borderStyle: band.dashed ? 'dashed' : 'solid',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.topicTitle, { color: band.fg }]} numberOfLines={2}>
        {topic.title}
      </Text>
      {topic.untouched ? (
        <Text style={[styles.topicValue, { color: band.fg, fontSize: 15 }]}>Not started</Text>
      ) : (
        <Text style={[styles.topicValue, { color: band.fg }]}>{topic.recallPct}%</Text>
      )}
      <Text style={[styles.topicMeta, { color: band.fg }]}>
        {topic.studiedCount}/{topic.cardCount} cards
        {topic.examRecallPct != null && !topic.untouched
          ? ` · ${topic.examRecallPct}% by exam`
          : ''}
      </Text>
    </TouchableOpacity>
  );
}

function ClassTopics({ group, styles, theme, navigation }) {
  return (
    <View style={styles.topicGroup}>
      <Text style={styles.topicGroupTitle}>{group.name}</Text>
      <View style={styles.topicGrid}>
        {group.topics.map((topic) => (
          <TopicTile
            key={topic.sectionId || 'unsectioned'}
            topic={topic}
            styles={styles}
            theme={theme}
            onPress={() =>
              navigation.navigate('ReviewSession', {
                categoryId: group.categoryId,
                sectionId: topic.sectionId,
                topicDrill: true,
                deckTitle: topic.title,
              })
            }
          />
        ))}
      </View>
    </View>
  );
}

function ReadinessCard({ item, styles, onPressExam }) {
  const color = item.score >= 75 ? '#16a34a' : item.score >= 50 ? '#ca8a04' : '#dc2626';
  const days = item.examDate
    ? Math.ceil((new Date(`${item.examDate}T12:00:00`) - Date.now()) / 86400000)
    : null;
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
      <TouchableOpacity onPress={onPressExam} activeOpacity={0.8}>
        {item.examDate ? (
          <Text style={styles.examLine}>
            {item.examLabel || 'Exam'} {new Date(`${item.examDate}T12:00:00`).toLocaleDateString()}
            {days != null ? ` · ${days < 0 ? 'passed' : days === 0 ? 'today' : `${days}d left`}` : ''}
            {'  '}Edit
          </Text>
        ) : (
          <Text style={styles.examLine}>+ Set exam date</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function InsightsContent({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [topicGroups, setTopicGroups] = useState([]);
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN);
  const [weakSpots, setWeakSpots] = useState([]);
  const [examTarget, setExamTarget] = useState(null);

  // Remember which sections the user left open — re-collapsing the page on
  // every visit would undo the point of collapsing it.
  useEffect(() => {
    AsyncStorage.getItem(SECTION_STATE_KEY)
      .then((raw) => {
        if (raw) setOpenSections({ ...DEFAULT_OPEN, ...JSON.parse(raw) });
      })
      .catch(() => {});
  }, []);

  const toggleSection = useCallback((key) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(SECTION_STATE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [r, w, f, t] = await Promise.all([
        InsightsService.getAllReadiness(),
        InsightsService.getWeakSpots(8),
        ForecastService.getAllForecasts(),
        TopicService.getAllClassTopics(),
      ]);
      setReadiness(r);
      setWeakSpots(w);
      setForecasts(f);
      setTopicGroups(t);
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

  // What each header shows while folded shut.
  const summaries = useMemo(() => {
    const scored = forecasts.filter((f) => !f.empty);
    const soonest = scored.find((f) => f.examDate && !f.examPassed) || scored[0];
    const weakestReadiness = readiness[0];
    const weakTopics = topicGroups.reduce(
      (n, g) => n + g.topics.filter((t) => t.untouched || TopicService.bandFor(t) === 'weak').length,
      0,
    );
    return {
      forecast: soonest ? `${soonest.name} ${soonest.finals.current}%` : null,
      readiness: weakestReadiness ? `lowest ${weakestReadiness.score}%` : null,
      topics: topicGroups.length
        ? (weakTopics ? `${weakTopics} need work` : 'all solid')
        : null,
      weak: weakSpots.length ? `${weakSpots.length} card${weakSpots.length !== 1 ? 's' : ''}` : null,
    };
  }, [forecasts, readiness, topicGroups, weakSpots]);

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
        <CollapsibleSection
          title="Exam Day Forecast"
          subtitle="How much of each class you'll actually recall on exam day — projected from the memory strength of every card, not just what you've covered."
          summary={summaries.forecast}
          open={openSections.forecast}
          onToggle={() => toggleSection('forecast')}
          styles={styles}
          theme={theme}
        >
          {forecasts.length === 0 ? (
            <Text style={styles.empty}>Enroll in a class to see your forecast.</Text>
          ) : (
            forecasts.map((f) => (
              <ForecastCard
                key={f.categoryId}
                forecast={f}
                styles={styles}
                theme={theme}
                navigation={navigation}
                onPressExam={() =>
                  setExamTarget({
                    categoryId: f.categoryId,
                    name: f.name,
                    examDate: f.examDate,
                    examLabel: f.examLabel,
                  })
                }
              />
            ))
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Exam Readiness"
          subtitle="How prepared you are based on mastery, overdue reviews, recent accuracy, and days until your exam."
          summary={summaries.readiness}
          open={openSections.readiness}
          onToggle={() => toggleSection('readiness')}
          styles={styles}
          theme={theme}
        >
          {readiness.length === 0 ? (
            <Text style={styles.empty}>Enroll in a class to see readiness scores.</Text>
          ) : (
            readiness.map((item) => (
              <ReadinessCard
                key={item.categoryId}
                item={item}
                styles={styles}
                onPressExam={() => setExamTarget(item)}
              />
            ))
          )}
        </CollapsibleSection>

        {topicGroups.length > 0 && (
          <CollapsibleSection
            title="Topic Breakdown"
            subtitle="Predicted recall for every topic in your classes, weakest first. Tap one to drill it."
            summary={summaries.topics}
            open={openSections.topics}
            onToggle={() => toggleSection('topics')}
            styles={styles}
            theme={theme}
          >
            {topicGroups.map((group) => (
              <ClassTopics
                key={group.categoryId}
                group={group}
                styles={styles}
                theme={theme}
                navigation={navigation}
              />
            ))}
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Weak Spots"
          subtitle="The individual cards dragging those topics down. Tap one to drill its topic, starting with that card."
          summary={summaries.weak}
          open={openSections.weak}
          onToggle={() => toggleSection('weak')}
          styles={styles}
          theme={theme}
        >
          {weakSpots.length === 0 ? (
            <Text style={styles.empty}>No weak spots detected yet — keep studying!</Text>
          ) : (
            weakSpots.map((spot) => (
              <TouchableOpacity
                key={spot.tidbit.id}
                style={styles.weakRow}
                onPress={() =>
                  navigation.navigate('ReviewSession', {
                    categoryId: spot.tidbit.category,
                    sectionId: spot.sectionId,
                    topicDrill: true,
                    startCardId: spot.tidbit.id,
                    deckTitle: spot.sectionTitle || ContentService.formatCategoryName(spot.tidbit.category),
                  })
                }
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.weakTerm} numberOfLines={1}>
                    {spot.tidbit.term || spot.tidbit.text}
                  </Text>
                  <Text style={styles.weakMeta}>
                    {spot.sectionTitle || ContentService.formatCategoryName(spot.tidbit.category)} · {spot.accuracy}% accuracy · {spot.lapses} lapse{spot.lapses !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </CollapsibleSection>

        <TouchableOpacity
          style={styles.queueBtn}
          onPress={() => navigation.navigate('ReviewQueue')}
        >
          <Text style={styles.queueBtnText}>Open Review Queue</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExamDateModal
        visible={!!examTarget}
        onClose={() => setExamTarget(null)}
        categoryId={examTarget?.categoryId}
        classCode={examTarget?.name}
        current={examTarget?.examDate ? { date: examTarget.examDate, label: examTarget.examLabel } : null}
        onSaved={() => load(false)}
      />
    </SafeAreaView>
  );
}

// TEMP (Expo testing): lets Study Insights open without a subscription so the
// new forecast work can be exercised on a free account. Set back to false
// before shipping — the gate itself is untouched.
const BYPASS_PREMIUM_GATE = true;

export default function InsightsScreen({ navigation }) {
  if (BYPASS_PREMIUM_GATE) {
    return <InsightsContent navigation={navigation} />;
  }
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
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, flexShrink: 1 },
  sectionSummary: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  sectionSummaryClosed: { color: theme.primary },
  sectionCaret: { fontSize: 13, width: 14, textAlign: 'right' },
  sectionBody: { paddingBottom: 8 },
  sectionSub: { fontSize: 13, color: theme.textSecondary, marginBottom: 14, lineHeight: 20 },
  empty: { fontSize: 14, color: theme.textSecondary, marginBottom: 12 },
  forecastCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastName: { fontSize: 17, fontWeight: '800', color: theme.text, flex: 1 },
  forecastChip: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
    backgroundColor: theme.primaryLight,
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  forecastHeadline: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.text,
    fontWeight: '600',
    marginBottom: 16,
  },
  legend: { marginTop: 14, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
  legendSub: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  legendValue: { fontSize: 17, fontWeight: '800' },
  forecastMeta: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 12,
    lineHeight: 16,
  },
  forecastCta: {
    marginTop: 12,
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  forecastCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  topicGroup: { marginBottom: 18 },
  topicGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: 10,
  },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topicTile: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  topicTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  topicValue: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  topicMeta: { fontSize: 10, marginTop: 2, opacity: 0.75 },
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
