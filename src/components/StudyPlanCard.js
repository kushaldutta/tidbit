import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function StudyPlanCard({ plan, onPress, isLoading }) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>📚 Today's Study Plan</Text>
        <Text style={styles.loadingText}>Generating your plan...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>📚 Today's Study Plan</Text>
        <Text style={styles.emptyText}>No plan available. Select categories to get started!</Text>
      </View>
    );
  }

  const isCompleted = plan.completed;
  const progressText = isCompleted
    ? `✅ Completed (${plan.completedCount}/${plan.totalCount})`
    : `${plan.completedCount}/${plan.totalCount} done`;

  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isCompleted}
    >
      <View style={styles.header}>
        <Text style={styles.title}>📚 Today's Study Plan</Text>
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.planText}>
        Do {plan.dueCount} due + {plan.newCount} new ({plan.estimatedMinutes} min)
      </Text>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(plan.completedCount / plan.totalCount) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{progressText}</Text>
      </View>

      {!isCompleted && (
        <TouchableOpacity style={styles.startButton} onPress={onPress}>
          <Text style={styles.startButtonText}>Start Session</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardCompleted: {
    backgroundColor: '#10b981',
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  startButton: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#e0e7ff',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#e0e7ff',
    fontStyle: 'italic',
  },
});

