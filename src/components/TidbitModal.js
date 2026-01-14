import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { ContentService } from '../services/ContentService';

const { width } = Dimensions.get('window');

export default function TidbitModal({ tidbit, onDismiss, onNextTidbit }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [learningState, setLearningState] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Initial animation on mount
  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Reset flip state when tidbit changes (but don't re-animate)
  useEffect(() => {
    if (tidbit) {
      // Reset flip to front when new tidbit loads
      setIsFlipped(false);
      flipAnim.setValue(0);
      
      // Check tidbit learning state
      const loadLearningState = async () => {
        const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
        if (tidbitWithId.id) {
          const state = await SpacedRepetitionService.getTidbitState(tidbitWithId.id);
          setIsSaved(state?.saved === true);
          setLearningState(state);
        } else {
          setIsSaved(false);
          setLearningState(null);
        }
      };
      loadLearningState();
      
      // Light haptic feedback for tidbit change
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [tidbit?.text, tidbit?.category]); // Only trigger on actual content change

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
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

  const handleAction = async (action) => {
    // Ensure tidbit has an ID
    const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
    const tidbitId = tidbitWithId.id;
    
    if (!tidbitId) {
      console.warn('Cannot record feedback: tidbit has no ID');
      Alert.alert('Error', 'Unable to save feedback. Please try again.');
      return;
    }
    
    // Map button action to service action
    let serviceAction;
    if (action === 'knew') {
      serviceAction = 'knew';
    } else if (action === 'didnt') {
      serviceAction = 'didnt_know';
    } else if (action === 'save' || action === 'unsave') {
      // Toggle save/unsave based on current state
      serviceAction = isSaved ? 'unsave' : 'save';
    } else {
      console.warn(`Unknown action: ${action}`);
      return;
    }

    try {
      // Record feedback
      console.log(`[SPACED_REP] Recording feedback: tidbitId=${tidbitId}, action=${serviceAction}`);
      await SpacedRepetitionService.recordFeedback(tidbitId, serviceAction);
      
      // Log the updated state
      const updatedState = await SpacedRepetitionService.getTidbitState(tidbitId);
      console.log(`[SPACED_REP] Updated state:`, JSON.stringify(updatedState, null, 2));
      
      // Update saved status and learning state for UI
      if (serviceAction === 'save' || serviceAction === 'unsave') {
        setIsSaved(serviceAction === 'save');
      }
      setLearningState(updatedState);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Visual feedback: flip back to front after a brief delay
      setTimeout(() => {
        if (isFlipped) {
          handleFlip();
        }
      }, 300);
      
      // For "I knew it" or "I didn't" actions, automatically show next tidbit
      if (action === 'knew' || action === 'didnt') {
        // Small delay to show feedback, then show next tidbit
        setTimeout(() => {
          handleNextTidbit();
        }, 500);
      }
    } catch (error) {
      console.error('Error recording feedback:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save feedback. Please try again.');
    }
  };

  // Simple version: just ask parent for the next tidbit, no extra animations
  const handleNextTidbit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onNextTidbit) {
      onNextTidbit();
    }
  };

  const categoryName = tidbit.category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Get mastery badge style helper
  const getMasteryBadgeStyle = (masteryLevel) => {
    if (!masteryLevel) return styles.masteryBadgeNew;
    const capitalized = masteryLevel.charAt(0).toUpperCase() + masteryLevel.slice(1);
    const styleName = `masteryBadge${capitalized}`;
    return styles[styleName] || styles.masteryBadgeNew;
  };

  // Format time ago helper
  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Simple opacity for front/back based on flip state
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.cardContainer}
          >
            {/* Front of Card */}
            <Animated.View
              style={[
                styles.card,
                styles.cardFront,
                { opacity: frontOpacity },
              ]}
              pointerEvents={isFlipped ? 'none' : 'auto'}
            >
              <View style={styles.cardContent}>
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.categoryLabel}>{categoryName}</Text>
                    {learningState && (
                      <View style={[styles.masteryBadge, getMasteryBadgeStyle(learningState.masteryLevel)]}>
                        <Text style={styles.masteryBadgeText}>
                          {learningState.masteryLevel === 'mastered' ? '⭐ Mastered' : 
                           learningState.masteryLevel === 'learning' ? '📚 Learning' : 
                           '🆕 New'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.tidbitContent}
                  activeOpacity={0.9}
                  onPress={handleFlip}
                >
                  <Text style={styles.tidbitText}>{tidbit.text}</Text>
                  {learningState && learningState.lastSeen && (
                    <View style={styles.learningInfo}>
                      <Text style={styles.learningInfoText}>
                        Last seen: {formatTimeAgo(learningState.lastSeen)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.flipHint}>
                    <Text style={styles.flipHintText}>Tap to flip</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                { opacity: backOpacity },
              ]}
              pointerEvents={!isFlipped ? 'none' : 'auto'}
            >
              <View style={styles.cardContent}>
                <View style={styles.header}>
                  <Text style={styles.categoryLabel}>{categoryName}</Text>
                  <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.actionsContainer}>
                  <Text style={styles.actionsTitle}>What did you think?</Text>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonKnew]}
                    onPress={() => handleAction('knew')}
                  >
                    <Text style={styles.actionButtonText}>✅ I knew it</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDidnt]}
                    onPress={() => handleAction('didnt')}
                  >
                    <Text style={styles.actionButtonText}>❓ I didn't</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSave]}
                    onPress={() => handleAction(isSaved ? 'unsave' : 'save')}
                  >
                    <Text style={styles.actionButtonText}>
                      {isSaved ? '🗑️ Unsave' : '💾 Save'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonNext]}
                    onPress={handleNextTidbit}
                  >
                    <Text style={styles.actionButtonText}>➡️ Reveal Next Tidbit Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.flipBackButton}
                    onPress={handleFlip}
                  >
                    <Text style={styles.flipBackText}>← Flip back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
  },
  cardContainer: {
    width: '100%',
    height: 400,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: '#ffffff',
  },
  cardBack: {
    backgroundColor: '#f9fafb',
  },
  cardContent: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  masteryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  masteryBadgeNew: {
    backgroundColor: '#e0e7ff',
  },
  masteryBadgeLearning: {
    backgroundColor: '#fef3c7',
  },
  masteryBadgeMastered: {
    backgroundColor: '#d1fae5',
  },
  masteryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    lineHeight: 20,
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
  learningInfo: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  learningInfoText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 2,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  actionButtonSave: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  actionButtonNext: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
    marginTop: 8,
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
});

