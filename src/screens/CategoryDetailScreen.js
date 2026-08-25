import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CategoryProgressService } from '../services/CategoryProgressService';
import { StudyPlanService } from '../services/StudyPlanService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

export default function CategoryDetailScreen({ route, navigation }) {
  const { categoryId } = route.params || {};
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
      const tidbits = await StudyPlanService.generateSessionTidbits(10, [categoryId]);
      if (!tidbits || tidbits.length === 0) {
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
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{progress.name}</Text>
            <Text style={styles.subtitle}>{progress.description || 'Your learning progress'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{masteryPercent}%</Text>
        <Text style={styles.statLabel}>Mastery</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

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

      {progress.due > 0 && (
        <View style={styles.dueCard}>
          <Text style={styles.dueTitle}>{progress.due} tidbits due for review</Text>
          <Text style={styles.dueSubtext}>Time to review what you've learned!</Text>
        </View>
      )}

      <TouchableOpacity style={styles.studyButton} onPress={handleStudyCategory}>
        <Text style={styles.studyButtonText}>Study this category</Text>
      </TouchableOpacity>

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

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginTop: 36,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 18,
    color: theme.text,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  statCard: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: theme.primary,
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
    backgroundColor: theme.card,
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
    color: theme.primary,
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dueCard: {
    backgroundColor: theme.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  dueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  dueSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  studyButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: theme.primary,
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
    backgroundColor: theme.card,
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
    color: theme.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.textSecondary,
  },
  loadingText: {
    marginTop: 32,
    color: theme.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 32,
    color: theme.textSecondary,
    textAlign: 'center',
  },
});
