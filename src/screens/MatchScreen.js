/**
 * MatchScreen — tap-to-pair matching game.
 *
 * Layout: two columns side by side.
 *   Left column  = shuffled term tiles  (card.front)
 *   Right column = shuffled definition tiles (card.back)
 *
 * How to play:
 *   1. Tap a term  → it highlights (selected). Tap again to deselect.
 *   2. Tap a definition → attempt to match.
 *      - Correct  → both tiles flash green then fade out.
 *      - Wrong    → both shake red, selection clears.
 *   3. When all pairs are matched, show score / time banner
 *      and a "Play again" or "See results" option.
 *
 * We cap at 8 pairs per round so the screen stays usable.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudyDeckService } from '../services/StudyDeckService';
import { GameScoreService } from '../services/GameScoreService';
import { CardLearningService } from '../services/CardLearningService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

const MAX_PAIRS = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Single tile ─────────────────────────────────────────────────────────────

function Tile({ label, state, onPress, theme, styles }) {
  const scale = useRef(new Animated.Value(1)).current;

  // Shake animation for wrong
  const shake = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.04, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.03, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (state === 'wrong') shake();
  }, [state]);

  const bg = {
    idle: theme.card,
    selected: theme.primaryLight,
    correct: theme.successBg,
    wrong: theme.dangerBg,
    matched: theme.successBg,
  }[state] || theme.card;

  const border = {
    idle: theme.border,
    selected: theme.primary,
    correct: theme.success,
    wrong: theme.danger,
    matched: theme.success,
  }[state] || theme.border;

  const opacity = state === 'matched' ? 0.4 : 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={state === 'matched'}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.tile,
          { backgroundColor: bg, borderColor: border, opacity, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.tileText} numberOfLines={4}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MatchScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { deckId, deckTitle, studyScope } = route.params;

  const [loading, setLoading] = useState(true);
  const [allCards, setAllCards] = useState([]);
  const [terms, setTerms] = useState([]);      // { id, label }
  const [defs, setDefs] = useState([]);         // { id, label }
  const [tileState, setTileState] = useState({}); // id → state string
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0); // used to restart
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);

  const timerRef = useRef(null);
  const roundStartRef = useRef(Date.now());

  useEffect(() => {
    StudyDeckService.loadStudyCards(deckId, studyScope).then((cards) => {
      setAllCards(cards);
      setLoading(false);
    });
  }, [deckId, studyScope]);

  // Build a round from allCards
  useEffect(() => {
    if (allCards.length < 2) return;
    const picked = shuffle(allCards).slice(0, MAX_PAIRS);
    const t = shuffle(picked.map((c) => ({ id: c.id, label: c.front })));
    const d = shuffle(picked.map((c) => ({ id: c.id, label: c.back })));
    setTerms(t);
    setDefs(d);
    const initState = {};
    [...picked].forEach((c) => {
      initState[`t-${c.id}`] = 'idle';
      initState[`d-${c.id}`] = 'idle';
    });
    setTileState(initState);
    setSelectedTerm(null);
    setMatchedCount(0);
    setMistakes(0);
    setDone(false);
    setLeaderboard([]);
    // Reset per-round timer
    roundStartRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - roundStartRef.current) / 1000));
    }, 1000);
  }, [allCards, round]);

  useEffect(() => {
    if (done) {
      clearInterval(timerRef.current);
      // Save score + load leaderboard
      GameScoreService.saveMatchScore(deckId, totalPairs, elapsed, mistakes);
      setLoadingLb(true);
      Promise.all([
        GameScoreService.getMatchLeaderboard(deckId),
        GameScoreService.getMyMatchBest(deckId),
      ]).then(([lb, pb]) => {
        setLeaderboard(lb);
        setPersonalBest(pb);
        setLoadingLb(false);
      }).catch(() => setLoadingLb(false));
    }
    return () => clearInterval(timerRef.current);
  }, [done]);

  const totalPairs = Math.min(allCards.length, MAX_PAIRS);

  const handleTermPress = (id) => {
    if (tileState[`t-${id}`] === 'matched') return;

    if (selectedTerm === id) {
      setSelectedTerm(null);
      setTileState((prev) => ({ ...prev, [`t-${id}`]: 'idle' }));
      return;
    }

    setSelectedTerm(id);
    setTileState((prev) => {
      const next = { ...prev };
      // Clear any previously selected term highlight
      terms.forEach((t) => {
        if (next[`t-${t.id}`] === 'selected') next[`t-${t.id}`] = 'idle';
      });
      next[`t-${id}`] = 'selected';
      return next;
    });
  };

  const handleDefPress = (id) => {
    if (!selectedTerm) return;
    if (tileState[`d-${id}`] === 'matched') return;

    if (id === selectedTerm) {
      // Correct match!
      setTileState((prev) => ({
        ...prev,
        [`t-${id}`]: 'matched',
        [`d-${id}`]: 'matched',
      }));
      setSelectedTerm(null);
      const newCount = matchedCount + 1;
      setMatchedCount(newCount);
      // Matching a pair = successful recognition — update spaced repetition
      CardLearningService.recordReview(id, { wasCorrect: true, mode: 'match' });
      if (newCount >= totalPairs) {
        setDone(true);
      }
    } else {
      // Wrong
      setMistakes((m) => m + 1);
      setTileState((prev) => ({
        ...prev,
        [`t-${selectedTerm}`]: 'wrong',
        [`d-${id}`]: 'wrong',
      }));
      // Reset after flash
      setTimeout(() => {
        setTileState((prev) => ({
          ...prev,
          [`t-${selectedTerm}`]: 'idle',
          [`d-${id}`]: 'idle',
        }));
        setSelectedTerm(null);
      }, 700);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;
  }

  if (allCards.length < 2) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="match" size={iconSize.hero} color={theme.textMuted} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>Need at least 2 cards to play Match.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={styles.exitRow}>
            <Icon name="close" size={iconSize.sm} color={theme.textSecondary} />
            <Text style={styles.exitText}>Exit</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.titleText}>Match</Text>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{matchedCount}/{totalPairs} matched</Text>
        {mistakes > 0 && (
          <Text style={styles.statMistake}>{mistakes} miss{mistakes !== 1 ? 'es' : ''}</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(matchedCount / totalPairs) * 100}%` }]} />
      </View>

      {done ? (
        <ScrollView contentContainerStyle={styles.doneScroll} showsVerticalScrollIndicator={false}>
          <Icon name="trophy" size={iconSize.hero} color={theme.primary} style={styles.doneIcon} />
          <Text style={styles.doneTitle}>All matched!</Text>
          <Text style={styles.doneSub}>
            {formatTime(elapsed)}  ·  {mistakes === 0 ? 'Perfect!' : `${mistakes} miss${mistakes !== 1 ? 'es' : ''}`}
          </Text>

          {personalBest && (
            <View style={styles.pbRow}>
              <Text style={styles.pbText}>
                Personal best: {formatTime(personalBest.elapsed_seconds)} · {personalBest.mistakes} miss{personalBest.mistakes !== 1 ? 'es' : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={() => setRound((r) => r + 1)}
          >
            <Text style={styles.playAgainText}>Play again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() =>
              navigation.replace('LearnSummary', {
                deckId,
                deckTitle,
                studyScope,
                correct: totalPairs - mistakes,
                total: totalPairs,
                mode: 'match',
              })
            }
          >
            <Text style={styles.doneBtnText}>See results →</Text>
          </TouchableOpacity>

          {/* Leaderboard */}
          <View style={styles.lbCard}>
            <Text style={styles.lbTitle}>Top scores — {deckTitle}</Text>
            {loadingLb ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 12 }} />
            ) : leaderboard.length === 0 ? (
              <Text style={styles.lbEmpty}>No scores yet — you're first!</Text>
            ) : (
              leaderboard.map((entry, i) => (
                <View key={entry.userId} style={[styles.lbRow, entry.isMe && styles.lbRowMe]}>
                  <Text style={styles.lbRank}>{i + 1}.</Text>
                  <Text style={[styles.lbName, entry.isMe && styles.lbNameMe]} numberOfLines={1}>
                    {entry.displayName}
                  </Text>
                  <Text style={[styles.lbScore, entry.isMe && styles.lbScoreMe]}>
                    {formatTime(entry.elapsedSeconds)} · {entry.mistakes} miss
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          <View style={styles.columns}>
            {/* Terms */}
            <View style={styles.column}>
              {terms.map((t) => (
                <Tile
                  key={t.id}
                  label={t.label}
                  state={tileState[`t-${t.id}`] || 'idle'}
                  onPress={() => handleTermPress(t.id)}
                  theme={theme}
                  styles={styles}
                />
              ))}
            </View>
            {/* Definitions */}
            <View style={styles.column}>
              {defs.map((d) => (
                <Tile
                  key={d.id}
                  label={d.label}
                  state={tileState[`d-${d.id}`] || 'idle'}
                  onPress={() => handleDefPress(d.id)}
                  theme={theme}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surfaceAlt },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exitText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600', width: 60 },
  titleText: { fontSize: 16, fontWeight: '800', color: theme.text },
  timerText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600', width: 60, textAlign: 'right' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingBottom: 8,
  },
  stat: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
  statMistake: { fontSize: 13, color: theme.danger, fontWeight: '600' },

  progressTrack: { height: 3, backgroundColor: theme.border, marginHorizontal: 20, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 3, backgroundColor: theme.warning, borderRadius: 2 },

  grid: { padding: 12, paddingBottom: 40 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 10 },

  tile: {
    borderRadius: 14, borderWidth: 2, padding: 14,
    minHeight: 70, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tileText: { fontSize: 13, fontWeight: '600', color: theme.text, lineHeight: 18, textAlign: 'center' },

  doneScroll: { padding: 28, paddingBottom: 60, alignItems: 'center' },
  doneIcon: { marginBottom: 12 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: theme.text, marginBottom: 6 },
  doneSub: { fontSize: 15, color: theme.textSecondary, marginBottom: 16 },
  pbRow: {
    backgroundColor: theme.warningBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 20,
  },
  pbText: { fontSize: 13, fontWeight: '600', color: theme.warningText },
  playAgainBtn: {
    backgroundColor: theme.primaryLight, borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 32, marginBottom: 12, width: '100%', alignItems: 'center',
  },
  playAgainText: { color: theme.primary, fontWeight: '700', fontSize: 16 },
  doneBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 24,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  lbCard: {
    width: '100%', backgroundColor: theme.card, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: theme.border,
  },
  lbTitle: { fontSize: 14, fontWeight: '800', color: theme.text, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.surfaceAlt },
  lbEmpty: { fontSize: 13, color: theme.textMuted, padding: 16, textAlign: 'center' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.surfaceAlt },
  lbRowMe: { backgroundColor: theme.primaryLight },
  lbRank: { width: 32, fontSize: 15, fontWeight: '700', color: theme.textSecondary },
  lbName: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.text },
  lbNameMe: { fontWeight: '800', color: theme.primary },
  lbScore: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  lbScoreMe: { color: theme.primary },

  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary, marginBottom: 16 },
  backLink: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});
