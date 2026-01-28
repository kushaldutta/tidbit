import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StudySessionService } from '../services/StudySessionService';
import { StudyPlanService } from '../services/StudyPlanService';
import { ContentService } from '../services/ContentService';
import { StorageService } from '../services/StorageService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';

const { width, height } = Dimensions.get('window');

export default function StudySessionScreen({ route, navigation }) {
  const { tidbits: initialTidbits } = route.params || {};
  const [currentTidbit, setCurrentTidbit] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
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
        flipAnim.setValue(0);
      } else {
        // No more tidbits, session complete
        await completeSession();
      }
    } catch (error) {
      console.error('[STUDY_SESSION] Error loading next tidbit:', error);
    }
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

  const handleTidbitAction = async (action) => {
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
        serviceAction
      );

      if (updatedSession) {
        setSessionStats(updatedSession.stats);
        
        // Update study plan progress
        await StudyPlanService.updatePlanProgress(updatedSession.stats.completed);
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
        // Update study plan
        await StudyPlanService.markPlanCompleted(finalSession.stats.completed);
        
        // Update daily tidbit count
        await StorageService.incrementTidbitsSeen(finalSession.stats.completed);
        await StorageService.incrementDailyTidbitCount(finalSession.stats.completed);
        
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
          <Text style={styles.summaryTitle}>🎉 Session Complete!</Text>
          
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
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading next tidbit...</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// Study Tidbit Card Component
function StudyTidbitCard({ tidbit, isFlipped, flipAnim, onFlip, onAction }) {
  const categoryName = tidbit.category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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
        </View>
        <TouchableOpacity
          style={styles.tidbitContent}
          activeOpacity={0.9}
          onPress={onFlip}
        >
          <Text style={styles.tidbitText}>{tidbit.text}</Text>
          <View style={styles.flipHint}>
            <Text style={styles.flipHintText}>Tap to flip</Text>
          </View>
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
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>What did you think?</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonKnew]}
            onPress={() => onAction('knew')}
          >
            <Text style={styles.actionButtonText}>✅ I knew it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDidnt]}
            onPress={() => onAction('didnt')}
          >
            <Text style={styles.actionButtonText}>❓ I didn't</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipBackButton}
            onPress={onFlip}
          >
            <Text style={styles.flipBackText}>← Flip back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeHeaderButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeHeaderText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
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
    height: 400,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardFront: {
    backgroundColor: '#ffffff',
  },
  cardBack: {
    backgroundColor: '#f9fafb',
  },
  cardHeader: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tidbitContent: {
    flex: 1,
    justifyContent: 'center',
  },
  tidbitText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  flipHint: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  flipHintText: {
    fontSize: 14,
    color: '#6366f1',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonKnew: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  actionButtonDidnt: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  flipBackButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  flipBackText: {
    fontSize: 14,
    color: '#6366f1',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
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
    backgroundColor: '#ffffff',
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
    color: '#6366f1',
    marginBottom: 8,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  accuracyContainer: {
    backgroundColor: '#ffffff',
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
    color: '#6b7280',
    marginBottom: 8,
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10b981',
  },
  closeButton: {
    backgroundColor: '#6366f1',
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

