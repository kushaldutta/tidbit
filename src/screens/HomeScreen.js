import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  DeviceEventEmitter,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageService } from '../services/StorageService';
import { ContentService } from '../services/ContentService';
import { CardLearningService } from '../services/CardLearningService';
import { StudyPlanService } from '../services/StudyPlanService';
import StudyPlanCard from '../components/StudyPlanCard';
import CategoryProgressPreview from '../components/CategoryProgressPreview';
import { CategoryProgressService } from '../services/CategoryProgressService';
import { GroupService } from '../services/GroupService';
import { ClassService } from '../services/ClassService';
import { AuthService } from '../services/AuthService';
import { SameBoatService } from '../services/SameBoatService';
import { InsightsService } from '../services/InsightsService';
import { DailyChallengeService } from '../services/DailyChallengeService';
import { useTheme } from '../context/ThemeContext';
import CoinBalanceChip from '../components/CoinBalanceChip';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({
    tidbitsSeen: 0,
    dailyTidbits: 0,
    learningStreak: 0,
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(true);
  const [categoryProgress, setCategoryProgress] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [challengeClasses, setChallengeClasses] = useState([]);
  const [homeInsight, setHomeInsight] = useState(null);
  const [upcomingExam, setUpcomingExam] = useState(null);

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
    const statsSub = DeviceEventEmitter.addListener('statsUpdated', () => {
      loadData();
    });
    return () => {
      unsubscribe();
      statsSub.remove();
    };
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
    if (!studyPlan.tidbits?.length) {
      Alert.alert(
        'No tidbits available',
        'Select classes with tidbit content and refresh in Settings, then try again.'
      );
      return;
    }

    try {
      navigation.navigate('StudySession', { tidbits: studyPlan.tidbits, fromDailyPlan: true });
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  };

  const loadCategoryProgress = async () => {
    try {
      await ClassService.ensureCategoriesSyncedToEnrollments();
      const progress = await CategoryProgressService.getEnrollmentCategoriesProgress();
      const sorted = CategoryProgressService.sortForHome(progress);
      setCategoryProgress(sorted.slice(0, 3));
    } catch (error) {
      console.error('Error loading category progress:', error);
      setCategoryProgress([]);
    }
  };

  const loadData = async () => {
    // Load groups in background — don't block the rest of the screen
    GroupService.getMyGroups().then(setGroups).catch(() => {});

    const classIds = await ClassService.getMyClassIds();
    await ClassService.ensureCategoriesSyncedToEnrollments();
    if (classIds.length > 0) {
      ClassService.getClassesByIds(classIds).then((classes) => {
        setEnrolledClasses(classes);
        setChallengeClasses(classes.filter((c) => ClassService.hasTidbitContent(c.id)));
        classes.forEach((c) => {
          const slug = ClassService.getCategoryForClass(c.id);
          if (slug) DailyChallengeService.claimAnyPendingCoins(slug).catch(() => {});
        });
      }).catch(() => { setEnrolledClasses([]); setChallengeClasses([]); });
    } else {
      setEnrolledClasses([]);
      setChallengeClasses([]);
    }

    const tidbitsSeen = await StorageService.getTidbitsSeen();
    const dailyTidbits = await StorageService.getDailyTidbitCount();
    const selected = await StorageService.getSelectedCategories();
    const available = ContentService.getAvailableCategories();
    const enrolledCategoryIds = await ClassService.getEnrollmentCategoryIds();
    
    // Filter out invalid categories (keep bundled catalog ids + enrolled class slugs)
    const availableIds = new Set([
      ...available.map((cat) => cat.id),
      ...enrolledCategoryIds,
    ]);
    const validCategories = selected.filter((catId) => availableIds.has(catId));
    
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
    
    // Today's quiz accuracy from card_attempts in AsyncStorage/Supabase
    let todayAccuracy = null;
    try {
      const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
      if (SUPABASE_CONFIGURED && AuthService) {
        const userId = AuthService.getUserId();
        if (userId) {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const { data: attempts } = await supabase
            .from('card_attempts')
            .select('was_correct')
            .eq('user_id', userId)
            .gte('attempted_at', todayStart.toISOString());
          if (attempts && attempts.length > 0) {
            const correct = attempts.filter(a => a.was_correct).length;
            todayAccuracy = Math.round((correct / attempts.length) * 100);
          }
        }
      }
    } catch {}

    setStats({ tidbitsSeen, dailyTidbits, learningStreak, todayAccuracy });
    setSelectedCategories(validCategories);
    const due = await CardLearningService.getTotalDueCount();
    setDueCount(due);
    SameBoatService.getHomeInsight().then(setHomeInsight).catch(() => {});
    InsightsService.getUpcomingExams().then((exams) => {
      setUpcomingExam(exams[0] || null);
    }).catch(() => {});
  };

  const handleGetTidbitNow = async () => {
    try {
      const tidbit = await ContentService.getDiscoveryTidbit();
      if (tidbit) {
        const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
        if (tidbitWithId.id) {
          await CardLearningService.markTidbitAsShown(tidbitWithId.id);
        }
        DeviceEventEmitter.emit('showTidbitNow', tidbitWithId);
      } else {
        Alert.alert(
          'No tidbit available',
          'Enroll in a class on the Categories tab to get started.',
        );
      }
    } catch (error) {
      console.error('Error getting tidbit:', error);
      Alert.alert('Something went wrong', 'Could not load a tidbit. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tidbit</Text>
          <Text style={styles.subtitle}>Study with your class</Text>
        </View>
        <CoinBalanceChip navigation={navigation} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{dueCount}</Text>
          <Text style={styles.statLabel}>Due</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.learningStreak}d</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {stats.todayAccuracy !== null && stats.todayAccuracy !== undefined
              ? `${stats.todayAccuracy}%`
              : '—'}
          </Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>

      {upcomingExam && (
        <TouchableOpacity
          style={styles.examBanner}
          onPress={() => navigation.navigate('Insights')}
          activeOpacity={0.85}
        >
          <Text style={styles.examBannerEmoji}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.examBannerTitle}>
              {upcomingExam.name} {upcomingExam.label}
            </Text>
            <Text style={styles.examBannerSub}>
              {upcomingExam.daysLeft < 0
                ? 'Passed — set your next exam in Insights'
                : upcomingExam.daysLeft === 0
                  ? 'Today'
                  : `${upcomingExam.daysLeft} day${upcomingExam.daysLeft === 1 ? '' : 's'} left`}
            </Text>
          </View>
          <Text style={styles.reviewQueueChevron}>›</Text>
        </TouchableOpacity>
      )}

      {homeInsight && (
        <TouchableOpacity
          style={styles.insightCard}
          onPress={() => navigation.navigate('ReviewQueue')}
          activeOpacity={0.85}
        >
          <Text style={styles.insightEmoji}>🛟</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightKicker}>
              {homeInsight.belowClass
                ? `${homeInsight.classCode} · you're behind the class`
                : `${homeInsight.classCode} struggles with`}
            </Text>
            <Text style={styles.insightTerm} numberOfLines={2}>{homeInsight.term}</Text>
            <Text style={styles.insightSub}>
              Class {homeInsight.classPct}% correct
              {homeInsight.yourPct != null ? ` · you ${homeInsight.yourPct}%` : ''}
            </Text>
          </View>
          <Text style={styles.reviewQueueChevron}>›</Text>
        </TouchableOpacity>
      )}

      <StudyPlanCard
        plan={studyPlan}
        onPress={handleStartStudySession}
        isLoading={studyPlanLoading}
      />

      <TouchableOpacity
        style={styles.reviewQueueCard}
        onPress={() => navigation.navigate('ReviewQueue')}
        activeOpacity={0.85}
      >
        <Text style={styles.reviewQueueEmoji}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewQueueTitle}>Review Queue</Text>
          <Text style={styles.reviewQueueSub}>
            {dueCount > 0
              ? `${dueCount} card${dueCount !== 1 ? 's' : ''} due for review`
              : 'All caught up — no reviews due'}
          </Text>
        </View>
        <Text style={styles.reviewQueueChevron}>›</Text>
      </TouchableOpacity>

      {challengeClasses.length > 0 && (
        <View style={styles.challengeSection}>
          <Text style={styles.sectionTitle}>Daily Challenge</Text>
          {challengeClasses.slice(0, 3).map((cls) => {
            const categorySlug = ClassService.getCategoryForClass(cls.id);
            if (!categorySlug) return null;
            return (
              <TouchableOpacity
                key={cls.id}
                style={styles.challengeCard}
                onPress={() => navigation.navigate('DailyChallenge', {
                  categorySlug,
                  categoryName: cls.code,
                })}
                activeOpacity={0.85}
              >
                <Text style={styles.challengeEmoji}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.challengeTitle}>{cls.code} Challenge</Text>
                  <Text style={styles.challengeSub}>10 questions · same for everyone today</Text>
                </View>
                <Text style={styles.challengeChevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <CategoryProgressPreview
        items={categoryProgress}
        onViewAll={() => navigation.navigate('CategoryProgress')}
        onCategoryPress={(categoryId) => navigation.navigate('CategoryDetail', { categoryId })}
      />

      <TouchableOpacity
        style={styles.myDecksCard}
        onPress={() => navigation.navigate('MyDecks')}
        activeOpacity={0.85}
      >
        <Text style={styles.myDecksEmoji}>📚</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.myDecksTitle}>My Decks</Text>
          <Text style={styles.myDecksSubtitle}>
            Create custom flashcard decks or browse presets
          </Text>
        </View>
        <Text style={styles.myDecksChevron}>›</Text>
      </TouchableOpacity>

      {groups.length > 0 && (
        <View style={styles.groupsSection}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.groupId}
              style={styles.groupCard}
              onPress={() => navigation.navigate('Group', g)}
              activeOpacity={0.8}
            >
              <View style={styles.groupLeft}>
                <View style={styles.groupIconCircle}>
                  <Text style={styles.groupIconText}>
                    {g.code.split(' ')[0].charAt(0)}
                  </Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupCode}>{g.code}</Text>
                  <Text style={styles.groupTitle} numberOfLines={1}>{g.title}</Text>
                </View>
              </View>
              <View style={styles.groupRight}>
                <Text style={styles.groupCount}>
                  👥 {g.memberCount}
                </Text>
                <Text style={styles.groupChevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.feedEntryBtn}
            onPress={() => navigation.navigate('Feed')}
            activeOpacity={0.8}
          >
            <Text style={styles.feedEntryEmoji}>📰</Text>
            <View style={styles.feedEntryInfo}>
              <Text style={styles.feedEntryTitle}>Class Feed</Text>
              <Text style={styles.feedEntrySubtitle}>Posts, shared decks & activity from your groups</Text>
            </View>
            <Text style={styles.feedEntryChevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.categoriesPreview}>
        <Text style={styles.sectionTitle}>
          {enrolledClasses.length > 0 ? 'Your Classes' : 'Your Categories'}
        </Text>
        {enrolledClasses.length > 0 ? (
          <View style={styles.categoryTags}>
            {enrolledClasses.map((cls) => (
              <View key={cls.id} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{cls.code}</Text>
              </View>
            ))}
          </View>
        ) : selectedCategories.length > 0 ? (
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
          <Text style={styles.emptyText}>No classes selected</Text>
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={styles.buttonText}>Manage Classes</Text>
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

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  myDecksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  myDecksEmoji: { fontSize: 32, marginRight: 14 },
  myDecksTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  myDecksSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  myDecksChevron: { fontSize: 28, color: '#9ca3af', marginLeft: 8 },

  groupsSection: { marginTop: 20 },
  feedEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: theme.accent,
  },
  feedEntryEmoji: { fontSize: 22, marginRight: 12 },
  feedEntryInfo: { flex: 1 },
  feedEntryTitle: { fontSize: 15, fontWeight: '700', color: theme.primary },
  feedEntrySubtitle: { fontSize: 12, color: theme.primary, marginTop: 2 },
  feedEntryChevron: { fontSize: 20, color: theme.primary, marginLeft: 8 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  groupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupIconText: { fontSize: 18, fontWeight: '700', color: theme.primary },
  groupInfo: { flex: 1 },
  groupCode: { fontSize: 15, fontWeight: '700', color: theme.text },
  groupTitle: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupCount: { fontSize: 13, color: theme.textSecondary },
  groupChevron: { fontSize: 20, color: '#9ca3af' },
  statCard: {
    flex: 1,
    backgroundColor: theme.card,
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
    color: theme.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesPreview: {
    backgroundColor: theme.card,
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
    color: theme.text,
    marginBottom: 12,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryTag: {
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.primary,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  button: {
    backgroundColor: theme.primary,
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
  reviewQueueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewQueueEmoji: { fontSize: 28, marginRight: 12 },
  reviewQueueTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  reviewQueueSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  reviewQueueChevron: { fontSize: 24, color: theme.textSecondary, fontWeight: '700' },

  examBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: theme.accent || '#c7d2fe',
  },
  examBannerEmoji: { fontSize: 24, marginRight: 12 },
  examBannerTitle: { fontSize: 15, fontWeight: '800', color: theme.text },
  examBannerSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#fdba74',
  },
  insightEmoji: { fontSize: 24, marginRight: 12 },
  insightKicker: { fontSize: 11, fontWeight: '800', color: '#9a3412', letterSpacing: 0.3, textTransform: 'uppercase' },
  insightTerm: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  insightSub: { fontSize: 12, color: '#9a3412', marginTop: 2 },

  challengeSection: { marginBottom: 16 },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight || '#eef2ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: theme.accent || '#a5b4fc',
  },
  challengeEmoji: { fontSize: 28, marginRight: 12 },
  challengeTitle: { fontSize: 15, fontWeight: '800', color: theme.primary },
  challengeSub: { fontSize: 12, color: theme.primary, marginTop: 2, opacity: 0.75 },
  challengeChevron: { fontSize: 24, color: theme.primary, fontWeight: '700' },
});

