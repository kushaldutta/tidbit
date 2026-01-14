import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { ContentService } from '../services/ContentService';

const { width } = Dimensions.get('window');

export default function SavedTidbitsViewer({ visible, onClose }) {
  const [savedTidbits, setSavedTidbits] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      loadSavedTidbits();
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Reset animations when closing
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setCurrentIndex(0);
    }
  }, [visible]);

  const loadSavedTidbits = async () => {
    try {
      setLoading(true);
      const savedTidbitIds = await SpacedRepetitionService.getSavedTidbits();
      
      // Fetch full tidbit objects
      const tidbits = [];
      for (const tidbitId of savedTidbitIds) {
        const tidbit = await ContentService.getTidbitById(tidbitId, false);
        if (tidbit) {
          tidbits.push(tidbit);
        }
      }
      
      setSavedTidbits(tidbits);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading saved tidbits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < savedTidbits.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClose = () => {
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
      onClose();
    });
  };

  if (!visible) return null;

  const currentTidbit = savedTidbits[currentIndex];
  const categoryName = currentTidbit?.category
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || '';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
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
            onPress={(e) => e.stopPropagation()}
            style={styles.cardContainer}
            activeOpacity={1}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Saved Tidbits</Text>
                  <Text style={styles.count}>
                    {savedTidbits.length > 0 ? `${currentIndex + 1} / ${savedTidbits.length}` : '0'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.content}>
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : savedTidbits.length === 0 ? (
                <View style={styles.content}>
                  <Text style={styles.emptyText}>No saved tidbits yet</Text>
                  <Text style={styles.emptySubtext}>
                    Save tidbits you like to view them here
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.categoryLabel}>{categoryName}</Text>
                  <ScrollView 
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={true}
                  >
                    <Text style={styles.tidbitText}>
                      {currentTidbit?.text || ''}
                    </Text>
                  </ScrollView>

                  <View style={styles.navigation}>
                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        currentIndex === 0 && styles.navButtonDisabled,
                      ]}
                      onPress={handlePrevious}
                      disabled={currentIndex === 0}
                    >
                      <Text style={[
                        styles.navButtonText,
                        currentIndex === 0 && styles.navButtonTextDisabled,
                      ]}>
                        ← Previous
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        currentIndex === savedTidbits.length - 1 && styles.navButtonDisabled,
                      ]}
                      onPress={handleNext}
                      disabled={currentIndex === savedTidbits.length - 1}
                    >
                      <Text style={[
                        styles.navButtonText,
                        currentIndex === savedTidbits.length - 1 && styles.navButtonTextDisabled,
                      ]}>
                        Next →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
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
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
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
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
    lineHeight: 24,
  },
  scrollContent: {
    height: 280,
    marginBottom: 16,
  },
  scrollContentContainer: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  tidbitText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
});

