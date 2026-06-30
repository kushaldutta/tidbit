import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StudyPlanService } from '../services/StudyPlanService';
import { CardLearningService } from '../services/CardLearningService';
import { useTheme } from '../context/ThemeContext';

export default function StudyModeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    CardLearningService.getTotalDueCount().then(setDueCount);
  }, []);

  const startSession = async (durationMinutes) => {
    try {
      setIsGenerating(true);
      setError(null);

      const totalTidbits = Math.max(3, durationMinutes);
      const tidbits = await StudyPlanService.generateSessionTidbits(totalTidbits);

      if (!tidbits || tidbits.length === 0) {
        setError(
          'Not enough tidbits available. Try selecting more categories or seeing more tidbits first.'
        );
        setIsGenerating(false);
        return;
      }

      navigation.navigate('StudySession', { tidbits });
    } catch (e) {
      console.error('[STUDY_MODE] Error starting session:', e);
      setError('Something went wrong starting your session. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Study Mode</Text>
      <Text style={styles.subtitle}>
        Quiz, recall, and match from your decks, or run a focused review session.
      </Text>

      <View style={styles.learnSection}>
        <Text style={styles.learnSectionTitle}>Interactive Learn Modes</Text>
        <Text style={styles.learnSectionSub}>
          Quiz, Recall, and Match: study from your own decks or preset class decks
        </Text>
        <TouchableOpacity
          style={styles.learnBtn}
          onPress={() => navigation.navigate('LearnModePicker')}
          activeOpacity={0.85}
        >
          <Text style={styles.learnBtnEmoji}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.learnBtnLabel}>Start Learning</Text>
            <Text style={styles.learnBtnSub}>Quiz · Recall · Match</Text>
          </View>
          <Text style={styles.learnBtnArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.reviewBtn}
        onPress={() => navigation.navigate('ReviewQueue')}
        activeOpacity={0.85}
      >
        <Text style={styles.reviewBtnEmoji}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewBtnLabel}>Review Queue</Text>
          <Text style={styles.reviewBtnSub}>
            {dueCount > 0 ? `${dueCount} due now` : 'Nothing due — nice work'}
          </Text>
        </View>
        <Text style={styles.learnBtnArrow}>›</Text>
      </TouchableOpacity>

      <Text style={styles.focusedHeader}>Focused Sessions</Text>
      <Text style={styles.focusedSub}>
        Pick a session length. Tidbit will mix reviews you owe with new material.
      </Text>

      <View style={styles.optionsContainer}>
        <SessionOption
          label="Quick Session"
          description="5 tidbits · light review"
          onPress={() => startSession(5)}
          disabled={isGenerating}
        />
        <SessionOption
          label="Standard Session"
          description="10 tidbits · balanced"
          onPress={() => startSession(10)}
          disabled={isGenerating}
        />
        <SessionOption
          label="Focused Session"
          description="15 tidbits · deeper practice"
          onPress={() => startSession(15)}
          disabled={isGenerating}
        />
        <SessionOption
          label="Deep Session"
          description="30 tidbits · serious study"
          onPress={() => startSession(30)}
          disabled={isGenerating}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isGenerating && (
        <Text style={styles.loadingText}>Building your session...</Text>
      )}

      <TouchableOpacity
        style={styles.myDecksBtn}
        onPress={() => navigation.navigate('MyDecks')}
        activeOpacity={0.85}
      >
        <Text style={styles.myDecksEmoji}>📚</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.myDecksLabel}>My Decks</Text>
          <Text style={styles.myDecksSub}>Create, edit, and manage your flashcard decks</Text>
        </View>
        <Text style={styles.myDecksArrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SessionOption({ label, description, onPress, disabled }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      style={[styles.optionCard, disabled && styles.optionCardDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 24,
  },
  learnSection: {
    marginBottom: 28,
  },
  learnSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  learnSectionSub: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  learnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.primaryLight,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.accent,
  },
  learnBtnEmoji: { fontSize: 32 },
  learnBtnLabel: { fontSize: 17, fontWeight: '800', color: theme.primary, marginBottom: 2 },
  learnBtnSub: { fontSize: 13, color: theme.primary },
  learnBtnArrow: { fontSize: 28, color: theme.primary, fontWeight: '700' },
  focusedHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  focusedSub: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  errorText: {
    marginTop: 8,
    color: '#dc2626',
    fontSize: 14,
  },
  loadingText: {
    marginTop: 8,
    color: theme.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  myDecksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  myDecksEmoji: { fontSize: 28 },
  myDecksLabel: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 2 },
  myDecksSub: { fontSize: 13, color: theme.textSecondary },
  myDecksArrow: { fontSize: 24, color: theme.textSecondary, fontWeight: '700' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: theme.primaryLight || '#e5e7eb',
  },
  reviewBtnEmoji: { fontSize: 26, marginRight: 12 },
  reviewBtnLabel: { fontSize: 16, fontWeight: '800', color: theme.text },
  reviewBtnSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
});
