/**
 * InfiniteRunnerScreen — Space B prototype.
 *
 * Character runs. A definition flies in as an obstacle.
 * Tap the matching term to dodge. Wrong tap or timeout = wipe out.
 * Score = distance. Class leaderboard.
 *
 * Deliberately theme-independent: this is a game canvas, not app chrome. The
 * ink stage and amber accent are the art direction and stay fixed across
 * themes. Everything the player returns to (Home, wallet, leaderboards) is
 * themed.
 *
 * The runner is drawn from Views as a thick-stroke pictogram rather than an
 * emoji — emoji render differently on every OS, so they cannot be art-directed,
 * and a system glyph as the hero of a game reads as a placeholder.
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { RunnerService } from '../services/RunnerService';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';
import { CardLearningService } from '../services/CardLearningService';
import { GameRunService } from '../services/GameRunService';
import { GAME_TYPE } from '../config/gameCatalog';

const { width: SCREEN_W } = Dimensions.get('window');
const HIT_X = 58;
const START_X = SCREEN_W + 24;
const CHAR_X = 26;

/** Ground line height inside the stage. Runner and obstacles both sit on it. */
const GROUND = 56;
/** Parallax tick pitch — must equal the ground loop distance or the seam shows. */
const TICK_PITCH = 48;
/** Haze moves at half speed for depth, so it needs its own matching pitch. */
const HAZE_PITCH = 24;

const INK = {
  bg: '#0B1220',
  stage: '#0E1626',
  panel: '#17223A',
  line: '#243350',
  dim: '#8494B0',
  text: '#EEF2F9',
};
const AMBER = '#F5A524';
const AMBER_HI = '#FFC85C';
const HIT_OK = '#3DD68C';
const HIT_BAD = '#FF6B6B';

/**
 * The player: a thick-stroke pictogram, legs driven by `stride`. At stride 0 the
 * pose is already mid-run, so it reads as motion even on the static intro.
 */
