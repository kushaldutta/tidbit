import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class BlockService {
  static CACHE_MS = 60 * 1000;
  static _blockedIds = null;
  static _blockedIdsAt = 0;

  static clearCache() {
    this._blockedIds = null;
    this._blockedIdsAt = 0;
  }

  static canBlockUser(otherUserId, myUserId) {
    return Boolean(otherUserId && myUserId && otherUserId !== myUserId);
  }

  static async getBlockedUserIds({ force = false } = {}) {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];

    if (
      !force &&
      this._blockedIds &&
      Date.now() - this._blockedIdsAt < this.CACHE_MS
    ) {
      return this._blockedIds;
    }

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_user_id')
      .eq('blocker_id', userId);

    if (error) {
      console.warn('[BlockService] getBlockedUserIds error:', error.message);
      return this._blockedIds || [];
    }

    this._blockedIds = (data || []).map((r) => r.blocked_user_id);
    this._blockedIdsAt = Date.now();
    return this._blockedIds;
  }

  static isBlocked(userId, blockedIds) {
    if (!userId || !blockedIds?.length) return false;
    return blockedIds.includes(userId);
  }

  static filterPosts(posts, blockedIds) {
    if (!blockedIds?.length) return posts || [];
    const blocked = new Set(blockedIds);
    return (posts || []).filter((p) => !p.authorId || !blocked.has(p.authorId));
  }

  static filterDecks(decks, blockedIds) {
    if (!blockedIds?.length) return decks || [];
    const blocked = new Set(blockedIds);
    return (decks || []).filter((d) => !d.ownerId || !blocked.has(d.ownerId));
  }

  static filterClassmates(classmates, blockedIds) {
    if (!blockedIds?.length) return classmates || [];
    const blocked = new Set(blockedIds);
    return (classmates || []).filter((c) => !c.id || !blocked.has(c.id));
  }

  static async blockUser(blockedUserId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');
    if (blockedUserId === userId) throw new Error('You cannot block yourself');

    const { error } = await supabase.from('user_blocks').upsert(
      { blocker_id: userId, blocked_user_id: blockedUserId },
      { onConflict: 'blocker_id,blocked_user_id' }
    );
    if (error) throw error;

    if (this._blockedIds && !this._blockedIds.includes(blockedUserId)) {
      this._blockedIds = [...this._blockedIds, blockedUserId];
    } else {
      this.clearCache();
    }
  }

  static async unblockUser(blockedUserId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .match({ blocker_id: userId, blocked_user_id: blockedUserId });
    if (error) throw error;

    if (this._blockedIds) {
      this._blockedIds = this._blockedIds.filter((id) => id !== blockedUserId);
    } else {
      this.clearCache();
    }
  }
}

export { BlockService };
export default BlockService;
