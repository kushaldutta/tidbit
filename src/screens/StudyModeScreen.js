import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StudyPlanService } from '../services/StudyPlanService';

export default function StudyModeScreen({ navigation }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const startSession = async (durationMinutes) => {
    try {
      setIsGenerating(true);
      setError(null);

      // Simple heuristic: ~1 tidbit per minute
      const totalTidbits = Math.max(3, durationMinutes); // ensure at least a few
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Study Mode</Text>
      <Text style={styles.subtitle}>
        Pick a focused session length. Tidbit will mix reviews you owe with new material.
      </Text>

      <View style={styles.optionsContainer}>
        <SessionOption
          label="Quick Session"
          description="5 minutes · light review"
          onPress={() => startSession(5)}
          disabled={isGenerating}
        />
        <SessionOption
          label="Standard Session"
          description="10 minutes · balanced"
          onPress={() => startSession(10)}
          disabled={isGenerating}
        />
        <SessionOption
          label="Focused Session"
          description="15 minutes · deeper practice"
          onPress={() => startSession(15)}
          disabled={isGenerating}
        />
        <SessionOption
          label="Deep Session"
          description="20 minutes · serious study"
          onPress={() => startSession(20)}
          disabled={isGenerating}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isGenerating && (
        <Text style={styles.loadingText}>Building your session...</Text>
      )}
    </ScrollView>
  );
}

function SessionOption({ label, description, onPress, disabled }) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 8,
    color: '#dc2626',
    fontSize: 14,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
