import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function ProgressRow({ item, onPress, styles }) {
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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
            styles={styles}
            onPress={() => onCategoryPress?.(item.categoryId)}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>No categories selected.</Text>
      )}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.card,
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
  title: { fontSize: 18, fontWeight: '600', color: theme.text },
  viewAll: { fontSize: 14, fontWeight: '600', color: theme.primary },
  row: { marginTop: 10 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
  rowRight: { fontSize: 12, color: theme.textSecondary },
  progressBar: {
    height: 6,
    backgroundColor: theme.primaryLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.primary },
  emptyText: { marginTop: 8, color: theme.textSecondary, fontStyle: 'italic' },
});
