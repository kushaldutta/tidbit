import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { QueueService } from '../services/QueueService';
import { RecallService } from '../services/RecallService';
import { SameBoatService } from '../services/SameBoatService';
import { CardLearningService } from '../services/CardLearningService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

// Default: show definition, user types the term. Future: user-selectable direction.
const RECALL_WRITE_TERM = true;

function getRecallPrompt(card) {
  return RECALL_WRITE_TERM ? card.back : card.front;
}

function getRecallAnswer(card) {
  return RECALL_WRITE_TERM ? card.front : card.back;
}

// ─── Same-Boat banner ─────────────────────────────────────────────────────────

function SameBoatBanner({ stat, styles, theme }) {
  if (!stat || stat.attempts < 2) return null;
  const wrongPct = Math.round(100 - (stat.pctCorrect ?? 0));
  const rightPct = Math.round(stat.pctCorrect ?? 0);

  let icon, msg, bg, textColor;
  if (wrongPct >= 60) {
    icon = 'buddy'; msg = `${wrongPct}% of your classmates missed this too`;
    bg = theme.dangerBg; textColor = theme.dangerText;
  } else if (wrongPct >= 30) {
    icon = 'stats'; msg = `${rightPct}% of classmates got this right`;
    bg = theme.warningBg; textColor = theme.warningText;
  } else {
    icon = 'trophy'; msg = `${rightPct}% of classmates got this — nice work`;
    bg = theme.successBg; textColor = theme.successText;
  }

  return (
    <View style={[styles.sameBoat, { backgroundColor: bg }]}>
      <Icon name={icon} size={iconSize.md} color={textColor} style={styles.sameBoatIcon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.sameBoatMsg, { color: textColor }]}>{msg}</Text>
        <Text style={styles.sameBoatSub}>{stat.attempts} attempt{stat.attempts !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

// ─── Diff highlighter ─────────────────────────────────────────────────────────

function DiffDisplay({ diff, styles, theme }) {
  return (
    <Text style={styles.diffBase}>
      {diff.map((token, i) => {
        let color = theme.text, bg = 'transparent', decoration = 'none';
        if (token.type === 'match') { color = theme.success; }
        else if (token.type === 'insert') { color = theme.danger; bg = theme.dangerBg; }
        else if (token.type === 'delete') { color = theme.danger; decoration = 'line-through'; }
        return (
          <Text key={i} style={{ color, backgroundColor: bg, textDecorationLine: decoration }}>
            {token.char}
          </Text>
        );
      })}
    </Text>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function RecallScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { deckId, deckTitle, studyScope, startCardId, categoryId } = route.params;

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [gradeResult, setGradeResult] = useState(null);
  const [sameBoatStat, setSameBoatStat] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [audioMode, setAudioMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [overridden, setOverridden] = useState(false); // true after user overrides the grade

  const inputRef = useRef(null);

  useEffect(() => {
    QueueService.buildCardsForLearnMode(deckId, studyScope, {
      mode: 'recall',
      startCardId: startCardId || null,
      categoryId: categoryId || null,
    }).then((c) => {
      setCards(c);
      setLoading(false);
    });
  }, [deckId, studyScope, startCardId, categoryId]);

  const currentCard = cards[index];

  // Stamped when a card first appears, so response time measures recall effort
  // rather than time since the screen mounted.
  // 1–4, 0 = not yet rated. Asked before grading so the rating stays honest.
  const [confidence, setConfidence] = useState(0);

  const shownAtRef = useRef(null);
  useEffect(() => {
    if (currentCard) shownAtRef.current = Date.now();
  }, [currentCard?.id]);

  // Speak the question when audio mode is on or card changes in audio mode
  useEffect(() => {
    if (!audioMode || !currentCard || gradeResult) return;
    // Small delay so iOS audio session is ready before we speak
    const timer = setTimeout(() => speakQuestion(), 300);
    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, [audioMode, index, currentCard]);

  const speakQuestion = async () => {
    if (!currentCard) return;
    try {
      const isSpeakingNow = await Speech.isSpeakingAsync();
      if (isSpeakingNow) Speech.stop();
    } catch (_) {}
    setIsSpeaking(true);
    Speech.speak(getRecallPrompt(currentCard), {
      language: 'en',
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: (err) => {
        console.warn('[RecallScreen] Speech error:', err);
        setIsSpeaking(false);
      },
    });
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim() || gradeResult) return;
    if (confidence === 0) return; // rate before grading, never after

    const correctAnswer = getRecallAnswer(currentCard);
    const result = RecallService.grade(userAnswer, correctAnswer);
    const diff = result.isCorrect ? null : RecallService.diff(userAnswer, correctAnswer);
    setGradeResult({ ...result, diff });

    setScore((prev) => ({
      correct: prev.correct + (result.isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    await SameBoatService.recordAttempt(currentCard.id, result.isCorrect, 'recall', {
      confidence,
      responseMs: shownAtRef.current ? Date.now() - shownAtRef.current : null,
    });
    await CardLearningService.recordReview(currentCard.id, {
      wasCorrect: result.isCorrect,
      mode: 'recall',
      confidence,
      categoryId: categoryId || null,
    });

    // Fetch Same-Boat stat
    const stat = await SameBoatService.getCardStat(currentCard.id);
    setSameBoatStat(stat);

    // Speak the correct answer in audio mode
    if (audioMode) {
      Speech.stop();
      Speech.speak(`The term is: ${getRecallAnswer(currentCard)}`, { language: 'en', rate: 0.85 });
    }
  };

  const handleNext = () => {
    Speech.stop();
    const next = index + 1;
    if (next >= cards.length) {
      navigation.replace('LearnSummary', {
        deckId,
        deckTitle,
        studyScope,
        correct: score.correct,
        total: score.total,
        mode: 'recall',
      });
      return;
    }
    setIndex(next);
    setUserAnswer('');
    setGradeResult(null);
    setSameBoatStat(null);
    setOverridden(false);
    setConfidence(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleOverride = async () => {
    if (!gradeResult || overridden) return;
    const flippedCorrect = !gradeResult.isCorrect;

    // Adjust score: if we're flipping correct→wrong, subtract 1; wrong→correct, add 1
    setScore((prev) => ({
      ...prev,
      correct: prev.correct + (flippedCorrect ? 1 : -1),
    }));

    // Update grade state to reflect the override
    setGradeResult((prev) => ({
      ...prev,
      isCorrect: flippedCorrect,
      grade: flippedCorrect ? 'exact' : 'wrong',
    }));

    // Re-record the attempt with corrected value (replaces the original in
    // aggregate stats). No response time: the clock stopped when the answer was
    // revealed, so anything measured here is the user reading the grade, not
    // recalling the card.
    // The user's rating still stands — an override corrects the grade, not how
    // sure they were before they saw it.
    await SameBoatService.recordAttempt(currentCard.id, flippedCorrect, 'recall_override', {
      confidence,
    });
    await CardLearningService.recordReview(currentCard.id, {
      wasCorrect: flippedCorrect,
      mode: 'recall_override',
      confidence,
      categoryId: categoryId || null,
    });

    // Hide Same-Boat stat — don't show it after an override
    setSameBoatStat(null);
    setOverridden(true);
  };

  const gradeColor = () => {
    if (!gradeResult) return theme.primary;
    if (gradeResult.grade === 'exact' || gradeResult.grade === 'close') return theme.success;
    if (gradeResult.grade === 'partial') return theme.warning;
    return theme.danger;
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="check" size={iconSize.hero} color={theme.success} filled style={styles.emptyIcon} />
        <Text style={styles.emptyText}>This deck has no cards yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const answered = !!gradeResult;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { Speech.stop(); navigation.goBack(); }}>
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{index + 1} / {cards.length}</Text>
        <Text style={styles.scoreText}>{score.correct} correct</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(index / cards.length) * 100}%` }]} />
      </View>

      {/* Audio mode toggle */}
      <View style={styles.audioToggleRow}>
        <Text style={styles.audioToggleLabel}>Audio mode</Text>
        <Switch
          value={audioMode}
          onValueChange={(v) => {
            setAudioMode(v);
            if (!v) Speech.stop();
          }}
          trackColor={{ false: theme.border, true: theme.accent }}
          thumbColor={audioMode ? theme.primary : theme.textMuted}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Prompt card */}
          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>
              {RECALL_WRITE_TERM ? 'TYPE THE TERM' : 'TYPE THE ANSWER'}
            </Text>
            <Text style={styles.promptText}>{getRecallPrompt(currentCard)}</Text>

            {audioMode && (
              <TouchableOpacity style={styles.speakBtn} onPress={speakQuestion}>
                <Text style={styles.speakBtnText}>
                  {isSpeaking ? 'Speaking…' : 'Repeat'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Input */}
          {!answered && (
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={RECALL_WRITE_TERM ? 'Type the term…' : 'Type your answer…'}
              placeholderTextColor={theme.textMuted}
              value={userAnswer}
              onChangeText={setUserAnswer}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
              multiline
              blurOnSubmit
            />
          )}

          {/* Result */}
          {answered && (
            <View>
              <View style={[styles.gradeBanner, { borderColor: gradeColor() }]}>
                <Text style={[styles.gradeText, { color: gradeColor() }]}>
                  {gradeResult.grade === 'exact' && 'Perfect'}
                  {gradeResult.grade === 'close' && 'Close enough'}
                  {gradeResult.grade === 'partial' && 'Almost — check spelling'}
                  {gradeResult.grade === 'wrong' && 'Not quite'}
                </Text>
                <Text style={styles.yourAnswerLabel}>You wrote:</Text>
                <Text style={styles.yourAnswerText}>{userAnswer}</Text>
                <Text style={styles.correctLabel}>
                  {RECALL_WRITE_TERM ? 'Correct term:' : 'Correct answer:'}
                </Text>
                <Text style={styles.correctText}>{getRecallAnswer(currentCard)}</Text>
                {!gradeResult.isCorrect && gradeResult.diff && (
                  <>
                    <Text style={styles.diffLabel}>Character diff:</Text>
                    <DiffDisplay diff={gradeResult.diff} styles={styles} theme={theme} />
                  </>
                )}
              </View>

              {/* Override button — lets user correct the app's evaluation */}
              {!overridden && (
                <TouchableOpacity
                  style={[
                    styles.overrideBtn,
                    gradeResult.isCorrect ? styles.overrideBtnMarkWrong : styles.overrideBtnMarkCorrect,
                  ]}
                  onPress={handleOverride}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.overrideBtnText,
                    gradeResult.isCorrect ? styles.overrideBtnTextWrong : styles.overrideBtnTextCorrect,
                  ]}>
                    {gradeResult.isCorrect ? 'Actually I got it wrong' : 'Actually I got it right'}
                  </Text>
                </TouchableOpacity>
              )}

              {!overridden && <SameBoatBanner stat={sameBoatStat} styles={styles} theme={theme} />}

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>
                  {index + 1 < cards.length ? 'Next' : 'See results'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!answered && (
            <View style={styles.confidenceWrap}>
              <Text style={styles.confidenceLabel}>How confident are you?</Text>
              <View style={styles.confidenceRow}>
                {[1, 2, 3, 4].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.confidenceBtn, confidence === v && styles.confidenceBtnActive]}
                    onPress={() => setConfidence(v)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.confidenceBtnText,
                        confidence === v && styles.confidenceBtnTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {!answered && (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!userAnswer.trim() || confidence === 0) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!userAnswer.trim() || confidence === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {confidence === 0 && userAnswer.trim() ? 'Rate your confidence' : 'Submit'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  exitText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
  progress: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
  scoreText: { fontSize: 14, color: theme.success, fontWeight: '700' },

  progressTrack: { height: 3, backgroundColor: theme.border, marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: theme.accent, borderRadius: 2 },

  audioToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingVertical: 8, gap: 10,
  },
  audioToggleLabel: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },

  scroll: { padding: 20, paddingBottom: 48 },

  promptCard: {
    backgroundColor: theme.card, borderRadius: 20, padding: 24,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  promptLabel: {
    fontSize: 10, fontWeight: '800', color: theme.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  promptText: { fontSize: 20, fontWeight: '700', color: theme.text, lineHeight: 30 },

  speakBtn: {
    marginTop: 16, alignSelf: 'flex-start',
    backgroundColor: theme.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  speakBtnText: { color: theme.primary, fontWeight: '600', fontSize: 14 },

  input: {
    backgroundColor: theme.card, borderRadius: 16, borderWidth: 2, borderColor: theme.border,
    padding: 16, fontSize: 16, color: theme.text, minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  gradeBanner: {
    backgroundColor: theme.card, borderRadius: 16, borderWidth: 2,
    padding: 16, marginBottom: 12,
  },
  gradeText: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  yourAnswerLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  yourAnswerText: { fontSize: 15, color: theme.textSecondary, marginBottom: 10 },
  correctLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  correctText: { fontSize: 15, color: theme.successText, fontWeight: '600', marginBottom: 10 },
  diffLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  diffBase: { fontSize: 15, lineHeight: 24 },

  sameBoat: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  sameBoatIcon: { fontSize: 24 },
  sameBoatMsg: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sameBoatSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  confidenceWrap: { marginBottom: 16 },
  confidenceLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
  confidenceRow: { flexDirection: 'row', gap: 8 },
  confidenceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.primaryLight || '#ddd',
    alignItems: 'center',
  },
  confidenceBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  confidenceBtnText: { fontWeight: '700', color: theme.text },
  confidenceBtnTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: theme.accent },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  overrideBtn: {
    borderRadius: 12, paddingVertical: 11, alignItems: 'center',
    marginBottom: 10, borderWidth: 1.5,
  },
  overrideBtnMarkWrong: { borderColor: theme.danger, backgroundColor: theme.dangerBg },
  overrideBtnMarkCorrect: { borderColor: theme.success, backgroundColor: theme.successBg },
  overrideBtnText: { fontSize: 13, fontWeight: '600' },
  overrideBtnTextWrong: { color: theme.danger },
  overrideBtnTextCorrect: { color: theme.success },

  nextBtn: {
    backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary, marginBottom: 16 },
  backLink: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});
