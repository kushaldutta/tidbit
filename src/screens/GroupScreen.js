import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { GroupService } from '../services/GroupService';
import { FeedService } from '../services/FeedService';
import { SameBoatService } from '../services/SameBoatService';
import { AuthService } from '../services/AuthService';
import { ModerationService } from '../services/ModerationService';
import ModerationReasonModal from '../components/ModerationReasonModal';
import ReportContentModal from '../components/ReportContentModal';
import SharedDeckRow from '../components/SharedDeckRow';
import CommentThread from '../components/CommentThread';
import { ReportService } from '../services/ReportService';
import { BlockService } from '../services/BlockService';
import { DeckVoteService } from '../services/DeckVoteService';
import { DeckService } from '../services/DeckService';
import { ClassService } from '../services/ClassService';
import { BuddyService } from '../services/BuddyService';
import { GroupChallengeService } from '../services/GroupChallengeService';
import { InsightsService } from '../services/InsightsService';
import SectionPickerModal from '../components/SectionPickerModal';
import ExamDateModal from '../components/ExamDateModal';
import { useTheme } from '../context/ThemeContext';

// ─── helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  return `${Math.floor(diff / 86400)}d ago`;
}

function postBodyText(post) {
  const { postType, payload } = post;
  if (postType === 'note') return payload.text || '';
  if (postType === 'activity') return payload.text || 'did something awesome';
  if (postType === 'deck_share') return `shared a deck: "${payload.deckTitle || 'Untitled'}"`;
  if (postType === 'dumb_question') return payload.text || '';
  return payload.text || '';
}

const REACTION_EMOJIS = ['👍', '❤️', '🔥'];
const TOP_DECKS_VISIBLE = 3;
const CLASSMATES_VIEW_ALL_MIN = 5;

// ─── sub-components ─────────────────────────────────────────────────────────

const avatarStyles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
});

