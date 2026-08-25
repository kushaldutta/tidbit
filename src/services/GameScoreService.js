/**
 * GameScoreService — leaderboards for Match and Speed Run.
 *
 * Both modes scope leaderboards by deck_id (supports real UUID decks and
 * virtual 'category:...' slugs). Best-per-user is computed in JS after
 * fetching recent scores so we stay query-simple.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { AchievementService } from './AchievementService';

const TOP_N = 10;
/** Speed Demon threshold — see src/config/achievementCatalog.js. */
const SPEED_DEMON_CORRECT = 15;

// ─── Helpers ─────────────────────────────────────────────────

async function fetchDisplayNames(userIds) {
  if (!userIds.length) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  return new Map((data || []).map((p) => [p.id, p.display_name || 'Student']));
}

// ─── Match ────────────────────────────────────────────────────

class GameScoreService {
  /**
   * Save a completed Match round.
   */
  static async saveMatchScore(deckId, pairsCount, elapsedSeconds, mistakes) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    try {
      await supabase.from('match_scores').insert({
        deck_id: deckId,
        user_id: userId,
        pairs_count: pairsCount,
        elapsed_seconds: elapsedSeconds,
        mistakes,
      });
    } catch (err) {
      console.warn('[GameScoreService] saveMatchScore failed:', err.message);
    }
  }

  /**
   * Top Match scores for a deck.
   * Sort: fewest mistakes → fastest time.
   * Returns one best row per user, top N overall.
   */
  static async getMatchLeaderboard(deckId) {
    if (!SUPABASE_CONFIGURED) return [];
    try {
      const { data } = await supabase
        .from('match_scores')
        .select('user_id, pairs_count, elapsed_seconds, mistakes, played_at')
        .eq('deck_id', deckId)
        .order('mistakes', { ascending: true })
        .order('elapsed_seconds', { ascending: true })
        .limit(TOP_N * 3); // fetch more to allow per-user dedup

      if (!data?.length) return [];

      // Keep only best score per user
      const best = new Map();
      for (const row of data) {
        if (!best.has(row.user_id)) best.set(row.user_id, row);
        // Already sorted best-first, so first occurrence is their best
      }

      const rows = [...best.values()]
        .sort((a, b) => a.mistakes - b.mistakes || a.elapsed_seconds - b.elapsed_seconds)
        .slice(0, TOP_N);

      const names = await fetchDisplayNames(rows.map((r) => r.user_id));
      const myId = AuthService.getUserId();

      return rows.map((r) => ({
        userId: r.user_id,
        displayName: r.user_id === myId ? 'You' : (names.get(r.user_id) || 'Student'),
        pairsCount: r.pairs_count,
        elapsedSeconds: r.elapsed_seconds,
        mistakes: r.mistakes,
        isMe: r.user_id === myId,
      }));
    } catch (err) {
      console.warn('[GameScoreService] getMatchLeaderboard failed:', err.message);
      return [];
    }
  }

  /**
   * Personal best for Match on a deck.
   */
  static async getMyMatchBest(deckId) {
    if (!SUPABASE_CONFIGURED) return null;
    const userId = AuthService.getUserId();
    if (!userId) return null;
    try {
      const { data } = await supabase
        .from('match_scores')
        .select('elapsed_seconds, mistakes, pairs_count, played_at')
        .eq('deck_id', deckId)
        .eq('user_id', userId)
        .order('mistakes', { ascending: true })
        .order('elapsed_seconds', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data || null;
    } catch {
      return null;
    }
  }

  // ─── Speed Run ──────────────────────────────────────────────

  /**
   * Save a completed Speed Run.
   */
  static async saveSpeedRunScore(deckId, durationSeconds, correctCount, totalAttempted) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    try {
      await supabase.from('speed_run_scores').insert({
        deck_id: deckId,
        user_id: userId,
        duration_seconds: durationSeconds,
        correct_count: correctCount,
        total_attempted: totalAttempted,
      });
      if (correctCount >= SPEED_DEMON_CORRECT) {
        AchievementService.unlock('speed_demon').catch(() => {});
      }
    } catch (err) {
      console.warn('[GameScoreService] saveSpeedRunScore failed:', err.message);
    }
  }

  /**
   * Top Speed Run scores for a deck + duration.
   * Sort: most correct → most attempted (tie-break).
   * Returns one best row per user.
   */
  static async getSpeedRunLeaderboard(deckId, durationSeconds) {
    if (!SUPABASE_CONFIGURED) return [];
    try {
      const { data } = await supabase
        .from('speed_run_scores')
        .select('user_id, correct_count, total_attempted, played_at')
        .eq('deck_id', deckId)
        .eq('duration_seconds', durationSeconds)
        .order('correct_count', { ascending: false })
        .order('total_attempted', { ascending: false })
        .limit(TOP_N * 3);

      if (!data?.length) return [];

      const best = new Map();
      for (const row of data) {
        if (!best.has(row.user_id)) best.set(row.user_id, row);
      }

      const rows = [...best.values()]
        .sort((a, b) => b.correct_count - a.correct_count || b.total_attempted - a.total_attempted)
        .slice(0, TOP_N);

      const names = await fetchDisplayNames(rows.map((r) => r.user_id));
      const myId = AuthService.getUserId();

      return rows.map((r) => ({
        userId: r.user_id,
        displayName: r.user_id === myId ? 'You' : (names.get(r.user_id) || 'Student'),
        correctCount: r.correct_count,
        totalAttempted: r.total_attempted,
        isMe: r.user_id === myId,
      }));
    } catch (err) {
      console.warn('[GameScoreService] getSpeedRunLeaderboard failed:', err.message);
      return [];
    }
  }

  /**
   * Personal best Speed Run for a deck + duration.
   */
  static async getMySpeedRunBest(deckId, durationSeconds) {
    if (!SUPABASE_CONFIGURED) return null;
    const userId = AuthService.getUserId();
    if (!userId) return null;
    try {
      const { data } = await supabase
        .from('speed_run_scores')
        .select('correct_count, total_attempted, played_at')
        .eq('deck_id', deckId)
        .eq('user_id', userId)
        .eq('duration_seconds', durationSeconds)
        .order('correct_count', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    } catch {
      return null;
    }
  }
}

export { GameScoreService };
export default GameScoreService;
