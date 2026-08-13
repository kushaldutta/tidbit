import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ActionSheetIOS,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { GroupChallengeService } from '../services/GroupChallengeService';
import { ClassService } from '../services/ClassService';
import { AuthService } from '../services/AuthService';

function daysLeft(endDate) {
  const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Ended';
  if (diff === 1) return '1 day left';
  return `${diff} days left`;
}

function ProgressBar({ pct, theme }) {
  return (
    <View style={{ height: 10, backgroundColor: theme.border, borderRadius: 6, overflow: 'hidden', marginVertical: 6 }}>
      <View
        style={{
          height: 10,
          width: `${Math.min(pct, 100)}%`,
          backgroundColor: pct >= 100 ? '#10b981' : theme.accent,
          borderRadius: 6,
        }}
      />
    </View>
  );
}

function ChallengeCard({ challenge, progress, onContribute, theme, styles }) {
  const pct = progress?.pctComplete ?? 0;
  const total = progress?.totalProgress ?? 0;
  const goal = challenge.goalValue;
  const participants = progress?.participantCount ?? 0;

  return (
    <View style={styles.challengeCard}>
      <View style={styles.challengeHeader}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <Text style={styles.daysLeft}>{daysLeft(challenge.endDate)}</Text>
      </View>
      {challenge.description ? (
        <Text style={styles.challengeDesc}>{challenge.description}</Text>
      ) : null}

      <ProgressBar pct={pct} theme={theme} />

      <View style={styles.challengeStats}>
        <Text style={styles.progressLabel}>
          {total.toLocaleString()} / {goal.toLocaleString()}
          {' '}
          <Text style={styles.goalUnit}>{challenge.goalType === 'reviews' ? 'reviews' : challenge.goalType}</Text>
        </Text>
        <Text style={styles.participantLabel}>
          {participants} {participants === 1 ? 'contributor' : 'contributors'}
        </Text>
      </View>

      {pct < 100 && (
        <TouchableOpacity style={styles.contributeBtn} onPress={() => onContribute(challenge.id)}>
          <Text style={styles.contributeBtnText}>Study Now →</Text>
        </TouchableOpacity>
      )}
      {pct >= 100 && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>🎉 Goal Reached!</Text>
        </View>
      )}
    </View>
  );
}

