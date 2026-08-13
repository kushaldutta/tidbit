/**
 * DailyTermScreen — Wordle for today's class term.
 * Same card for the whole class. Definition fragment + category as hints.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  DailyTermService,
  MAX_GUESSES,
  letterCount,
  expandGuess,
  scoreGuess,
  bestKeyStates,
} from '../services/DailyTermService';
import { GameRunService } from '../services/GameRunService';
import { CardLearningService } from '../services/CardLearningService';
import { SameBoatService } from '../services/SameBoatService';

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const TILE = {
  empty: { bg: '#3a3a3c', border: '#3a3a3c', color: '#f8fafc' },
  typed: { bg: '#121213', border: '#565758', color: '#f8fafc' },
  correct: { bg: '#538d4e', border: '#538d4e', color: '#fff' },
  present: { bg: '#b59f3b', border: '#b59f3b', color: '#fff' },
  absent: { bg: '#3a3a3c', border: '#3a3a3c', color: '#f8fafc' },
  space: { bg: 'transparent', border: 'transparent', color: 'transparent' },
};

export default function DailyTermScreen({ route, navigation }) {
  const { classId, categorySlug, classCode } = route.params || {};

  const [phase, setPhase] = useState('loading');
  const [puzzle, setPuzzle] = useState(null);
  const [guesses, setGuesses] = useState([]); // full expanded strings
  const [current, setCurrent] = useState(''); // letters only
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(false);
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const startAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      const today = await DailyTermService.getToday(classId, categorySlug);
      if (!today) {
        setError('No term-sized cards in this class deck yet.');
        setPhase('error');
        return;
      }
      setPuzzle(today);
      const existing = await GameRunService.getMyRunForChallenge(today.id);
      if (existing) {
        setResult({
          coins: 0,
          score: existing.score,
          won: existing.correct_count > 0,
          guessesUsed: existing.total_attempted,
          already: true,
        });
        setPhase('results');
        DailyTermService.getTodayBoard(today.id).then(setLeaderboard);
        return;
      }
      startAt.current = Date.now();
      setPhase('playing');
    })();
  }, [classId, categorySlug]);

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#538d4e" size="large" />
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.big}>🟩</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const answer = puzzle.answer;
  const need = letterCount(answer);
  const keys = bestKeyStates(guesses, answer);
  const showFirstLetter = guesses.length >= 2;

  const submitGuess = async () => {
    if (current.length !== need) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const expanded = expandGuess(current, answer);
    const next = [...guesses, expanded];
    setGuesses(next);
    setCurrent('');
    const won = expanded === answer;
    const lost = !won && next.length >= MAX_GUESSES;
    if (!won && !lost) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    Haptics.notificationAsync(
      won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    CardLearningService.recordReview(puzzle.card.id, { wasCorrect: won, mode: 'wordle' });
    SameBoatService.recordAttempt(puzzle.card.id, won, 'wordle');
    const submitted = await DailyTermService.submit({
      challenge: puzzle,
      guesses: next,
      won,
      elapsedMs: Date.now() - startAt.current,
    });
    setResult(submitted);
    setLeaderboard(submitted.leaderboard || []);
    setPhase('results');
  };

  const onKey = (ch) => {
    if (phase !== 'playing') return;
    if (ch === 'ENTER') {
      submitGuess();
      return;
    }
    if (ch === 'DEL') {
      setCurrent((s) => s.slice(0, -1));
      return;
    }
    if (current.length >= need) return;
    setCurrent((s) => s + ch);
  };

  const rows = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (guesses[i]) rows.push({ text: guesses[i], colors: scoreGuess(guesses[i], answer) });
    else if (i === guesses.length) rows.push({ text: expandGuess(current, answer), colors: null });
    else rows.push({ text: expandGuess('', answer), colors: null });
  }

  if (phase === 'results') {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <Text style={styles.big}>{result?.won ? '🟩' : '⬛'}</Text>
          <Text style={styles.title}>
            {result?.already
              ? 'Already played today'
              : result?.won
                ? `Got it in ${result.guessesUsed}`
                : 'Tomorrow’s another term'}
          </Text>
          <Text style={styles.answerReveal}>{puzzle.answer}</Text>
          <Text style={styles.defFull}>{puzzle.card.back}</Text>
          {result?.coins > 0 && (
            <Text style={styles.coins}>🪙 +{result.coins} Study Coins</Text>
          )}
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
          <View style={styles.lbCard}>
            <Text style={styles.lbTitle}>🏅 {classCode} · fewest guesses win</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.muted}>You're on the board.</Text>
            ) : (
              leaderboard.map((e, i) => (
                <View key={e.userId} style={[styles.lbRow, e.isMe && styles.lbMe]}>
                  <Text style={styles.lbRank}>{i + 1}</Text>
                  <Text style={[styles.lbName, e.isMe && styles.lbMeText]} numberOfLines={1}>
                    {e.displayName}
                  </Text>
                  <Text style={[styles.lbScore, e.isMe && styles.lbMeText]}>{e.score} pts</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.hud}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.exit}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.hudTitle}>{classCode} Term</Text>
        <Text style={styles.hudGuess}>{guesses.length}/{MAX_GUESSES}</Text>
      </View>

      <Text style={styles.fragment}>{puzzle.fragment}</Text>
      {showFirstLetter && (
        <Text style={styles.hint}>Starts with {answer.replace(/ /g, '')[0]}</Text>
      )}

      <View style={[styles.board, shake && styles.boardShake]}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.text.split('').map((ch, ci) => {
              const color = row.colors ? row.colors[ci] : ch ? 'typed' : 'empty';
              const t = TILE[color] || TILE.empty;
              const isSpace = ch === ' ' || color === 'space';
              return (
                <View
                  key={ci}
                  style={[
                    styles.tile,
                    isSpace && styles.tileSpace,
                    { backgroundColor: t.bg, borderColor: t.border },
                    row.text.length > 8 && styles.tileSm,
                  ]}
                >
                  {!isSpace && (
                    <Text style={[styles.tileText, { color: t.color }, row.text.length > 8 && styles.tileTextSm]}>
                      {ch}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.keyboard}>
        {KEY_ROWS.map((row, ri) => (
          <View key={row} style={styles.keyRow}>
            {ri === 2 && (
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={() => onKey('ENTER')}>
                <Text style={styles.keyTextSm}>ENTER</Text>
              </TouchableOpacity>
            )}
            {row.split('').map((ch) => {
              const st = keys[ch];
              const bg = st === 'correct' ? '#538d4e' : st === 'present' ? '#b59f3b' : st === 'absent' ? '#3a3a3c' : '#818384';
              return (
                <TouchableOpacity key={ch} style={[styles.key, { backgroundColor: bg }]} onPress={() => onKey(ch)}>
                  <Text style={styles.keyText}>{ch}</Text>
                </TouchableOpacity>
              );
            })}
            {ri === 2 && (
              <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={() => onKey('DEL')}>
                <Text style={styles.keyTextSm}>DEL</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121213' },
  center: { flex: 1, backgroundColor: '#121213', alignItems: 'center', justifyContent: 'center', padding: 24 },
  big: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  errorText: { color: '#e2e8f0', fontSize: 16, textAlign: 'center' },
  link: { color: '#86efac', fontSize: 16, fontWeight: '700', marginTop: 16 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  exit: { color: '#a1a1aa', fontSize: 22, fontWeight: '700', width: 36 },
  hudTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  hudGuess: { color: '#a1a1aa', fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },
  fragment: {
    color: '#d4d4d8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    fontStyle: 'italic',
  },
  hint: { color: '#86efac', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  board: { paddingHorizontal: 12, paddingTop: 16, gap: 6, alignItems: 'center' },
  boardShake: { transform: [{ translateX: 6 }] },
  row: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  tile: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSm: { width: 28, height: 32 },
  tileSpace: { width: 12, height: 42, borderWidth: 0 },
  tileText: { fontSize: 20, fontWeight: '800' },
  tileTextSm: { fontSize: 14 },
  keyboard: { marginTop: 'auto', paddingHorizontal: 4, paddingBottom: 8, gap: 6 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  key: {
    minWidth: 32,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#818384',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  keyWide: { minWidth: 52, backgroundColor: '#565758' },
  keyText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  keyTextSm: { color: '#fff', fontSize: 11, fontWeight: '800' },
  resultsScroll: { alignItems: 'center', padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
  answerReveal: { fontSize: 20, fontWeight: '800', color: '#86efac', marginBottom: 8 },
  defFull: { fontSize: 15, color: '#a1a1aa', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  coins: { fontSize: 18, fontWeight: '800', color: '#fcd34d', marginVertical: 8 },
  doneBtn: {
    backgroundColor: '#538d4e',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginTop: 8,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  lbCard: { width: '100%', backgroundColor: '#1a1a1b', borderRadius: 16, padding: 16, marginTop: 24 },
  lbTitle: { fontSize: 13, fontWeight: '800', color: '#a1a1aa', marginBottom: 8 },
  muted: { color: '#71717a' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  lbMe: { backgroundColor: '#27272a' },
  lbRank: { width: 28, color: '#a1a1aa', fontWeight: '800' },
  lbName: { flex: 1, color: '#e4e4e7', fontSize: 15 },
  lbScore: { color: '#e4e4e7', fontWeight: '700' },
  lbMeText: { color: '#86efac', fontWeight: '800' },
});
