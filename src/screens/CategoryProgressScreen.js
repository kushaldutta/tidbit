import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CategoryProgressService } from '../services/CategoryProgressService';

function ProgressCard({ item, onPress }) {
  const progress = item.total > 0 ? item.mastered / item.total : 0;
  const progressWidth = `${Math.min(100, Math.max(0, progress * 100))}%`;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardPercent}>{item.masteryPercent}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Mastered: {item.mastered}/{item.total}</Text>
        <Text style={styles.metaText}>Due: {item.due}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CategoryProgressScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const progress = await CategoryProgressService.getSelectedCategoriesProgress();
        const sorted = CategoryProgressService.sortForHome(progress);
        setItems(sorted);
      } finally {
        setLoading(false);
      }
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Category Progress</Text>
        <Text style={styles.subtitle}>See how you’re doing in each class/category</Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>Select some categories to start tracking progress.</Text>
      ) : (
        items.map((item) => (
          <ProgressCard 
            key={item.categoryId} 
            item={item} 
            onPress={() => navigation.navigate('CategoryDetail', { categoryId: item.categoryId })}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  header: { marginTop: 12, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  loadingText: { marginTop: 16, color: '#6b7280', fontStyle: 'italic' },
  emptyText: { marginTop: 16, color: '#6b7280' },
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  cardPercent: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: '#6366f1' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: '#6b7280' },
});


