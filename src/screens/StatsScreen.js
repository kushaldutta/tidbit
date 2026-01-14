import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import SavedTidbitsViewer from '../components/SavedTidbitsViewer';
import MasteredTidbitsViewer from '../components/MasteredTidbitsViewer';
import DueTidbitsViewer from '../components/DueTidbitsViewer';

export default function StatsScreen() {
  const [stats, setStats] = useState({
    tidbitsSeen: 0,
    dailyUnlocks: 0,
    dailyTidbits: 0,
    mastered: 0,
    due: 0,
    saved: 0,
    learningStreak: 0,
  });
  const [showSavedViewer, setShowSavedViewer] = useState(false);
  const [showMasteredViewer, setShowMasteredViewer] = useState(false);
  const [showDueViewer, setShowDueViewer] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const tidbitsSeen = await StorageService.getTidbitsSeen();
    const dailyUnlocks = await StorageService.getDailyUnlocks();
    const dailyTidbits = await StorageService.getDailyTidbitCount();
    
    // Load spaced repetition stats
    const dueTidbits = await SpacedRepetitionService.getDueTidbits();
    const savedTidbits = await SpacedRepetitionService.getSavedTidbits();
    
    // Count mastered tidbits
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const allKeys = await AsyncStorage.getAllKeys();
    const spacedRepKeys = allKeys.filter(key => key.startsWith('spaced_repetition_'));
    
    let masteredCount = 0;
    let learningStreak = 0;
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
          if (state.masteryLevel === 'mastered') {
            masteredCount++;
          }
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
    learningStreak = 0;
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
    
    setStats({ 
      tidbitsSeen, 
      dailyUnlocks, 
      dailyTidbits,
      mastered: masteredCount,
      due: dueTidbits.length,
      saved: savedTidbits.length,
      learningStreak,
    });
  };

  const getStreakMessage = () => {
    if (stats.dailyTidbits === 0) {
      return "Start unlocking to see your first tidbit!";
    } else if (stats.dailyTidbits < 5) {
      return "Great start! Keep unlocking to learn more.";
    } else if (stats.dailyTidbits < 10) {
      return "You're on a roll! Learning something new every unlock.";
    } else if (stats.dailyTidbits < 15) {
      return "Impressive! You're building great learning habits.";
    } else {
      return "Amazing! You're a learning machine!";
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Stats</Text>
        <Text style={styles.subtitle}>Track your learning journey</Text>
      </View>

      <View style={styles.mainStatCard}>
        <Text style={styles.mainStatNumber}>{stats.tidbitsSeen}</Text>
        <Text style={styles.mainStatLabel}>Total Tidbits Learned</Text>
        <Text style={styles.mainStatSubtext}>
          Every unlock is a chance to learn something new
        </Text>
      </View>

      <View style={styles.dailyStatsContainer}>
        <View style={styles.dailyStatCard}>
          <Text style={styles.dailyStatNumber}>{stats.dailyTidbits}</Text>
          <Text style={styles.dailyStatLabel}>Tidbits Today</Text>
          <Text style={styles.dailyStatSubtext}>Out of 100 daily limit</Text>
        </View>
        <View style={styles.dailyStatCard}>
          <Text style={styles.dailyStatNumber}>{stats.dailyUnlocks}</Text>
          <Text style={styles.dailyStatLabel}>Phone Unlocks</Text>
          <Text style={styles.dailyStatSubtext}>Today</Text>
        </View>
      </View>

      <View style={styles.learningSection}>
        <Text style={styles.sectionTitle}>Learning Progress</Text>
        
        <View style={styles.learningStatsContainer}>
          <TouchableOpacity
            style={styles.learningStatCard}
            onPress={() => setShowMasteredViewer(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.learningStatNumber}>{stats.mastered}</Text>
            <Text style={styles.learningStatLabel}>Mastered</Text>
            <Text style={styles.learningStatSubtext}>Tidbits you know well</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.learningStatCard}
            onPress={() => setShowDueViewer(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.learningStatNumber}>{stats.due}</Text>
            <Text style={styles.learningStatLabel}>Due for Review</Text>
            <Text style={styles.learningStatSubtext}>Ready to review</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.learningStatsContainer}>
          <TouchableOpacity
            style={styles.learningStatCard}
            onPress={() => setShowSavedViewer(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.learningStatNumber}>{stats.saved}</Text>
            <Text style={styles.learningStatLabel}>Saved</Text>
            <Text style={styles.learningStatSubtext}>Your favorites</Text>
          </TouchableOpacity>
          <View style={styles.learningStatCard}>
            <Text style={styles.learningStatNumber}>{stats.learningStreak}</Text>
            <Text style={styles.learningStatLabel}>Day Streak</Text>
            <Text style={styles.learningStatSubtext}>Consecutive days</Text>
          </View>
        </View>
      </View>

      <View style={styles.messageCard}>
        <Text style={styles.messageText}>{getStreakMessage()}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About Your Stats</Text>
        <Text style={styles.infoText}>
          • Total Tidbits: All tidbits you've seen since installing Tidbit{'\n'}
          • Daily Limit: You can see up to 20 tidbits per day{'\n'}
          • Unlocks: Number of times you've unlocked your phone today{'\n'}
          • Stats reset daily at midnight
        </Text>
      </View>

      <SavedTidbitsViewer
        visible={showSavedViewer}
        onClose={() => setShowSavedViewer(false)}
      />
      <MasteredTidbitsViewer
        visible={showMasteredViewer}
        onClose={() => setShowMasteredViewer(false)}
      />
      <DueTidbitsViewer
        visible={showDueViewer}
        onClose={() => setShowDueViewer(false)}
      />
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
    marginBottom: 24,
    marginTop: 20,
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
  },
  mainStatCard: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainStatNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  mainStatLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainStatSubtext: {
    fontSize: 14,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  dailyStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dailyStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dailyStatNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  dailyStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  dailyStatSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  messageCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  messageText: {
    fontSize: 16,
    color: '#065f46',
    lineHeight: 24,
    fontWeight: '500',
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
  learningSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  learningStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  learningStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  learningStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  learningStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  learningStatSubtext: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
});

