import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QueueService } from '../services/QueueService';
import { QuizService } from '../services/QuizService';
import { RecallService } from '../services/RecallService';
import { SameBoatService } from '../services/SameBoatService';
import { CardLearningService } from '../services/CardLearningService';
import { useTheme } from '../context/ThemeContext';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function getRecallPrompt(card) {
  return card.back;
}

function getRecallAnswer(card) {
  return card.front;
}

export default function ReviewSessionScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const {
    deckId,
    deckTitle,
    studyScope,
    startCardId,
    categoryId,
    mixedReview = false,
  } = route.params || {};

  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Quiz state
  const [confidence, setConfidence] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [quizResult, setQuizResult] = useState(null);

  // Recall state
  const [userAnswer, setUserAnswer] = useState('');
  const [recallResult, setRecallResult] = useState(null);

  useEffect(() => {
    const loader = mixedReview
      ? QueueService.buildMixedReviewSessionItems()
      : QueueService.buildReviewSessionItems(deckId, studyScope, {
          startCardId: startCardId || null,
          categoryId: categoryId || null,
        });
    loader.then((sessionItems) => {
      setItems(sessionItems);
      setLoading(false);
    });
  }, [deckId, studyScope, startCardId, categoryId, mixedReview]);

  const current = items[index];
  const answered = current?.mode === 'quiz' ? quizResult !== null : recallResult !== null;

  const resetQuestionState = () => {
    setConfidence(0);
    setChosen(null);
    setQuizResult(null);
    setUserAnswer('');
    setRecallResult(null);
  };

  const finishSession = (finalScore) => {
    navigation.replace('LearnSummary', {
      deckId,
      deckTitle,
      studyScope,
      correct: finalScore.correct,
      total: finalScore.total,
      mode: 'review',
    });
  };

  const handleQuizChoose = async (optionIndex) => {
    if (quizResult || confidence === 0 || !current?.question) return;

    setChosen(optionIndex);
    const res = QuizService.checkAnswer(current.question, optionIndex);
    setQuizResult(res);

    const wasCorrect = res.correct;
    const nextScore = {
      correct: score.correct + (wasCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(nextScore);

    await SameBoatService.recordAttempt(current.card.id, wasCorrect, 'quiz');
    await CardLearningService.recordReview(current.card.id, {
      wasCorrect,
      mode: 'quiz',
      confidence,
      categoryId: current.categoryId || categoryId || null,
    });
  };

  const handleRecallSubmit = async () => {
    if (!userAnswer.trim() || recallResult || !current?.card) return;

    const correctAnswer = getRecallAnswer(current.card);
    const result = RecallService.grade(userAnswer, correctAnswer);
    setRecallResult(result);

    const nextScore = {
      correct: score.correct + (result.isCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(nextScore);

    await SameBoatService.recordAttempt(current.card.id, result.isCorrect, 'recall');
    await CardLearningService.recordReview(current.card.id, {
      wasCorrect: result.isCorrect,
      mode: 'recall',
      confidence: result.isCorrect ? 3 : 1,
      categoryId: current.categoryId || categoryId || null,
    });
  };

  const handleNext = () => {
    const next = index + 1;
    if (next >= items.length) {
      finishSession(score);
      return;
    }
    setIndex(next);
    resetQuestionState();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyText}>No cards due for review right now.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const modeLabel = current.mode === 'quiz' ? 'Multiple choice' : 'Recall';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.exitText}>✕ Exit</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{index + 1} / {items.length}</Text>
        <Text style={styles.scoreText}>✓ {score.correct}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((index + (answered ? 1 : 0)) / items.length) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.modeBadge}>{modeLabel}</Text>

          {current.mode === 'quiz' && current.question ? (
            <>
              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>QUESTION</Text>
                <Text style={styles.questionText}>{current.question.question}</Text>
              </View>

              {!answered && (
                <View style={styles.confidenceWrap}>
                  <Text style={styles.confidenceLabel}>How confident are you?</Text>
                  <View style={styles.confidenceRow}>
                    {[1, 2, 3, 4].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.confidenceBtn, confidence === v && styles.confidenceBtnActive]}
                        onPress={() => setConfidence(v)}
                      >
                        <Text style={[styles.confidenceBtnText, confidence === v && styles.confidenceBtnTextActive]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {current.question.options.map((opt, i) => {
                const isChosen = chosen === i;
                const isCorrect = i === current.question.correctIndex;
                let optStyle = styles.option;
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
                    disabled={answered || confidence === 0}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionLabel}>{OPTION_LABELS[i]}</Text>
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <>
              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>DEFINITION</Text>
                <Text style={styles.questionText}>{getRecallPrompt(current.card)}</Text>
              </View>

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
                  />
                  <TouchableOpacity
                    style={[styles.nextBtn, !userAnswer.trim() && styles.nextBtnDisabled]}
                    onPress={handleRecallSubmit}
                    disabled={!userAnswer.trim()}
                  >
                    <Text style={styles.nextBtnText}>Check answer</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[styles.feedbackCard, recallResult.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
                  <Text style={styles.feedbackTitle}>
                    {recallResult.isCorrect ? 'Correct!' : 'Not quite'}
                  </Text>
                  <Text style={styles.feedbackAnswer}>{getRecallAnswer(current.card)}</Text>
                </View>
              )}
            </>
          )}

          {answered && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {index + 1 < items.length ? 'Next →' : 'See results'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exitText: { fontSize: 15, color: theme.textSecondary, fontWeight: '600' },
  progress: { fontSize: 15, fontWeight: '700', color: theme.text },
  scoreText: { fontSize: 15, fontWeight: '700', color: theme.primary },
  progressTrack: {
    height: 4,
    backgroundColor: theme.primaryLight || '#e5e7eb',
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  scroll: { padding: 20, paddingBottom: 40 },
  modeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.primaryLight || '#eef2ff',
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  questionCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  questionLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
  questionText: { fontSize: 20, fontWeight: '700', color: theme.text, lineHeight: 28 },
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
  input: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.primaryLight || '#e5e7eb',
  },
  feedbackCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  feedbackCorrect: { backgroundColor: '#f0fdf4' },
  feedbackWrong: { backgroundColor: '#fef2f2' },
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  feedbackAnswer: { fontSize: 15, color: theme.text },
  nextBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 },
  backLink: { fontSize: 16, color: theme.primary, fontWeight: '600' },
});
