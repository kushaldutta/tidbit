import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class CommentService {
  /**
   * Fetch all comments for a post, oldest first, with author names.
   */
  static async getComments(postId) {
    if (!SUPABASE_CONFIGURED) return [];
    const { data, error } = await supabase
      .from('feed_comments')
      .select(`
        id, post_id, author_id, text, created_at,
        profiles!author_id(display_name, grad_year)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[CommentService] getComments error:', error.message);
      return [];
    }

    return (data || []).map((c) => ({
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      authorName: c.profiles?.display_name || 'Tidbit User',
      authorYear: c.profiles?.grad_year || null,
      text: c.text,
      createdAt: c.created_at,
    }));
  }

  /**
   * Add a comment to a post. Returns the new comment row or throws.
   */
  static async addComment(postId, text) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');

    const trimmed = text?.trim();
    if (!trimmed) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: postId, author_id: userId, text: trimmed })
      .select(`id, post_id, author_id, text, created_at,
               profiles!author_id(display_name, grad_year)`)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      postId: data.post_id,
      authorId: data.author_id,
      authorName: data.profiles?.display_name || 'Tidbit User',
      authorYear: data.profiles?.grad_year || null,
      text: data.text,
      createdAt: data.created_at,
    };
  }

  /**
   * Delete a comment the current user authored (RLS enforced).
   */
  static async deleteComment(commentId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');

    const { error } = await supabase
      .from('feed_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', userId);

    if (error) throw error;
  }

  /**
   * Moderator delete — calls security-definer RPC.
   */
  static async moderatorDeleteComment(commentId, reason = '') {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.rpc('moderator_delete_feed_comment', {
      p_comment_id: commentId,
      p_reason: reason || null,
    });
    if (error) throw error;
  }

  /**
   * Subscribe to live comment updates for a specific post.
   * Returns an unsubscribe function.
   */
  static subscribeToPostComments(postId, onUpdate) {
    if (!SUPABASE_CONFIGURED) return () => {};

    const channel = supabase
      .channel(`comments:post:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` },
        onUpdate,
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  static canDeleteComment(comment, myUserId) {
    return Boolean(myUserId && comment?.authorId === myUserId);
  }
}

export { CommentService };
export default CommentService;
