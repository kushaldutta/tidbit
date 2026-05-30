import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckService } from '../services/DeckService';
import { QuizService } from '../services/QuizService';
import { SameBoatService } from '../services/SameBoatService';

const { width: SCREEN_W } = Dimensions.get('window');
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Same-Boat banner ─────────────────────────────────────────────────────────

function SameBoatBanner({ stat }) {
  if (!stat || stat.attempts < 2) return null;
  const wrongPct = Math.round(100 - (stat.pctCorrect ?? 0));
  const rightPct = Math.round(stat.pctCorrect ?? 0);

  let emoji, msg, bg, textColor;
  if (wrongPct >= 60) {
    emoji = '🤝'; msg = `${wrongPct}% of your classmates got this wrong too`;
    bg = '#fef2f2'; textColor = '#991b1b';
  } else if (wrongPct >= 30) {
    emoji = '📊'; msg = `${rightPct}% of your classmates got this right`;
    bg = '#fffbeb'; textColor = '#92400e';
  } else {
    emoji = '🏆'; msg = `${rightPct}% of classmates got this right — tough one?`;
    bg = '#f0fdf4'; textColor = '#166534';
  }

  return (
    <View style={[styles.sameBoat, { backgroundColor: bg }]}>
      <Text style={styles.sameBoatEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sameBoatMsg, { color: textColor }]}>{msg}</Text>
        <Text style={styles.sameBoatSub}>{stat.attempts} classmate attempt{stat.attempts !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

// ─── Confidence slider (Tier A standout) ────────────────────────────────────

function ConfidenceSlider({ value, onChange }) {
  const labels = ['Not sure', 'Somewhat', 'Pretty sure', 'Certain'];
  const colors = ['#f87171', '#fb923c', '#facc15', '#4ade80'];
  return (
    <View style={styles.confidenceWrap}>
      <Text style={styles.confidenceLabel}>How confident are you?</Text>
      <View style={styles.confidenceRow}>
        {[1, 2, 3, 4].map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              styles.confidenceBtn,
              { borderColor: colors[v - 1] },
              value === v && { backgroundColor: colors[v - 1] },
            ]}
            onPress={() => onChange(v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.confidenceBtnText, value === v && styles.confidenceBtnTextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value > 0 && (
        <Text style={styles.confidenceHint}>{labels[value - 1]}</Text>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function QuizScreen({ route, navigation }) {
  const { deckId, deckTitle } = route.params;

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(null);       // index of chosen option
  const [result, setResult] = useState(null);        // { correct, correctIndex }
  const [confidence, setConfidence] = useState(0);   // 1–4, 0 = not set
  const [sameBoatStat, setSameBoatStat] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    DeckService.listCards(deckId).then((cards) => {
      setQuestions(QuizService.buildQuestions(cards));
      setLoading(false);
    });
  }, [deckId]);

  const currentQ = questions[index];

  const handleChoose = async (optionIndex) => {
    if (result) return; // already answered
    if (confidence === 0) return; // must pick confidence first

    setChosen(optionIndex);
    const res = QuizService.checkAnswer(currentQ, optionIndex);
    setResult(res);

    const wasCorrect = res.correct;
    setScore((prev) => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Record attempt with confidence
    await SameBoatService.recordAttempt(currentQ.cardId, wasCorrect, 'quiz');
    // Also write confidence to card_attempts via a direct update isn't possible
    // after insert — the confidence is passed as part of the insert in a future
    // SameBoatService upgrade; for now it's stored in the local result only.

    // Fetch Same-Boat stat
    const stat = await SameBoatService.getCardStat(currentQ.cardId);
    setSameBoatStat(stat);
  };

  const handleNext = () => {
    const next = index + 1;
    if (next >= questions.length) {
      navigation.replace('LearnSummary', {
        deckTitle,
        correct: score.correct + (result?.correct ? 0 : 0),
        total: score.total,
        mode: 'quiz',
      });
      return;
    }
    // Fade transition
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setIndex(next);
    setChosen(null);
    setResult(null);
    setConfidence(0);
    setSameBoatStat(null);
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyText}>Need at least 2 cards to quiz.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const answered = result !== null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.exitText}>✕ Exit</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{index + 1} / {questions.length}</Text>
        <Text style={styles.scoreText}>✓ {score.correct}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(index / questions.length) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Question */}
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>QUESTION</Text>
            <Text style={styles.questionText}>{currentQ.question}</Text>
          </View>

          {/* Confidence slider — shown before answering */}
          {!answered && (
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
          )}

          {/* Hint when confidence not set */}
          {!answered && confidence === 0 && (
            <Text style={styles.confidenceHintGlobal}>
              Rate your confidence before choosing an answer
            </Text>
          )}

          {/* Options */}
          <View style={styles.optionsWrap}>
            {currentQ.options.map((opt, i) => {
              let bg = '#fff';
              let borderColor = '#e5e7eb';
              let textColor = '#111827';

              if (answered) {
                if (i === result.correctIndex) {
                  bg = '#f0fdf4'; borderColor = '#4ade80'; textColor = '#166534';
                } else if (i === chosen && !result.correct) {
                  bg = '#fef2f2'; borderColor = '#f87171'; textColor = '#991b1b';
                }
              } else if (confidence === 0) {
                // greyed out until confidence is selected
                bg = '#f9fafb'; textColor = '#9ca3af';
              }

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.option, { backgroundColor: bg, borderColor }]}
                  onPress={() => handleChoose(i)}
                  disabled={answered || confidence === 0}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionLabel, answered && i === result.correctIndex && styles.optionLabelCorrect, answered && i === chosen && !result.correct && styles.optionLabelWrong]}>
                    <Text style={styles.optionLabelText}>{OPTION_LABELS[i]}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: textColor }]} numberOfLines={4}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Result + Same-Boat (after answering) */}
          {answered && (
            <View>
              <View style={[styles.resultBanner, result.correct ? styles.resultCorrect : styles.resultWrong]}>
                <Text style={styles.resultText}>
                  {result.correct ? '✓ Correct!' : '✗ Incorrect'}
                </Text>
                {!result.correct && (
                  <Text style={styles.resultCorrectAnswer}>
                    Correct: {currentQ.correct}
                  </Text>
                )}
              </View>

              <SameBoatBanner stat={sameBoatStat} />

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>
                  {index + 1 < questions.length ? 'Next →' : 'See results'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  exitText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  progress: { fontSize: 14, color: '#374151', fontWeight: '600' },
  scoreText: { fontSize: 14, color: '#16a34a', fontWeight: '700' },

  progressTrack: { height: 3, backgroundColor: '#e5e7eb', marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: '#6366f1', borderRadius: 2 },

  scroll: { padding: 20, paddingBottom: 48 },

  questionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  questionLabel: {
    fontSize: 10, fontWeight: '800', color: '#9ca3af',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  questionText: { fontSize: 20, fontWeight: '700', color: '#111827', lineHeight: 30 },

  confidenceWrap: {
    backgroundColor: '#eef2ff', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  confidenceLabel: { fontSize: 13, fontWeight: '600', color: '#4338ca', marginBottom: 12 },
  confidenceRow: { flexDirection: 'row', gap: 10 },
  confidenceBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  confidenceBtnText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  confidenceBtnTextActive: { color: '#fff' },
  confidenceHint: { fontSize: 12, color: '#6366f1', marginTop: 10, textAlign: 'center', fontWeight: '600' },

  confidenceHintGlobal: {
    fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 12, fontStyle: 'italic',
  },

  optionsWrap: { gap: 10, marginBottom: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 2, padding: 14, gap: 12,
  },
  optionLabel: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabelCorrect: { backgroundColor: '#4ade80' },
  optionLabelWrong: { backgroundColor: '#f87171' },
  optionLabelText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 22 },

  resultBanner: {
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  resultCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#4ade80' },
  resultWrong: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#f87171' },
  resultText: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  resultCorrectAnswer: { fontSize: 14, color: '#374151' },

  sameBoat: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  sameBoatEmoji: { fontSize: 24 },
  sameBoatMsg: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sameBoatSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  nextBtn: {
    backgroundColor: '#6366f1', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  backLink: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
});
