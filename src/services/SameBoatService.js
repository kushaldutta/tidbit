import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ClassService } from './ClassService';

/**
 * Past this, the user put the phone down mid-card. Storing that as a response
 * time would poison every average built on the column, so it is dropped.
 */
const MAX_PLAUSIBLE_RESPONSE_MS = 10 * 60 * 1000;

class SameBoatService {
  /**
   * Record that the current user attempted a card and whether they got it right.
   * This is the core instrumentation call — invoke it every time a user flips a
   * card and marks known/unknown.
   *
   * `confidence` (1–4) must be the user's own rating, given *before* they found
   * out whether they were right. Never derive it from correctness: the reason
   * this column is worth storing is to surface cards the user is confident about
   * and wrong about, and a derived rating makes that pairing impossible by
   * construction. Callers with no genuine rating should omit it.
   *
   * `responseMs` is the time from the card appearing to the answer being
   * submitted. Omit it where the number would not mean what it says — a puzzle
   * spanning several guesses, or a correction made after the answer was already
   * revealed.
   */
  static async recordAttempt(
    cardId,
    wasCorrect,
    source = 'session',
    { confidence = null, responseMs = null } = {},
  ) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    const cleanConfidence = Number.isInteger(confidence) && confidence >= 1 && confidence <= 4
      ? confidence
      : null;
    const cleanResponseMs = Number.isFinite(responseMs)
      && responseMs > 0
      && responseMs <= MAX_PLAUSIBLE_RESPONSE_MS
      ? Math.round(responseMs)
      : null;

    try {
      await supabase.from('card_attempts').insert({
        user_id:      userId,
        card_id:      cardId,
        was_correct:  wasCorrect,
        source,
        confidence:   cleanConfidence,
        response_ms:  cleanResponseMs,
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
      const myId = AuthService.getUserId();
      return data.filter((r) => r.user_id !== myId).length;
    } catch (e) {
      console.warn('[SameBoat] getLiveCount error:', e.message);
      return 0;
    }
  }

  /**
   * Fetch the list of classmates currently studying (last 5 minutes),
   * enriched with display names from migration 037's updated view.
   * Returns an array of { userId, displayName } excluding the current user.
   */
  static async getLiveUsers(classId) {
    if (!SUPABASE_CONFIGURED) return [];
    try {
      const { data, error } = await supabase
        .from('class_live_presence')
        .select('user_id, display_name')
        .eq('class_id', classId);
      if (error || !data) return [];
      const myId = AuthService.getUserId();
      return data
        .filter((r) => r.user_id !== myId)
        .map((r) => ({ userId: r.user_id, displayName: r.display_name || 'Tidbit User' }));
    } catch (e) {
      console.warn('[SameBoat] getLiveUsers error:', e.message);
      return [];
    }
  }

  /**
   * Subscribe to live-presence changes for a class via Supabase Realtime.
   * card_attempts inserts/updates trigger the view to refresh — we listen
   * to the card_attempts table and debounce the callback.
   * Returns an unsubscribe function.
   */
  static subscribeToPresence(classId, onUpdate) {
    if (!SUPABASE_CONFIGURED) return () => {};

    let timer = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; onUpdate(); }, 800);
    };

    const channel = supabase
      .channel(`presence:class:${classId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'card_attempts' },
        debounced,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
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

  /**
   * One Home insight: a card your class misses, plus your accuracy if you've tried it.
   */
  static async getHomeInsight() {
    if (!SUPABASE_CONFIGURED) return null;
    try {
      const classIds = await ClassService.getMyClassIds();
      if (!classIds.length) return null;

      const candidates = [];
      for (const classId of classIds) {
        const slug = ClassService.getCategoryForClass(classId);
        if (!slug) continue;
        const { data: deck } = await supabase
          .from('decks')
          .select('id')
          .eq('slug', slug)
          .is('owner_id', null)
          .maybeSingle();
        if (!deck) continue;
        const hardest = await this.getHardestCard(deck.id, 3);
        if (!hardest) continue;
        candidates.push({ classId, slug, ...hardest });
      }
      if (!candidates.length) return null;
      candidates.sort((a, b) => a.pctCorrect - b.pctCorrect);
      const pick = candidates[0];

      const [{ data: card }, classes] = await Promise.all([
        supabase.from('cards').select('id, front, back').eq('id', pick.cardId).maybeSingle(),
        ClassService.getClassesByIds([pick.classId]),
      ]);
      if (!card?.front) return null;

      const userId = AuthService.getUserId();
      let yourPct = null;
      if (userId) {
        const { data: mine } = await supabase
          .from('card_attempts')
          .select('was_correct')
          .eq('user_id', userId)
          .eq('card_id', pick.cardId);
        if (mine?.length) {
          yourPct = Math.round((mine.filter((a) => a.was_correct).length / mine.length) * 100);
        }
      }

      const classPct = Math.round(pick.pctCorrect);
      return {
        cardId: pick.cardId,
        term: card.front,
        classCode: classes[0]?.code || pick.slug,
        classPct,
        yourPct,
        attempts: pick.attempts,
        categorySlug: pick.slug,
        belowClass: yourPct != null && yourPct < classPct,
      };
    } catch (e) {
      console.warn('[SameBoat] getHomeInsight error:', e.message);
      return null;
    }
  }
}

export { SameBoatService };
export default SameBoatService;
