/**
 * MatchScreen — tap-to-pair matching game.
 *
 * Layout: two columns side by side.
 *   Left column  = shuffled term tiles  (card.front)
 *   Right column = shuffled definition tiles (card.back)
 *
 * How to play:
 *   1. Tap a term  → it highlights (selected).
 *   2. Tap a definition → attempt to match.
 *      - Correct  → both tiles flash green then fade out.
 *      - Wrong    → both shake red, selection clears.
 *   3. When all pairs are matched, show score / time banner
 *      and a "Play again" or "See results" option.
 *
 * We cap at 8 pairs per round so the screen stays usable.
 */
import React, { useState, useEffect, useRef } from 'react';
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
import { useTheme } from '../context/ThemeContext';

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

function Tile({ label, state, onPress }) {
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
    idle: '#fff',
    selected: '#eef2ff',
    correct: '#f0fdf4',
    wrong: '#fef2f2',
    matched: '#f0fdf4',
  }[state] || '#fff';

  const border = {
    idle: '#e5e7eb',
    selected: '#6366f1',
    correct: '#4ade80',
    wrong: '#f87171',
    matched: '#bbf7d0',
  }[state] || '#e5e7eb';

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
  const { deckId, deckTitle, studyScope } = route.params;

  const [loading, setLoading] = useState(true);
  const [allCards, setAllCards] = useState([]);
  const [terms, setTerms] = useState([]);      // { id, label }
  const [defs, setDefs] = useState([]);         // { id, label }
  const [tileState, setTileState] = useState({}); // id → state string
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0); // used to restart

  const timerRef = useRef(null);

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
    // Timer
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, [allCards, round]);

  useEffect(() => {
    if (done) clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [done]);

  const totalPairs = Math.min(allCards.length, MAX_PAIRS);

  const handleTermPress = (id) => {
    if (tileState[`t-${id}`] === 'matched') return;
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
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  if (allCards.length < 2) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyEmoji}>🧩</Text>
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
          <Text style={styles.exitText}>✕ Exit</Text>
        </TouchableOpacity>
        <Text style={styles.titleText}>Match</Text>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{matchedCount}/{totalPairs} matched</Text>
        {mistakes > 0 && <Text style={styles.statMistake}>✗ {mistakes} miss{mistakes !== 1 ? 'es' : ''}</Text>}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(matchedCount / totalPairs) * 100}%` }]} />
      </View>

      {done ? (
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>All matched!</Text>
          <Text style={styles.doneSub}>
            Time: {formatTime(elapsed)}  ·  Misses: {mistakes}
          </Text>
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
        </View>
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
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  exitText: { fontSize: 14, color: '#6b7280', fontWeight: '600', width: 60 },
  titleText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  timerText: { fontSize: 14, color: '#6b7280', fontWeight: '600', width: 60, textAlign: 'right' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingBottom: 8,
  },
  stat: { fontSize: 13, color: '#374151', fontWeight: '600' },
  statMistake: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

  progressTrack: { height: 3, backgroundColor: '#e5e7eb', marginHorizontal: 20, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 3, backgroundColor: '#f59e0b', borderRadius: 2 },

  grid: { padding: 12, paddingBottom: 40 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 10 },

  tile: {
    borderRadius: 14, borderWidth: 2, padding: 14,
    minHeight: 70, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tileText: { fontSize: 13, fontWeight: '600', color: '#111827', lineHeight: 18, textAlign: 'center' },

  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  doneEmoji: { fontSize: 56, marginBottom: 16 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  doneSub: { fontSize: 15, color: '#6b7280', marginBottom: 32 },
  playAgainBtn: {
    backgroundColor: '#eef2ff', borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 32, marginBottom: 14, width: '100%', alignItems: 'center',
  },
  playAgainText: { color: '#6366f1', fontWeight: '700', fontSize: 16 },
  doneBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 32, width: '100%', alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  backLink: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
});
