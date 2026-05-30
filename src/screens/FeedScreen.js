import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FeedService } from '../services/FeedService';
import { GroupService } from '../services/GroupService';
import { AuthService } from '../services/AuthService';

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  if (postType === 'dumb_question') return payload.text || '';
  if (postType === 'activity') return payload.text || '';
  if (postType === 'deck_share') return `shared a deck: "${payload.deckTitle || 'Untitled'}"`;
  return payload.text || '';
}

const REACTION_EMOJIS = ['👍', '❤️', '🔥'];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36, anon = false }) {
  if (anon) {
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#6b7280' }]}>
        <Text style={{ fontSize: size * 0.45 }}>🎭</Text>
      </View>
    );
  }
  const initials = name
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const bg = colors[initials.charCodeAt(0) % colors.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post, myUserId, onReact }) {
  const isAnon = post.postType === 'dumb_question';
  const isActivity = post.postType === 'activity';
  const isDeckShare = post.postType === 'deck_share';
  const body = postBodyText(post);

  const kindCount = {};
  const myKinds = new Set();
  post.reactions.forEach((r) => {
    kindCount[r.kind] = (kindCount[r.kind] || 0) + 1;
    if (r.user_id === myUserId) myKinds.add(r.kind);
  });

  return (
    <View style={[
      styles.postCard,
      isActivity && styles.postCardActivity,
      isAnon && styles.postCardAnon,
      isDeckShare && styles.postCardDeckShare,
    ]}>
      {/* Header row */}
      <View style={styles.postHeader}>
        <Avatar name={post.authorName} anon={isAnon} size={34} />
        <View style={styles.postMeta}>
          <View style={styles.postMetaRow}>
            <Text style={styles.postAuthor}>
              {isAnon ? 'Anonymous 🎭' : (post.authorName || 'Tidbit User')}
            </Text>
            {isAnon && (
              <View style={styles.anonBadge}>
                <Text style={styles.anonBadgeText}>dumb question</Text>
              </View>
            )}
            {isActivity && (
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>⚡ activity</Text>
              </View>
            )}
          </View>
          <View style={styles.postSubRow}>
            <Text style={styles.groupLabel}>{post.groupCode}</Text>
            <Text style={styles.postDot}> · </Text>
            <Text style={styles.postTime}>{relativeTime(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <Text style={styles.postBody}>{body}</Text>

      {/* Reactions */}
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

// ─── ComposeModal ─────────────────────────────────────────────────────────────

function ComposeModal({ visible, groups, onClose, onPost }) {
  const [text, setText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.groupId || '');
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);

  // Reset when opened
  React.useEffect(() => {
    if (visible) {
      setText('');
      setSelectedGroupId(groups[0]?.groupId || '');
      setAnonymous(false);
    }
  }, [visible, groups]);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed || !selectedGroupId) return;
    setPosting(true);
    try {
      await onPost(selectedGroupId, trimmed, anonymous);
      onClose();
    } catch (e) {
      Alert.alert('Could not post', e.message || 'Try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={!text.trim() || !selectedGroupId || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text style={[
                  styles.modalPost,
                  (!text.trim() || !selectedGroupId) && styles.modalPostDisabled,
                ]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Group picker */}
            <Text style={styles.modalLabel}>Post to</Text>
            <View style={styles.groupChips}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.groupId}
                  style={[
                    styles.groupChip,
                    selectedGroupId === g.groupId && styles.groupChipActive,
                  ]}
                  onPress={() => setSelectedGroupId(g.groupId)}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.groupChipText,
                    selectedGroupId === g.groupId && styles.groupChipTextActive,
                  ]}>
                    {g.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Text input */}
            <TextInput
              style={styles.modalInput}
              placeholder={
                anonymous
                  ? 'Ask your dumb question... (no one will know it\'s you 🎭)'
                  : 'Share a note, resource, or question with your class...'
              }
              placeholderTextColor="#9ca3af"
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              maxLength={500}
            />

            {/* Anonymous toggle */}
            <View style={styles.anonRow}>
              <View style={styles.anonInfo}>
                <Text style={styles.anonLabel}>Post anonymously 🎭</Text>
                <Text style={styles.anonSubtitle}>
                  Your name won't be shown. No dumb questions.
                </Text>
              </View>
              <Switch
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>

            {anonymous && (
              <View style={styles.anonWarning}>
                <Text style={styles.anonWarningText}>
                  🎭 This will be posted as "Anonymous". Your classmates won't see your name.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── FeedScreen ───────────────────────────────────────────────────────────────

export default function FeedScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const myUserId = AuthService.getUserId();

  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState(null); // null = All
  const [composeVisible, setComposeVisible] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [feedPosts, myGroups] = await Promise.all([
        FeedService.getHomeFeed(),
        GroupService.getMyGroups(),
      ]);
      setPosts(feedPosts);
      setGroups(myGroups);
    } catch (e) {
      console.warn('[FeedScreen] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleReact = async (postId, kind, hasReacted) => {
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
      load();
    }
  };

  const handlePost = async (groupId, text, anonymous) => {
    await FeedService.postToGroup(groupId, text, anonymous);
    await load();
  };

  const filteredPosts = filterGroupId
    ? posts.filter((p) => p.groupId === filterGroupId)
    : posts;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => setComposeVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.composeBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      {groups.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterGroupId === null && styles.filterChipActive]}
            onPress={() => setFilterGroupId(null)}
          >
            <Text style={[styles.filterChipText, filterGroupId === null && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.groupId}
              style={[styles.filterChip, filterGroupId === g.groupId && styles.filterChipActive]}
              onPress={() => setFilterGroupId(g.groupId)}
            >
              <Text style={[styles.filterChipText, filterGroupId === g.groupId && styles.filterChipTextActive]}>
                {g.code}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Feed */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              myUserId={myUserId}
              onReact={handleReact}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              {groups.length === 0 ? (
                <>
                  <Text style={styles.emptyEmoji}>🎓</Text>
                  <Text style={styles.emptyTitle}>No classes yet</Text>
                  <Text style={styles.emptyBody}>
                    Join a class from Settings → My Classes to see your group feed here.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => navigation.navigate('MyClasses')}
                  >
                    <Text style={styles.emptyBtnText}>Go to My Classes</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTitle}>Nothing yet</Text>
                  <Text style={styles.emptyBody}>
                    Be the first to post something to your class groups!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => setComposeVisible(true)}
                  >
                    <Text style={styles.emptyBtnText}>Post something</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
          ListFooterComponent={<View style={{ height: 24 }} />}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Compose modal */}
      <ComposeModal
        visible={composeVisible}
        groups={groups}
        onClose={() => setComposeVisible(false)}
        onPost={handlePost}
      />
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // ── header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  composeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeBtnText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },

  // ── filter chips ──────────────────────────────────────────────────────────
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterChipTextActive: { color: '#4338ca' },

  // ── list ──────────────────────────────────────────────────────────────────
  listContent: { paddingTop: 8, paddingBottom: 16 },

  // ── post card ─────────────────────────────────────────────────────────────
  postCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postCardActivity: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  postCardAnon: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  postCardDeckShare: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  postMeta: { flex: 1, marginLeft: 10 },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  postAuthor: { fontSize: 14, fontWeight: '700', color: '#111827' },
  postSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#6366f1' },
  postDot: { fontSize: 11, color: '#d1d5db' },
  postTime: { fontSize: 11, color: '#9ca3af' },
  anonBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  anonBadgeText: { fontSize: 10, color: '#7c3aed', fontWeight: '700' },
  activityBadge: {
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  activityBadgeText: { fontSize: 10, color: '#854d0e', fontWeight: '700' },
  postBody: {
    fontSize: 15,
    color: '#1f2937',
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
    backgroundColor: '#f9fafb',
  },
  reactionBtnActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  reactionCountActive: { color: '#4338ca' },

  // ── empty state ───────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── compose modal ─────────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalCancel: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalPost: { fontSize: 15, color: '#6366f1', fontWeight: '700' },
  modalPostDisabled: { opacity: 0.4 },
  modalBody: { flex: 1, padding: 20 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  groupChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  groupChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  groupChipTextActive: { color: '#4338ca' },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  anonInfo: { flex: 1, marginRight: 12 },
  anonLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  anonSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  anonWarning: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  anonWarningText: { fontSize: 13, color: '#6d28d9', lineHeight: 18 },
});
