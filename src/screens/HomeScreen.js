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

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    tidbitsSeen: 0,
    dailyUnlocks: 0,
    dailyTidbits: 0,
  });
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const tidbitsSeen = await StorageService.getTidbitsSeen();
    const dailyUnlocks = await StorageService.getDailyUnlocks();
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
    
    setStats({ tidbitsSeen, dailyUnlocks, dailyTidbits });
    setSelectedCategories(validCategories);
  };

  const handleTestTidbit = async () => {
    const tidbit = await ContentService.getRandomTidbit();
    if (tidbit) {
      // Navigate to a test modal or show it
      // For now, we'll just show an alert or you can trigger the modal from App.js
      console.log('Test tidbit:', tidbit);
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
          <Text style={styles.statNumber}>{stats.dailyUnlocks}</Text>
          <Text style={styles.statLabel}>Unlocks</Text>
        </View>
      </View>

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
        style={[styles.button, styles.testButton]}
        onPress={handleTestTidbit}
      >
        <Text style={styles.testButtonText}>Test Tidbit (Dev)</Text>
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
  testButton: {
    backgroundColor: '#f3f4f6',
    marginTop: 8,
  },
  testButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
});