function Avatar({ name, size = 40 }) {
  const initials = name
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const bg = colors[initials.charCodeAt(0) % colors.length];
  return (
    <View style={[avatarStyles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[avatarStyles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function PostCard({ post, myUserId, isModerator, onReact, onDelete, onModerateRemove, onReport, onBlock }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const body = postBodyText(post);
  const isActivity = post.postType === 'activity';
  const canDelete = FeedService.canUserDeletePost(post, myUserId);
  const showModRemove = isModerator && !canDelete;
  const showReport = ReportService.canReportPost(post, myUserId);
  const showBlock = BlockService.canBlockUser(post.authorId, myUserId);

  const confirmDelete = () => {
    Alert.alert(
      'Delete post?',
      'This will remove your message from the class feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(post.id) },
      ]
    );
  };

  const hasMenu = canDelete || showModRemove || showReport || showBlock;

  const openMenu = () => {
    const options = [];
    const handlers = [];

    if (canDelete) {
      options.push('Delete');
      handlers.push(confirmDelete);
    }
    if (showModRemove) {
      options.push('Remove');
      handlers.push(() => onModerateRemove(post));
    }
    if (showReport) {
      options.push('Report');
      handlers.push(() => onReport(post));
    }
    if (showBlock) {
      options.push('Block user');
      handlers.push(() => onBlock(post));
    }
    options.push('Cancel');

    const destructiveIndex = options.findIndex(
      (label) => label === 'Delete' || label === 'Remove' || label === 'Block user',
    );

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (index) => {
          if (index >= 0 && index < handlers.length) handlers[index]();
        },
      );
    } else {
      Alert.alert('Message options', undefined, [
        ...handlers.map((fn, i) => ({
          text: options[i],
          onPress: fn,
          style:
            options[i] === 'Delete' || options[i] === 'Remove' || options[i] === 'Block user'
              ? 'destructive'
              : 'default',
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // Build per-kind counts + my-reaction set
  const kindCount = {};
  const myKinds = new Set();
  post.reactions.forEach((r) => {
    kindCount[r.kind] = (kindCount[r.kind] || 0) + 1;
    if (r.user_id === myUserId) myKinds.add(r.kind);
  });

  return (
    <View style={[styles.postCard, isActivity && styles.postCardActivity]}>
      <View style={styles.postHeader}>
        <Avatar name={post.authorName} size={34} />
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{post.authorName}</Text>
          <Text style={styles.postTime}>{relativeTime(post.createdAt)}</Text>
        </View>
        {isActivity && (
          <View style={styles.activityBadge}>
            <Text style={styles.activityBadgeText}>⚡ activity</Text>
          </View>
        )}
        {hasMenu && (
          <TouchableOpacity
            style={styles.postMenuBtn}
            onPress={openMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.postMenuBtnText}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.postBody}>{body}</Text>

      <View style={styles.reactionRow}>
        {REACTION_EMOJIS.map((emoji) => {
          const count = kindCount[emoji] || 0;
          const active = myKinds.has(emoji);
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionBtn, active && styles.reactionBtnActive]}
              onPress={() => onReact(post.id, emoji, active)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 0 && (
                <Text style={[styles.reactionCount, active && styles.reactionCountActive]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <CommentThread
        postId={post.id}
        commentCount={post.commentCount ?? 0}
        isModerator={isModerator}
      />
    </View>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function GroupScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { groupId, classId, code, title, memberCount } = route.params;
  const myUserId = AuthService.getUserId();

  const [classmates, setClassmates] = useState([]);
  const [decks, setDecks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [liveUsers, setLiveUsers] = useState([]);
  const [myBuddies, setMyBuddies] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [posting, setPosting] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [modTarget, setModTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [votingDeckId, setVotingDeckId] = useState(null);
  const [savingDeckId, setSavingDeckId] = useState(null);
  const [mySection, setMySection] = useState(null);
  const [pendingBuddyReqs, setPendingBuddyReqs] = useState([]);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [examInfo, setExamInfo] = useState(null);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const inputRef = useRef(null);

  const sortedDecks = useMemo(
    () => DeckVoteService.sortDecksByUpvotes(decks),
    [decks]
  );
  const topDecks = sortedDecks.slice(0, TOP_DECKS_VISIBLE);
  const hasMoreDecks = sortedDecks.length > TOP_DECKS_VISIBLE;

  const load = useCallback(async (isRefresh = false, silent = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    try {
      const [cm, dk, ps, liveUsersData, blockedIds, buddies, challenge, section, pendingBuddies] = await Promise.all([
        GroupService.getClassmates(classId),
        GroupService.getGroupDecks(groupId),
        FeedService.getGroupPosts(groupId),
        SameBoatService.getLiveUsers(classId),
        BlockService.getBlockedUserIds(),
        BuddyService.getMyBuddies(classId),
        GroupChallengeService.getActiveChallengeForGroup(groupId),
        GroupService.getMySection(classId),
        BuddyService.getPendingRequests(),
      ]);
      setClassmates(BlockService.filterClassmates(cm, blockedIds));
      setDecks(BlockService.filterDecks(dk, blockedIds));
      setPosts(BlockService.filterPosts(ps, blockedIds));
      setLiveUsers(liveUsersData);
      setLiveCount(liveUsersData.length);
      setMyBuddies(buddies);
      setActiveChallenge(challenge);
      setMySection(section);
      setPendingBuddyReqs((pendingBuddies || []).filter((r) => String(r.classId) === String(classId)));
      const slug = ClassService.getCategoryForClass(classId);
      if (slug) {
        InsightsService.getExamDates().then((dates) => {
          setExamInfo(dates[slug] || null);
        }).catch(() => {});
      }
      if (challenge) {
        const progress = await GroupChallengeService.getChallengeProgress(challenge.id);
        setChallengeProgress(progress);
      } else {
        setChallengeProgress(null);
      }
    } catch (e) {
      console.warn('[GroupScreen] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useFocusEffect(
    useCallback(() => {
      ModerationService.isModerator().then(setIsModerator);
    }, [])
  );

  useEffect(() => {
    const unsubscribeFeed = FeedService.subscribeToFeedUpdates(
      () => load(false, true),
      { groupId },
    );
    const unsubscribePresence = SameBoatService.subscribeToPresence(classId, async () => {
      const users = await SameBoatService.getLiveUsers(classId);
      setLiveUsers(users);
      setLiveCount(users.length);
    });
    return () => {
      unsubscribeFeed();
      unsubscribePresence();
    };
  }, [groupId, classId, load]);

  const handlePost = async () => {
    const text = draftText.trim();
    if (!text) return;
    setPosting(true);
    try {
      await FeedService.postNote(groupId, text);
      setDraftText('');
      inputRef.current?.blur();
      await load();
    } catch (e) {
      Alert.alert('Could not post', e.message || 'Try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleReact = async (postId, kind, hasReacted) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const reactions = hasReacted
          ? p.reactions.filter((r) => !(r.user_id === myUserId && r.kind === kind))
          : [...p.reactions, { user_id: myUserId, kind }];
        return { ...p, reactions };
      })
    );
    try {
      await FeedService.toggleReaction(postId, kind, hasReacted);
    } catch {
      // Revert on failure
      load();
    }
  };

  const handleDelete = async (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await FeedService.deletePost(postId);
    } catch (e) {
      Alert.alert('Could not delete', e.message || 'Try again.');
      load();
    }
  };

  const openModPost = (post) => setModTarget({ type: 'post', post });

  const openModDeck = (deck) => {
    setModTarget({
      type: 'deck',
      deckId: deck.id,
      deckTitle: deck.title,
    });
  };

  const openReportPost = (post) => setReportTarget({ type: 'post', post });

  const openReportDeck = (deck) => setReportTarget({ type: 'deck', deck });

  const handleBlockPost = (post) => {
    Alert.alert(
      'Block this user?',
      `You won't see posts or shared decks from ${post.authorName || 'this user'} in your groups.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await BlockService.blockUser(post.authorId);
              await load(false, true);
            } catch (e) {
              Alert.alert('Could not block user', e.message || 'Try again.');
            }
          },
        },
      ]
    );
  };

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
      groupId,
      code,
      title,
    });
  };

  const handleSaveDeck = async (deck) => {
    setSavingDeckId(deck.id);
    try {
      const { saveIsNew } = await DeckService.copyDeckToMyDecks(deck.id);
      if (saveIsNew) {
        setDecks((prev) =>
          prev.map((d) =>
            d.id === deck.id ? { ...d, saveCount: (d.saveCount || 0) + 1 } : d
          )
        );
      }
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

  const openAllDecks = () => {
    navigation.navigate('GroupSharedDecks', { groupId, classId, code, title });
  };

  const openAllClassmates = () => {
    navigation.navigate('GroupClassmates', { classId, code, title });
  };

  const handleBuddyRespond = async (req, accept) => {
    try {
      if (accept) await BuddyService.acceptRequest(req.id);
      else await BuddyService.declineRequest(req.id);
      setPendingBuddyReqs((prev) => prev.filter((r) => r.id !== req.id));
      if (accept) load(false, true);
    } catch (e) {
      Alert.alert(accept ? 'Couldn’t accept' : 'Couldn’t decline', e.message || 'Try again.');
    }
  };

  const handleReportSubmit = async ({ category, details }) => {
    try {
      if (reportTarget.type === 'post') {
        await ReportService.submitPostReport(reportTarget.post, { category, details });
      } else {
        await ReportService.submitDeckReport(reportTarget.deck, groupId, { category, details });
      }
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
      if (modTarget.type === 'post') {
        await ModerationService.moderateFeedPost(modTarget.post, reason);
        setPosts((prev) => prev.filter((p) => {
          if (p.id === modTarget.post.id) return false;
          if (
            modTarget.post.postType === 'deck_share' &&
            modTarget.post.payload?.deckId &&
            p.postType === 'deck_share' &&
            p.payload?.deckId === modTarget.post.payload.deckId
          ) {
            return false;
          }
          return true;
        }));
        if (
          modTarget.post.postType === 'deck_share' &&
          modTarget.post.payload?.deckId
        ) {
          setDecks((prev) =>
            prev.filter((d) => d.id !== modTarget.post.payload.deckId)
          );
        }
      } else {
        await ModerationService.removeDeckFromGroup(
          modTarget.deckId,
          groupId,
          reason
        );
        setDecks((prev) => prev.filter((d) => d.id !== modTarget.deckId));
        setPosts((prev) =>
          prev.filter(
            (p) =>
              !(
                p.postType === 'deck_share' &&
                p.payload?.deckId === modTarget.deckId
              )
          )
        );
      }
    } catch (e) {
      Alert.alert('Could not remove', e.message || 'Try again.');
      load();
      throw e;
    }
  };

  const modModalCopy = (() => {
    if (!modTarget) return null;
    if (modTarget.type === 'deck') {
      return {
        title: 'Remove deck from class?',
        description: `"${modTarget.deckTitle || 'This deck'}" will be hidden from this class. The owner keeps their copy.`,
        confirmLabel: 'Remove deck',
      };
    }
    if (modTarget.post?.postType === 'deck_share') {
      return {
        title: 'Remove deck from class?',
        description: `"${modTarget.post.payload?.deckTitle || 'This deck'}" will be unshared and its feed post removed. The owner keeps their copy.`,
        confirmLabel: 'Remove deck',
      };
    }
    return {
      title: 'Remove post from feed?',
      description: 'This post will be removed for all classmates in this group.',
      confirmLabel: 'Remove post',
    };
  })();

  // Header rendered inside FlatList so it scrolls with posts
  const ListHeader = (
    <View>
      {/* Classmates */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Classmates {classmates.length > 0 ? `(${classmates.length})` : ''}
          </Text>
          {classmates.length >= CLASSMATES_VIEW_ALL_MIN && (
            <TouchableOpacity onPress={openAllClassmates} activeOpacity={0.7}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          )}
        </View>
        {classmates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🎓</Text>
            <Text style={styles.emptyText}>You're the first one here!</Text>
            <Text style={styles.emptySubtext}>
              Share the app with your classmates to see them appear.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classmateRow}
          >
            {classmates.map((c) => (
              <View key={c.id} style={styles.classmateCard}>
                <Avatar name={c.display_name} size={44} />
                <Text style={styles.classmateName} numberOfLines={1}>
                  {c.display_name || 'Tidbit User'}
                </Text>
                {c.grad_year ? (
                  <Text style={styles.classmateYear}>'{String(c.grad_year).slice(-2)}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity
        style={styles.classActionRow}
        onPress={() => setSectionPickerOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.classActionEmoji}>🏛️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.classActionTitle}>{mySection ? mySection.name : 'Join a section'}</Text>
          <Text style={styles.classActionSub}>
            {mySection ? 'Your discussion section' : 'e.g. CS 61A Section 103'}
          </Text>
        </View>
        <Text style={styles.challengeChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.classActionRow}
        onPress={() => setExamModalOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.classActionEmoji}>📅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.classActionTitle}>
            {examInfo?.date
              ? `${examInfo.label || 'Exam'} · ${new Date(`${examInfo.date}T12:00:00`).toLocaleDateString()}`
              : 'Set exam date'}
          </Text>
          <Text style={styles.classActionSub}>
            {examInfo?.date ? 'Countdown on Home and Insights' : 'Midterm or final — readiness counts down'}
          </Text>
        </View>
        <Text style={styles.challengeChevron}>›</Text>
      </TouchableOpacity>

      {/* Studying Now — realtime presence with avatars */}
      {liveUsers.length > 0 && (
        <View style={styles.studyingNowBar}>
          <View style={styles.livePulse} />
          <View style={styles.liveAvatarStack}>
            {liveUsers.slice(0, 4).map((u) => (
              <View key={u.userId} style={styles.liveAvatarWrap}>
                <Avatar name={u.displayName} size={26} />
              </View>
            ))}
          </View>
          <Text style={styles.studyingNowText}>
            {liveUsers.length === 1
              ? `${liveUsers[0].displayName} is studying now`
              : liveUsers.length <= 3
                ? `${liveUsers.map((u) => u.displayName.split(' ')[0]).join(', ')} are studying`
                : `${liveUsers.length} classmates studying now`}
          </Text>
        </View>
      )}

      {/* Incoming buddy requests */}
      {pendingBuddyReqs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buddy requests</Text>
          {pendingBuddyReqs.map((req) => (
            <View key={req.id} style={styles.buddyReqRow}>
              <Avatar name={req.requesterName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.buddyReqName}>{req.requesterName}</Text>
                <Text style={styles.buddyReqSub}>wants to be study buddies</Text>
              </View>
              <TouchableOpacity style={styles.buddyDeclineBtn} onPress={() => handleBuddyRespond(req, false)}>
                <Text style={styles.buddyDeclineText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buddyAcceptBtn} onPress={() => handleBuddyRespond(req, true)}>
                <Text style={styles.buddyAcceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Study Buddies */}
      {myBuddies.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Study Buddies</Text>
            <TouchableOpacity onPress={openAllClassmates} activeOpacity={0.7}>
              <Text style={styles.viewAllLink}>Add buddy</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classmateRow}>
            {myBuddies.filter((b) => b.classId === classId).map((buddy) => (
              <View key={buddy.pairId} style={styles.buddyCard}>
                <Avatar name={buddy.buddyName} size={44} />
                <Text style={styles.classmateName} numberOfLines={1}>
                  {buddy.buddyName.split(' ')[0]}
                </Text>
                {buddy.sharedStreak > 0 && (
                  <Text style={styles.buddyStreak}>🔥 {buddy.sharedStreak}</Text>
                )}
                <TouchableOpacity
                  style={styles.nudgeBtn}
                  onPress={async () => {
                    const sent = await BuddyService.nudgeBuddy(buddy.pairId);
                    if (!sent) Alert.alert('Already nudged', 'You can nudge once per hour.');
                  }}
                >
                  <Text style={styles.nudgeBtnText}>Nudge</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Daily Challenge */}
      {ClassService.hasTidbitContent(classId) && (() => {
        const categorySlug = ClassService.getCategoryForClass(classId);
        if (!categorySlug) return null;
        return (
          <TouchableOpacity
            style={styles.challengeCard}
            onPress={() => navigation.navigate('DailyChallenge', {
              categorySlug,
              categoryName: title || code,
            })}
            activeOpacity={0.85}
          >
            <Text style={styles.challengeEmoji}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>Daily Challenge</Text>
              <Text style={styles.challengeSub}>10 questions · same for everyone today</Text>
            </View>
            <Text style={styles.challengeChevron}>›</Text>
          </TouchableOpacity>
        );
      })()}

      {/* Group Challenge */}
      {activeChallenge && (
        <TouchableOpacity
          style={styles.groupChallengeCard}
          onPress={() => navigation.navigate('GroupChallenge', { groupId, classId, classCode: code, classTitle: title })}
          activeOpacity={0.85}
        >
          <Text style={styles.challengeEmoji}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>{activeChallenge.title}</Text>
            {challengeProgress ? (
              <View style={styles.miniProgressWrap}>
                <View style={styles.miniProgressTrack}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${Math.min(challengeProgress.pctComplete, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.miniProgressLabel}>
                  {challengeProgress.pctComplete}% — {challengeProgress.totalProgress}/{activeChallenge.goalValue}
                </Text>
              </View>
            ) : (
              <Text style={styles.challengeSub}>Class challenge · tap to see progress</Text>
            )}
          </View>
          <Text style={styles.challengeChevron}>›</Text>
        </TouchableOpacity>
      )}
      {!activeChallenge && (
        <TouchableOpacity
          style={[styles.groupChallengeCard, styles.groupChallengeCardEmpty]}
          onPress={() => navigation.navigate('GroupChallenge', { groupId, classId, classCode: code, classTitle: title })}
          activeOpacity={0.85}
        >
          <Text style={styles.challengeEmoji}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>Class Challenges</Text>
            <Text style={styles.challengeSub}>Create a collective study goal</Text>
          </View>
          <Text style={styles.challengeChevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Shared Decks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared Decks</Text>
        {sortedDecks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No shared decks yet</Text>
            <Text style={styles.emptySubtext}>
              Open a deck you created and share it with this group.
            </Text>
          </View>
        ) : (
          <>
            {topDecks.map((d) => (
              <SharedDeckRow
                key={d.id}
                deck={d}
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
            ))}
            {hasMoreDecks && (
              <TouchableOpacity
                style={styles.showMoreDecksBtn}
                onPress={openAllDecks}
                activeOpacity={0.7}
              >
                <Text style={styles.showMoreDecksText}>
                  Show all {sortedDecks.length} decks
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Activity section header */}
      <View style={[styles.section, styles.sectionHeaderOnly]}>
        <Text style={styles.sectionTitle}>Group Chat</Text>
        <Text style={styles.sectionSubtitle}>
          Post notes, questions, or resources for your classmates
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Fixed group header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              👥 {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
          {liveCount > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                {liveCount} studying now
              </Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor="#6366f1"
              />
            }
            ListHeaderComponent={ListHeader}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                myUserId={myUserId}
                isModerator={isModerator}
                onReact={handleReact}
                onDelete={handleDelete}
                onModerateRemove={openModPost}
                onReport={openReportPost}
                onBlock={handleBlockPost}
              />
            )}
            ListEmptyComponent={
              <View style={styles.feedEmpty}>
                <Text style={styles.feedEmptyEmoji}>💬</Text>
                <Text style={styles.feedEmptyText}>No posts yet</Text>
                <Text style={styles.feedEmptySubtext}>
                  Be the first to post something for {code}!
                </Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 12 }} />}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Composer */}
        <SafeAreaView edges={['bottom']} style={styles.composerWrapper}>
          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              style={styles.composerInput}
              placeholder={`Post to ${code}…`}
              placeholderTextColor="#9ca3af"
              value={draftText}
              onChangeText={setDraftText}
              multiline
              maxLength={280}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[
                styles.postBtn,
                (!draftText.trim() || posting) && styles.postBtnDisabled,
              ]}
              onPress={handlePost}
              disabled={!draftText.trim() || posting}
              activeOpacity={0.8}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ModerationReasonModal
        visible={Boolean(modTarget && modModalCopy)}
        title={modModalCopy?.title}
        description={modModalCopy?.description}
        confirmLabel={modModalCopy?.confirmLabel}
        onClose={() => setModTarget(null)}
        onConfirm={handleModConfirm}
      />

      <ReportContentModal
        visible={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />

      <SectionPickerModal
        visible={sectionPickerOpen}
        onClose={() => setSectionPickerOpen(false)}
        classId={classId}
        classCode={code}
        onChanged={() => load(false, true)}
      />

      <ExamDateModal
        visible={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        categoryId={ClassService.getCategoryForClass(classId) || classId}
        classCode={code}
        current={examInfo}
        onSaved={(next) => setExamInfo(next)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  // ── header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: theme.card,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 15, color: '#6366f1', fontWeight: '500' },
  code: { fontSize: 22, fontWeight: '800', color: theme.text },
  title: { fontSize: 14, color: theme.textSecondary, marginTop: 2, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 8 },
  badge: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, color: '#4338ca', fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  liveBadgeText: { fontSize: 12, color: '#166534', fontWeight: '600' },

  // ── list ────────────────────────────────────────────────────────────────
  listContent: { paddingBottom: 8 },

  section: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderOnly: { paddingBottom: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
  sectionSubtitle: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },

  // ── classmates ─────────────────────────────────────────────────────────
  classmateRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  classmateCard: { alignItems: 'center', width: 68 },
  classmateName: {
    fontSize: 11,
    color: theme.text,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    width: 68,
  },
  classmateYear: { fontSize: 10, color: theme.textSecondary, marginTop: 1 },

  // ── empty states ────────────────────────────────────────────────────────
  emptyBox: { alignItems: 'center', paddingVertical: 16 },
  emptyEmoji: { fontSize: 28, marginBottom: 6 },
  emptyText: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 },

  feedEmpty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 },
  feedEmptyEmoji: { fontSize: 36, marginBottom: 8 },
  feedEmptyText: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 4 },
  feedEmptySubtext: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 },

  // ── shared decks ────────────────────────────────────────────────────────
  showMoreDecksBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  showMoreDecksText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },

  // ── post card ───────────────────────────────────────────────────────────
  postCard: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  postCardActivity: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postMeta: { flex: 1, marginLeft: 10 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: theme.text },
  postTime: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  activityBadge: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  activityBadgeText: { fontSize: 10, color: '#854d0e', fontWeight: '600' },
  postMenuBtn: {
    marginLeft: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  postMenuBtnText: { fontSize: 20, fontWeight: '700', color: theme.textSecondary, lineHeight: 22 },
  reportDeckBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  postBody: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  reactionRow: { flexDirection: 'row', gap: 8 },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: theme.background,
  },
  reactionBtnActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  reactionCountActive: { color: '#4338ca' },

  // ── composer ────────────────────────────────────────────────────────────
  composerWrapper: { backgroundColor: theme.card },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    maxHeight: 100,
  },
  postBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  postBtnDisabled: { backgroundColor: '#c7d2fe' },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight || '#eef2ff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: theme.accent || '#a5b4fc',
  },
  challengeEmoji: { fontSize: 28, marginRight: 12 },
  challengeTitle: { fontSize: 15, fontWeight: '800', color: theme.primary },
  challengeSub: { fontSize: 12, color: theme.primary, marginTop: 2, opacity: 0.75 },
  challengeChevron: { fontSize: 24, color: theme.primary, fontWeight: '700' },

  classActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.primaryLight || '#e5e7eb',
  },
  classActionEmoji: { fontSize: 22, marginRight: 12 },
  classActionTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  classActionSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  // ── group challenge card ─────────────────────────────────────────────────
  groupChallengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
  },
  groupChallengeCardEmpty: {
    opacity: 0.75,
    borderStyle: 'dashed',
  },
  miniProgressWrap: { marginTop: 4, gap: 3 },
  miniProgressTrack: {
    height: 5,
    backgroundColor: '#fde68a',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  miniProgressFill: {
    height: 5,
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  miniProgressLabel: { fontSize: 11, color: '#92400e' },

  // ── studying now bar ─────────────────────────────────────────────────────
  studyingNowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveAvatarStack: { flexDirection: 'row' },
  liveAvatarWrap: { marginRight: -6, borderRadius: 13, borderWidth: 1.5, borderColor: '#f0fdf4' },
  studyingNowText: { fontSize: 13, color: '#166534', fontWeight: '600', flex: 1 },

  // ── study buddies ────────────────────────────────────────────────────────
  buddyCard: { alignItems: 'center', width: 72, gap: 3 },
  buddyStreak: { fontSize: 11, color: '#f97316', fontWeight: '700' },
  nudgeBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  nudgeBtnText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  buddyReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: theme.accent || '#c7d2fe',
  },
  buddyReqName: { fontSize: 15, fontWeight: '700', color: theme.text },
  buddyReqSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  buddyDeclineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  buddyDeclineText: { fontWeight: '700', color: '#4b5563' },
  buddyAcceptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.primary,
  },
  buddyAcceptText: { fontWeight: '800', color: '#fff' },
});
