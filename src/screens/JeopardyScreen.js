/**
 * JeopardyScreen — shared class board. First correct term claims the square.
 * Prompt: definition → type the term. Board resets each UTC day.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { JeopardyService } from '../services/JeopardyService';
import { GameRunService } from '../services/GameRunService';
import { CardLearningService } from '../services/CardLearningService';
import { SameBoatService } from '../services/SameBoatService';
import { AuthService } from '../services/AuthService';

const NAVY = '#06061a';
const CELL = '#060CE9';
const CELL_MINE = '#1a3cff';
const CELL_TAKEN = '#0a1478';
const GOLD = '#F5D76E';
const WHITE = '#f8fafc';

export default function JeopardyScreen({ route, navigation }) {
  const { classId, categorySlug, classCode } = route.params || {};
  const myId = AuthService.getUserId();

  const [phase, setPhase] = useState('loading'); // loading | board | clue | error
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // 'wrong' | 'ok' | 'taken'
  const [result, setResult] = useState(null);
  const [misses, setMisses] = useState(0);
  const [claiming, setClaiming] = useState(false);

  const inputRef = useRef(null);
  const startAt = useRef(Date.now());

  const loadBoard = useCallback(async () => {
    const today = await JeopardyService.getToday(classId, categorySlug);
    if (!today) {
      setError('Need more cards in this class deck to build a board.');
      setPhase('error');
      return null;
    }
    setBoard(today);
    const [run, lb] = await Promise.all([
      GameRunService.getMyRunForChallenge(today.id),
      JeopardyService.getTodayBoard(today.id),
    ]);
    setMyScore(run?.score || 0);
    setLeaderboard(lb);
    return today;
  }, [classId, categorySlug]);

  useEffect(() => {
    loadBoard().then((today) => {
      if (today) setPhase('board');
    });
  }, [loadBoard]);

  useEffect(() => {
    if (phase !== 'board' || !board?.id) return undefined;
    const t = setInterval(() => {
      JeopardyService.refresh(board.id).then((fresh) => {
        if (fresh) setBoard(fresh);
      });
      JeopardyService.getTodayBoard(board.id).then(setLeaderboard);
    }, 12000);
    return () => clearInterval(t);
  }, [phase, board?.id]);

  const openCell = async (cell) => {
    if (!cell?.card || cell.claimedBy || phase !== 'board') return;
    const fresh = await JeopardyService.refresh(board.id);
    if (fresh) setBoard(fresh);
    const latest = fresh?.cells[cell.index] || cell;
    if (latest.claimedBy) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setActiveIndex(cell.index);
    setUserAnswer('');
    setFeedback(null);
    setResult(null);
    setMisses(0);
    setPhase('clue');
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const submitClue = async () => {
    if (!userAnswer.trim() || claiming || feedback === 'ok') return;
    const cell = board.cells[activeIndex];
    setClaiming(true);
    const elapsedMs = Date.now() - startAt.current;
    const outcome = await JeopardyService.tryClaim({
      board,
      cellIndex: activeIndex,
      answer: userAnswer,
      elapsedMs,
    });
    setClaiming(false);

    if (outcome.reason === 'wrong') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setFeedback('wrong');
      setMisses((n) => n + 1);
      setUserAnswer('');
      CardLearningService.recordReview(cell.card.id, { wasCorrect: false, mode: 'jeopardy' });
      SameBoatService.recordAttempt(cell.card.id, false, 'jeopardy');
      return;
    }

    if (outcome.reason === 'taken') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFeedback('taken');
      setResult({ takenBy: outcome.board?.cells[activeIndex]?.claimedName || 'a classmate' });
      if (outcome.board) setBoard(outcome.board);
      setTimeout(() => {
        setPhase('board');
        setActiveIndex(null);
      }, 1400);
      return;
    }

    if (!outcome.ok) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    CardLearningService.recordReview(cell.card.id, { wasCorrect: true, mode: 'jeopardy' });
    SameBoatService.recordAttempt(cell.card.id, true, 'jeopardy');
    setFeedback('ok');
    setResult(outcome);
    setMyScore(outcome.score || myScore + cell.value);
    if (outcome.board) setBoard(outcome.board);
    if (outcome.leaderboard) setLeaderboard(outcome.leaderboard);
    setTimeout(() => {
      setPhase('board');
      setActiveIndex(null);
    }, 1400);
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={GOLD} size="large" />
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.big}>🟦</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const nCats = board.categories.length;
  const nValues = board.values.length;
  const width = Dimensions.get('window').width;
  const cellW = (width - 16 - 3 * (nCats - 1)) / nCats;
  const playable = board.cells.filter((c) => c.card);
  const claimedCount = playable.filter((c) => c.claimedBy).length;
  const complete = playable.length > 0 && claimedCount === playable.length;
  const cell = activeIndex != null ? board.cells[activeIndex] : null;
  const showHint = misses >= 2 && cell?.card?.front;

  if (phase === 'clue' && cell?.card) {
    return (
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.clueTop}>
            <TouchableOpacity onPress={() => { setPhase('board'); setActiveIndex(null); }}>
              <Text style={styles.backGold}>← Board</Text>
            </TouchableOpacity>
            <Text style={styles.clueMeta}>
              {board.categories[cell.catIndex]?.title} · {cell.value}
            </Text>
            <View style={{ width: 64 }} />
          </View>
          <View style={styles.clueBody}>
            <Text style={styles.defLabel}>DEFINITION</Text>
            <Text style={styles.defText}>{cell.card.back}</Text>
            {showHint && feedback !== 'ok' && (
              <Text style={styles.hint}>
                Starts with {String(cell.card.front).trim()[0]}
              </Text>
            )}
            {feedback === 'wrong' && (
              <Text style={styles.wrong}>Not quite — try again. Square is still open.</Text>
            )}
            {feedback === 'ok' && (
              <Text style={styles.ok}>
                {cell.value}! {result?.term}
                {result?.coins ? `  ·  +${result.coins} coins` : ''}
              </Text>
            )}
            {feedback === 'taken' && (
              <Text style={styles.taken}>Already claimed by {result?.takenBy}</Text>
            )}
            {feedback !== 'ok' && feedback !== 'taken' && (
              <>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Type the term…"
                  placeholderTextColor="#94a3b8"
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={submitClue}
                  editable={!claiming}
                />
                <TouchableOpacity
                  style={[styles.lockBtn, (!userAnswer.trim() || claiming) && styles.lockDisabled]}
                  onPress={submitClue}
                  disabled={!userAnswer.trim() || claiming}
                  activeOpacity={0.85}
                >
                  <Text style={styles.lockText}>{claiming ? 'Claiming…' : 'Lock in'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backGold}>← Games</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{classCode || 'Class'} Jeopardy</Text>
          <Text style={styles.headerSub}>You · {myScore}</Text>
        </View>
        <Text style={styles.headerSub}>{claimedCount}/{playable.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {complete && (
          <Text style={styles.banner}>Board complete · see who won below</Text>
        )}
        <View style={styles.catRow}>
          {board.categories.map((cat, i) => (
            <View key={i} style={[styles.catCell, { width: cellW }]}>
              <Text style={styles.catText} numberOfLines={2}>{cat.title}</Text>
            </View>
          ))}
        </View>
        {board.values.map((value, valueIndex) => (
          <View key={value} style={styles.valueRow}>
            {board.categories.map((_, catIndex) => {
              const idx = catIndex * nValues + valueIndex;
              const c = board.cells[idx];
              const mine = c?.claimedBy && c.claimedBy === myId;
              const taken = Boolean(c?.claimedBy);
              const empty = !c?.card;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    { width: cellW },
                    mine && styles.cellMine,
                    taken && !mine && styles.cellTaken,
                    empty && styles.cellEmpty,
                  ]}
                  onPress={() => openCell(c)}
                  disabled={taken || empty}
                  activeOpacity={0.85}
                >
                  {taken ? (
                    <Text style={styles.claimedName} numberOfLines={2}>
                      {mine ? 'YOU' : (c.claimedName || '—')}
                    </Text>
                  ) : (
                    <Text style={[styles.cellValue, empty && { color: '#334155' }]}>
                      {empty ? '—' : value}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <Text style={styles.lbTitle}>Today’s board</Text>
        {leaderboard.length === 0 ? (
          <Text style={styles.lbEmpty}>No squares claimed yet. First correct answer wins.</Text>
        ) : (
          leaderboard.map((row, i) => (
            <View key={row.userId} style={[styles.lbRow, row.isMe && styles.lbMe]}>
              <Text style={styles.lbRank}>{i + 1}</Text>
              <Text style={styles.lbName}>{row.displayName}</Text>
              <Text style={styles.lbScore}>{row.score}</Text>
            </View>
          ))
        )}
        <Text style={styles.footnote}>
          Definition → term. First correct claim locks the square. Resets at midnight UTC.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  center: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  big: { fontSize: 48 },
  errorText: { color: WHITE, fontSize: 16, textAlign: 'center' },
  link: { color: GOLD, fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a8a',
  },
  backGold: { color: GOLD, fontWeight: '700', fontSize: 15, width: 72 },
  headerTitle: { color: WHITE, fontWeight: '800', fontSize: 16 },
  headerSub: { color: GOLD, fontWeight: '700', fontSize: 12, marginTop: 2 },
  scroll: { padding: 8, paddingBottom: 40 },
  banner: {
    color: GOLD,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  catRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  catCell: {
    backgroundColor: '#000066',
    minHeight: 44,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  valueRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  cell: {
    backgroundColor: CELL,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cellMine: { backgroundColor: CELL_MINE, borderWidth: 2, borderColor: GOLD },
  cellTaken: { backgroundColor: CELL_TAKEN },
  cellEmpty: { backgroundColor: '#0b1220' },
  cellValue: { color: GOLD, fontSize: 18, fontWeight: '900' },
  claimedName: { color: '#cbd5e1', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  lbTitle: {
    color: GOLD,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  lbEmpty: { color: '#94a3b8', fontSize: 13 },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  lbMe: { backgroundColor: '#1e3a8a' },
  lbRank: { width: 24, color: GOLD, fontWeight: '800' },
  lbName: { flex: 1, color: WHITE, fontWeight: '600' },
  lbScore: { color: GOLD, fontWeight: '800' },
  footnote: { color: '#64748b', fontSize: 12, marginTop: 16, lineHeight: 18 },
  clueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clueMeta: { color: GOLD, fontWeight: '800', fontSize: 13 },
  clueBody: { flex: 1, padding: 20 },
  defLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  defText: { color: WHITE, fontSize: 22, fontWeight: '600', lineHeight: 30, marginBottom: 20 },
  hint: { color: GOLD, fontWeight: '700', marginBottom: 12 },
  wrong: { color: '#fca5a5', fontWeight: '700', marginBottom: 12 },
  ok: { color: GOLD, fontSize: 20, fontWeight: '800', marginTop: 12 },
  taken: { color: '#fde68a', fontSize: 16, fontWeight: '700', marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: WHITE,
    backgroundColor: '#0b1220',
    marginBottom: 12,
  },
  lockBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lockDisabled: { opacity: 0.4 },
  lockText: { color: NAVY, fontSize: 16, fontWeight: '800' },
});
