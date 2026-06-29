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
import { StudyDeckService } from '../services/StudyDeckService';
import { RecallService } from '../services/RecallService';
import { SameBoatService } from '../services/SameBoatService';
import { useTheme } from '../context/ThemeContext';

// Default: show definition, user types the term. Future: user-selectable direction.
const RECALL_WRITE_TERM = true;

function getRecallPrompt(card) {
  return RECALL_WRITE_TERM ? card.back : card.front;
}

function getRecallAnswer(card) {
  return RECALL_WRITE_TERM ? card.front : card.back;
}

// ─── Same-Boat banner ─────────────────────────────────────────────────────────

function SameBoatBanner({ stat }) {
  if (!stat || stat.attempts < 2) return null;
  const wrongPct = Math.round(100 - (stat.pctCorrect ?? 0));
  const rightPct = Math.round(stat.pctCorrect ?? 0);

  let emoji, msg, bg, textColor;
  if (wrongPct >= 60) {
    emoji = '🤝'; msg = `${wrongPct}% of your classmates missed this too`;
    bg = '#fef2f2'; textColor = '#991b1b';
  } else if (wrongPct >= 30) {
    emoji = '📊'; msg = `${rightPct}% of classmates got this right`;
    bg = '#fffbeb'; textColor = '#92400e';
  } else {
    emoji = '🏆'; msg = `${rightPct}% of classmates got this — nice work`;
    bg = '#f0fdf4'; textColor = '#166534';
  }

  return (
    <View style={[styles.sameBoat, { backgroundColor: bg }]}>
      <Text style={styles.sameBoatEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sameBoatMsg, { color: textColor }]}>{msg}</Text>
        <Text style={styles.sameBoatSub}>{stat.attempts} attempt{stat.attempts !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

// ─── Diff highlighter ─────────────────────────────────────────────────────────

function DiffDisplay({ diff }) {
  return (
    <Text style={styles.diffBase}>
      {diff.map((token, i) => {
        let color = '#111827', bg = 'transparent', decoration = 'none';
        if (token.type === 'match') { color = '#16a34a'; }
        else if (token.type === 'insert') { color = '#dc2626'; bg = '#fee2e2'; }
        else if (token.type === 'delete') { color = '#dc2626'; decoration = 'line-through'; }
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
  const { deckId, deckTitle, studyScope } = route.params;

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
    StudyDeckService.loadStudyCards(deckId, studyScope).then((c) => {
      const shuffled = [...c].sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setLoading(false);
    });
  }, [deckId, studyScope]);

  const currentCard = cards[index];

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

    const correctAnswer = getRecallAnswer(currentCard);
    const result = RecallService.grade(userAnswer, correctAnswer);
    const diff = result.isCorrect ? null : RecallService.diff(userAnswer, correctAnswer);
    setGradeResult({ ...result, diff });

    setScore((prev) => ({
      correct: prev.correct + (result.isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Record attempt
    await SameBoatService.recordAttempt(currentCard.id, result.isCorrect, 'recall');

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

    // Re-record the attempt with corrected value (replaces the original in aggregate stats)
    await SameBoatService.recordAttempt(currentCard.id, flippedCorrect, 'recall_override');

    // Hide Same-Boat stat — don't show it after an override
    setSameBoatStat(null);
    setOverridden(true);
  };

  const gradeColor = () => {
    if (!gradeResult) return '#6366f1';
    if (gradeResult.grade === 'exact' || gradeResult.grade === 'close') return '#16a34a';
    if (gradeResult.grade === 'partial') return '#f59e0b';
    return '#dc2626';
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyEmoji}>📭</Text>
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
          <Text style={styles.exitText}>✕ Exit</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{index + 1} / {cards.length}</Text>
        <Text style={styles.scoreText}>✓ {score.correct}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(index / cards.length) * 100}%` }]} />
      </View>

      {/* Audio mode toggle */}
      <View style={styles.audioToggleRow}>
        <Text style={styles.audioToggleLabel}>🔊 Audio mode</Text>
        <Switch
          value={audioMode}
          onValueChange={(v) => {
            setAudioMode(v);
            if (!v) Speech.stop();
          }}
          trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
          thumbColor={audioMode ? '#6366f1' : '#9ca3af'}
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
                  {isSpeaking ? '🔊 Speaking…' : '🔊 Repeat'}
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
              placeholderTextColor="#9ca3af"
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
                  {gradeResult.grade === 'exact' && '✓ Perfect!'}
                  {gradeResult.grade === 'close' && '✓ Close enough!'}
                  {gradeResult.grade === 'partial' && '⚡ Almost — check spelling'}
                  {gradeResult.grade === 'wrong' && '✗ Not quite'}
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
                    <DiffDisplay diff={gradeResult.diff} />
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
                    {gradeResult.isCorrect ? '✗ Actually I got it wrong' : '✓ Actually I got it right'}
                  </Text>
                </TouchableOpacity>
              )}

              {!overridden && <SameBoatBanner stat={sameBoatStat} />}

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>
                  {index + 1 < cards.length ? 'Next →' : 'See results'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!answered && (
            <TouchableOpacity
              style={[styles.submitBtn, !userAnswer.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!userAnswer.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  progressFill: { height: 3, backgroundColor: '#a78bfa', borderRadius: 2 },

  audioToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingVertical: 8, gap: 10,
  },
  audioToggleLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },

  scroll: { padding: 20, paddingBottom: 48 },

  promptCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  promptLabel: {
    fontSize: 10, fontWeight: '800', color: '#9ca3af',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },
  promptText: { fontSize: 20, fontWeight: '700', color: '#111827', lineHeight: 30 },

  speakBtn: {
    marginTop: 16, alignSelf: 'flex-start',
    backgroundColor: '#eef2ff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  speakBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 14 },

  input: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb',
    padding: 16, fontSize: 16, color: '#111827', minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  gradeBanner: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 2,
    padding: 16, marginBottom: 12,
  },
  gradeText: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  yourAnswerLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  yourAnswerText: { fontSize: 15, color: '#374151', marginBottom: 10 },
  correctLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  correctText: { fontSize: 15, color: '#166534', fontWeight: '600', marginBottom: 10 },
  diffLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  diffBase: { fontSize: 15, lineHeight: 24 },

  sameBoat: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  sameBoatEmoji: { fontSize: 24 },
  sameBoatMsg: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sameBoatSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  submitBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#c7d2fe' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  overrideBtn: {
    borderRadius: 12, paddingVertical: 11, alignItems: 'center',
    marginBottom: 10, borderWidth: 1.5,
  },
  overrideBtnMarkWrong: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  overrideBtnMarkCorrect: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  overrideBtnText: { fontSize: 13, fontWeight: '600' },
  overrideBtnTextWrong: { color: '#dc2626' },
  overrideBtnTextCorrect: { color: '#16a34a' },

  nextBtn: {
    backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  backLink: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
});
