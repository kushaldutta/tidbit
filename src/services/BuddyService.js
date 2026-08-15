import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class BuddyService {
  /**
   * Send a buddy request to a classmate for a specific class.
   * No-ops silently if a request already exists.
   */
  static async sendRequest(targetUserId, classId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const myId = AuthService.getUserId();
    if (!myId) throw new Error('Not signed in');
    if (myId === targetUserId) throw new Error('Cannot buddy yourself');

    const { error } = await supabase.from('buddy_requests').insert({
      requester_id: myId,
      target_id: targetUserId,
      class_id: classId,
    });

    // Ignore "already exists" duplicate conflict
    if (error && !error.message.includes('unique') && !error.code?.includes('23505')) {
      throw error;
    }
  }

  /**
   * Accept a pending buddy request by its ID.
   * Creates the buddy_pairs row atomically via RPC.
   */
  static async acceptRequest(requestId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.rpc('accept_buddy_request', {
      p_request_id: requestId,
    });
    if (error) throw error;
  }

  /**
   * Decline a pending buddy request.
   */
  static async declineRequest(requestId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const myId = AuthService.getUserId();
    if (!myId) throw new Error('Not signed in');

    const { error } = await supabase
      .from('buddy_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('target_id', myId);

    if (error) throw error;
  }

  /**
   * Fetch all incoming pending requests for the current user.
   */
  static async getPendingRequests() {
    if (!SUPABASE_CONFIGURED) return [];
    const myId = AuthService.getUserId();
    if (!myId) return [];

    const { data, error } = await supabase
      .from('buddy_requests')
      .select('id, requester_id, class_id, status, created_at')
      .eq('target_id', myId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[BuddyService] getPendingRequests error:', error.message);
      return [];
    }
    if (!data?.length) return [];

    const requesterIds = [...new Set(data.map((r) => r.requester_id))];
    const classIds = [...new Set(data.map((r) => r.class_id).filter(Boolean))];
    const [{ data: profiles }, { data: classes }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, grad_year').in('id', requesterIds),
      classIds.length
        ? supabase.from('classes').select('id, code, title').in('id', classIds)
        : Promise.resolve({ data: [] }),
    ]);
    const nameById = new Map((profiles || []).map((p) => [p.id, p]));
    const classById = new Map((classes || []).map((c) => [c.id, c]));

    return data.map((r) => {
      const profile = nameById.get(r.requester_id);
      const cls = classById.get(r.class_id);
      return {
        id: r.id,
        requesterId: r.requester_id,
        requesterName: profile?.display_name || 'Tidbit User',
        requesterYear: profile?.grad_year || null,
        classId: r.class_id,
        classCode: cls?.code || '',
        classTitle: cls?.title || '',
        status: r.status,
        createdAt: r.created_at,
      };
    });
  }

  /**
   * Fetch all active buddy pairs for the current user, optionally filtered by class.
   */
  static async getMyBuddies(classId = null) {
    if (!SUPABASE_CONFIGURED) return [];
    const myId = AuthService.getUserId();
    if (!myId) return [];

    let query = supabase
      .from('buddy_pairs')
      .select(`
        id, user1_id, user2_id, class_id, shared_streak, last_nudge_at, last_shared_study_date,
        classes!class_id(code, title),
        u1:profiles!user1_id(display_name, grad_year),
        u2:profiles!user2_id(display_name, grad_year)
      `)
      .or(`user1_id.eq.${myId},user2_id.eq.${myId}`);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[BuddyService] getMyBuddies error:', error.message);
      return [];
    }

    return (data || []).map((pair) => {
      const buddyProfile = pair.user1_id === myId ? pair.u2 : pair.u1;
      const buddyId = pair.user1_id === myId ? pair.user2_id : pair.user1_id;
      return {
        pairId: pair.id,
        buddyId,
        buddyName: buddyProfile?.display_name || 'Tidbit User',
        buddyYear: buddyProfile?.grad_year || null,
        classId: pair.class_id,
        classCode: pair.classes?.code || '',
        classTitle: pair.classes?.title || '',
        sharedStreak: pair.shared_streak,
        lastNudgeAt: pair.last_nudge_at,
        lastSharedStudyDate: pair.last_shared_study_date,
      };
    });
  }

  /**
   * Nudge a buddy (rate-limited to once/hour by the RPC).
   * Returns true if the nudge was sent, false if rate-limited.
   */
  static async nudgeBuddy(pairId) {
    if (!SUPABASE_CONFIGURED) return false;
    const { data, error } = await supabase.rpc('nudge_buddy', { p_pair_id: pairId });
    if (error) {
      console.warn('[BuddyService] nudgeBuddy error:', error.message);
      return false;
    }
    return data === true;
  }

  /**
   * Check if the current user already has an active or pending buddy relationship
   * with a specific user for a specific class.
   */
  static async getRelationshipStatus(targetUserId, classId) {
    if (!SUPABASE_CONFIGURED) return 'none';
    const myId = AuthService.getUserId();
    if (!myId) return 'none';

    // Check buddy_pairs
    const u1 = myId < targetUserId ? myId : targetUserId;
    const u2 = myId < targetUserId ? targetUserId : myId;

    const { data: pair } = await supabase
      .from('buddy_pairs')
      .select('id')
      .eq('user1_id', u1)
      .eq('user2_id', u2)
      .eq('class_id', classId)
      .maybeSingle();

    if (pair) return 'buddies';

    // Check pending requests
    const { data: req } = await supabase
      .from('buddy_requests')
      .select('id, requester_id, status')
      .or(`and(requester_id.eq.${myId},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${myId})`)
      .eq('class_id', classId)
      .eq('status', 'pending')
      .maybeSingle();

    if (req) return req.requester_id === myId ? 'request_sent' : 'request_received';

    return 'none';
  }
}

export { BuddyService };
export default BuddyService;
