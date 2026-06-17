import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { GroupService } from '../services/GroupService';
import { FeedService } from '../services/FeedService';
import { SameBoatService } from '../services/SameBoatService';
import { AuthService } from '../services/AuthService';
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

function PostCard({ post, myUserId, onReact, onDelete }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const body = postBodyText(post);
  const isActivity = post.postType === 'activity';
  const canDelete = FeedService.canUserDeletePost(post, myUserId);

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
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={confirmDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async (isRefresh = false, silent = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    try {
      const [cm, dk, ps, live] = await Promise.all([
        GroupService.getClassmates(classId),
        GroupService.getGroupDecks(groupId),
        FeedService.getGroupPosts(groupId),
        SameBoatService.getLiveCount(classId),
      ]);
      setClassmates(cm);
      setDecks(dk);
      setPosts(ps);
      setLiveCount(live);
    } catch (e) {
      console.warn('[GroupScreen] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const unsubscribe = FeedService.subscribeToFeedUpdates(
      () => load(false, true),
      { groupId },
    );
    return unsubscribe;
  }, [groupId, load]);

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

  // Header rendered inside FlatList so it scrolls with posts
  const ListHeader = (
    <View>
      {/* Classmates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Classmates {classmates.length > 0 ? `(${classmates.length})` : ''}
        </Text>
        {classmates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🎓</Text>
            <Text style={styles.emptyText}>You're the first one here!</Text>
            <Text style={styles.emptySubtext}>
              Share the app with your classmates to see them appear.
            </Text>
          </View>
        ) : (
          <View style={styles.classmateGrid}>
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
          </View>
        )}
      </View>

      {/* Shared Decks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared Decks</Text>
        {decks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No shared decks yet</Text>
            <Text style={styles.emptySubtext}>
              Open a deck you created and share it with this group.
            </Text>
          </View>
        ) : (
            decks.map((d) => (
                <View key={d.id} style={styles.deckCard}>
                  <View style={styles.deckInfo}>
                    <Text style={styles.deckTitle}>{d.title}</Text>
                    <Text style={styles.deckMeta}>
                      {d.cardCount} cards · by {d.ownerName}
                    </Text>
                  </View>
                  {d.cardCount > 0 && (
                    <TouchableOpacity
                      style={styles.studyBtn}
                      onPress={() =>
                        navigation.navigate('GroupDeckStudy', {
                          deckId: d.id,
                          deckTitle: d.title,
                          classId,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.studyBtnText}>Study</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
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
                onReact={handleReact}
                onDelete={handleDelete}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },

  // ── classmates ─────────────────────────────────────────────────────────
  classmateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  deckInfo: { flex: 1 },
  deckTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  deckMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  deckChevron: { fontSize: 20, color: theme.textSecondary },
  studyBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  studyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

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
  deleteBtn: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
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
});
