import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { ProfileService } from './ProfileService';

class ModerationService {
  static _moderatorCache = null;
  static _moderatorCacheAt = 0;
  static CACHE_MS = 60 * 1000;

  static async isModerator({ force = false } = {}) {
    if (
      !force &&
      this._moderatorCache != null &&
      Date.now() - this._moderatorCacheAt < this.CACHE_MS
    ) {
      return this._moderatorCache;
    }

    const profile = await ProfileService.getMyProfile();
    const value = profile?.is_moderator === true;
    this._moderatorCache = value;
    this._moderatorCacheAt = Date.now();
    return value;
  }

  static clearCache() {
    this._moderatorCache = null;
    this._moderatorCacheAt = 0;
  }

  static async deleteFeedPost(postId, reason) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const trimmed = reason?.trim();
    if (!trimmed) throw new Error('Reason is required');

    const { error } = await supabase.rpc('moderator_delete_feed_post', {
      p_post_id: postId,
      p_reason: trimmed,
    });
    if (error) throw error;
  }

  static async removeDeckFromGroup(deckId, groupId, reason) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const trimmed = reason?.trim();
    if (!trimmed) throw new Error('Reason is required');

    const { error } = await supabase.rpc('moderator_remove_deck_from_group', {
      p_deck_id: deckId,
      p_group_id: groupId,
      p_reason: trimmed,
    });
    if (error) throw error;
  }

  /**
   * Moderate a feed item. Deck-share posts unshare the deck from the class;
   * everything else deletes the feed post only.
   */
  static async moderateFeedPost(post, reason) {
    const deckId = post.payload?.deckId;
    if (post.postType === 'deck_share' && deckId && post.groupId) {
      await this.removeDeckFromGroup(deckId, post.groupId, reason);
      return 'deck';
    }
    await this.deleteFeedPost(post.id, reason);
    return 'post';
  }
}

export { ModerationService };
export default ModerationService;
