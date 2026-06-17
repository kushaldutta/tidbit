import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

function debounceCallback(fn, ms = 400) {
  let timer = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, ms);
  };
}

class FeedService {
  /**
   * Subscribe to live feed updates (new posts, reactions). RLS limits events to
   * groups the signed-in user can read. Returns an unsubscribe function.
   * Pass groupId to scope post events to one class group (still listens for all reactions).
   */
  static subscribeToFeedUpdates(onUpdate, { groupId, pollIntervalMs = 15000 } = {}) {
    if (!SUPABASE_CONFIGURED) return () => {};

    const userId = AuthService.getUserId();
    if (!userId) return () => {};

    const notify = debounceCallback(onUpdate);
    const channelName = groupId ? `feed:group:${groupId}` : `feed:home:${userId}`;
    const channel = supabase.channel(channelName);

    const postFilter = groupId ? { filter: `group_id=eq.${groupId}` } : {};
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'feed_posts', ...postFilter },
      notify,
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reactions' },
      notify,
    );

    channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[FeedService] realtime subscription error:', err?.message || status);
      }
    });

    const pollTimer = pollIntervalMs > 0
      ? setInterval(notify, pollIntervalMs)
      : null;

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }

  /**
   * Fetch the 30 most-recent posts for a group, newest first.
   * Each post is enriched with author display name and an array of reactions.
   */
  static async getGroupPosts(groupId) {
    if (!SUPABASE_CONFIGURED) return [];
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        id, post_type, payload, created_at, author_id, group_id,
        profiles!author_id(display_name, grad_year),
        reactions(kind, user_id)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[FeedService] getGroupPosts error:', error.message);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      postType: p.post_type,
      payload: p.payload || {},
      createdAt: p.created_at,
      authorId: p.author_id,
      groupId: p.group_id,
      authorName: p.profiles?.display_name || 'Tidbit User',
      authorYear: p.profiles?.grad_year || null,
      reactions: p.reactions || [],
    }));
  }

  /**
   * Post a plain-text note to a group.
   */
  static async postNote(groupId, text) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');
    const { error } = await supabase.from('feed_posts').insert({
      author_id: userId,
      group_id: groupId,
      post_type: 'note',
      payload: { text: text.trim() },
    });
    if (error) throw error;
  }

  /**
   * Fetch the unified home feed: all posts from every group the current user
   * belongs to, newest first. Enriched with author name, group class code,
   * and reactions. Dumb-question posts have authorName = null (UI hides identity).
   */
  static async getHomeFeed() {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];

    // Step 1 — class IDs the user is enrolled in
    const { data: memberships, error: mErr } = await supabase
      .from('class_memberships')
      .select('class_id')
      .eq('user_id', userId);
    if (mErr || !memberships?.length) return [];

    const classIds = memberships.map((m) => m.class_id);

    // Step 2 — groups for those classes + class label
    const { data: groups, error: gErr } = await supabase
      .from('groups')
      .select('id, class_id, classes(code, title)')
      .in('class_id', classIds);
    if (gErr || !groups?.length) return [];

    const groupIds = [];
    const groupInfo = {};
    groups.forEach((g) => {
      groupIds.push(g.id);
      groupInfo[g.id] = {
        classId: g.class_id,
        code: g.classes?.code || '',
        title: g.classes?.title || '',
      };
    });

    // Step 3 — posts from all those groups
    const { data: posts, error: pErr } = await supabase
      .from('feed_posts')
      .select(`
        id, post_type, payload, created_at, group_id, author_id,
        profiles!author_id(display_name, grad_year),
        reactions(kind, user_id)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (pErr) {
      console.warn('[FeedService] getHomeFeed error:', pErr.message);
      return [];
    }

    return (posts || []).map((p) => {
      const isDumbQ = p.post_type === 'dumb_question';
      return {
        id: p.id,
        postType: p.post_type,
        payload: p.payload || {},
        createdAt: p.created_at,
        authorId: p.author_id,
        groupId: p.group_id,
        groupCode: groupInfo[p.group_id]?.code || '',
        groupTitle: groupInfo[p.group_id]?.title || '',
        classId: groupInfo[p.group_id]?.classId || '',
        // Hide identity for anonymous posts
        authorName: isDumbQ ? null : (p.profiles?.display_name || 'Tidbit User'),
        authorYear: isDumbQ ? null : (p.profiles?.grad_year || null),
        reactions: p.reactions || [],
      };
    });
  }

  /**
   * Post to a group — either a regular note or an anonymous dumb question.
   * `anonymous = true` sets post_type to 'dumb_question' so the UI hides the author.
   */
  static async postToGroup(groupId, text, anonymous = false) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');
    const { error } = await supabase.from('feed_posts').insert({
      author_id: userId,
      group_id: groupId,
      post_type: anonymous ? 'dumb_question' : 'note',
      payload: { text: text.trim() },
    });
    if (error) throw error;
  }

  /** User-written feed messages the author may remove. */
  static isUserComposedPost(postType) {
    return postType === 'note' || postType === 'dumb_question';
  }

  static canUserDeletePost(post, myUserId) {
    return Boolean(
      myUserId &&
      post?.authorId === myUserId &&
      this.isUserComposedPost(post.postType)
    );
  }

  /** Delete a feed post authored by the signed-in user (RLS enforced). */
  static async deletePost(postId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');

    const { error } = await supabase
      .from('feed_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', userId);
    if (error) throw error;
  }

  /**
   * Toggle a reaction on a post. If the current user already has this kind
   * of reaction, it is removed; otherwise it is added.
   * Pass `hasReacted` (boolean) from the UI to avoid an extra round-trip.
   */
  static async toggleReaction(postId, kind, hasReacted) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    if (hasReacted) {
      await supabase
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('kind', kind);
    } else {
      await supabase
        .from('reactions')
        .insert({ post_id: postId, user_id: userId, kind });
    }
  }
}

export { FeedService };
export default FeedService;
