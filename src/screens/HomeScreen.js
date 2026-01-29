import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { ContentService } from '../services/ContentService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { StudyPlanService } from '../services/StudyPlanService';
import StudyPlanCard from '../components/StudyPlanCard';
import CategoryProgressPreview from '../components/CategoryProgressPreview';
import { CategoryProgressService } from '../services/CategoryProgressService';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    tidbitsSeen: 0,
    dailyTidbits: 0,
    learningStreak: 0,
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(true);
  const [categoryProgress, setCategoryProgress] = useState([]);

  useEffect(() => {
    loadData();
    loadDevMode();
    loadStudyPlan();
    loadCategoryProgress();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
      loadDevMode();
      loadStudyPlan();
      loadCategoryProgress();
    });
    return unsubscribe;
  }, [navigation]);

  const loadDevMode = async () => {
    const enabled = await StorageService.getDevModeEnabled();
    setDevModeEnabled(enabled);
  };

  const loadStudyPlan = async () => {
    try {
      setStudyPlanLoading(true);
      const plan = await StudyPlanService.getDailyPlan();
      setStudyPlan(plan);
    } catch (error) {
      console.error('Error loading study plan:', error);
      setStudyPlan(null);
    } finally {
      setStudyPlanLoading(false);
    }
  };

  const handleStartStudySession = async () => {
    if (!studyPlan || studyPlan.completed) return;
    
    try {
      // Navigate to study session with plan tidbits
      navigation.navigate('StudySession', { tidbits: studyPlan.tidbits });
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  };

  const loadCategoryProgress = async () => {
    try {
      const progress = await CategoryProgressService.getSelectedCategoriesProgress();
      const sorted = CategoryProgressService.sortForHome(progress);
      setCategoryProgress(sorted.slice(0, 3));
    } catch (error) {
      console.error('Error loading category progress:', error);
      setCategoryProgress([]);
    }
  };

  const loadData = async () => {
    const tidbitsSeen = await StorageService.getTidbitsSeen();
    const dailyTidbits = await StorageService.getDailyTidbitCount();
    const selected = await StorageService.getSelectedCategories();
    const available = ContentService.getAvailableCategories();
    
    // Filter out invalid categories (categories that no longer exist)
    const availableIds = available.map(cat => cat.id);
    const validCategories = selected.filter(catId => availableIds.includes(catId));
    
    // If any invalid categories were removed, update storage
    if (validCategories.length !== selected.length) {
      await StorageService.setSelectedCategories(validCategories);
    }
    
    // Calculate learning streak (same logic as StatsScreen)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const allKeys = await AsyncStorage.getAllKeys();
    const spacedRepKeys = allKeys.filter(key => key.startsWith('spaced_repetition_'));
    
    const today = new Date().toDateString();
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toDateString());
    }
    
    const daysWithActivity = new Set();
    
    for (const key of spacedRepKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const state = JSON.parse(data);
          // Track learning streak (days with activity)
          if (state.lastSeen) {
            const lastSeenDate = new Date(state.lastSeen).toDateString();
            if (last7Days.includes(lastSeenDate)) {
              daysWithActivity.add(lastSeenDate);
            }
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    }
    
    // Calculate streak (consecutive days from today backwards)
    let learningStreak = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      if (daysWithActivity.has(dateStr)) {
        learningStreak++;
      } else if (i > 0) {
        // Break streak if we hit a day without activity (but today can be 0)
        break;
      }
    }
    
    setStats({ tidbitsSeen, dailyTidbits, learningStreak });
    setSelectedCategories(validCategories);
  };

  const handleGetTidbitNow = async () => {
    try {
      // Get a smart tidbit (prioritizes due tidbits for spaced repetition)
      const tidbit = await ContentService.getSmartTidbit();
      if (tidbit) {
        // Mark tidbit as shown (will mark as "shown as due" if it was due)
        const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
        if (tidbitWithId.id) {
          await SpacedRepetitionService.markTidbitAsShown(tidbitWithId.id);
        }
        
        // Trigger the tidbit modal by navigating with tidbit data
        // App.js will listen for this and show the modal
        navigation.navigate('Tidbit', { tidbit: tidbitWithId });
        
        // Count this as a tidbit seen (total + today)
        await StorageService.incrementTidbitsSeen();
        await StorageService.incrementDailyTidbitCount();

        // Update UI immediately (avoid waiting for navigation focus reload)
        setStats(prev => ({
          ...prev,
          tidbitsSeen: (prev.tidbitsSeen || 0) + 1,
          dailyTidbits: (prev.dailyTidbits || 0) + 1,
        }));
      }
    } catch (error) {
      console.error('Error getting tidbit:', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tidbit</Text>
        <Text style={styles.subtitle}>Learn something new with every unlock</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.tidbitsSeen}</Text>
          <Text style={styles.statLabel}>Total Tidbits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.dailyTidbits}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.learningStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      <StudyPlanCard
        plan={studyPlan}
        onPress={handleStartStudySession}
        isLoading={studyPlanLoading}
      />

      <CategoryProgressPreview
        items={categoryProgress}
        onViewAll={() => navigation.navigate('CategoryProgress')}
      />

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          Every time you unlock your phone, Tidbit shows you a quick, interesting fact
          from your selected categories. Each tidbit takes less than 3 seconds to read
          and can be dismissed instantly.
        </Text>
      </View>

      <View style={styles.categoriesPreview}>
        <Text style={styles.sectionTitle}>Your Categories</Text>
        {selectedCategories.length > 0 ? (
          <View style={styles.categoryTags}>
            {selectedCategories.map((cat) => (
              <View key={cat} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>
                  {ContentService.formatCategoryName(cat)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No categories selected</Text>
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={styles.buttonText}>Manage Categories</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.getTidbitButton]}
        onPress={handleGetTidbitNow}
      >
        <Text style={styles.buttonText}>Get Tidbit Now</Text>
      </TouchableOpacity>
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
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
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
  categoriesPreview: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryTag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  getTidbitButton: {
    marginTop: 16,
    marginBottom: 8,
  },
});

