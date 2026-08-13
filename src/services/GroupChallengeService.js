import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class GroupChallengeService {
  /**
   * Fetch all active (or recently ended) challenges for a group.
   * Returns challenges sorted by end_date ascending (soonest deadline first).
   */
  static async getChallenges(groupId, { includeExpired = false } = {}) {
    if (!SUPABASE_CONFIGURED) return [];

    let query = supabase
      .from('group_challenges')
      .select('id, title, description, goal_type, goal_value, start_date, end_date, created_at, created_by')
      .eq('group_id', groupId);

    if (!includeExpired) {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('end_date', today);
    }

    const { data, error } = await query.order('end_date', { ascending: true });

    if (error) {
      console.warn('[GroupChallengeService] getChallenges error:', error.message);
      return [];
    }

    return (data || []).map(mapChallenge);
  }

  /**
   * Fetch aggregate progress for a specific challenge.
   * Returns { totalProgress, goalValue, participantCount, pctComplete }.
   */
  static async getChallengeProgress(challengeId) {
    if (!SUPABASE_CONFIGURED) return null;

    const { data, error } = await supabase
      .from('group_challenge_progress')
      .select('challenge_id, goal_value, total_progress, participant_count')
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      challengeId: data.challenge_id,
      goalValue: data.goal_value,
      totalProgress: Number(data.total_progress),
      participantCount: Number(data.participant_count),
      pctComplete: Math.min(100, Math.round((Number(data.total_progress) / data.goal_value) * 100)),
    };
  }

  /**
   * Fetch per-user leaderboard for a challenge (top 20).
   */
  static async getLeaderboard(challengeId) {
    if (!SUPABASE_CONFIGURED) return [];

    const { data, error } = await supabase
      .from('group_challenge_user_progress')
      .select('user_id, display_name, user_total')
      .eq('challenge_id', challengeId)
      .order('user_total', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[GroupChallengeService] getLeaderboard error:', error.message);
      return [];
    }

    return (data || []).map((row, i) => ({
      rank: i + 1,
      userId: row.user_id,
      displayName: row.display_name || 'Tidbit User',
      total: Number(row.user_total),
    }));
  }

  /**
   * Contribute toward a challenge (e.g. after a study session).
   * amount = number of cards reviewed / sessions completed.
   */
  static async contribute(challengeId, amount = 1, sourceType = 'card_attempt') {
    if (!SUPABASE_CONFIGURED) return;
    const { error } = await supabase.rpc('contribute_to_challenge', {
      p_challenge_id: challengeId,
      p_amount: amount,
      p_source_type: sourceType,
    });
    if (error) {
      console.warn('[GroupChallengeService] contribute error:', error.message);
    }
  }

  /**
   * Create a new challenge for a group. Only class members can create.
   */
  static async createChallenge(groupId, { title, description, goalType, goalValue, startDate, endDate }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('group_challenges')
      .insert({
        group_id: groupId,
        title: title.trim(),
        description: description?.trim() || null,
        goal_type: goalType,
        goal_value: goalValue,
        start_date: startDate,
        end_date: endDate,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapChallenge(data);
  }

  /**
   * Fetch the single most active (earliest-ending) challenge for a group.
   * Handy for the GroupScreen summary card.
   */
  static async getActiveChallengeForGroup(groupId) {
    const challenges = await GroupChallengeService.getChallenges(groupId, { includeExpired: false });
    return challenges[0] || null;
  }
}

function mapChallenge(c) {
  return {
    id: c.id,
    title: c.title,
    description: c.description || null,
    goalType: c.goal_type,
    goalValue: c.goal_value,
    startDate: c.start_date,
    endDate: c.end_date,
    createdAt: c.created_at,
    createdBy: c.created_by || null,
  };
}

export { GroupChallengeService };
export default GroupChallengeService;