function RunnerFigure({ stride }) {
  const legFront = stride.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '18deg'] });
  const legBack = stride.interpolate({ inputRange: [0, 1], outputRange: ['24deg', '-22deg'] });
  const arm = stride.interpolate({ inputRange: [0, 1], outputRange: ['26deg', '-20deg'] });
  return (
    <View style={styles.figure}>
      <View style={styles.figHead} />
      <View style={styles.figTorso} />
      <Animated.View style={[styles.figArm, { transform: [{ rotate: arm }] }]} />
      <Animated.View style={[styles.figLeg, { transform: [{ rotate: legFront }] }]} />
      <Animated.View style={[styles.figLeg, styles.figLegBack, { transform: [{ rotate: legBack }] }]} />
    </View>
  );
}

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
  const insets = useSafeAreaInsets();

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
  const stride = useRef(new Animated.Value(0)).current;
  const bobLoop = useRef(null);
  const groundLoop = useRef(null);
  const strideLoop = useRef(null);
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
    strideLoop.current?.stop();
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

    stride.setValue(0);
    strideLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(stride, { toValue: 1, duration: 165, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(stride, { toValue: 0, duration: 165, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    strideLoop.current.start();
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
        <ActivityIndicator color={AMBER} size="large" />
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="warning" size={iconSize.hero} color={AMBER} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === 'ready') {
    return (
      <View style={styles.playRoot}>
        <SafeAreaView style={styles.readyRoot} edges={['top', 'bottom']}>
          <TouchableOpacity style={styles.exitAbs} onPress={() => navigation.goBack()}>
            <Icon name="close" size={iconSize.md} color={INK.dim} />
          </TouchableOpacity>

          <View style={styles.readyBody}>
            <View style={styles.readyStage}>
              <View style={styles.readyGround} />
              <View style={styles.readyFigureSlot}>
                <RunnerFigure stride={stride} />
              </View>
            </View>

            <Text style={styles.readyTitle}>Infinite Runner</Text>
            <Text style={styles.readySub}>{classCode || 'Your class'}</Text>
            <Text style={styles.readyDesc}>
              Tap the matching term before the definition reaches you.
            </Text>

            <TouchableOpacity style={styles.goBtn} onPress={startRun} activeOpacity={0.85}>
              <Text style={styles.goBtnText}>Run</Text>
            </TouchableOpacity>
          </View>

          {leaderboard.length > 0 && (
            <View style={styles.lbPreview}>
              <Text style={styles.lbTitle}>Class best</Text>
              {leaderboard.slice(0, 3).map((e, i) => (
                <View key={e.userId} style={styles.lbPreviewRow}>
                  <Text style={styles.lbRank}>{i + 1}</Text>
                  <Text style={styles.lbName} numberOfLines={1}>{e.displayName}</Text>
                  <Text style={styles.lbScore}>{e.score}m</Text>
                </View>
              ))}
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  if (phase === 'results') {
    const meters = Math.floor(result?.meters ?? distance);
    return (
      <SafeAreaView style={styles.resultsRoot}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <Text style={styles.resultsKicker}>
            {result?.reason === 'wrong' ? 'Wrong term' : 'Too slow'}
          </Text>
          <View style={styles.resultsScoreRow}>
            <Text style={styles.resultsScore}>{meters}</Text>
            <Text style={styles.resultsUnit}>m</Text>
          </View>
          <Text style={styles.resultsLabel}>
            {correct} dodge{correct === 1 ? '' : 's'}
          </Text>

          {result?.coins > 0 && (
            <TouchableOpacity style={styles.coinChip} onPress={() => navigation.navigate('CoinWallet')}>
              <Icon name="coins" size={iconSize.sm} color={AMBER_HI} />
              <Text style={styles.coinLine}>+{result.coins} Study Coins</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.goBtn} onPress={startRun} activeOpacity={0.85}>
            <Text style={styles.goBtnText}>Run again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Done</Text>
          </TouchableOpacity>

          <View style={styles.lbCard}>
            <Text style={styles.lbTitle}>{classCode || 'Class'} distance</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.lbEmpty}>You're on the board.</Text>
            ) : (
              leaderboard.map((e, i) => (
                <View key={e.userId} style={[styles.lbRow, e.isMe && styles.lbRowMe]}>
                  <Text style={[styles.lbRank, e.isMe && styles.lbNameMe]}>{i + 1}</Text>
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

  // Ticks move at full speed; the haze band behind them is interpolated to a
  // third of that, so the stage reads as having depth without a second loop.
  const hazeX = groundX.interpolate({
    inputRange: [-TICK_PITCH, 0],
    outputRange: [-HAZE_PITCH, 0],
  });

  return (
    <View style={styles.playRoot}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.hud}>
          <TouchableOpacity
            onPress={() => { stopLoops(); navigation.goBack(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={iconSize.md} color={INK.dim} />
          </TouchableOpacity>
          <View style={styles.hudScore}>
            <Text style={styles.hudDist}>{Math.floor(distance)}</Text>
            <Text style={styles.hudUnit}>m</Text>
          </View>
          <View style={styles.hudChip}>
            <Text style={styles.hudHits}>{correct}</Text>
            <Text style={styles.hudChipLabel}>dodged</Text>
          </View>
        </View>

        <View style={styles.stage}>
          <LinearGradient
            colors={['rgba(245,165,36,0)', 'rgba(245,165,36,0.10)']}
            style={styles.horizonGlow}
            pointerEvents="none"
          />
          <Animated.View style={[styles.hazeRow, { transform: [{ translateX: hazeX }] }]}>
            {Array.from({ length: 24 }).map((_, i) => (
              <View key={i} style={[styles.haze, { height: 10 + ((i * 7) % 22) }]} />
            ))}
          </Animated.View>

          <View style={styles.groundLine} />
          <View style={styles.groundFill} />
          <Animated.View style={[styles.tickRow, { transform: [{ translateX: groundX }] }]}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View key={i} style={styles.tick} />
            ))}
          </Animated.View>

          <Animated.View
            style={[styles.player, { transform: [{ translateY: charY }] }]}
          >
            <RunnerFigure stride={stride} />
          </Animated.View>

          {obstacle && (
            <Animated.View
              style={[
                styles.gate,
                flash === 'ok' && styles.gateOk,
                flash === 'bad' && styles.gateBad,
                { transform: [{ translateX: obstacleX }] },
              ]}
            >
              <View
                style={[
                  styles.gateEdge,
                  flash === 'ok' && styles.gateEdgeOk,
                  flash === 'bad' && styles.gateEdgeBad,
                ]}
              />
              <Text style={styles.gatePrompt} numberOfLines={4}>
                {obstacle.prompt}
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 14) + 10 }]}>
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
  playRoot: { flex: 1, backgroundColor: INK.bg },
  center: {
    flex: 1,
    backgroundColor: INK.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: { color: INK.text, fontSize: 16, textAlign: 'center' },
  backLink: { color: AMBER, fontSize: 16, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  exitAbs: { position: 'absolute', top: 12, left: 12, padding: 8, zIndex: 5 },

  // ─── The runner pictogram ───────────────────────────────────────────────
  figure: { width: 34, height: 42 },
  figHead: {
    position: 'absolute', top: 0, left: 13,
    width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER,
  },
  figTorso: {
    position: 'absolute', top: 11, left: 15,
    width: 6, height: 15, borderRadius: 3, backgroundColor: AMBER,
  },
  figArm: {
    position: 'absolute', top: 13, left: 8,
    width: 12, height: 5, borderRadius: 2.5, backgroundColor: AMBER,
  },
  figLeg: {
    position: 'absolute', top: 24, left: 14,
    width: 6, height: 17, borderRadius: 3, backgroundColor: AMBER,
  },
  figLegBack: { backgroundColor: '#B87615' },

  // ─── Ready ──────────────────────────────────────────────────────────────
  readyRoot: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
  readyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  readyStage: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 28,
  },
  readyGround: {
    position: 'absolute', bottom: 0, left: 24, right: 24,
    height: 2, borderRadius: 1, backgroundColor: INK.line,
  },
  readyFigureSlot: { marginBottom: 2 },
  readyTitle: { fontSize: 30, fontWeight: '700', color: INK.text, letterSpacing: -0.3 },
  readySub: {
    fontSize: 13, fontWeight: '600', color: AMBER,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6,
  },
  readyDesc: {
    fontSize: 15, color: INK.dim, textAlign: 'center',
    lineHeight: 21, marginTop: 16,
  },
  goBtn: {
    backgroundColor: AMBER,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 52,
    marginTop: 28,
  },
  goBtnText: { color: INK.bg, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  // ─── Leaderboards ───────────────────────────────────────────────────────
  lbPreview: { paddingHorizontal: 32, gap: 2 },
  lbPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 12 },
  lbTitle: {
    fontSize: 11, fontWeight: '700', color: INK.dim,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  lbCard: {
    width: '100%',
    backgroundColor: INK.panel,
    borderRadius: 14,
    padding: 16,
    marginTop: 32,
  },
  lbEmpty: { color: INK.dim, fontSize: 14 },
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.line,
  },
  lbRowMe: { backgroundColor: 'rgba(245,165,36,0.08)' },
  lbRank: { width: 18, color: INK.dim, fontWeight: '600', fontSize: 13 },
  lbName: { flex: 1, color: INK.text, fontSize: 15 },
  lbNameMe: { color: AMBER_HI, fontWeight: '700' },
  lbScore: { color: INK.text, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // ─── Results ────────────────────────────────────────────────────────────
  resultsRoot: { flex: 1, backgroundColor: INK.bg },
  resultsScroll: { alignItems: 'center', padding: 32, paddingBottom: 48 },
  resultsKicker: {
    fontSize: 11, fontWeight: '700', color: HIT_BAD,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  resultsScoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  resultsScore: {
    fontSize: 64, fontWeight: '700', color: AMBER,
    fontVariant: ['tabular-nums'], letterSpacing: -1.5,
  },
  resultsUnit: { fontSize: 24, fontWeight: '600', color: AMBER, marginLeft: 3 },
  resultsLabel: { fontSize: 15, color: INK.dim, marginTop: 4 },
  coinChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(245,165,36,0.12)',
    borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
    marginTop: 20,
  },
  coinLine: { fontSize: 14, fontWeight: '600', color: AMBER_HI },

  // ─── HUD ────────────────────────────────────────────────────────────────
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hudScore: { flexDirection: 'row', alignItems: 'baseline' },
  hudDist: {
    fontSize: 30, fontWeight: '700', color: INK.text,
    fontVariant: ['tabular-nums'], letterSpacing: -0.5,
  },
  hudUnit: { fontSize: 14, fontWeight: '600', color: INK.dim, marginLeft: 2 },
  hudChip: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: INK.panel,
    borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 11,
  },
  hudHits: { fontSize: 14, fontWeight: '700', color: AMBER, fontVariant: ['tabular-nums'] },
  hudChipLabel: { fontSize: 11, color: INK.dim, fontWeight: '500' },

  // ─── Stage ──────────────────────────────────────────────────────────────
  stage: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: INK.stage,
    overflow: 'hidden',
  },
  horizonGlow: {
    position: 'absolute', left: 0, right: 0, bottom: GROUND, height: 90,
  },
  hazeRow: {
    position: 'absolute', bottom: GROUND, left: 0,
    flexDirection: 'row', alignItems: 'flex-end', gap: HAZE_PITCH - 10,
  },
  haze: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: '#152037' },
  groundLine: {
    position: 'absolute', left: 0, right: 0, bottom: GROUND - 2,
    height: 2, backgroundColor: INK.line,
  },
  groundFill: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND,
    backgroundColor: '#0A1120',
  },
  tickRow: {
    position: 'absolute', bottom: GROUND - 16, left: 0,
    flexDirection: 'row', gap: TICK_PITCH - 20,
  },
  tick: { width: 20, height: 3, borderRadius: 1.5, backgroundColor: '#1E2C46' },

  player: { position: 'absolute', left: CHAR_X, bottom: GROUND, zIndex: 3 },

  // The obstacle no longer announces "DODGE" — the rule is taught once on the
  // intro screen, not stamped on every object that flies past.
  gate: {
    position: 'absolute',
    left: 0,
    bottom: GROUND,
    width: 180,
    minHeight: 116,
    flexDirection: 'row',
    backgroundColor: INK.panel,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
  },
  gateOk: { backgroundColor: 'rgba(61,214,140,0.14)' },
  gateBad: { backgroundColor: 'rgba(255,107,107,0.16)' },
  gateEdge: { width: 5, backgroundColor: AMBER },
  gateEdgeOk: { backgroundColor: HIT_OK },
  gateEdgeBad: { backgroundColor: HIT_BAD },
  gatePrompt: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: INK.text,
    lineHeight: 19,
    padding: 12,
  },

  // ─── Controls ───────────────────────────────────────────────────────────
  controls: {
    paddingHorizontal: 12,
    paddingTop: 14,
    // paddingBottom is applied inline from the safe-area inset.
    gap: 9,
  },
  optBtn: {
    backgroundColor: INK.panel,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optText: { color: INK.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
