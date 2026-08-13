/**
 * SpeedDuelScreen — 10 cards, definition → type the term, race the clock.
 * Same prompt direction as Daily Challenge / Speed Run so mode-switching never leaks.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { RecallService } from '../services/RecallService';
import { SpeedDuelService } from '../services/SpeedDuelService';
import { GameRunService } from '../services/GameRunService';

function formatMs(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SpeedDuelScreen({ route, navigation }) {
  const { challengeId, classId, opponentId, opponentName } = route.params || {};
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [phase, setPhase] = useState('loading');
  const [challenge, setChallenge] = useState(null);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState(null);
  const [lastFlash, setLastFlash] = useState(null);

  const startRef = useRef(Date.now());
  const tickRef = useRef(null);
  const inputRef = useRef(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let ch = null;
        if (challengeId) {
          ch = await SpeedDuelService.getChallenge(challengeId);
        } else if (classId && opponentId) {
          ch = await SpeedDuelService.createChallenge(classId, opponentId);
        }
        if (!ch) throw new Error('Could not load duel');
        const myRun = await GameRunService.getMyRunForChallenge(ch.id);
        if (myRun) {
          if (cancelled) return;
          setChallenge(ch);
          setOutcome({
            coins: 0,
            result: ch.status === 'completed' ? 'done' : 'waiting',
            myCorrect: myRun.correct_count,
            myElapsedMs: myRun.elapsed_ms,
          });
          setPhase(ch.status === 'completed' ? 'results' : 'waiting');
          return;
        }
        const loaded = await SpeedDuelService.getChallengeCards(ch);
        if (loaded.length < 2) throw new Error('Not enough cards for this duel');
        if (cancelled) return;
        setChallenge(ch);
        setCards(loaded);
        startRef.current = Date.now();
        setPhase('playing');
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Could not start duel');
          setPhase('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [challengeId, classId, opponentId]);

  useEffect(() => {
    if (phase !== 'playing') return;
    tickRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 250);
    setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearInterval(tickRef.current);
  }, [phase]);

  const finish = useCallback(async (finalCorrect, finalAnswers, ms) => {
    if (finishingRef.current || !challenge) return;
    finishingRef.current = true;
    clearInterval(tickRef.current);
    setPhase('submitting');
    const result = await SpeedDuelService.submitRun(challenge, {
      correctCount: finalCorrect,
      totalAttempted: finalAnswers.length,
      elapsedMs: ms,
      answers: finalAnswers,
    });
    setOutcome(result);
    setPhase(result.result === 'waiting' ? 'waiting' : 'results');
  }, [challenge]);

  const submit = useCallback(() => {
    if (phase !== 'playing' || !userAnswer.trim()) return;
    const card = cards[index];
    if (!card) return;
    const graded = RecallService.grade(userAnswer.trim(), card.front);
    const nextAnswers = [...answers, { cardId: card.id, wasCorrect: graded.isCorrect }];
    const nextCorrect = correct + (graded.isCorrect ? 1 : 0);
    setLastFlash(graded.isCorrect ? 'correct' : 'wrong');
    setAnswers(nextAnswers);
    setCorrect(nextCorrect);
    setUserAnswer('');

    const ms = Date.now() - startRef.current;
    if (index + 1 >= cards.length) {
      finish(nextCorrect, nextAnswers, ms);
    } else {
      setTimeout(() => {
        setLastFlash(null);
        setIndex((i) => i + 1);
        inputRef.current?.focus();
      }, 180);
    }
  }, [phase, userAnswer, cards, index, answers, correct, finish]);

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.muted}>{phase === 'submitting' ? 'Locking in your run…' : 'Setting up the duel…'}</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.bigEmoji}>⚔️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === 'waiting' || phase === 'results') {
    const title =
      outcome?.result === 'win' ? 'You won!' :
      outcome?.result === 'loss' ? 'They got you' :
      outcome?.result === 'tie' ? 'Dead even' :
      'Waiting on your opponent';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.readyContent}>
          <Text style={styles.bigEmoji}>{outcome?.result === 'win' ? '🏆' : '⚔️'}</Text>
          <Text style={styles.readyTitle}>{title}</Text>
          {opponentName ? <Text style={styles.readySub}>vs {opponentName}</Text> : null}
          <Text style={styles.statLine}>
            {outcome?.myCorrect ?? correct}/{cards.length || 10} correct · {formatMs(outcome?.myElapsedMs ?? elapsedMs)}
          </Text>
          {outcome?.theirCorrect != null && (
            <Text style={styles.statLine}>
              Opponent: {outcome.theirCorrect} correct · {formatMs(outcome.theirElapsedMs)}
            </Text>
          )}
          {outcome?.coins > 0 && (
            <Text style={styles.coinLine}>🪙 +{outcome.coins} Study Coins</Text>
          )}
          {phase === 'waiting' && (
            <Text style={styles.muted}>They’ll see this in Games and on the class feed.</Text>
          )}
          <TouchableOpacity style={styles.goBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.goBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const card = cards[index];
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.progressText}>{index + 1} / {cards.length}</Text>
        <Text style={styles.timer}>{formatMs(elapsedMs)}</Text>
      </View>
      <View style={[styles.flashBar, lastFlash === 'correct' && styles.flashOk, lastFlash === 'wrong' && styles.flashBad]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.play}>
          <Text style={styles.vs}>
            Speed Duel{opponentName ? ` · vs ${opponentName}` : ''}
          </Text>
          <View style={styles.definitionCard}>
            <Text style={styles.definitionLabel}>DEFINITION</Text>
            <Text style={styles.definitionText}>{card?.back}</Text>
          </View>
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
            onSubmitEditing={submit}
          />
          <TouchableOpacity
            style={[styles.submitBtn, !userAnswer.trim() && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={!userAnswer.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Lock in</Text>
          </TouchableOpacity>
          <Text style={styles.scoreHint}>{correct} correct</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginTop: 8 },
  errorText: { fontSize: 16, color: theme.text, textAlign: 'center', marginBottom: 12 },
  backLink: { fontSize: 16, fontWeight: '600', color: theme.primary },
  bigEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  exitBtn: { position: 'absolute', top: 12, left: 16, zIndex: 2, padding: 8 },
  exitText: { fontSize: 22, color: theme.textSecondary, fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressText: { fontSize: 15, fontWeight: '700', color: theme.text },
  timer: { fontSize: 16, fontWeight: '800', color: theme.primary, fontVariant: ['tabular-nums'] },
  flashBar: { height: 4, backgroundColor: 'transparent' },
  flashOk: { backgroundColor: '#16a34a' },
  flashBad: { backgroundColor: '#dc2626' },
  play: { flex: 1, padding: 20 },
  vs: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 12 },
  definitionCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.primaryLight,
  },
  definitionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: theme.textSecondary, marginBottom: 8 },
  definitionText: { fontSize: 20, fontWeight: '600', color: theme.text, lineHeight: 28 },
  input: {
    borderWidth: 1.5,
    borderColor: theme.primaryLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: theme.text,
    backgroundColor: theme.card,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scoreHint: { textAlign: 'center', marginTop: 14, color: theme.textSecondary, fontWeight: '600' },
  readyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  readyTitle: { fontSize: 28, fontWeight: '800', color: theme.text, marginBottom: 6, textAlign: 'center' },
  readySub: { fontSize: 16, color: theme.textSecondary, marginBottom: 16 },
  statLine: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 6 },
  coinLine: { fontSize: 18, fontWeight: '800', color: '#92400e', marginTop: 10 },
  goBtn: {
    marginTop: 28,
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  goBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
