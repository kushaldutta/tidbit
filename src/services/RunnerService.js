/**
 * RunnerService — Infinite Runner card pool + scoring.
 *
 * Prompt direction matches Daily Challenge / Speed Duel:
 *   definition (card.back) on the obstacle, tap the term (card.front).
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { GameRunService } from './GameRunService';
import { CoinService } from './CoinService';
import { AchievementService } from './AchievementService';
import { GAME_TYPE } from '../config/gameCatalog';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class RunnerService {
  static async loadCards(categorySlug) {
    if (!SUPABASE_CONFIGURED || !categorySlug) return [];
    try {
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
      console.warn('[Runner] loadCards failed:', err.message);
      return [];
    }
  }

  /**
   * One obstacle: definition prompt + 3 term options.
   */
  static buildObstacle(card, allCards) {
    const correct = card.front.trim();
    const pool = allCards
      .filter((c) => c.id !== card.id && c.front?.trim() && c.front.trim() !== correct)
      .map((c) => c.front.trim());
    const distractors = shuffle([...new Set(pool)]).slice(0, 2);
    while (distractors.length < 2) {
      distractors.push(distractors.length === 0 ? 'Not this one' : 'Skip');
    }
    const options = shuffle([correct, ...distractors]);
    return {
      card,
      prompt: card.back.trim(),
      options,
      correctIndex: options.indexOf(correct),
    };
  }

  static travelMs(correctCount) {
    return Math.max(1600, 4000 - correctCount * 160);
  }

  static coinsForDistance(meters) {
    if (meters < 40) return 0;
    const play = 5;
    const bonus = Math.min(25, Math.floor(meters / 100));
    return play + bonus;
  }

  static async submitRun({ classId, distance, correctCount, elapsedMs }) {
    const meters = Math.floor(distance);
    const run = await GameRunService.recordRun({
      gameType: GAME_TYPE.RUNNER,
      classId,
      score: meters,
      correctCount,
      totalAttempted: correctCount + 1, // last one is the wipe
      elapsedMs,
      meta: { distance: meters },
    });

    const coins = this.coinsForDistance(meters);
    if (run?.id && coins > 0) {
      await CoinService.credit(coins, 'runner', run.id, `${meters}m Infinite Runner`);
    }
    if (meters >= 1000) {
      await AchievementService.unlock('runner_1k');
    }

    const leaderboard = await GameRunService.getLeaderboard(GAME_TYPE.RUNNER, { classId });
    return { coins, meters, leaderboard, runId: run?.id || null };
  }
}

export { RunnerService };
export default RunnerService;
