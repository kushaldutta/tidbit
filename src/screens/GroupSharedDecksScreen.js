import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { GroupService } from '../services/GroupService';
import { AuthService } from '../services/AuthService';
import { ModerationService } from '../services/ModerationService';
import { ReportService } from '../services/ReportService';
import { BlockService } from '../services/BlockService';
import { DeckVoteService } from '../services/DeckVoteService';
import { DeckService } from '../services/DeckService';
import SharedDeckRow from '../components/SharedDeckRow';
import ModerationReasonModal from '../components/ModerationReasonModal';
import ReportContentModal from '../components/ReportContentModal';

export default function GroupSharedDecksScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { groupId, classId, code, title } = route.params;
  const myUserId = AuthService.getUserId();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [votingDeckId, setVotingDeckId] = useState(null);
  const [savingDeckId, setSavingDeckId] = useState(null);
  const [modTarget, setModTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const sortedDecks = useMemo(
    () => DeckVoteService.sortDecksByUpvotes(decks),
    [decks]
  );

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dk, blockedIds] = await Promise.all([
        GroupService.getGroupDecks(groupId),
        BlockService.getBlockedUserIds(),
      ]);
      setDecks(BlockService.filterDecks(dk, blockedIds));
    } catch (e) {
      console.warn('[GroupSharedDecksScreen] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useFocusEffect(
    useCallback(() => {
      ModerationService.isModerator().then(setIsModerator);
    }, [])
  );

  const handleVote = async (deck, vote) => {
    const prevVote = deck.myVote ?? 0;
    const delta = DeckVoteService.voteDeltaFromToggle(prevVote, vote);
    const optimistic = DeckVoteService.applyVoteChange(deck, delta);

    setVotingDeckId(deck.id);
    setDecks((prev) => {
      const next = prev.map((d) => (d.id === deck.id ? optimistic : d));
      return DeckVoteService.sortDecksByUpvotes(next);
    });

    try {
      await DeckVoteService.setVote(deck.id, groupId, vote);
    } catch (e) {
      load();
      Alert.alert('Could not vote', e.message || 'Try again.');
    } finally {
      setVotingDeckId(null);
    }
  };

  const handleStudyDeck = (deck) => {
    navigation.navigate('GroupDeckStudy', {
      deckId: deck.id,
      deckTitle: deck.title,
      classId,
    });
  };

  const handleSaveDeck = async (deck) => {
    setSavingDeckId(deck.id);
    try {
      await DeckService.copyDeckToMyDecks(deck.id);
      Alert.alert(
        'Saved to My Decks',
        `"${deck.title}" was copied to your decks. You can edit it and enable notifications in Settings.`
      );
    } catch (e) {
      Alert.alert('Could not save deck', e.message || 'Try again.');
    } finally {
      setSavingDeckId(null);
    }
  };

  const openModDeck = (deck) => {
    setModTarget({
      deckId: deck.id,
      deckTitle: deck.title,
    });
  };

  const openReportDeck = (deck) => setReportTarget(deck);

  const handleReportSubmit = async ({ category, details }) => {
    try {
      await ReportService.submitDeckReport(reportTarget, groupId, { category, details });
      setReportTarget(null);
      Alert.alert(
        'Report submitted',
        'Thanks for helping keep Tidbit safe. Our team will review this.'
      );
    } catch (e) {
      Alert.alert('Could not submit report', e.message || 'Try again.');
      throw e;
    }
  };

  const handleModConfirm = async (reason) => {
    try {
      await ModerationService.removeDeckFromGroup(
        modTarget.deckId,
        groupId,
        reason
      );
      setDecks((prev) => prev.filter((d) => d.id !== modTarget.deckId));
      setModTarget(null);
    } catch (e) {
      Alert.alert('Could not remove', e.message || 'Try again.');
      load();
      throw e;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {sortedDecks.length} shared deck{sortedDecks.length !== 1 ? 's' : ''} · ranked by upvotes
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />
      ) : (
        <FlatList
          data={sortedDecks}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <SharedDeckRow
              deck={item}
              myUserId={myUserId}
              isModerator={isModerator}
              onVote={handleVote}
              onStudy={handleStudyDeck}
              onReport={openReportDeck}
              onModRemove={openModDeck}
              onSave={handleSaveDeck}
              voting={votingDeckId}
              saving={savingDeckId}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No shared decks yet</Text>
              <Text style={styles.emptySubtext}>
                Open a deck you created and share it with this group.
              </Text>
            </View>
          }
        />
      )}

      <ModerationReasonModal
        visible={!!modTarget}
        title="Remove deck from class?"
        description={`"${modTarget?.deckTitle || 'This deck'}" will be hidden from this class. The owner keeps their copy.`}
        confirmLabel="Remove deck"
        onClose={() => setModTarget(null)}
        onConfirm={handleModConfirm}
      />

      <ReportContentModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.card },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#6366f1', fontWeight: '600' },
  code: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.textSecondary },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 },
});
