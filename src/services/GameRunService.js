/**
 * GameRunService — persist + leaderboard for any game_type.
 * New modes insert here; they do not get their own score table.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

const TOP_N = 10;

async function fetchDisplayNames(userIds) {
  if (!userIds.length) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  return new Map((data || []).map((p) => [p.id, p.display_name || 'Student']));
}

class GameRunService {
  static async recordRun({
    challengeId = null,
    gameType,
    classId = null,
    deckId = null,
    score = 0,
    correctCount = 0,
    totalAttempted = 0,
    elapsedMs = 0,
    meta = {},
  }) {
    if (!SUPABASE_CONFIGURED) return null;
    const userId = AuthService.getUserId();
    if (!userId) return null;

    const row = {
      challenge_id: challengeId,
      user_id: userId,
      game_type: gameType,
      class_id: classId,
      deck_id: deckId,
      score,
      correct_count: correctCount,
      total_attempted: totalAttempted,
      elapsed_ms: elapsedMs,
      meta,
    };

    const { data, error } = await supabase
      .from('game_runs')
      .insert(row)
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('[GameRunService] recordRun failed:', error.message);
      return null;
    }

    try {
      const { StreakService } = require('./StreakService');
      StreakService.recordActivity().catch(() => {});
    } catch {
      /* streak is non-fatal */
    }

    return data;
  }

  static async getMyRunForChallenge(challengeId) {
    if (!SUPABASE_CONFIGURED || !challengeId) return null;
    const userId = AuthService.getUserId();
    if (!userId) return null;
    const { data } = await supabase
      .from('game_runs')
      .select('id, score, correct_count, total_attempted, elapsed_ms, meta, created_at')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle();
    return data || null;
  }

  static async getRunsForChallenge(challengeId) {
    if (!SUPABASE_CONFIGURED || !challengeId) return [];
    const { data } = await supabase
      .from('game_runs')
      .select('user_id, score, correct_count, total_attempted, elapsed_ms, created_at')
      .eq('challenge_id', challengeId);
    return data || [];
  }

  /**
   * Best-per-user leaderboard for a game type, optionally scoped to a class.
   */
  static async getLeaderboard(gameType, { classId = null, limit = TOP_N } = {}) {
    if (!SUPABASE_CONFIGURED) return [];
    try {
      let query = supabase
        .from('game_runs')
        .select('user_id, score, correct_count, elapsed_ms, created_at')
        .eq('game_type', gameType)
        .order('score', { ascending: false })
        .limit(limit * 4);
      if (classId) query = query.eq('class_id', classId);

      const { data } = await query;
      if (!data?.length) return [];

      const best = new Map();
      for (const row of data) {
        if (!best.has(row.user_id)) best.set(row.user_id, row);
      }
      const rows = [...best.values()]
        .sort((a, b) => b.score - a.score || a.elapsed_ms - b.elapsed_ms)
        .slice(0, limit);

      const names = await fetchDisplayNames(rows.map((r) => r.user_id));
      const myId = AuthService.getUserId();
      return rows.map((r) => ({
        userId: r.user_id,
        displayName: r.user_id === myId ? 'You' : (names.get(r.user_id) || 'Student'),
        score: r.score,
        correctCount: r.correct_count,
        elapsedMs: r.elapsed_ms,
        isMe: r.user_id === myId,
      }));
    } catch (err) {
      console.warn('[GameRunService] getLeaderboard failed:', err.message);
      return [];
    }
  }

  /**
   * Accumulate onto the one-run-per-challenge row (Jeopardy claims, etc.).
   * Inserts if this is the user's first play of the challenge.
   */
  static async addToRun(challengeId, {
    gameType,
    classId = null,
    deltaScore = 0,
    deltaCorrect = 0,
    elapsedMs = 0,
    claim = null,
  }) {
    if (!SUPABASE_CONFIGURED || !challengeId) return null;
    const existing = await this.getMyRunForChallenge(challengeId);
    if (!existing) {
      const inserted = await this.recordRun({
        challengeId,
        gameType,
        classId,
        score: deltaScore,
        correctCount: deltaCorrect,
        totalAttempted: 1,
        elapsedMs,
        meta: { claims: claim ? [claim] : [] },
      });
      if (inserted) {
        return {
          id: inserted.id,
          score: deltaScore,
          correct_count: deltaCorrect,
          total_attempted: 1,
          meta: { claims: claim ? [claim] : [] },
        };
      }
      const raced = await this.getMyRunForChallenge(challengeId);
      if (!raced) return null;
      return this._patchRun(raced, { deltaScore, deltaCorrect, elapsedMs, claim });
    }
    return this._patchRun(existing, { deltaScore, deltaCorrect, elapsedMs, claim });
  }

  static async _patchRun(existing, { deltaScore, deltaCorrect, elapsedMs, claim }) {
    const claims = [...(existing.meta?.claims || [])];
    if (claim) claims.push(claim);
    const { data, error } = await supabase
      .from('game_runs')
      .update({
        score: (existing.score || 0) + deltaScore,
        correct_count: (existing.correct_count || 0) + deltaCorrect,
        total_attempted: (existing.total_attempted || 0) + 1,
        elapsed_ms: elapsedMs,
        meta: { ...(existing.meta || {}), claims },
      })
      .eq('id', existing.id)
      .select('id, score, correct_count, total_attempted, meta')
      .maybeSingle();
    if (error) {
      console.warn('[GameRunService] addToRun failed:', error.message);
      return null;
    }
    return data;
  }
}

export { GameRunService };
export default GameRunService;
