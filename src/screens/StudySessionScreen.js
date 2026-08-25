import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StudySessionService } from '../services/StudySessionService';
import { StudyPlanService } from '../services/StudyPlanService';
import { ContentService } from '../services/ContentService';
import { StorageService } from '../services/StorageService';
import { RecallService } from '../services/RecallService';
import { QuizService } from '../services/QuizService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

const { width, height } = Dimensions.get('window');

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function formatCategoryName(category) {
  if (!category) return 'Tidbit';
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Which question style this card gets. QueueService decides it from the card's
 * stage; the fallback covers tidbits from a plan built before it did — those
 * behave the way they always have.
 */
function studyModeFor(tidbit) {
  const mode = tidbit?.studyMode;
  // A quiz with no question survived a class too small for real distractors.
  if (mode === 'quiz') return tidbit.question ? 'quiz' : 'flashcard';
  if (mode === 'recall' || mode === 'flashcard') return mode;
  return tidbit?.term ? 'recall' : 'flashcard';
}

function modeLabelFor(tidbit, mode) {
  if (mode === 'quiz') return 'Multiple choice';
  if (mode === 'recall') return 'Recall';
  return tidbit?.stage && tidbit.stage !== 'new' ? 'Review' : 'New';
}

export default function StudySessionScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { tidbits: initialTidbits, fromDailyPlan = false } = route.params || {};
  const [currentTidbit, setCurrentTidbit] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [recallResult, setRecallResult] = useState(null);
  const [chosenOption, setChosenOption] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeSession();
    return () => {
      // Cleanup: end session if component unmounts
      if (!isComplete) {
        StudySessionService.endSession();
      }
    };
  }, []);

  const initializeSession = async () => {
    try {
      // Start session with provided tidbits
      const session = await StudySessionService.startSession(initialTidbits);
      if (!session || !initialTidbits?.length) {
        Alert.alert(
          'No tidbits to study',
          'Select classes with tidbit content and try again.'
        );
        navigation.goBack();
        return;
      }
      if (session) {
        setSessionStats(session.stats);
        // Load first tidbit
        loadNextTidbit();
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('[STUDY_SESSION] Error initializing session:', error);
      navigation.goBack();
    }
  };

  const loadNextTidbit = async () => {
    try {
      const tidbit = await StudySessionService.getNextTidbit();
      if (tidbit) {
        const tidbitWithId = ContentService.ensureTidbitHasId(tidbit);
        setCurrentTidbit(tidbitWithId);
        setIsFlipped(false);
        setUserAnswer('');
        setRecallResult(null);
        setChosenOption(null);
        setQuizResult(null);
        flipAnim.setValue(0);
      } else {
        // No more tidbits, session complete
        await completeSession();
      }
    } catch (error) {
      console.error('[STUDY_SESSION] Error loading next tidbit:', error);
    }
  };

  const handleRecallSubmit = () => {
    if (!currentTidbit?.term || !userAnswer.trim() || recallResult) return;
    const graded = RecallService.grade(userAnswer.trim(), currentTidbit.term);
    setRecallResult(graded);
    Haptics.notificationAsync(
      graded.isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    setTimeout(() => {
      handleTidbitAction(graded.isCorrect ? 'knew' : 'didnt', 'recall');
    }, 900);
  };

  const handleQuizChoose = (optionIndex) => {
    if (quizResult || !currentTidbit?.question) return;
    const res = QuizService.checkAnswer(currentTidbit.question, optionIndex);
    setChosenOption(optionIndex);
    setQuizResult(res);
    Haptics.notificationAsync(
      res.correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    // Longer than the recall pause: a wrong pick needs time to read the
    // highlighted answer before the card is replaced.
    setTimeout(() => {
      handleTidbitAction(res.correct ? 'knew' : 'didnt', 'quiz');
    }, 1200);
  };

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toValue = isFlipped ? 0 : 1;
    
    Animated.spring(flipAnim, {
      toValue,
      tension: 65,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(!isFlipped);
    });
  };

  const handleTidbitAction = async (action, mode = 'session') => {
    if (!currentTidbit?.id) return;

    try {
      // Map action to service action
      let serviceAction;
      if (action === 'knew') {
        serviceAction = 'knew';
      } else if (action === 'didnt') {
        serviceAction = 'didnt_know';
      } else if (action === 'save') {
        serviceAction = 'save';
      } else {
        return;
      }

      // Record feedback
      const updatedSession = await StudySessionService.recordTidbitFeedback(
        currentTidbit.id,
        serviceAction,
        { mode }
      );

      if (updatedSession) {
        setSessionStats(updatedSession.stats);

        if (fromDailyPlan) {
          await StudyPlanService.updatePlanProgress(updatedSession.stats.completed);
        }
      }

      if (action === 'knew' || action === 'didnt') {
        await StorageService.recordTidbitAnswered();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Flip back to front
      if (isFlipped) {
        handleFlip();
      }
      
      // Small delay before next tidbit
      setTimeout(() => {
        loadNextTidbit();
      }, 500);
    } catch (error) {
      console.error('[STUDY_SESSION] Error handling action:', error);
    }
  };

  const completeSession = async () => {
    try {
      const finalSession = await StudySessionService.endSession();
      if (finalSession) {
        if (fromDailyPlan) {
          await StudyPlanService.markPlanCompleted(finalSession.stats.completed);
        }

        setIsComplete(true);
        setShowSummary(true);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[STUDY_SESSION] Error completing session:', error);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (showSummary && sessionStats) {
    return (
      <View style={styles.container}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Session complete</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatCard}>
              <Text style={styles.summaryStatNumber}>{sessionStats.completed}</Text>
              <Text style={styles.summaryStatLabel}>Tidbits Reviewed</Text>
            </View>
            
            <View style={styles.summaryStatCard}>
              <Text style={styles.summaryStatNumber}>{sessionStats.knew}</Text>
              <Text style={styles.summaryStatLabel}>I Knew It</Text>
            </View>
            
            <View style={styles.summaryStatCard}>
              <Text style={styles.summaryStatNumber}>{sessionStats.didntKnow}</Text>
              <Text style={styles.summaryStatLabel}>Need Practice</Text>
            </View>
          </View>

          <View style={styles.accuracyContainer}>
            <Text style={styles.accuracyLabel}>Accuracy</Text>
            <Text style={styles.accuracyValue}>
              {sessionStats.completed > 0
                ? Math.round((sessionStats.knew / sessionStats.completed) * 100)
                : 0}%
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header with progress */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeHeaderButton}>
            <Text style={styles.closeHeaderText}>✕</Text>
          </TouchableOpacity>
          
          {sessionStats && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {sessionStats.completed} / {sessionStats.total}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(sessionStats.completed / sessionStats.total) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Study content area - show tidbit card */}
        <ScrollView 
          style={styles.studyArea}
          contentContainerStyle={styles.studyContent}
        >
          {currentTidbit ? (
            <StudyTidbitCard
              tidbit={currentTidbit}
              isFlipped={isFlipped}
              flipAnim={flipAnim}
              onFlip={handleFlip}
              onAction={handleTidbitAction}
              userAnswer={userAnswer}
              onChangeAnswer={setUserAnswer}
              recallResult={recallResult}
              onRecallSubmit={handleRecallSubmit}
              chosenOption={chosenOption}
              quizResult={quizResult}
              onQuizChoose={handleQuizChoose}
              styles={styles}
              theme={theme}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading next tidbit...</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Study Tidbit Card Component
function StudyTidbitCard({
  tidbit,
  isFlipped,
  flipAnim,
  onFlip,
  onAction,
  userAnswer,
  onChangeAnswer,
  recallResult,
  onRecallSubmit,
  chosenOption,
  quizResult,
  onQuizChoose,
  styles,
  theme,
}) {
  const categoryName = formatCategoryName(tidbit.category);
  const mode = studyModeFor(tidbit);
  const modeLabel = modeLabelFor(tidbit, mode);

  if (mode === 'quiz') {
    const { question } = tidbit;
    return (
      <View style={styles.quizCardWrap}>
        <View style={styles.staticCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.categoryLabel}>{categoryName}</Text>
            <Text style={styles.modeBadge}>{modeLabel}</Text>
          </View>
          <Text style={styles.defLabel}>WHICH TERM FITS?</Text>
          <Text style={styles.quizPrompt}>{question.question}</Text>
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex;
            const isChosen = i === chosenOption;
            const revealed = quizResult !== null;
            return (
              <TouchableOpacity
                key={`${i}-${opt}`}
                style={[
                  styles.optionRow,
                  revealed && isCorrect && styles.optionCorrect,
                  revealed && isChosen && !isCorrect && styles.optionWrong,
                ]}
                onPress={() => onQuizChoose(i)}
                disabled={revealed}
                activeOpacity={0.85}
              >
                <Text style={styles.optionLetter}>{OPTION_LABELS[i]}</Text>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
          {quizResult && (
            <Text style={quizResult.correct ? styles.recallOk : styles.recallBad}>
              {quizResult.correct ? 'Correct' : `Answer: ${question.correct}`}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (mode === 'recall') {
    return (
      <View style={styles.cardContainer}>
        <View style={[styles.card, styles.cardFront]}>
          <View style={styles.cardHeader}>
            <Text style={styles.categoryLabel}>{categoryName}</Text>
            <Text style={styles.modeBadge}>{modeLabel}</Text>
          </View>
          <Text style={styles.defLabel}>DEFINITION</Text>
          <Text style={styles.tidbitText}>{tidbit.text}</Text>
          {recallResult ? (
            <Text style={recallResult.isCorrect ? styles.recallOk : styles.recallBad}>
              {recallResult.isCorrect
                ? `Got it · ${tidbit.term}`
                : `Answer: ${tidbit.term}`}
            </Text>
          ) : (
            <>
              <TextInput
                style={styles.recallInput}
                placeholder="Type the term…"
                placeholderTextColor={theme.textMuted}
                value={userAnswer}
                onChangeText={onChangeAnswer}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onRecallSubmit}
              />
              <TouchableOpacity
                style={[styles.lockBtn, !userAnswer.trim() && styles.lockBtnDisabled]}
                onPress={onRecallSubmit}
                disabled={!userAnswer.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.lockBtnText}>Lock in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.cardContainer}>
      {/* Front of Card */}
      <Animated.View
        style={[styles.card, styles.cardFront, { opacity: frontOpacity }]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.categoryLabel}>{categoryName}</Text>
          <Text style={styles.modeBadge}>{modeLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.tidbitContent}
          activeOpacity={0.9}
          onPress={onFlip}
        >
          {tidbit.term ? (
            <>
              <Text style={styles.termText}>{tidbit.term}</Text>
              <View style={styles.flipHint}>
                <Text style={styles.flipHintText}>Tap to reveal definition</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.tidbitText}>{tidbit.text}</Text>
              <View style={styles.flipHint}>
                <Text style={styles.flipHintText}>Tap to flip</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Back of Card */}
      <Animated.View
        style={[styles.card, styles.cardBack, { opacity: backOpacity }]}
        pointerEvents={!isFlipped ? 'none' : 'auto'}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.categoryLabel}>{categoryName}</Text>
        </View>
        <ScrollView
          style={styles.actionsScroll}
          contentContainerStyle={styles.actionsContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {tidbit.term ? (
            <View style={styles.definitionBox}>
              <Text style={styles.definitionText}>{tidbit.text}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonKnew]}
            onPress={() => onAction('knew')}
          >
            <Icon name="check" size={iconSize.md} color={theme.success} filled />
            <Text style={styles.actionButtonText}>I knew it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDidnt]}
            onPress={() => onAction('didnt')}
          >
            <Icon name="wrong" size={iconSize.md} color={theme.warning} />
            <Text style={styles.actionButtonText}>I didn't</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipBackButton}
            onPress={onFlip}
          >
            <Text style={styles.flipBackText}>← Flip back</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  closeHeaderButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeHeaderText: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 3,
  },
  studyArea: {
    flex: 1,
  },
  studyContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height - 200,
  },
  cardContainer: {
    width: width - 40,
    maxWidth: 400,
    height: 420,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardFront: {
    backgroundColor: theme.card,
  },
  cardBack: {
    backgroundColor: theme.background,
  },
  quizCardWrap: {
    width: width - 40,
    maxWidth: 400,
  },
  // Grows with its content instead of being pinned inside a fixed-height
  // container — a long definition plus four options will not fit 420pt.
  staticCard: {
    minHeight: 420,
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  categoryLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.textSecondary,
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  quizPrompt: {
    fontSize: 18,
    lineHeight: 27,
    color: theme.text,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: theme.background,
  },
  optionCorrect: {
    borderColor: theme.success,
    backgroundColor: theme.successBg,
  },
  optionWrong: {
    borderColor: theme.danger,
    backgroundColor: theme.dangerBg,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primary,
    width: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: theme.text,
    fontWeight: '500',
  },
  tidbitContent: {
    flex: 1,
    justifyContent: 'center',
  },
  tidbitText: {
    fontSize: 20,
    lineHeight: 32,
    color: theme.text,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  defLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: theme.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  recallInput: {
    borderWidth: 1.5,
    borderColor: theme.primaryLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: theme.text,
    backgroundColor: theme.background,
    marginTop: 8,
    marginBottom: 12,
  },
  lockBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lockBtnDisabled: { opacity: 0.4 },
  lockBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  recallOk: { color: theme.success, fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 12 },
  recallBad: { color: theme.danger, fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 12 },
  termText: {
    fontSize: 26,
    lineHeight: 34,
    color: theme.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    paddingVertical: 12,
  },
  definitionBox: {
    backgroundColor: theme.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  definitionText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.text,
    fontWeight: '500',
  },
  actionsScroll: { flex: 1 },
  actionsContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  flipHint: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  flipHintText: {
    fontSize: 14,
    color: theme.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  actionButtonKnew: {
    borderColor: theme.success,
    backgroundColor: theme.successBg,
  },
  actionButtonDidnt: {
    borderColor: theme.warning,
    backgroundColor: theme.warningBg,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  flipBackButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  flipBackText: {
    fontSize: 14,
    color: theme.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  summaryContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 32,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  summaryStatCard: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryStatNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 8,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  accuracyContainer: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accuracyLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.success,
  },
  closeButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