export default function GroupChallengeScreen({ route, navigation }) {
  const { groupId, classId, classCode, classTitle } = route.params;
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [challenges, setChallenges] = useState([]);
  const [progresses, setProgresses] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedLeaderboard, setExpandedLeaderboard] = useState(null);

  // Track which challenge the user left to study for, so we can auto-contribute on return
  const pendingContribution = useRef(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGoal, setNewGoal] = useState('100');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await GroupChallengeService.getChallenges(groupId, { includeExpired: false });
    setChallenges(data);

    const progressMap = {};
    const lbMap = {};
    await Promise.all(
      data.map(async (c) => {
        progressMap[c.id] = await GroupChallengeService.getChallengeProgress(c.id);
        lbMap[c.id] = await GroupChallengeService.getLeaderboard(c.id);
      })
    );
    setProgresses(progressMap);
    setLeaderboard(lbMap);
    if (!silent) setLoading(false);
  }, [groupId]);

  useFocusEffect(useCallback(() => {
    // If the user just returned from a study session, log the contribution
    if (pendingContribution.current) {
      const { challengeId } = pendingContribution.current;
      pendingContribution.current = null;
      GroupChallengeService.contribute(challengeId, 1, 'study_session')
        .then(() => load(true));
    } else {
      load();
    }
  }, [load]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  /**
   * "Study Now" — shows an action sheet so the user picks a real study mode,
   * then navigates there. When they return, useFocusEffect logs the contribution.
   */
  const handleStudyNow = (challengeId) => {
    const categorySlug = classId ? ClassService.getCategoryForClass(classId) : null;
    const hasDailyChallenge = Boolean(categorySlug);

    const options = [
      { label: 'Study Shared Decks', action: () => navigateToStudy(challengeId, 'decks') },
      { label: 'Review Queue', action: () => navigateToStudy(challengeId, 'review') },
    ];
    if (hasDailyChallenge) {
      options.unshift({ label: "Today's Daily Challenge", action: () => navigateToStudy(challengeId, 'daily', { categorySlug }) });
    }

    const labels = [...options.map((o) => o.label), 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, title: 'Choose how to study' },
        (idx) => { if (idx < options.length) options[idx].action(); }
      );
    } else {
      Alert.alert(
        'Choose how to study',
        'Pick a study mode — your session will count toward the challenge.',
        [
          ...options.map((o) => ({ text: o.label, onPress: o.action })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const navigateToStudy = (challengeId, mode, extra = {}) => {
    pendingContribution.current = { challengeId };
    if (mode === 'daily') {
      navigation.navigate('DailyChallenge', {
        categorySlug: extra.categorySlug,
        categoryName: classTitle || classCode,
      });
    } else if (mode === 'review') {
      navigation.navigate('ReviewQueue');
    } else {
      navigation.navigate('GroupSharedDecks', {
        groupId,
        classId,
        code: classCode,
        title: classTitle,
      });
    }
  };

  const handleCreate = async () => {
    const trimTitle = newTitle.trim();
    if (!trimTitle) { Alert.alert('Title required'); return; }
    const goalNum = parseInt(newGoal, 10);
    if (!goalNum || goalNum < 1) { Alert.alert('Goal must be a positive number'); return; }

    setCreating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const endStr = end.toISOString().split('T')[0];

      await GroupChallengeService.createChallenge(groupId, {
        title: trimTitle,
        description: newDesc.trim() || null,
        goalType: 'reviews',
        goalValue: goalNum,
        startDate: today,
        endDate: endStr,
      });

      setShowCreateModal(false);
      setNewTitle(''); setNewDesc(''); setNewGoal('100');
      await load(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not create challenge.');
    } finally {
      setCreating(false);
    }
  };

  const myUserId = AuthService.getUserId();

  const renderItem = ({ item: challenge }) => {
    const progress = progresses[challenge.id] || null;
    const lb = leaderboard[challenge.id] || [];
    const isExpanded = expandedLeaderboard === challenge.id;

    return (
      <View style={styles.challengeSection}>
        <ChallengeCard
          challenge={challenge}
          progress={progress}
          onContribute={handleStudyNow}
          theme={theme}
          styles={styles}
        />

        <TouchableOpacity
          style={styles.leaderboardToggle}
          onPress={() => setExpandedLeaderboard(isExpanded ? null : challenge.id)}
        >
          <Text style={styles.leaderboardToggleText}>
            {isExpanded ? '▲ Hide leaderboard' : '▼ Class leaderboard'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.leaderboardCard}>
            {lb.length === 0 && (
              <Text style={styles.emptyLb}>No contributions yet — start studying!</Text>
            )}
            {lb.slice(0, 10).map((entry) => (
              <View key={entry.userId} style={styles.lbRow}>
                <Text style={[styles.lbRank, entry.rank <= 3 && styles.lbRankTop]}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </Text>
                <Text style={[styles.lbName, entry.userId === myUserId && styles.lbNameMe]}>
                  {entry.displayName}{entry.userId === myUserId ? ' (you)' : ''}
                </Text>
                <Text style={styles.lbTotal}>{entry.total}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{classCode} Challenges</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyTitle}>No active challenges</Text>
              <Text style={styles.emptySubtitle}>Create one to rally your classmates!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.emptyBtnText}>Create Challenge</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Challenge Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Challenge</Text>
            <TouchableOpacity onPress={handleCreate} disabled={creating}>
              {creating
                ? <ActivityIndicator size="small" color={theme.accent} />
                : <Text style={styles.modalSave}>Create</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Midterm Prep Week"
              placeholderTextColor={theme.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { height: 72 }]}
              placeholder="Motivate your class…"
              placeholderTextColor={theme.textSecondary}
              value={newDesc}
              onChangeText={setNewDesc}
              maxLength={280}
              multiline
            />

            <Text style={styles.fieldLabel}>Collective review goal</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="number-pad"
              value={newGoal}
              onChangeText={setNewGoal}
              maxLength={6}
            />
            <Text style={styles.fieldHint}>Challenge runs 7 days from today. All class members can contribute.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backBtn: { padding: 4 },
    backLabel: { fontSize: 16, color: theme.accent },
    headerTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    createBtn: {
      backgroundColor: theme.accent,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, gap: 16 },

    challengeSection: { gap: 4 },

    challengeCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 16,
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    challengeTitle: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1, marginRight: 8 },
    daysLeft: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    challengeDesc: { fontSize: 14, color: theme.textSecondary },
    challengeStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
    goalUnit: { fontWeight: '400', color: theme.textSecondary },
    participantLabel: { fontSize: 12, color: theme.textSecondary },

    contributeBtn: {
      marginTop: 6,
      backgroundColor: theme.accent,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    contributeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    completedBadge: {
      marginTop: 6,
      backgroundColor: '#d1fae5',
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    completedText: { color: '#065f46', fontSize: 14, fontWeight: '700' },

    leaderboardToggle: { paddingVertical: 6, paddingHorizontal: 4 },
    leaderboardToggleText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },

    leaderboardCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 12,
      gap: 10,
    },
    emptyLb: { fontSize: 13, color: theme.textSecondary, fontStyle: 'italic' },
    lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    lbRank: { width: 32, fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
    lbRankTop: { fontSize: 18 },
    lbName: { flex: 1, fontSize: 14, color: theme.text },
    lbNameMe: { fontWeight: '700', color: theme.accent },
    lbTotal: { fontSize: 14, fontWeight: '700', color: theme.text, minWidth: 36, textAlign: 'right' },

    emptyState: { alignItems: 'center', paddingTop: 64, gap: 10 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    emptySubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
    emptyBtn: {
      marginTop: 12,
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 11,
    },
    emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Modal
    modalRoot: { flex: 1, backgroundColor: theme.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    modalCancel: { fontSize: 16, color: theme.textSecondary },
    modalTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    modalSave: { fontSize: 16, color: theme.accent, fontWeight: '700' },
    modalBody: { padding: 20 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 16 },
    fieldInput: {
      backgroundColor: theme.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: theme.text,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    fieldHint: { fontSize: 12, color: theme.textSecondary, marginTop: 8 },
  });
}
