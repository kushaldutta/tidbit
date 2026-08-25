/**
 * InfiniteRunnerScreen — Space B prototype.
 *
 * Character runs. A definition flies in as an obstacle.
 * Tap the matching term to dodge. Wrong tap or timeout = wipe out.
 * Score = distance. Class leaderboard.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { RunnerService } from '../services/RunnerService';
import { CardLearningService } from '../services/CardLearningService';
import { GameRunService } from '../services/GameRunService';
import { GAME_TYPE } from '../config/gameCatalog';

const { width: SCREEN_W } = Dimensions.get('window');
const HIT_X = 58;
const START_X = SCREEN_W + 24;
const CHAR_X = 22;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function InfiniteRunnerScreen({ route, navigation }) {
  const { classId, categorySlug, classCode } = route.params || {};

  const [phase, setPhase] = useState('loading'); // loading | ready | playing | results | error
  const [cards, setCards] = useState([]);
  const [distance, setDistance] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [obstacle, setObstacle] = useState(null);
  const [flash, setFlash] = useState(null); // 'ok' | 'bad'
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  const obstacleX = useRef(new Animated.Value(START_X)).current;
  const charY = useRef(new Animated.Value(0)).current;
  const groundX = useRef(new Animated.Value(0)).current;
  const bobLoop = useRef(null);
  const groundLoop = useRef(null);
  const obstacleRef = useRef(null);
  const travelAnim = useRef(null);
  const crashRef = useRef(null);
  const distTimer = useRef(null);
  const startAt = useRef(0);
  const running = useRef(false);
  const deckRef = useRef([]);
  const deckIdx = useRef(0);
  const correctRef = useRef(0);
  const distanceRef = useRef(0);

  useEffect(() => {
    RunnerService.loadCards(categorySlug).then((loaded) => {
      if (loaded.length < 3) {
        setError('Need at least 3 cards in this class deck to run.');
        setPhase('error');
        return;
      }
      setCards(loaded);
      setPhase('ready');
      GameRunService.getLeaderboard(GAME_TYPE.RUNNER, { classId }).then(setLeaderboard);
    });
    return () => stopLoops();
  }, [categorySlug, classId]);

  const stopLoops = () => {
    running.current = false;
    if (distTimer.current) clearInterval(distTimer.current);
    travelAnim.current?.stop();
    bobLoop.current?.stop();
    groundLoop.current?.stop();
  };

  const startBob = () => {
    charY.setValue(0);
    bobLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(charY, { toValue: -7, duration: 180, useNativeDriver: true }),
        Animated.timing(charY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    );
    bobLoop.current.start();
  };

  const startGround = () => {
    groundX.setValue(0);
    groundLoop.current = Animated.loop(
      Animated.timing(groundX, {
        toValue: -48,
        duration: 420,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    groundLoop.current.start();
  };

  const jump = () => {
    bobLoop.current?.stop();
    Animated.sequence([
      Animated.timing(charY, { toValue: -52, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(charY, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      if (running.current) startBob();
    });
  };

  const spawnObstacle = useCallback(() => {
    if (!running.current) return;
    const deck = deckRef.current;
    if (!deck.length) return;
    const card = deck[deckIdx.current % deck.length];
    deckIdx.current += 1;
    const next = RunnerService.buildObstacle(card, deck);
    obstacleRef.current = next;
    setObstacle(next);
    setFlash(null);
    obstacleX.setValue(START_X);
    const ms = RunnerService.travelMs(correctRef.current);
    const anim = Animated.timing(obstacleX, {
      toValue: HIT_X,
      duration: ms,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    travelAnim.current = anim;
    anim.start(({ finished }) => {
      if (finished && running.current) crashRef.current?.('timeout');
    });
  }, []);

  const crash = async (reason) => {
    if (!running.current) return;
    running.current = false;
    stopLoops();
    setFlash('bad');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (reason === 'timeout' && obstacleRef.current?.card?.id) {
      CardLearningService.recordReview(obstacleRef.current.card.id, {
        wasCorrect: false,
        mode: 'runner',
      });
    }
    const elapsedMs = Date.now() - startAt.current;
    const meters = distanceRef.current;
    const hits = correctRef.current;
    setPhase('results');
    const submitted = await RunnerService.submitRun({
      classId,
      distance: meters,
      correctCount: hits,
      elapsedMs,
    });
    setResult({ ...submitted, reason });
    setLeaderboard(submitted.leaderboard || []);
  };
  crashRef.current = crash;

  const startRun = () => {
    deckRef.current = shuffle(cards);
    deckIdx.current = 0;
    correctRef.current = 0;
    distanceRef.current = 0;
    setCorrect(0);
    setDistance(0);
    setObstacle(null);
    setResult(null);
    setFlash(null);
    startAt.current = Date.now();
    running.current = true;
    setPhase('playing');
    startBob();
    startGround();
    distTimer.current = setInterval(() => {
      if (!running.current) return;
      const speed = Math.min(28, 11 + correctRef.current * 0.7);
      distanceRef.current += speed * 0.05;
      setDistance(distanceRef.current);
    }, 50);
    setTimeout(spawnObstacle, 350);
  };

  const pickOption = (index) => {
    if (!running.current || !obstacle) return;
    const ok = index === obstacle.correctIndex;
    CardLearningService.recordReview(obstacle.card.id, {
      wasCorrect: ok,
      mode: 'runner',
    });
    if (!ok) {
      crash('wrong');
      return;
    }
    travelAnim.current?.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFlash('ok');
    jump();
    correctRef.current += 1;
    setCorrect(correctRef.current);
    Animated.timing(obstacleX, {
      toValue: HIT_X + 40,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        if (running.current) spawnObstacle();
      }, 120);
    });
  };

  // ─── Loading / error / ready ─────────────────────────────────

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#fbbf24" size="large" />
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.bigEmoji}>🏃</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.center}>
        <TouchableOpacity style={styles.exitAbs} onPress={() => navigation.goBack()}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.bigEmoji}>🏃</Text>
        <Text style={styles.readyTitle}>Infinite Runner</Text>
        <Text style={styles.readySub}>{classCode || 'Your class'}</Text>
        <Text style={styles.readyDesc}>
          Definitions fly at you. Tap the matching term to dodge.{'\n'}
          Miss or wait too long — wipe out. How far can you run?
        </Text>
        <TouchableOpacity style={styles.goBtn} onPress={startRun} activeOpacity={0.85}>
          <Text style={styles.goBtnText}>Run</Text>
        </TouchableOpacity>
        {leaderboard.length > 0 && (
          <View style={styles.lbPreview}>
            <Text style={styles.lbTitle}>Class best</Text>
            {leaderboard.slice(0, 3).map((e, i) => (
              <Text key={e.userId} style={styles.lbLine}>
                {i + 1}. {e.displayName} · {e.score}m
              </Text>
            ))}
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (phase === 'results') {
    const meters = Math.floor(result?.meters ?? distance);
    return (
      <SafeAreaView style={styles.center}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <Text style={styles.bigEmoji}>{meters >= 1000 ? '🔥' : meters >= 300 ? '🏃' : '💥'}</Text>
          <Text style={styles.resultsScore}>{meters}m</Text>
          <Text style={styles.resultsLabel}>
            {correct} dodge{correct === 1 ? '' : 's'} · {result?.reason === 'wrong' ? 'wrong term' : 'too slow'}
          </Text>
          {result?.coins > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('CoinWallet')}>
              <Text style={styles.coinLine}>+{result.coins} Study Coins</Text>
              <Text style={styles.coinLineSub}>See your pile</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.goBtn} onPress={startRun} activeOpacity={0.85}>
            <Text style={styles.goBtnText}>Run again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Done</Text>
          </TouchableOpacity>
          <View style={styles.lbCard}>
            <Text style={styles.lbTitle}>🏅 {classCode || 'Class'} distance</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.lbEmpty}>You're on the board.</Text>
            ) : (
              leaderboard.map((e, i) => (
                <View key={e.userId} style={[styles.lbRow, e.isMe && styles.lbRowMe]}>
                  <Text style={styles.lbRank}>{i + 1}</Text>
                  <Text style={[styles.lbName, e.isMe && styles.lbNameMe]} numberOfLines={1}>
                    {e.displayName}
                  </Text>
                  <Text style={[styles.lbScore, e.isMe && styles.lbNameMe]}>{e.score}m</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Playing ─────────────────────────────────────────────────

  return (
    <View style={styles.playRoot}>
      <LinearGradient colors={['#071018', '#122033', '#1a2a22']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.hud}>
          <TouchableOpacity onPress={() => { stopLoops(); navigation.goBack(); }}>
            <Text style={styles.exitText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.hudDist}>{Math.floor(distance)}m</Text>
          <Text style={styles.hudHits}>{correct} dodged</Text>
        </View>

        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.groundHash,
              { transform: [{ translateX: groundX }] },
            ]}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={styles.hash} />
            ))}
          </Animated.View>

          <Animated.Text
            style={[styles.character, { transform: [{ translateY: charY }] }]}
          >
            🏃
          </Animated.Text>

          {obstacle && (
            <Animated.View
              style={[
                styles.obstacle,
                flash === 'ok' && styles.obstacleOk,
                flash === 'bad' && styles.obstacleBad,
                { transform: [{ translateX: obstacleX }] },
              ]}
            >
              <Text style={styles.obstacleLabel}>DODGE</Text>
              <Text style={styles.obstaclePrompt} numberOfLines={5}>
                {obstacle.prompt}
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.controls}>
          <Text style={styles.controlsHint}>Tap the term</Text>
          {(obstacle?.options || ['', '', '']).map((opt, i) => (
            <TouchableOpacity
              key={`${obstacle?.card?.id || 'x'}-${i}`}
              style={styles.optBtn}
              onPress={() => pickOption(i)}
              activeOpacity={0.85}
              disabled={!obstacle || !running.current}
            >
              <Text style={styles.optText} numberOfLines={2}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#071018',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  playRoot: { flex: 1, backgroundColor: '#071018' },
  bigEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  readyTitle: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
  readySub: { fontSize: 16, color: '#94a3b8', marginBottom: 14 },
  readyDesc: { fontSize: 15, color: '#cbd5e1', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  goBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  goBtnText: { color: '#111827', fontSize: 18, fontWeight: '800' },
  errorText: { color: '#e2e8f0', fontSize: 16, textAlign: 'center', marginBottom: 12 },
  backLink: { color: '#fbbf24', fontSize: 16, fontWeight: '700', marginTop: 16 },
  exitAbs: { position: 'absolute', top: 16, left: 16, padding: 8 },
  exitText: { color: '#94a3b8', fontSize: 22, fontWeight: '700' },
  lbPreview: { marginTop: 28, alignItems: 'center' },
  lbTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 8, letterSpacing: 0.4 },
  lbLine: { color: '#e2e8f0', fontSize: 14, marginBottom: 4 },
  resultsScroll: { alignItems: 'center', padding: 24, paddingBottom: 48 },
  resultsScore: { fontSize: 56, fontWeight: '900', color: '#fbbf24' },
  resultsLabel: { fontSize: 15, color: '#94a3b8', marginBottom: 8 },
  coinLine: { fontSize: 18, fontWeight: '800', color: '#fcd34d', marginTop: 8, textAlign: 'center' },
  coinLineSub: { fontSize: 14, color: '#94a3b8', marginBottom: 8, textAlign: 'center' },
  lbCard: {
    width: '100%',
    backgroundColor: '#122033',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  lbEmpty: { color: '#94a3b8', fontSize: 14 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1e293b' },
  lbRowMe: { backgroundColor: '#1e3a2f' },
  lbRank: { width: 28, color: '#94a3b8', fontWeight: '800' },
  lbName: { flex: 1, color: '#e2e8f0', fontSize: 15 },
  lbNameMe: { color: '#fbbf24', fontWeight: '800' },
  lbScore: { color: '#e2e8f0', fontWeight: '700' },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hudDist: { fontSize: 28, fontWeight: '900', color: '#fbbf24', fontVariant: ['tabular-nums'] },
  hudHits: { fontSize: 16, fontWeight: '800', color: '#86efac' },
  stage: {
    height: 280,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#0f1c28',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  groundHash: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    flexDirection: 'row',
    gap: 24,
  },
  hash: { width: 22, height: 4, backgroundColor: '#334155', borderRadius: 2 },
  character: {
    position: 'absolute',
    left: CHAR_X,
    bottom: 44,
    fontSize: 42,
    zIndex: 3,
  },
  obstacle: {
    position: 'absolute',
    left: 0,
    bottom: 52,
    width: 168,
    minHeight: 132,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 10,
    zIndex: 2,
  },
  obstacleOk: { borderColor: '#22c55e', backgroundColor: '#14532d' },
  obstacleBad: { borderColor: '#ef4444', backgroundColor: '#7f1d1d' },
  obstacleLabel: { fontSize: 10, fontWeight: '800', color: '#fbbf24', letterSpacing: 1, marginBottom: 4 },
  obstaclePrompt: { fontSize: 13, fontWeight: '600', color: '#f8fafc', lineHeight: 18 },
  controls: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: 'flex-end',
    gap: 10,
  },
  controlsHint: { color: '#64748b', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  optBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  optText: { color: '#f8fafc', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
