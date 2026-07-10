/**
 * DailyChallengeService — Daily Class Challenge logic.
 *
 * Each class gets the same 10 cards per UTC day, seeded deterministically
 * from hash(categorySlug + ISO date) so every student plays identical questions.
 *
 * Scoring (per spec):
 *   Recall correct → 3 pts   Quiz correct → 1 pt   Wrong → 0
 *
 * Coin awards (end-of-day, once per challenge):
 *   Participation (all 10 answered) → 5 coins
 *   Rank #1  → 50  |  Rank #2–3 → 30  |  Rank #4–10 → 10
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ContentService } from './ContentService';
import { RecallService } from './RecallService';
import { CoinService } from './CoinService';

export const CHALLENGE_QUESTION_COUNT = 10;
export const RECALL_POINTS = 3;
export const QUIZ_POINTS = 1;

const COIN_PARTICIPATION = 5;
const COIN_RANK = [50, 30, 30, 10, 10, 10, 10, 10, 10, 10]; // index 0 = rank 1

// ─── Deterministic seeded shuffle ────────────────────────────

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ─── Card loading ─────────────────────────────────────────────

async function loadDeckCardsForCategory(categorySlug) {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    // Find preset deck for slug
    const { data: deck } = await supabase
      .from('decks')
      .select('id')
      .eq('slug', categorySlug)
      .is('owner_id', null)
      .maybeSingle();
    if (!deck) return [];

    const { data: cards } = await supabase
      .from('cards')
      .select('id, front, back')
      .eq('deck_id', deck.id)
      .not('front', 'is', null)
      .not('back', 'is', null);
    return (cards || []).filter((c) => c.front?.trim() && c.back?.trim());
  } catch (err) {
    console.warn('[DailyChallenge] loadDeckCards failed:', err.message);
    return [];
  }
}

// ─── Challenge fetching / creation ────────────────────────────

class DailyChallengeService {
  /**
   * Get (or lazily create) today's challenge for a category.
   * Returns { id, categorySlug, challengeDate, cardIds } or null.
   */
  static async getTodayChallenge(categorySlug) {
    if (!SUPABASE_CONFIGURED) return null;
    const date = todayUTC();

    // Try to fetch existing
    const { data: existing } = await supabase
      .from('daily_challenges')
      .select('id, category_slug, challenge_date, card_ids')
      .eq('category_slug', categorySlug)
      .eq('challenge_date', date)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        categorySlug: existing.category_slug,
        challengeDate: existing.challenge_date,
        cardIds: existing.card_ids,
      };
    }

    // Create deterministic set
    const allCards = await loadDeckCardsForCategory(categorySlug);
    if (allCards.length < 2) return null;

    const seed = hashSeed(`${categorySlug}:${date}`);
    const shuffled = seededShuffle(allCards, seed);
    const selected = shuffled.slice(0, Math.min(CHALLENGE_QUESTION_COUNT, shuffled.length));
    const cardIds = selected.map((c) => c.id);

    // Insert, ignoring duplicate if another client already created it this second
    await supabase
      .from('daily_challenges')
      .upsert(
        { category_slug: categorySlug, challenge_date: date, card_ids: cardIds },
        { onConflict: 'category_slug,challenge_date', ignoreDuplicates: true },
      );

    // Always fetch back — works whether we just inserted or someone beat us to it
    const { data: row } = await supabase
      .from('daily_challenges')
      .select('id, category_slug, challenge_date, card_ids')
      .eq('category_slug', categorySlug)
      .eq('challenge_date', date)
      .maybeSingle();

    if (!row) return null;
    return {
      id: row.id,
      categorySlug: row.category_slug,
      challengeDate: row.challenge_date,
      cardIds: row.card_ids,
    };
  }

  /**
   * Load the actual card objects for a challenge.
   * Returns cards in challenge order.
   */
  static async getChallengeCards(challenge) {
    if (!challenge?.cardIds?.length) return [];
    if (!SUPABASE_CONFIGURED) return [];

    try {
      const { data: cards } = await supabase
        .from('cards')
        .select('id, front, back')
        .in('id', challenge.cardIds);

      const byId = new Map((cards || []).map((c) => [c.id, c]));
      return challenge.cardIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .filter((c) => c.front?.trim() && c.back?.trim());
    } catch (err) {
      console.warn('[DailyChallenge] getChallengeCards failed:', err.message);
      return [];
    }
  }

  // ─── My run ─────────────────────────────────────────────────

  /**
   * Returns { entries: [...], totalPoints, completed } for current user.
   */
  static async getMyRun(challengeId) {
    if (!SUPABASE_CONFIGURED) return { entries: [], totalPoints: 0, completed: false };
    const userId = AuthService.getUserId();
    if (!userId) return { entries: [], totalPoints: 0, completed: false };

    try {
      const { data } = await supabase
        .from('daily_challenge_entries')
        .select('question_index, mode, was_correct, points_earned')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .order('question_index', { ascending: true });

      const entries = data || [];
      const totalPoints = entries.reduce((s, e) => s + (e.points_earned ?? 0), 0);
      const completed = entries.length >= CHALLENGE_QUESTION_COUNT;
      return { entries, totalPoints, completed };
    } catch (err) {
      console.warn('[DailyChallenge] getMyRun failed:', err.message);
      return { entries: [], totalPoints: 0, completed: false };
    }
  }

  // ─── Submit answer ────────────────────────────────────────────

  /**
   * Grade and persist one answer.
   * Returns { wasCorrect, pointsEarned } or null on error.
   * No-ops silently if the question was already answered.
   */
  static async submitAnswer(challengeId, questionIndex, mode, payload, card) {
    if (!SUPABASE_CONFIGURED) return null;
    const userId = AuthService.getUserId();
    if (!userId) return null;

    let wasCorrect = false;

    if (mode === 'recall') {
      const result = RecallService.grade(payload.userAnswer, card.front);
      wasCorrect = result.isCorrect;
    } else {
      // quiz mode: payload.chosenIndex compared to payload.correctIndex
      wasCorrect = payload.chosenIndex === payload.correctIndex;
    }

    const pointsEarned = wasCorrect ? (mode === 'recall' ? RECALL_POINTS : QUIZ_POINTS) : 0;

    try {
      const { error } = await supabase
        .from('daily_challenge_entries')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          question_index: questionIndex,
          mode,
          was_correct: wasCorrect,
          points_earned: pointsEarned,
        });

      // Ignore unique-violation (already answered)
      if (error && !error.message?.includes('unique')) {
        throw error;
      }

      return { wasCorrect, pointsEarned };
    } catch (err) {
      console.warn('[DailyChallenge] submitAnswer failed:', err.message);
      return null;
    }
  }

  // ─── Leaderboard ──────────────────────────────────────────────

  /**
   * Returns top entries for a challenge.
   * Each row: { userId, displayName, totalPoints, completedAt }
   */
  static async getLeaderboard(challengeId, limit = 20) {
    if (!SUPABASE_CONFIGURED) return [];

    try {
      const { data } = await supabase
        .from('daily_challenge_entries')
        .select('user_id, points_earned, answered_at')
        .eq('challenge_id', challengeId);

      if (!data?.length) return [];

      // Aggregate per user
      const byUser = new Map();
      for (const row of data) {
        if (!byUser.has(row.user_id)) {
          byUser.set(row.user_id, { totalPoints: 0, lastAnswered: row.answered_at, count: 0 });
        }
        const u = byUser.get(row.user_id);
        u.totalPoints += row.points_earned ?? 0;
        u.count += 1;
        if (row.answered_at > u.lastAnswered) u.lastAnswered = row.answered_at;
      }

      // Fetch display names
      const userIds = [...byUser.keys()];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);
      const nameById = new Map((profiles || []).map((p) => [p.id, p.display_name || 'Student']));

      const rows = [...byUser.entries()]
        .map(([userId, stats]) => ({
          userId,
          displayName: nameById.get(userId) || 'Student',
          totalPoints: stats.totalPoints,
          completedAll: stats.count >= CHALLENGE_QUESTION_COUNT,
          lastAnswered: stats.lastAnswered,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints || a.lastAnswered.localeCompare(b.lastAnswered))
        .slice(0, limit);

      return rows;
    } catch (err) {
      console.warn('[DailyChallenge] getLeaderboard failed:', err.message);
      return [];
    }
  }

  // ─── Coin awards ──────────────────────────────────────────────

  /**
   * Claim participation + rank coins for a completed challenge.
   * Safe to call multiple times — RPC deduplicates.
   */
  static async tryClaimRewards(challengeId) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    // Participation coins
    await CoinService.credit(
      COIN_PARTICIPATION,
      'daily_challenge_participation',
      challengeId,
      'Completed daily challenge',
    );

    // Rank coins — compute rank from leaderboard
    try {
      const leaderboard = await this.getLeaderboard(challengeId, 10);
      const rankIndex = leaderboard.findIndex((r) => r.userId === userId);
      if (rankIndex >= 0 && rankIndex < COIN_RANK.length) {
        const rankCoins = COIN_RANK[rankIndex];
        if (rankCoins > 0) {
          await CoinService.credit(
            rankCoins,
            'daily_challenge_rank',
            `${challengeId}:rank`,
            `Daily challenge rank #${rankIndex + 1}`,
          );
        }
      }
    } catch (err) {
      console.warn('[DailyChallenge] tryClaimRewards rank failed:', err.message);
    }
  }
}

export { DailyChallengeService };
export default DailyChallengeService;
