/**
 * SpeedRunScreen — timed blitz mode.
 *
 * Definition shown → user types the term as fast as possible.
 * Cards cycle instantly on submit. Timer counts down (60 or 90s).
 * Score = correct answers in the time limit.
 *
 * Flow:
 *   1. Ready screen — choose 60s or 90s, then "Go!"
 *   2. Playing — countdown bar, current card, text input
 *   3. Results — score, personal best, deck leaderboard
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { StudyDeckService } from '../services/StudyDeckService';
import { RecallService } from '../services/RecallService';
import { GameScoreService } from '../services/GameScoreService';
import { CardLearningService } from '../services/CardLearningService';

const DURATION_OPTIONS = [60, 90];

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Leaderboard row ─────────────────────────────────────────

function LbRow({ rank, entry }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
  return (
    <View style={[lbS.row, entry.isMe && lbS.rowMe]}>
      <Text style={lbS.rank}>{medal}</Text>
      <Text style={[lbS.name, entry.isMe && lbS.nameMe]} numberOfLines={1}>{entry.displayName}</Text>
      <Text style={[lbS.score, entry.isMe && lbS.scoreMe]}>{entry.correctCount} correct</Text>
    </View>
  );
}

const lbS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  rowMe: { backgroundColor: '#eef2ff' },
  rank: { width: 32, fontSize: 15, fontWeight: '700', color: '#374151' },
  name: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  nameMe: { fontWeight: '800', color: '#6366f1' },
  score: { fontSize: 13, fontWeight: '700', color: '#374151' },
  scoreMe: { color: '#6366f1' },
});

// ─── Main screen ──────────────────────────────────────────────

export default function SpeedRunScreen({ route, navigation }) {
  const { deckId, deckTitle, studyScope } = route.params;
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [phase, setPhase] = useState('loading'); // loading | ready | playing | results
  const [allCards, setAllCards] = useState([]);
  const [duration, setDuration] = useState(60);

  // Playing state
  const [cardQueue, setCardQueue] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [lastResult, setLastResult] = useState(null); // 'correct' | 'wrong' | null
  const [attemptLog, setAttemptLog] = useState([]); // { card, wasCorrect, userAnswer }
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Results state
  const [leaderboard, setLeaderboard] = useState([]);
  const [personalBest, setPersonalBest] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Load cards ─────────────────────────────────────────────

  useEffect(() => {
    StudyDeckService.loadStudyCards(deckId, studyScope).then((cards) => {
      // Only keep cards that have a distinct term and definition
      const usable = cards.filter((c) => c.front?.trim() && c.back?.trim());
      setAllCards(usable);
      setPhase(usable.length >= 2 ? 'ready' : 'error');
    });
  }, [deckId, studyScope]);

  // ─── Start run ───────────────────────────────────────────────

  const startRun = useCallback((chosenDuration) => {
    setDuration(chosenDuration);
    // Shuffle cards into a large queue (repeat if deck is small)
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    // Repeat to fill at least 60 slots so we never run out
    const queue = [];
    while (queue.length < Math.max(60, allCards.length * 3)) {
      queue.push(...shuffled.sort(() => Math.random() - 0.5));
    }
    setCardQueue(queue);
    setCardIndex(0);
    setUserAnswer('');
    setTimeLeft(chosenDuration);
    setCorrect(0);
    setAttempted(0);
    setLastResult(null);
    setAttemptLog([]);
    setPhase('playing');
  }, [allCards]);

  // ─── Countdown timer ─────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // When timer hits 0, finish
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      finishRun();
    }
  }, [timeLeft, phase]);

  // Focus input when playing starts
  useEffect(() => {
    if (phase === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  const finishRun = useCallback(() => {
    clearInterval(timerRef.current);
    setPhase('results');
    setLoadingResults(true);
    setCorrect((c) => {
      setAttempted((a) => {
        GameScoreService.saveSpeedRunScore(deckId, duration, c, a);
        Promise.all([
          GameScoreService.getSpeedRunLeaderboard(deckId, duration),
          GameScoreService.getMySpeedRunBest(deckId, duration),
        ]).then(([lb, pb]) => {
          setLeaderboard(lb);
          setPersonalBest(pb);
          setLoadingResults(false);
        }).catch(() => setLoadingResults(false));
        return a;
      });
      return c;
    });
  }, [deckId, duration]);

  // ─── Answer submission ────────────────────────────────────────

  const submitAnswer = useCallback(() => {
    if (!userAnswer.trim() || phase !== 'playing') return;
    const card = cardQueue[cardIndex];
    if (!card) return;

    const result = RecallService.grade(userAnswer.trim(), card.front);
    const isCorrect = result.isCorrect;

    setAttempted((a) => a + 1);
    if (isCorrect) setCorrect((c) => c + 1);
    setAttemptLog((log) => [...log, { card, wasCorrect: isCorrect, userAnswer: userAnswer.trim() }]);

    // Update spaced repetition — card is now at least "introduced" regardless of correctness
    CardLearningService.recordReview(card.id, { wasCorrect: isCorrect, mode: 'speed_run' });

    // Flash feedback
    setLastResult(isCorrect ? 'correct' : 'wrong');
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setLastResult(null));

    setCardIndex((i) => i + 1);
    setUserAnswer('');
  }, [userAnswer, phase, cardQueue, cardIndex, flashAnim]);

  // ─── Derived ─────────────────────────────────────────────────

  const currentCard = cardQueue[cardIndex] || null;
  const progressPct = timeLeft / duration;

  // ─── Loading ──────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.errorEmoji}>⚡</Text>
        <Text style={styles.errorText}>Need at least 2 cards to Speed Run.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Ready screen ────────────────────────────────────────────

  if (phase === 'ready') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.readyContent}>
          <Text style={styles.readyEmoji}>⚡</Text>
          <Text style={styles.readyTitle}>Speed Run</Text>
          <Text style={styles.readySub}>{deckTitle}</Text>
          <Text style={styles.readyDesc}>
            Definition appears — type the term as fast as you can.{'\n'}Cards flip instantly. How many can you get?
          </Text>
          <Text style={styles.readyPickLabel}>Choose your time limit:</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
                onPress={() => setDuration(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.durationBtnText, duration === d && styles.durationBtnTextActive]}>
                  {d}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.goBtn} onPress={() => startRun(duration)} activeOpacity={0.85}>
            <Text style={styles.goBtnText}>Go! ⚡</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Results screen ───────────────────────────────────────────

  if (phase === 'results') {
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const isPB = !personalBest || correct >= personalBest.correct_count;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <Text style={styles.resultsEmoji}>{correct >= 10 ? '🔥' : correct >= 5 ? '⚡' : '📖'}</Text>
          <Text style={styles.resultsScore}>{correct}</Text>
          <Text style={styles.resultsLabel}>correct in {duration}s</Text>
          <Text style={styles.resultsAccuracy}>{attempted} attempted · {accuracy}% accuracy</Text>

          {isPB && correct > 0 && (
            <View style={styles.pbBanner}>
              <Text style={styles.pbBannerText}>🏆 New personal best!</Text>
            </View>
          )}
          {!isPB && personalBest && (
            <View style={styles.pbBanner}>
              <Text style={styles.pbBannerText}>
                Personal best: {personalBest.correct_count} correct
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.tryAgainBtn} onPress={() => startRun(duration)} activeOpacity={0.85}>
            <Text style={styles.tryAgainText}>Try again ⚡</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

          <View style={styles.lbCard}>
            <Text style={styles.lbTitle}>🏅 Top scores — {deckTitle} ({duration}s)</Text>
            {loadingResults ? (
              <ActivityIndicator color={theme.primary} style={{ margin: 16 }} />
            ) : leaderboard.length === 0 ? (
              <Text style={styles.lbEmpty}>No scores yet — you're first!</Text>
            ) : (
              leaderboard.map((entry, i) => (
                <LbRow key={entry.userId} rank={i + 1} entry={entry} />
              ))
            )}
          </View>

          {attemptLog.length > 0 && (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>📋 Your round</Text>
              {attemptLog.map((item, i) => (
                <View
                  key={i}
                  style={[styles.reviewRow, item.wasCorrect ? styles.reviewRowCorrect : styles.reviewRowWrong]}
                >
                  <View style={[styles.reviewDot, item.wasCorrect ? styles.dotCorrect : styles.dotWrong]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewTerm, item.wasCorrect ? styles.termCorrect : styles.termWrong]}>
                      {item.card.front}
                    </Text>
                    <Text style={styles.reviewDef} numberOfLines={2}>{item.card.back}</Text>
                    {!item.wasCorrect && (
                      <Text style={styles.reviewYourAnswer}>You wrote: "{item.userAnswer}"</Text>
                    )}
                  </View>
                  <Text style={item.wasCorrect ? styles.checkMark : styles.crossMark}>
                    {item.wasCorrect ? '✓' : '✗'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Playing ──────────────────────────────────────────────────

  const flashColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', lastResult === 'correct' ? '#bbf7d0' : '#fecaca'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Timer bar */}
      <View style={styles.timerBarTrack}>
        <Animated.View
          style={[
            styles.timerBarFill,
            {
              width: `${progressPct * 100}%`,
              backgroundColor: progressPct > 0.4 ? theme.primary : progressPct > 0.2 ? '#f59e0b' : '#ef4444',
            },
          ]}
        />
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.timerText}>{timeLeft}s</Text>
        <Text style={styles.deckLabel} numberOfLines={1}>{deckTitle}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{correct} ✓</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.cardWrap, { backgroundColor: flashColor }]}>
          {/* Definition */}
          <View style={styles.defCard}>
            <Text style={styles.defLabel}>DEFINITION</Text>
            <Text style={styles.defText}>{currentCard?.back}</Text>
          </View>

          {/* Input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type the term…"
            placeholderTextColor={theme.textSecondary}
            value={userAnswer}
            onChangeText={setUserAnswer}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submitAnswer}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.submitBtn, !userAnswer.trim() && styles.submitBtnDisabled]}
            onPress={submitAnswer}
            disabled={!userAnswer.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Submit →</Text>
          </TouchableOpacity>

          <Text style={styles.attempted}>{attempted} attempted</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 },
  backLink: { fontSize: 16, color: theme.primary, fontWeight: '600' },
  exitBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 8 },
  exitText: { fontSize: 16, color: theme.textSecondary, fontWeight: '600' },

  // Ready
  readyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  readyEmoji: { fontSize: 64, marginBottom: 12 },
  readyTitle: { fontSize: 32, fontWeight: '900', color: theme.text, marginBottom: 4 },
  readySub: { fontSize: 15, color: theme.textSecondary, marginBottom: 16 },
  readyDesc: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  readyPickLabel: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 12 },
  durationRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  durationBtn: {
    paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14,
    borderWidth: 2, borderColor: theme.primaryLight || '#e5e7eb',
    backgroundColor: theme.card,
  },
  durationBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight || '#eef2ff' },
  durationBtnText: { fontSize: 18, fontWeight: '700', color: theme.textSecondary },
  durationBtnTextActive: { color: theme.primary },
  goBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 48, alignItems: 'center', width: '100%',
  },
  goBtnText: { color: '#fff', fontSize: 20, fontWeight: '900' },

  // Playing
  timerBarTrack: { height: 5, backgroundColor: theme.primaryLight || '#e5e7eb' },
  timerBarFill: { height: 5, borderRadius: 2 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.primaryLight || '#e5e7eb',
  },
  timerText: { fontSize: 20, fontWeight: '900', color: theme.text, width: 50 },
  deckLabel: { flex: 1, fontSize: 13, color: theme.textSecondary, textAlign: 'center', fontWeight: '600' },
  scoreBadge: {
    backgroundColor: theme.primaryLight || '#eef2ff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, minWidth: 50, alignItems: 'center',
  },
  scoreText: { fontSize: 14, fontWeight: '800', color: theme.primary },
  cardWrap: { flex: 1, padding: 20, paddingBottom: 32 },
  defCard: { backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  defLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
  defText: { fontSize: 20, fontWeight: '700', color: theme.text, lineHeight: 28 },
  input: {
    backgroundColor: theme.card, borderRadius: 12, padding: 16, fontSize: 17,
    color: theme.text, borderWidth: 1.5, borderColor: theme.primaryLight || '#e5e7eb', marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  attempted: { textAlign: 'center', marginTop: 10, fontSize: 13, color: theme.textSecondary },

  // Results
  resultsScroll: { padding: 28, paddingBottom: 60, alignItems: 'center' },
  resultsEmoji: { fontSize: 64, marginBottom: 12 },
  resultsScore: { fontSize: 64, fontWeight: '900', color: theme.primary },
  resultsLabel: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 },
  resultsAccuracy: { fontSize: 14, color: theme.textSecondary, marginBottom: 16 },
  pbBanner: {
    backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 8, marginBottom: 20,
  },
  pbBannerText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  tryAgainBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  tryAgainText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  doneBtn: {
    backgroundColor: theme.primaryLight || '#eef2ff', borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', width: '100%', marginBottom: 24,
  },
  doneBtnText: { color: theme.primary, fontSize: 16, fontWeight: '800' },
  lbCard: {
    width: '100%', backgroundColor: theme.card, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb',
  },
  lbTitle: { fontSize: 14, fontWeight: '800', color: theme.text, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  lbEmpty: { fontSize: 13, color: '#9ca3af', padding: 16, textAlign: 'center' },

  reviewCard: {
    width: '100%', backgroundColor: theme.card, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', marginTop: 16,
  },
  reviewTitle: {
    fontSize: 14, fontWeight: '800', color: theme.text,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  reviewRow: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  reviewRowCorrect: { backgroundColor: '#f0fdf4' },
  reviewRowWrong: { backgroundColor: '#fef2f2' },
  reviewDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, marginRight: 10 },
  dotCorrect: { backgroundColor: '#22c55e' },
  dotWrong: { backgroundColor: '#ef4444' },
  reviewTerm: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  termCorrect: { color: '#15803d' },
  termWrong: { color: '#b91c1c' },
  reviewDef: { fontSize: 12, color: theme.textSecondary, lineHeight: 16 },
  reviewYourAnswer: { fontSize: 12, color: '#9ca3af', marginTop: 3, fontStyle: 'italic' },
  checkMark: { fontSize: 18, fontWeight: '700', color: '#22c55e', marginLeft: 8, alignSelf: 'center' },
  crossMark: { fontSize: 18, fontWeight: '700', color: '#ef4444', marginLeft: 8, alignSelf: 'center' },
});
