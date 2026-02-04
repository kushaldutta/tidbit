import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

function ProgressRow({ item, onPress }) {
  const progress = item.total > 0 ? item.mastered / item.total : 0;
  const progressWidth = `${Math.min(100, Math.max(0, progress * 100))}%`;

  return (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowRight}>
          {item.due > 0 ? `${item.due} due · ` : ''}
          {item.masteryPercent}%
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </TouchableOpacity>
  );
}

export default function CategoryProgressPreview({ items, onViewAll, onCategoryPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {items?.length ? (
        items.map((item) => (
          <ProgressRow 
            key={item.categoryId} 
            item={item} 
            onPress={() => onCategoryPress?.(item.categoryId)}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>No categories selected.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  viewAll: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  row: { marginTop: 10 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  rowRight: { fontSize: 12, color: '#6b7280' },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#6366f1' },
  emptyText: { marginTop: 8, color: '#6b7280', fontStyle: 'italic' },
});


