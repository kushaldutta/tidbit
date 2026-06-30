import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { QueueService } from '../services/QueueService';
import { ContentService } from '../services/ContentService';
import { StudyDeckService } from '../services/StudyDeckService';
import { useTheme } from '../context/ThemeContext';

function stageLabel(stage) {
  return QueueService.modeForStage(stage) === 'quiz' ? 'Multiple choice' : 'Recall';
}

export default function ReviewQueueScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [groups, setGroups] = useState([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grouped = await QueueService.getReviewQueueGrouped();
      setGroups(grouped);
      setTotalDue(grouped.reduce((sum, g) => sum + g.items.length, 0));
    } catch (e) {
      console.warn('[ReviewQueue] load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleItem = async (item, categoryId) => {
    const deckId = await ContentService.getPresetDeckIdForSlug(categoryId);
    if (deckId) {
      const studyScope = await StudyDeckService.resolveStudyScope(deckId);
      navigation.navigate('ReviewSession', {
        deckId,
        deckTitle: ContentService.formatCategoryName(categoryId),
        studyScope,
        categoryId,
        startCardId: item.tidbit.id,
      });
      return;
    }
    navigation.navigate('StudySession', {
      tidbits: [ContentService.ensureTidbitHasId(item.tidbit)],
    });
  };

  const handleGroupReview = async (group) => {
    const deckId = await ContentService.getPresetDeckIdForSlug(group.categoryId);
    if (!deckId) return;
    const studyScope = await StudyDeckService.resolveStudyScope(deckId);
    navigation.navigate('ReviewSession', {
      deckId,
      deckTitle: group.name,
      studyScope,
      categoryId: group.categoryId,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Queue</Text>
        <Text style={styles.subtitle}>
          {totalDue === 0
            ? 'Nothing due right now — great job!'
            : `${totalDue} card${totalDue !== 1 ? 's' : ''} due for review`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✓</Text>
            <Text style={styles.emptyText}>You're caught up on reviews.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.categoryId} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupTitle}>{group.name}</Text>
                  <Text style={styles.groupCount}>{group.items.length} due</Text>
                </View>
                <TouchableOpacity
                  style={styles.reviewAllBtn}
                  onPress={() => handleGroupReview(group)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reviewAllText}>Review all</Text>
                </TouchableOpacity>
              </View>
              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.tidbit.id}
                  style={styles.itemRow}
                  onPress={() => handleItem(item, group.categoryId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTerm} numberOfLines={1}>
                      {item.tidbit.term || item.tidbit.text}
                    </Text>
                    <Text style={styles.itemMode}>{stageLabel(item.stage)}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingBottom: 8 },
  back: { fontSize: 16, color: theme.primary, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary },
  groupCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  groupTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
  groupCount: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewAllBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reviewAllText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.primaryLight || '#eee',
  },
  itemBody: { flex: 1 },
  itemTerm: { fontSize: 15, fontWeight: '600', color: theme.text },
  itemMode: { fontSize: 12, color: theme.primary, marginTop: 2, fontWeight: '600' },
  chevron: { fontSize: 22, color: theme.textSecondary },
});
