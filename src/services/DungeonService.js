/**
 * DungeonService — Floor 1 of the class dungeon.
 *
 * Deck sections map to floors. Floor 1 = first section (or first 8 cards).
 * Same-boat accuracy picks the boss and elite rooms.
 * Prompt direction: definition (back) → term (front).
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { DeckService } from './DeckService';
import { GameRunService } from './GameRunService';
import { CoinService } from './CoinService';
import { AchievementService } from './AchievementService';
import { GAME_TYPE } from '../config/gameCatalog';

const ROOMS_PER_FLOOR = 8;
const MAX_HP = 4;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hintFromTerm(term) {
  const t = String(term || '').trim();
  if (!t) return '';
  return t
    .split('')
    .map((ch, i) => {
      if (i === 0) return ch;
      if (/\s/.test(ch)) return ' ';
      return '·';
    })
    .join('');
}

class DungeonService {
  static MAX_HP = MAX_HP;

  static async loadDeck(categorySlug) {
    if (!SUPABASE_CONFIGURED || !categorySlug) return null;
    const { data: deck } = await supabase
      .from('decks')
      .select('id, title')
      .eq('slug', categorySlug)
      .is('owner_id', null)
      .maybeSingle();
    return deck || null;
  }

  static async buildFloor(categorySlug) {
    const deck = await this.loadDeck(categorySlug);
    if (!deck) return null;

    const [sections, { data: cardRows }] = await Promise.all([
      DeckService.listSections(deck.id),
      supabase
        .from('cards')
        .select('id, front, back, section_id, position')
        .eq('deck_id', deck.id)
        .not('front', 'is', null)
        .not('back', 'is', null)
        .order('position', { ascending: true }),
    ]);

    const cards = (cardRows || []).filter((c) => c.front?.trim() && c.back?.trim());
    if (cards.length < 3) return null;

    const firstSection = (sections || []).find((s) =>
      cards.some((c) => c.section_id === s.id),
    );
    const pool = firstSection
      ? cards.filter((c) => c.section_id === firstSection.id)
      : cards;
    const floorTitle = firstSection?.title || 'Floor 1';
    const usable = pool.length >= 3 ? pool : cards;

    const ids = usable.map((c) => c.id);
    const { data: stats } = await supabase
      .from('card_same_boat')
      .select('card_id, attempts, pct_correct')
      .in('card_id', ids);

    const statMap = new Map(
      (stats || []).map((s) => [
        s.card_id,
        { attempts: s.attempts || 0, pctCorrect: s.pct_correct },
      ]),
    );

    let bossId = null;
    let lowest = 101;
    for (const c of usable) {
      const s = statMap.get(c.id);
      if (s && s.attempts >= 3 && s.pctCorrect != null && s.pctCorrect < lowest) {
        lowest = s.pctCorrect;
        bossId = c.id;
      }
    }

    let picked;
    if (usable.length <= ROOMS_PER_FLOOR) {
      picked = [...usable];
    } else {
      const rest = shuffle(usable.filter((c) => c.id !== bossId)).slice(0, ROOMS_PER_FLOOR - 1);
      const bossCard = usable.find((c) => c.id === bossId) || usable[usable.length - 1];
      picked = [...rest, bossCard];
    }

    if (bossId) {
      const bi = picked.findIndex((c) => c.id === bossId);
      if (bi >= 0 && bi !== picked.length - 1) {
        const [boss] = picked.splice(bi, 1);
        picked.push(boss);
      }
    } else {
      // No class data yet — last room is still the boss.
      bossId = picked[picked.length - 1].id;
    }

    const rooms = picked.map((card, i) => {
      const s = statMap.get(card.id) || null;
      const isBoss = card.id === bossId || i === picked.length - 1;
      const elite = !isBoss && s && s.attempts >= 3 && s.pctCorrect < 55;
      return {
        card,
        kind: isBoss ? 'boss' : elite ? 'elite' : 'normal',
        sameBoat: s,
      };
    });

    return {
      deckId: deck.id,
      deckTitle: deck.title,
      floorTitle,
      rooms,
    };
  }

  static buildQuizOptions(card, allCards) {
    const correct = card.front.trim();
    const pool = allCards
      .filter((c) => c.id !== card.id && c.front?.trim() && c.front.trim() !== correct)
      .map((c) => c.front.trim());
    const distractors = shuffle([...new Set(pool)]).slice(0, 2);
    while (distractors.length < 2) distractors.push('Not this');
    const options = shuffle([correct, ...distractors]);
    return { options, correctIndex: options.indexOf(correct) };
  }

  static hintFor(card) {
    return hintFromTerm(card.front);
  }

  static damageFor(kind) {
    return kind === 'boss' ? 2 : 1;
  }

  static coinsFor({ roomsCleared, clearedFloor }) {
    if (roomsCleared <= 0) return 0;
    return 5 + roomsCleared * 3 + (clearedFloor ? 20 : 0);
  }

  static async submitRun({ classId, roomsCleared, totalRooms, hpLeft, elapsedMs, clearedFloor }) {
    const score = roomsCleared * 100 + hpLeft * 25 + (clearedFloor ? 500 : 0);
    const run = await GameRunService.recordRun({
      gameType: GAME_TYPE.DUNGEON,
      classId,
      score,
      correctCount: roomsCleared,
      totalAttempted: totalRooms,
      elapsedMs,
      meta: { roomsCleared, clearedFloor, hpLeft },
    });

    const coins = this.coinsFor({ roomsCleared, clearedFloor });
    if (run?.id && coins > 0) {
      await CoinService.credit(
        coins,
        'dungeon',
        run.id,
        clearedFloor ? 'Dungeon floor cleared' : `Dungeon · ${roomsCleared} rooms`,
      );
    }
    if (clearedFloor) {
      await AchievementService.unlock('dungeon_diver');
    }

    const leaderboard = await GameRunService.getLeaderboard(GAME_TYPE.DUNGEON, { classId });
    return { coins, score, leaderboard, runId: run?.id || null };
  }
}

export { DungeonService };
export default DungeonService;
