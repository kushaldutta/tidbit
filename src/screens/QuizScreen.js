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
import { QueueService } from '../services/QueueService';
import { QuizService } from '../services/QuizService';
import { SameBoatService } from '../services/SameBoatService';
import { CardLearningService } from '../services/CardLearningService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Same-Boat banner ─────────────────────────────────────────────────────────

function SameBoatBanner({ stat, styles, theme }) {
  if (!stat || stat.attempts < 2) return null;
  const wrongPct = Math.round(100 - (stat.pctCorrect ?? 0));
  const rightPct = Math.round(stat.pctCorrect ?? 0);

  let icon, msg, bg, textColor;
  if (wrongPct >= 60) {
    icon = 'buddy'; msg = `${wrongPct}% of your classmates got this wrong too`;
    bg = theme.dangerBg; textColor = theme.dangerText;
  } else if (wrongPct >= 30) {
    icon = 'accuracy'; msg = `${rightPct}% of your classmates got this right`;
    bg = theme.warningBg; textColor = theme.warningText;
  } else {
    icon = 'trophy'; msg = `${rightPct}% of classmates got this right — tough one?`;
    bg = theme.successBg; textColor = theme.successText;
  }

  return (
    <View style={[styles.sameBoat, { backgroundColor: bg }]}>
      <Icon name={icon} size={iconSize.lg} color={textColor} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.sameBoatMsg, { color: textColor }]}>{msg}</Text>
        <Text style={styles.sameBoatSub}>{stat.attempts} classmate attempt{stat.attempts !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

// ─── Confidence slider (Tier A standout) ────────────────────────────────────

/**
 * A 4-stop sequential ramp, deliberately NOT themed. Semantic tokens encode
 * pass/fail; this encodes *degree*, so it needs evenly spaced steps between the
 * endpoints. Swapping the ends for theme.danger/theme.success would break the
 * ramp's even lightness progression.
 */
const CONFIDENCE_RAMP = ['#f87171', '#fb923c', '#facc15', '#4ade80'];

function ConfidenceSlider({ value, onChange, styles, theme }) {
  const labels = ['Not sure', 'Somewhat', 'Pretty sure', 'Certain'];
  const colors = CONFIDENCE_RAMP;
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
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { deckId, deckTitle, studyScope, startCardId, categoryId } = route.params;

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(null);       // index of chosen option
  const [result, setResult] = useState(null);        // { correct, correctIndex }
  const [confidence, setConfidence] = useState(0);   // 1–4, 0 = not set
  const [sameBoatStat, setSameBoatStat] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  // Stamped when a question first appears, so response time measures thinking
  // rather than time since the screen mounted.
  const shownAtRef = useRef(null);

  useEffect(() => {
    QueueService.buildCardsForLearnMode(deckId, studyScope, {
      mode: 'quiz',
      startCardId: startCardId || null,
      categoryId: categoryId || null,
    }).then((cards) => {
      setQuestions(QuizService.buildQuestions(cards, { preserveOrder: !!startCardId }));
      setLoading(false);
    });
  }, [deckId, studyScope, startCardId, categoryId]);

  const currentQ = questions[index];

  useEffect(() => {
    if (currentQ) shownAtRef.current = Date.now();
  }, [currentQ?.cardId]);

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

    // Record attempt with confidence. The rating is genuine here — the screen
    // refuses to accept an answer until the user has rated it, and they rate it
    // before finding out whether they were right.
    await SameBoatService.recordAttempt(currentQ.cardId, wasCorrect, 'quiz', {
      confidence,
      responseMs: shownAtRef.current ? Date.now() - shownAtRef.current : null,
    });
    await CardLearningService.recordReview(currentQ.cardId, {
      wasCorrect,
      mode: 'quiz',
      confidence,
      categoryId: categoryId || null,
    });

    // Fetch Same-Boat stat
    const stat = await SameBoatService.getCardStat(currentQ.cardId);
    setSameBoatStat(stat);
  };

  const handleNext = () => {
    const next = index + 1;
    if (next >= questions.length) {
      navigation.replace('LearnSummary', {
        deckId,
        deckTitle,
        studyScope,
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
    return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>;
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="deck" size={iconSize.hero} color={theme.textMuted} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>No cards available for this review session.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const answered = result !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={styles.exitRow}>
            <Icon name="close" size={iconSize.sm} color={theme.textSecondary} />
            <Text style={styles.exitText}>Exit</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.progress}>{index + 1} / {questions.length}</Text>
        <Text style={styles.scoreText}>{score.correct} correct</Text>
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
            <ConfidenceSlider value={confidence} onChange={setConfidence} styles={styles} theme={theme} />
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
              let borderColor = theme.border;
              let textColor = theme.text;

              if (answered) {
                if (i === result.correctIndex) {
                  bg = theme.successBg; borderColor = theme.success; textColor = theme.successText;
                } else if (i === chosen && !result.correct) {
                  bg = theme.dangerBg; borderColor = theme.danger; textColor = theme.dangerText;
                }
              } else if (confidence === 0) {
                // greyed out until confidence is selected
                bg = theme.surfaceAlt; textColor = theme.textMuted;
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
                <View style={styles.resultRow}>
                  <Icon
                    name={result.correct ? 'check' : 'wrong'}
                    size={iconSize.md}
                    color={result.correct ? theme.successText : theme.dangerText}
                  />
                  <Text style={styles.resultText}>
                    {result.correct ? 'Correct' : 'Incorrect'}
                  </Text>
                </View>
                {!result.correct && (
                  <Text style={styles.resultCorrectAnswer}>
                    Correct: {currentQ.correct}
                  </Text>
                )}
              </View>

              <SameBoatBanner stat={sameBoatStat} styles={styles} theme={theme} />

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

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surfaceAlt },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exitText: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
  progress: { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
  scoreText: { fontSize: 14, color: theme.success, fontWeight: '700' },

  progressTrack: { height: 3, backgroundColor: theme.border, marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: theme.primary, borderRadius: 2 },

  scroll: { padding: 20, paddingBottom: 48 },

  questionCard: {
    backgroundColor: theme.card, borderRadius: 20, padding: 24,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  questionLabel: {
    fontSize: 10, fontWeight: '800', color: theme.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  questionText: { fontSize: 20, fontWeight: '700', color: theme.text, lineHeight: 30 },

  confidenceWrap: {
    backgroundColor: theme.primaryLight, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  confidenceLabel: { fontSize: 13, fontWeight: '600', color: theme.primaryDark, marginBottom: 12 },
  confidenceRow: { flexDirection: 'row', gap: 10 },
  confidenceBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card,
  },
  confidenceBtnText: { fontSize: 16, fontWeight: '700', color: theme.textSecondary },
  confidenceBtnTextActive: { color: '#fff' },
  confidenceHint: { fontSize: 12, color: theme.primary, marginTop: 10, textAlign: 'center', fontWeight: '600' },

  confidenceHintGlobal: {
    fontSize: 13, color: theme.textMuted, textAlign: 'center', marginBottom: 12, fontStyle: 'italic',
  },

  optionsWrap: { gap: 10, marginBottom: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 2, padding: 14, gap: 12,
  },
  optionLabel: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabelCorrect: { backgroundColor: theme.success },
  optionLabelWrong: { backgroundColor: theme.danger },
  optionLabelText: { fontSize: 12, fontWeight: '800', color: theme.textSecondary },
  optionText: { flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 22 },

  resultBanner: {
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  resultCorrect: { backgroundColor: theme.successBg, borderWidth: 1.5, borderColor: theme.success },
  resultWrong: { backgroundColor: theme.dangerBg, borderWidth: 1.5, borderColor: theme.danger },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultText: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 4 },
  resultCorrectAnswer: { fontSize: 14, color: theme.textSecondary },

  sameBoat: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  sameBoatMsg: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sameBoatSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  nextBtn: {
    backgroundColor: theme.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary, marginBottom: 16 },
  backLink: { fontSize: 15, color: theme.primary, fontWeight: '600' },
});
