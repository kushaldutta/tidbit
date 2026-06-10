import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CategoryProgressService } from '../services/CategoryProgressService';
import { ClassService } from '../services/ClassService';
import { useTheme } from '../context/ThemeContext';

function ProgressCard({ item, onPress, styles }) {
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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await ClassService.ensureCategoriesSyncedToEnrollments();
        const progress = await CategoryProgressService.getEnrollmentCategoriesProgress();
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
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Category Progress</Text>
            <Text style={styles.subtitle}>See how you’re doing in each class/category</Text>
          </View>
        </View>
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
            styles={styles}
            onPress={() => navigation.navigate('CategoryDetail', { categoryId: item.categoryId })}
          />
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20 },
  header: { marginTop: 36, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
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
  headerText: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: theme.textSecondary },
  loadingText: { marginTop: 16, color: theme.textSecondary, fontStyle: 'italic' },
  emptyText: { marginTop: 16, color: theme.textSecondary },
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  cardPercent: { fontSize: 16, fontWeight: '700', color: theme.primary },
  progressBar: {
    height: 8,
    backgroundColor: theme.primaryLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: theme.primary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: theme.textSecondary },
});
