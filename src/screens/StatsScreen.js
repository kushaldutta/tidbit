import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StorageService } from '../services/StorageService';

export default function StatsScreen() {
  const [stats, setStats] = useState({
    tidbitsSeen: 0,
    dailyUnlocks: 0,
    dailyTidbits: 0,
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const tidbitsSeen = await StorageService.getTidbitsSeen();
    const dailyUnlocks = await StorageService.getDailyUnlocks();
    const dailyTidbits = await StorageService.getDailyTidbitCount();
    
    setStats({ tidbitsSeen, dailyUnlocks, dailyTidbits });
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
          <Text style={styles.dailyStatSubtext}>Out of 20 daily limit</Text>
        </View>
        <View style={styles.dailyStatCard}>
          <Text style={styles.dailyStatNumber}>{stats.dailyUnlocks}</Text>
          <Text style={styles.dailyStatLabel}>Phone Unlocks</Text>
          <Text style={styles.dailyStatSubtext}>Today</Text>
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
});

