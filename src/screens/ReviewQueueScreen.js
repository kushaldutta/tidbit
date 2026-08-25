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
import { QueueService, LEARN_SESSION_CARD_LIMIT } from '../services/QueueService';
import { ContentService } from '../services/ContentService';
import { StudyDeckService } from '../services/StudyDeckService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { iconSize } from '../theme/tokens';

function modeBreakdown(items) {
  let quiz = 0;
  let recall = 0;
  for (const item of items) {
    if (QueueService.modeForStage(item.stage) === 'quiz') quiz += 1;
    else recall += 1;
  }
  const parts = [];
  if (quiz > 0) parts.push(`${quiz} multiple choice`);
  if (recall > 0) parts.push(`${recall} recall`);
  return parts.join(' · ');
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

  const handleReviewAll = () => {
    navigation.navigate('ReviewSession', {
      mixedReview: true,
      deckTitle: 'Mixed Review',
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

  const sessionSize = Math.min(totalDue, LEARN_SESSION_CARD_LIMIT);

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
        {totalDue > 0 && (
          <Text style={styles.hint}>Terms stay hidden until you start a review.</Text>
        )}
      </View>

      {totalDue > 0 && (
        <View style={styles.reviewAllWrap}>
          <TouchableOpacity
            style={styles.reviewAllPrimary}
            onPress={handleReviewAll}
            activeOpacity={0.85}
          >
            <Text style={styles.reviewAllPrimaryText}>Review all</Text>
            <Text style={styles.reviewAllPrimarySub}>
              Up to {sessionSize} card{sessionSize !== 1 ? 's' : ''} across your classes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="check" size={iconSize.hero} color={theme.success} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>You're caught up on reviews.</Text>
          </View>
        ) : (
          groups.map((group) => {
            const breakdown = modeBreakdown(group.items);
            return (
              <View key={group.categoryId} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle}>{group.name}</Text>
                    <Text style={styles.groupCount}>
                      {group.items.length} due
                      {breakdown ? ` · ${breakdown}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => handleGroupReview(group)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  hint: { fontSize: 13, color: theme.textSecondary, marginTop: 6, fontStyle: 'italic' },
  reviewAllWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  reviewAllPrimary: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  reviewAllPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  reviewAllPrimarySub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary },
  groupCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  groupTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
  groupCount: { fontSize: 13, color: theme.textSecondary, marginTop: 4, lineHeight: 18 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewBtn: {
    backgroundColor: theme.primaryLight || theme.primary + '22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  reviewBtnText: { color: theme.primary, fontWeight: '700', fontSize: 14 },
});
