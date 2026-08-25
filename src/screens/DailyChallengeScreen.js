import React, { useState, useEffect, useCallback } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import {
  DailyChallengeService,
  CHALLENGE_QUESTION_COUNT,
  RECALL_POINTS,
  QUIZ_POINTS,
  COIN_PARTICIPATION,
} from '../services/DailyChallengeService';
import { CoinService } from '../services/CoinService';
import { QuizService } from '../services/QuizService';
import { RecallService } from '../services/RecallService';
import { AuthService } from '../services/AuthService';
import { CardLearningService } from '../services/CardLearningService';
import CoinBalanceChip from '../components/CoinBalanceChip';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Leaderboard row ─────────────────────────────────────────

function LeaderboardRow({ rank, entry, myUserId }) {
  const isMe = entry.userId === myUserId;
  return (
    <View style={[lbStyles.row, isMe && lbStyles.rowMe]}>
      <Text style={lbStyles.rank}>{rank}.</Text>
      <Text style={[lbStyles.name, isMe && lbStyles.nameMe]} numberOfLines={1}>
        {isMe ? 'You' : entry.displayName}
      </Text>
      <Text style={[lbStyles.pts, isMe && lbStyles.ptsMe]}>{entry.totalPoints} pts</Text>
    </View>
  );
}

const lbStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowMe: { backgroundColor: '#eef2ff' },
  rank: { width: 36, fontSize: 16, fontWeight: '700', color: '#374151' },
  name: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  nameMe: { fontWeight: '800', color: '#6366f1' },
  pts: { fontSize: 15, fontWeight: '700', color: '#374151' },
  ptsMe: { color: '#6366f1' },
});

// ─── Main screen ──────────────────────────────────────────────

