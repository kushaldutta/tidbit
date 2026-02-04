import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CategoryProgressService } from '../services/CategoryProgressService';
import { ContentService } from '../services/ContentService';
import { StudyPlanService } from '../services/StudyPlanService';

export default function CategoryDetailScreen({ route, navigation }) {
  const { categoryId } = route.params || {};
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      loadProgress();
    }
  }, [categoryId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await CategoryProgressService.getCategoryProgress(categoryId);
      setProgress(data);
    } catch (error) {
      console.error('[CATEGORY_DETAIL] Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudyCategory = async () => {
    if (!categoryId) return;
    
    try {
      // Generate a session filtered to this category
      const tidbits = await StudyPlanService.generateSessionTidbits(10, [categoryId]);
      
      if (!tidbits || tidbits.length === 0) {
        // Show error or fallback
        return;
      }

      navigation.navigate('StudySession', { tidbits });
    } catch (error) {
      console.error('[CATEGORY_DETAIL] Error starting study session:', error);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.loadingText}>Loading...</Text>
      </ScrollView>
    );
  }

  if (!progress) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.emptyText}>Category not found.</Text>
      </ScrollView>
    );
  }

  const masteryPercent = progress.total > 0 ? Math.round((progress.mastered / progress.total) * 100) : 0;
  const progressWidth = `${Math.min(100, Math.max(0, masteryPercent))}%`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{progress.name}</Text>
        <Text style={styles.subtitle}>{progress.description || 'Your learning progress'}</Text>
      </View>

      {/* Mastery Card */}
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{masteryPercent}%</Text>
        <Text style={styles.statLabel}>Mastery</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxNumber}>{progress.total}</Text>
          <Text style={styles.statBoxLabel}>Total Tidbits</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxNumber}>{progress.seen}</Text>
          <Text style={styles.statBoxLabel}>Seen</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxNumber}>{progress.mastered}</Text>
          <Text style={styles.statBoxLabel}>Mastered</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxNumber}>{progress.learning}</Text>
          <Text style={styles.statBoxLabel}>Learning</Text>
        </View>
      </View>

      {/* Due Section */}
      {progress.due > 0 && (
        <View style={styles.dueCard}>
          <Text style={styles.dueTitle}>📋 {progress.due} tidbits due for review</Text>
          <Text style={styles.dueSubtext}>Time to review what you've learned!</Text>
        </View>
      )}

      {/* Study Button */}
      <TouchableOpacity style={styles.studyButton} onPress={handleStudyCategory}>
        <Text style={styles.studyButtonText}>📚 Study This Category</Text>
      </TouchableOpacity>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About This Category</Text>
        <Text style={styles.infoText}>
          Mastery is calculated based on tidbits you've marked as "I knew it" 3+ times in a row.
          Keep reviewing to increase your mastery percentage!
        </Text>
      </View>
    </ScrollView>
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
  header: {
    marginTop: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statCard: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statBoxNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dueCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  dueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  dueSubtext: {
    fontSize: 14,
    color: '#78350f',
  },
  studyButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  studyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },
  loadingText: {
    marginTop: 32,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 32,
    color: '#6b7280',
    textAlign: 'center',
  },
});

