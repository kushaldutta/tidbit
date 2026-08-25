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
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { ContentService } from '../services/ContentService';
import { StorageService } from '../services/StorageService';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { iconSize } from '../theme/tokens';

const { width, height: windowHeight } = Dimensions.get('window');

export default function TidbitModal({ tidbit, onDismiss, onNextTidbit }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [learningState, setLearningState] = useState(null);
  const [cardHeight, setCardHeight] = useState(400);
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
      
      // Check tidbit learning state and mark as shown if it was due
      const loadLearningState = async () => {
        const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
        if (tidbitWithId.id) {
          const state = await SpacedRepetitionService.getTidbitState(tidbitWithId.id);
          setIsSaved(state?.saved === true);
          setLearningState(state);
          
          // Mark tidbit as shown (will mark as "shown as due" if it was due)
          await SpacedRepetitionService.markTidbitAsShown(tidbitWithId.id);
          
          // Reload state to get updated "wasShownAsDue" flag
          const updatedState = await SpacedRepetitionService.getTidbitState(tidbitWithId.id);
          setLearningState(updatedState);
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

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If this was a due tidbit and user dismissed without action, clear the due status
    if (tidbit) {
      const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
      if (tidbitWithId.id && learningState?.wasShownAsDue) {
        await SpacedRepetitionService.clearDueStatus(tidbitWithId.id);
      }
    }
    
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
      await SpacedRepetitionService.recordFeedback(tidbitId, serviceAction, tidbitWithId.category);
      
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
      
      // For "I knew it" or "I didn't" actions, dismiss the modal
      if (action === 'knew' || action === 'didnt') {
        await StorageService.recordTidbitAnswered();
        setTimeout(() => {
          handleDismiss();
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
            style={[styles.cardContainer, { minHeight: cardHeight }]}
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
                          {learningState.masteryLevel === 'mastered' ? 'Mastered'
                            : learningState.masteryLevel === 'learning' ? 'Learning'
                              : 'New'}
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
                    </>
                  )}
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
                <ScrollView
                  style={styles.actionsScroll}
                  contentContainerStyle={styles.actionsContainer}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  onContentSizeChange={(_w, h) => {
                    const needed = Math.min(windowHeight * 0.85, Math.max(400, h + 100));
                    setCardHeight(needed);
                  }}
                >
                  {tidbit.term && (
                    <View style={styles.definitionBox}>
                      <Text style={styles.definitionText}>{tidbit.text}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonKnew]}
                    onPress={() => handleAction('knew')}
                  >
                    <Icon name="check" size={iconSize.md} color={theme.successText} />
                    <Text style={styles.actionButtonText}>I knew it</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDidnt]}
                    onPress={() => handleAction('didnt')}
                  >
                    <Icon name="wrong" size={iconSize.md} color={theme.warningText} />
                    <Text style={styles.actionButtonText}>I didn't</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSave]}
                    onPress={() => handleAction(isSaved ? 'unsave' : 'save')}
                  >
                    <Icon
                      name={isSaved ? 'close' : 'add'}
                      size={iconSize.md}
                      color={theme.textSecondary}
                    />
                    <Text style={styles.actionButtonText}>
                      {isSaved ? 'Unsave' : 'Save'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.flipBackButton}
                    onPress={handleFlip}
                  >
                    <Text style={styles.flipBackText}>← Flip back</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
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
    minHeight: 400,
    maxHeight: '85%',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: theme.card,
  },
  cardBack: {
    backgroundColor: theme.surfaceAlt,
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
    color: theme.primary,
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
    backgroundColor: theme.primaryLight,
  },
  masteryBadgeLearning: {
    backgroundColor: theme.warningBg,
  },
  masteryBadgeMastered: {
    backgroundColor: theme.successBg,
  },
  masteryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.text,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.textSecondary,
    lineHeight: 20,
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
  termText: {
    fontSize: 28,
    lineHeight: 38,
    color: theme.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    paddingVertical: 16,
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
  learningInfo: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  learningInfoText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginVertical: 2,
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
  actionsScroll: { flex: 1 },
  actionsContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 4,
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
    borderColor: theme.success,
    backgroundColor: theme.successBg,
  },
  actionButtonDidnt: {
    borderColor: theme.warning,
    backgroundColor: theme.warningBg,
  },
  actionButtonSave: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
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
});

