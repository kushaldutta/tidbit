import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class SameBoatService {
  /**
   * Record that the current user attempted a card and whether they got it right.
   * This is the core instrumentation call — invoke it every time a user flips a
   * card and marks known/unknown.
   */
  static async recordAttempt(cardId, wasCorrect, source = 'session') {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    try {
      await supabase.from('card_attempts').insert({
        user_id:      userId,
        card_id:      cardId,
        was_correct:  wasCorrect,
        source,
        attempted_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[SameBoat] recordAttempt error:', e.message);
    }
  }

  /**
   * Get class-level accuracy stats for a single card.
   * The card_same_boat view is filtered by RLS so you only see aggregates
   * for attempts by you and your classmates.
   *
   * Returns: { attempts: number, pctCorrect: number } or null if no data.
   */
  static async getCardStat(cardId) {
    if (!SUPABASE_CONFIGURED) return null;
    try {
      const { data, error } = await supabase
        .from('card_same_boat')
        .select('attempts, pct_correct')
        .eq('card_id', cardId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        attempts:   data.attempts || 0,
        pctCorrect: data.pct_correct ?? null,
      };
    } catch (e) {
      console.warn('[SameBoat] getCardStat error:', e.message);
      return null;
    }
  }

  /**
   * Count how many unique classmates are actively studying RIGHT NOW
   * (any card attempt in the last 5 minutes) for a given class.
   * Returns 0 if no data or an error occurs.
   */
  static async getLiveCount(classId) {
    if (!SUPABASE_CONFIGURED) return 0;
    try {
      const { data, error } = await supabase
        .from('class_live_presence')
        .select('user_id')
        .eq('class_id', classId);
      if (error || !data) return 0;
      // Exclude the current user from the count
      const myId = AuthService.getUserId();
      return data.filter((r) => r.user_id !== myId).length;
    } catch (e) {
      console.warn('[SameBoat] getLiveCount error:', e.message);
      return 0;
    }
  }

  /**
   * For a deck, return the hardest card — the one with the lowest pct_correct
   * among cards that have at least `minAttempts` recorded attempts.
   * Returns null if no attempt data exists yet.
   */
  static async getHardestCard(deckId, minAttempts = 3) {
    if (!SUPABASE_CONFIGURED) return null;
    try {
      // Get all card IDs for this deck
      const { data: cards, error: cErr } = await supabase
        .from('cards')
        .select('id')
        .eq('deck_id', deckId);
      if (cErr || !cards?.length) return null;

      const cardIds = cards.map((c) => c.id);

      // Get Same-Boat stats for those cards
      const { data: stats, error: sErr } = await supabase
        .from('card_same_boat')
        .select('card_id, attempts, pct_correct')
        .in('card_id', cardIds)
        .gte('attempts', minAttempts)
        .order('pct_correct', { ascending: true })
        .limit(1);

      if (sErr || !stats?.length) return null;
      return {
        cardId:     stats[0].card_id,
        attempts:   stats[0].attempts,
        pctCorrect: stats[0].pct_correct,
      };
    } catch (e) {
      console.warn('[SameBoat] getHardestCard error:', e.message);
      return null;
    }
  }
}

export { SameBoatService };
export default SameBoatService;