export default function DailyChallengeScreen({ route, navigation }) {
  const { categorySlug, categoryName } = route.params;
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const myUserId = AuthService.getUserId();

  const [phase, setPhase] = useState('loading'); // loading | playing | summary
  const [challenge, setChallenge] = useState(null);
  const [cards, setCards] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // { questionIndex, wasCorrect, pointsEarned, mode }
  const [totalPoints, setTotalPoints] = useState(0);

  // Per-question state
  const [mode, setMode] = useState('recall'); // 'recall' | 'quiz'
  const [userAnswer, setUserAnswer] = useState('');
  const [recallResult, setRecallResult] = useState(null);
  const [quizOptions, setQuizOptions] = useState([]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(null);
  const [chosenIndex, setChosenIndex] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [answered, setAnswered] = useState(false);

  // Summary
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(0);

  // ─── Load challenge ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ch = await DailyChallengeService.getTodayChallenge(categorySlug);
      if (cancelled || !ch) { setPhase('error'); return; }

      const cardList = await DailyChallengeService.getChallengeCards(ch);
      if (cancelled || !cardList.length) { setPhase('error'); return; }

      // Check if already completed today
      const myRun = await DailyChallengeService.getMyRun(ch.id);
      if (myRun.completed) {
        setChallenge(ch);
        setCards(cardList);
        setTotalPoints(myRun.totalPoints);
        setAnswers(myRun.entries);
        setPhase('summary');
        const awarded = await DailyChallengeService.tryClaimRewards(ch.id);
        const already = await CoinService.alreadyCredited(
          'daily_challenge_participation',
          ch.id,
        );
        if (!cancelled) setCoinsAwarded(awarded || already ? COIN_PARTICIPATION : 0);
        loadLeaderboard(ch.id);
        return;
      }

      // Resume from last answered index
      const nextIndex = myRun.entries.length;
      setChallenge(ch);
      setCards(cardList);
      setTotalPoints(myRun.totalPoints);
      setAnswers(myRun.entries);
      setQuestionIndex(nextIndex);
      setPhase('playing');
    })();
    return () => { cancelled = true; };
  }, [categorySlug]);

  // Build quiz options whenever question or mode changes
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'quiz' || !cards.length) return;
    const card = cards[questionIndex];
    if (!card) return;

    // Distractors: front values from other cards in today's set
    const pool = cards.filter((c) => c.id !== card.id).map((c) => ({ front: c.front, back: c.front }));
    const fakeCard = { id: card.id, front: card.front, back: card.front };
    const questions = QuizService.buildQuestions(
      [fakeCard, ...pool],
      { preserveOrder: true },
    );
    if (questions[0]) {
      setQuizOptions(questions[0].options);
      setQuizCorrectIndex(questions[0].correctIndex);
    }
  }, [questionIndex, mode, cards, phase]);

  const resetQuestionState = useCallback(() => {
    setMode('recall');
    setUserAnswer('');
    setRecallResult(null);
    setQuizOptions([]);
    setQuizCorrectIndex(null);
    setChosenIndex(null);
    setQuizResult(null);
    setAnswered(false);
  }, []);

  const loadLeaderboard = useCallback(async (challengeId) => {
    setLoadingLeaderboard(true);
    const lb = await DailyChallengeService.getLeaderboard(challengeId);
    setLeaderboard(lb);
    setLoadingLeaderboard(false);
  }, []);

  // ─── Submit recall ──────────────────────────────────────────

  const handleRecallSubmit = async () => {
    if (!userAnswer.trim() || answered) return;
    const card = cards[questionIndex];
    const result = RecallService.grade(userAnswer, card.front);
    setRecallResult(result);
    setAnswered(true);
    await persistAnswer('recall', result.isCorrect, { userAnswer });
  };

  // ─── Submit quiz ─────────────────────────────────────────────

  const handleQuizChoose = async (idx) => {
    if (answered) return;
    setChosenIndex(idx);
    const correct = idx === quizCorrectIndex;
    setQuizResult({ correct, correctIndex: quizCorrectIndex });
    setAnswered(true);
    await persistAnswer('quiz', correct, { chosenIndex: idx, correctIndex: quizCorrectIndex });
  };

  // ─── Switch to quiz mid-question ─────────────────────────────

  const handleSwitchToQuiz = () => {
    if (answered) return;
    setMode('quiz');
    setUserAnswer('');
    setRecallResult(null);
  };

  // ─── Persist to Supabase ──────────────────────────────────────

  const persistAnswer = async (answerMode, wasCorrect, payload) => {
    const card = cards[questionIndex];
    const result = await DailyChallengeService.submitAnswer(
      challenge.id,
      questionIndex,
      answerMode,
      payload,
      card,
    );
    const pts = result?.pointsEarned ?? (wasCorrect ? (answerMode === 'recall' ? RECALL_POINTS : QUIZ_POINTS) : 0);
    const newTotal = totalPoints + pts;
    setTotalPoints(newTotal);
    setAnswers((prev) => [
      ...prev,
      { questionIndex, mode: answerMode, wasCorrect, points_earned: pts },
    ]);

    // Update spaced repetition — recall mode earns the same stage credit as recall sessions
    await CardLearningService.recordReview(card.id, {
      wasCorrect,
      mode: 'daily_challenge',
    }).catch(() => {});
  };

  // ─── Advance / complete ───────────────────────────────────────

  const handleNext = async () => {
    const next = questionIndex + 1;
    if (next >= cards.length) {
      // All answered — claim rewards and show summary
      setPhase('summary');
      const awarded = await DailyChallengeService.tryClaimRewards(challenge.id);
      const already = await CoinService.alreadyCredited(
        'daily_challenge_participation',
        challenge.id,
      );
      setCoinsAwarded(awarded || already ? COIN_PARTICIPATION : 0);
      loadLeaderboard(challenge.id);
    } else {
      setQuestionIndex(next);
      resetQuestionState();
    }
  };

  // ─── Render helpers ───────────────────────────────────────────

  const card = cards[questionIndex] || null;
  const progress = `${Math.min(questionIndex + (answered ? 1 : 0), cards.length)} / ${cards.length}`;

  // ─── Loading ──────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading today's challenge…</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Icon name="dailyChallenge" size={iconSize.hero} color={theme.textMuted} style={styles.errorIcon} />
        <Text style={styles.errorText}>No challenge available yet for this class.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Summary ──────────────────────────────────────────────────

  if (phase === 'summary') {
    const maxPoints = cards.length * RECALL_POINTS;
    const pct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={styles.exitRow}>
              <Icon name="close" size={iconSize.sm} color={theme.textSecondary} />
              <Text style={styles.exitText}>Done</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{categoryName} Challenge</Text>
          <CoinBalanceChip navigation={navigation} />
        </View>

        <ScrollView contentContainerStyle={styles.summaryScroll}>
          <View style={styles.summaryHeader}>
            <Icon
              name={pct === 100 ? 'trophy' : pct >= 70 ? 'mastered' : pct >= 40 ? 'startLearning' : 'study'}
              size={iconSize.hero}
              color={theme.primary}
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryScore}>{totalPoints} pts</Text>
            <Text style={styles.summaryOf}>out of {maxPoints} possible</Text>
          </View>

          {coinsAwarded > 0 && (
            <View style={styles.coinBanner}>
              <View style={styles.coinBannerRow}>
                <Icon name="coins" size={iconSize.md} color={theme.warningText} />
                <Text style={styles.coinBannerText}>+{coinsAwarded} Study Coins</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CoinWallet')}>
                <Text style={styles.coinBannerLink}>See your pile ›</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.leaderboardCard}>
            <Text style={styles.leaderboardTitle}>Today's Leaderboard</Text>
            {loadingLeaderboard ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
            ) : leaderboard.length === 0 ? (
              <Text style={styles.lbEmpty}>No one else has played yet — you're first!</Text>
            ) : (
              leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.userId}
                  rank={i + 1}
                  entry={entry}
                  myUserId={myUserId}
                />
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Back to class</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Playing ──────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={iconSize.md} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>{progress}</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(Math.min(questionIndex + (answered ? 1 : 0), cards.length) / cards.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{totalPoints} pts</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Class + mode label */}
          <View style={styles.metaRow}>
            <Text style={styles.classLabel}>{categoryName}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {mode === 'recall' ? `Recall · ${RECALL_POINTS} pts` : `Multiple choice · ${QUIZ_POINTS} pt`}
              </Text>
            </View>
          </View>

          {/* Definition prompt */}
          <View style={styles.definitionCard}>
            <Text style={styles.definitionLabel}>DEFINITION</Text>
            <Text style={styles.definitionText}>{card?.back}</Text>
          </View>

          {/* Recall mode */}
          {mode === 'recall' && (
            <>
              {!answered ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Type the term…"
                    placeholderTextColor={theme.textSecondary}
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleRecallSubmit}
                  />
                  <TouchableOpacity
                    style={[styles.submitBtn, !userAnswer.trim() && styles.submitBtnDisabled]}
                    onPress={handleRecallSubmit}
                    disabled={!userAnswer.trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Check answer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.switchBtn}
                    onPress={handleSwitchToQuiz}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchBtnText}>
                      Switch to multiple choice ({QUIZ_POINTS} pt if correct)
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[
                  styles.feedbackCard,
                  recallResult?.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                ]}>
                  <Text style={styles.feedbackTitle}>
                    {recallResult?.isCorrect ? `Correct! +${RECALL_POINTS} pts` : 'Not quite'}
                  </Text>
                  <Text style={styles.feedbackAnswer}>
                    {recallResult?.isCorrect ? card?.front : `Answer: ${card?.front}`}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Quiz mode */}
          {mode === 'quiz' && (
            <>
              {quizOptions.map((opt, i) => {
                let optStyle = styles.option;
                const isChosen = chosenIndex === i;
                const isCorrect = i === quizCorrectIndex;
                if (answered) {
                  if (isCorrect) optStyle = [styles.option, styles.optionCorrect];
                  else if (isChosen) optStyle = [styles.option, styles.optionWrong];
                } else if (isChosen) {
                  optStyle = [styles.option, styles.optionSelected];
                }
                return (
                  <TouchableOpacity
                    key={i}
                    style={optStyle}
                    onPress={() => handleQuizChoose(i)}
                    disabled={answered}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionLabel}>{OPTION_LABELS[i]}</Text>
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
              {answered && quizResult && (
                <View style={[
                  styles.feedbackCard,
                  quizResult.correct ? styles.feedbackCorrect : styles.feedbackWrong,
                ]}>
                  <Text style={styles.feedbackTitle}>
                    {quizResult.correct ? `Correct! +${QUIZ_POINTS} pt` : 'Not quite'}
                  </Text>
                  {!quizResult.correct && (
                    <Text style={styles.feedbackAnswer}>Answer: {card?.front}</Text>
                  )}
                </View>
              )}
            </>
          )}

          {answered && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>
                {questionIndex + 1 < cards.length ? 'Next →' : 'See results'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: theme.textSecondary },
  errorIcon: { marginBottom: 12 },
  errorText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 },
  backLink: { fontSize: 16, color: theme.primary, fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLight || '#e5e7eb',
  },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exitText: { fontSize: 15, color: theme.textSecondary, fontWeight: '600' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: theme.text },
  progressWrap: { flex: 1, alignItems: 'center' },
  progressText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 4 },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.primaryLight || '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  pointsBadge: {
    backgroundColor: theme.primaryLight || '#eef2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  pointsText: { fontSize: 13, fontWeight: '800', color: theme.primary },

  scroll: { padding: 20, paddingBottom: 40 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  classLabel: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  modeBadge: {
    backgroundColor: theme.primaryLight || '#eef2ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeBadgeText: { fontSize: 12, fontWeight: '700', color: theme.primary },

  definitionCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  definitionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  definitionText: { fontSize: 20, fontWeight: '700', color: theme.text, lineHeight: 28 },

  input: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.primaryLight || '#e5e7eb',
  },
  submitBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  switchBtn: { alignItems: 'center', paddingVertical: 10 },
  switchBtnText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: { borderColor: theme.primary },
  optionCorrect: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  optionLabel: { fontSize: 16, fontWeight: '800', color: theme.primary, width: 28 },
  optionText: { flex: 1, fontSize: 15, color: theme.text },

  feedbackCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  feedbackCorrect: { backgroundColor: '#f0fdf4' },
  feedbackWrong: { backgroundColor: '#fef2f2' },
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4, color: '#111827' },
  feedbackAnswer: { fontSize: 15, color: '#374151' },

  nextBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Summary
  summaryScroll: { padding: 20, paddingBottom: 60 },
  summaryHeader: { alignItems: 'center', marginBottom: 20 },
  summaryIcon: { marginBottom: 8 },
  summaryScore: { fontSize: 52, fontWeight: '900', color: theme.primary },
  summaryOf: { fontSize: 15, color: theme.textSecondary, marginTop: 4 },
  coinBanner: {
    backgroundColor: theme.warningBg,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  coinBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinBannerText: { fontSize: 16, fontWeight: '700', color: theme.warningText },
  coinBannerLink: { fontSize: 13, fontWeight: '700', color: theme.warningText, marginTop: 6 },
  leaderboardCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lbEmpty: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  doneBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
