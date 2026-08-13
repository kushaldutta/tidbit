/**
 * DungeonScreen — Floor 1.
 *
 * Map of rooms (section cards). Combat is recall-first, definition → term.
 * Miss: take damage + hint, then quiz. Boss hits harder. Same-boat elites glow.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DungeonService } from '../services/DungeonService';
import { RecallService } from '../services/RecallService';
import { CardLearningService } from '../services/CardLearningService';
import { SameBoatService } from '../services/SameBoatService';
import { GameRunService } from '../services/GameRunService';
import { GAME_TYPE } from '../config/gameCatalog';

const KIND_META = {
  normal: { emoji: '👾', label: 'Enemy', color: '#94a3b8' },
  elite: { emoji: '💀', label: 'Elite · class struggles here', color: '#f59e0b' },
  boss: { emoji: '🐉', label: 'Boss', color: '#ef4444' },
};

export default function DungeonScreen({ route, navigation }) {
  const { classId, categorySlug, classCode } = route.params || {};

  const [phase, setPhase] = useState('loading'); // loading | map | combat | results | error
  const [floor, setFloor] = useState(null);
  const [hp, setHp] = useState(DungeonService.MAX_HP);
  const [roomIndex, setRoomIndex] = useState(0);
  const [cleared, setCleared] = useState([]); // room indexes
  const [error, setError] = useState(null);

  const [attempt, setAttempt] = useState(0); // 0 first recall, 1 hint/quiz
  const [userAnswer, setUserAnswer] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'ok' | 'miss'
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const startAt = useRef(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    DungeonService.buildFloor(categorySlug).then((built) => {
      if (!built) {
        setError('Need at least 3 cards in this class deck to enter the dungeon.');
        setPhase('error');
        return;
      }
      setFloor(built);
      setPhase('map');
      GameRunService.getLeaderboard(GAME_TYPE.DUNGEON, { classId }).then(setLeaderboard);
    });
  }, [categorySlug, classId]);

  const room = floor?.rooms[roomIndex];
  const allCards = floor?.rooms.map((r) => r.card) || [];

  const enterRoom = (i) => {
    if (i !== cleared.length) return; // must clear in order
    setRoomIndex(i);
    setAttempt(0);
    setUserAnswer('');
    setQuiz(null);
    setFeedback(null);
    setPhase('combat');
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const finishRun = useCallback(async ({ roomsCleared, clearedFloor, hpLeft }) => {
    const elapsedMs = Date.now() - startAt.current;
    setPhase('results');
    const submitted = await DungeonService.submitRun({
      classId,
      roomsCleared,
      totalRooms: floor?.rooms.length || 0,
      hpLeft,
      elapsedMs,
      clearedFloor,
    });
    setResult({ ...submitted, roomsCleared, clearedFloor, hpLeft });
    setLeaderboard(submitted.leaderboard || []);
  }, [classId, floor]);

  const onCorrect = async (card, kind) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    CardLearningService.recordReview(card.id, { wasCorrect: true, mode: 'dungeon' });
    SameBoatService.recordAttempt(card.id, true, 'dungeon');
    setFeedback('ok');
    const nextCleared = [...cleared, roomIndex];
    setCleared(nextCleared);
    const last = roomIndex >= (floor.rooms.length - 1);
    setTimeout(() => {
      if (last) {
        finishRun({
          roomsCleared: nextCleared.length,
          clearedFloor: true,
          hpLeft: hp,
        });
      } else {
        setPhase('map');
      }
    }, 650);
  };

  const onMiss = async (card, kind) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    CardLearningService.recordReview(card.id, { wasCorrect: false, mode: 'dungeon' });
    SameBoatService.recordAttempt(card.id, false, 'dungeon');
    const dmg = DungeonService.damageFor(kind);
    const nextHp = Math.max(0, hp - dmg);
    setHp(nextHp);
    setFeedback('miss');
    if (nextHp <= 0) {
      setTimeout(() => {
        finishRun({
          roomsCleared: cleared.length,
          clearedFloor: false,
          hpLeft: 0,
        });
      }, 700);
      return;
    }
    if (attempt === 0) {
      const q = DungeonService.buildQuizOptions(card, allCards);
      setQuiz(q);
      setAttempt(1);
      setUserAnswer('');
    } else {
      // Failed the second try — room not cleared, retreat to map (stay on this room)
      setTimeout(() => setPhase('map'), 700);
    }
  };

  const submitRecall = () => {
    if (!room || !userAnswer.trim() || feedback === 'ok') return;
    const graded = RecallService.grade(userAnswer.trim(), room.card.front);
    if (graded.isCorrect) onCorrect(room.card, room.kind);
    else onMiss(room.card, room.kind);
  };

  const submitQuiz = (index) => {
    if (!room || !quiz || feedback === 'ok') return;
    if (index === quiz.correctIndex) onCorrect(room.card, room.kind);
    else onMiss(room.card, room.kind);
  };

  const restart = () => {
    setHp(DungeonService.MAX_HP);
    setRoomIndex(0);
    setCleared([]);
    setAttempt(0);
    setUserAnswer('');
    setQuiz(null);
    setFeedback(null);
    setResult(null);
    startAt.current = Date.now();
    setPhase('map');
  };

  // ─── Loading / error ─────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#f59e0b" size="large" />
        <Text style={styles.muted}>Lighting the torches…</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.bigEmoji}>🗡️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.goldLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Results ─────────────────────────────────────────────────

  if (phase === 'results') {
    const clearedFloor = result?.clearedFloor;
    return (
      <SafeAreaView style={styles.center}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <Text style={styles.bigEmoji}>{clearedFloor ? '🏆' : '💀'}</Text>
          <Text style={styles.readyTitle}>
            {clearedFloor ? 'Floor cleared' : 'You fell'}
          </Text>
          <Text style={styles.readySub}>
            {result?.roomsCleared || 0}/{floor?.rooms.length || 0} rooms · {result?.score || 0} pts
          </Text>
          {result?.coins > 0 && (
            <Text style={styles.coinLine}>🪙 +{result.coins} Study Coins</Text>
          )}
          <TouchableOpacity style={styles.goBtn} onPress={restart} activeOpacity={0.85}>
            <Text style={styles.goBtnText}>Enter again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.goldLink}>Done</Text>
          </TouchableOpacity>
          <View style={styles.lbCard}>
            <Text style={styles.lbTitle}>🏅 {classCode || 'Class'} dungeon</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.muted}>No scores yet.</Text>
            ) : (
              leaderboard.map((e, i) => (
                <View key={e.userId} style={[styles.lbRow, e.isMe && styles.lbRowMe]}>
                  <Text style={styles.lbRank}>{i + 1}</Text>
                  <Text style={[styles.lbName, e.isMe && styles.gold]} numberOfLines={1}>
                    {e.displayName}
                  </Text>
                  <Text style={[styles.lbScore, e.isMe && styles.gold]}>{e.score}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Map ─────────────────────────────────────────────────────

  if (phase === 'map') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.hud}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.exitText}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.hudTitle}>{floor.floorTitle}</Text>
            <Text style={styles.hudSub}>{classCode}</Text>
          </View>
          <Hearts hp={hp} max={DungeonService.MAX_HP} />
        </View>
        <ScrollView contentContainerStyle={styles.mapScroll}>
          <Text style={styles.mapHint}>
            Each room is a card. Elites are cards your class misses. The boss is the worst one.
          </Text>
          <View style={styles.path}>
            {floor.rooms.map((r, i) => {
              const meta = KIND_META[r.kind];
              const isCleared = cleared.includes(i);
              const isCurrent = i === cleared.length;
              const locked = i > cleared.length;
              return (
                <TouchableOpacity
                  key={r.card.id}
                  style={[
                    styles.node,
                    r.kind === 'boss' && styles.nodeBoss,
                    r.kind === 'elite' && styles.nodeElite,
                    isCleared && styles.nodeCleared,
                    isCurrent && styles.nodeCurrent,
                    locked && styles.nodeLocked,
                  ]}
                  onPress={() => enterRoom(i)}
                  disabled={locked || isCleared}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nodeEmoji}>
                    {isCleared ? '✓' : meta.emoji}
                  </Text>
                  <Text style={styles.nodeLabel} numberOfLines={1}>
                    {r.kind === 'boss' ? 'Boss' : `Room ${i + 1}`}
                  </Text>
                  {r.sameBoat?.attempts >= 3 && (
                    <Text style={styles.nodeStat}>
                      class {Math.round(r.sameBoat.pctCorrect)}%
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {cleared.length < floor.rooms.length && (
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => enterRoom(cleared.length)}
              activeOpacity={0.85}
            >
              <Text style={styles.goBtnText}>
                {cleared.length === 0 ? 'Enter room 1' : `Enter room ${cleared.length + 1}`}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Combat ──────────────────────────────────────────────────

  const meta = KIND_META[room.kind];
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hud}>
        <TouchableOpacity onPress={() => setPhase('map')}>
          <Text style={styles.exitText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.hudTitle}>
          {meta.emoji} {meta.label}
        </Text>
        <Hearts hp={hp} max={DungeonService.MAX_HP} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.combat} keyboardShouldPersistTaps="handled">
          <View style={[styles.enemyCard, room.kind === 'boss' && styles.enemyBoss]}>
            <Text style={styles.enemyEmoji}>{meta.emoji}</Text>
            <Text style={styles.defLabel}>DEFINITION</Text>
            <Text style={styles.defText}>{room.card.back}</Text>
            {room.sameBoat?.attempts >= 3 && (
              <Text style={styles.boatLine}>
                Your class gets this {Math.round(room.sameBoat.pctCorrect)}% of the time
              </Text>
            )}
          </View>

          {attempt === 1 && (
            <View style={styles.hintCard}>
              <Text style={styles.hintLabel}>HINT</Text>
              <Text style={styles.hintText}>{DungeonService.hintFor(room.card)}</Text>
            </View>
          )}

          {feedback === 'ok' && (
            <Text style={styles.okLine}>Defeated! {room.card.front}</Text>
          )}
          {feedback === 'miss' && hp > 0 && attempt === 1 && (
            <Text style={styles.missLine}>
              Hit for {DungeonService.damageFor(room.kind)} · quiz to finish it
            </Text>
          )}

          {attempt === 0 && !feedback && (
            <>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type the term…"
                placeholderTextColor="#64748b"
                value={userAnswer}
                onChangeText={setUserAnswer}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submitRecall}
              />
              <TouchableOpacity
                style={[styles.goBtn, !userAnswer.trim() && styles.goBtnOff]}
                onPress={submitRecall}
                disabled={!userAnswer.trim()}
              >
                <Text style={styles.goBtnText}>Strike</Text>
              </TouchableOpacity>
            </>
          )}

          {attempt === 1 && quiz && feedback !== 'ok' && hp > 0 && (
            <View style={{ gap: 10, width: '100%' }}>
              {quiz.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.optBtn}
                  onPress={() => submitQuiz(i)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Hearts({ hp, max }) {
  return (
    <Text style={styles.hearts}>
      {Array.from({ length: max }).map((_, i) => (i < hp ? '❤️' : '🖤')).join('')}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#140c0a' },
  center: {
    flex: 1,
    backgroundColor: '#140c0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  muted: { color: '#a8a29e', fontSize: 14, marginTop: 10, textAlign: 'center' },
  bigEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  errorText: { color: '#e7e5e4', fontSize: 16, textAlign: 'center', marginBottom: 12 },
  goldLink: { color: '#fbbf24', fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  gold: { color: '#fbbf24', fontWeight: '800' },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#292524',
  },
  exitText: { color: '#a8a29e', fontSize: 22, fontWeight: '700', width: 36 },
  hudTitle: { color: '#fef3c7', fontSize: 16, fontWeight: '800' },
  hudSub: { color: '#a8a29e', fontSize: 12, marginTop: 2 },
  hearts: { fontSize: 14 },
  mapScroll: { padding: 20, paddingBottom: 40 },
  mapHint: { color: '#a8a29e', fontSize: 13, lineHeight: 18, marginBottom: 16, textAlign: 'center' },
  path: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 24 },
  node: {
    width: 96,
    backgroundColor: '#1c1917',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#44403c',
  },
  nodeElite: { borderColor: '#d97706' },
  nodeBoss: { borderColor: '#dc2626', width: 200 },
  nodeCleared: { borderColor: '#16a34a', opacity: 0.7 },
  nodeCurrent: { borderColor: '#fbbf24', borderWidth: 2 },
  nodeLocked: { opacity: 0.4 },
  nodeEmoji: { fontSize: 26, marginBottom: 4 },
  nodeLabel: { color: '#e7e5e4', fontSize: 12, fontWeight: '700' },
  nodeStat: { color: '#f59e0b', fontSize: 10, marginTop: 2, fontWeight: '700' },
  goBtn: {
    backgroundColor: '#b45309',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'center',
  },
  goBtnOff: { opacity: 0.4 },
  goBtnText: { color: '#fffbeb', fontSize: 16, fontWeight: '800' },
  combat: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  enemyCard: {
    width: '100%',
    backgroundColor: '#1c1917',
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: '#57534e',
    marginBottom: 16,
  },
  enemyBoss: { borderColor: '#dc2626' },
  enemyEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  defLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#a8a29e', marginBottom: 8 },
  defText: { fontSize: 18, fontWeight: '600', color: '#fafaf9', lineHeight: 26 },
  boatLine: { marginTop: 12, color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  hintCard: {
    width: '100%',
    backgroundColor: '#1c1917',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  hintLabel: { fontSize: 10, fontWeight: '800', color: '#fbbf24', letterSpacing: 1 },
  hintText: { fontSize: 22, fontWeight: '800', color: '#fef3c7', marginTop: 4, letterSpacing: 2 },
  okLine: { color: '#86efac', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  missLine: { color: '#fca5a5', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#57534e',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#fafaf9',
    backgroundColor: '#1c1917',
    marginBottom: 12,
  },
  optBtn: {
    backgroundColor: '#1c1917',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#57534e',
  },
  optText: { color: '#fafaf9', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  readyTitle: { fontSize: 26, fontWeight: '800', color: '#fef3c7', marginBottom: 4 },
  readySub: { fontSize: 15, color: '#a8a29e', marginBottom: 8 },
  coinLine: { fontSize: 18, fontWeight: '800', color: '#fcd34d', marginVertical: 8 },
  resultsScroll: { alignItems: 'center', padding: 24, paddingBottom: 48 },
  lbCard: {
    width: '100%',
    backgroundColor: '#1c1917',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  lbTitle: { fontSize: 13, fontWeight: '800', color: '#a8a29e', marginBottom: 8 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  lbRowMe: { backgroundColor: '#292524' },
  lbRank: { width: 28, color: '#a8a29e', fontWeight: '800' },
  lbName: { flex: 1, color: '#e7e5e4', fontSize: 15 },
  lbScore: { color: '#e7e5e4', fontWeight: '700' },
});
