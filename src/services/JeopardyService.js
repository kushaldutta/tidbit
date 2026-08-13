/**
 * JeopardyService — one shared class board per UTC day.
 * Categories from deck sections (or chunked deck). First correct claim wins the square.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ProfileService } from './ProfileService';
import { DeckService } from './DeckService';
import { GameRunService } from './GameRunService';
import { CoinService } from './CoinService';
import { AchievementService } from './AchievementService';
import { RecallService } from './RecallService';
import { GAME_TYPE } from '../config/gameCatalog';

export const JEOPARDY_VALUES = [200, 400, 600, 800, 1000];
const MAX_CATS = 5;

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function mulberry32(a) {
  return function next() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seedNum) {
  const rand = mulberry32(seedNum || 1);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function shortTitle(title, fallback) {
  const t = String(title || fallback || 'TOPIC').trim();
  if (t.length <= 16) return t.toUpperCase();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const two = `${words[0]} ${words[1]}`;
    return (two.length <= 18 ? two : words[0]).toUpperCase();
  }
  return t.slice(0, 14).toUpperCase();
}

function difficulty(card, statMap) {
  const s = statMap.get(card.id);
  if (s && s.attempts >= 2 && s.pctCorrect != null) return 100 - s.pctCorrect;
  return card.position || 0;
}

async function parentGroupId(classId) {
  const { data } = await supabase
    .from('groups')
    .select('id')
    .eq('class_id', classId)
    .is('section_name', null)
    .maybeSingle();
  return data?.id || null;
}

function buildCategories(sections, cards, seedNum) {
  const usable = (cards || []).filter((c) => c.front?.trim() && c.back?.trim());
  const fromSections = (sections || [])
    .map((s) => ({
      title: shortTitle(s.title),
      cards: usable.filter((c) => c.section_id === s.id),
    }))
    .filter((c) => c.cards.length >= 3);

  if (fromSections.length >= 2) {
    return seededShuffle(fromSections, seedNum).slice(0, MAX_CATS);
  }

  const shuffled = seededShuffle(usable, seedNum);
  const n = Math.min(MAX_CATS, Math.max(2, Math.floor(shuffled.length / 3)));
  const size = Math.ceil(shuffled.length / n);
  const cats = [];
  for (let i = 0; i < n; i++) {
    const slice = shuffled.slice(i * size, (i + 1) * size);
    if (slice.length >= 2) {
      cats.push({ title: `SET ${i + 1}`, cards: slice });
    }
  }
  return cats;
}

function buildCells(categories, values, seedNum, statMap) {
  const cells = [];
  categories.forEach((cat, catIndex) => {
    const picked = seededShuffle(cat.cards, seedNum + catIndex * 17).slice(0, values.length);
    picked.sort((a, b) => difficulty(a, statMap) - difficulty(b, statMap));
    values.forEach((value, valueIndex) => {
      const card = picked[valueIndex] || null;
      cells.push({
        catIndex,
        valueIndex,
        value,
        cardId: card?.id || null,
        claimedBy: null,
        claimedName: null,
      });
    });
  });
  return cells;
}

class JeopardyService {
  static async getToday(classId, categorySlug) {
    if (!SUPABASE_CONFIGURED) return null;
    const date = todayUTC();
    const { data: rows } = await supabase
      .from('game_challenges')
      .select('*')
      .eq('game_type', GAME_TYPE.JEOPARDY)
      .eq('class_id', classId)
      .eq('seed', date)
      .order('created_at', { ascending: true })
      .limit(1);
    if (rows?.[0]) return this._hydrate(rows[0]);

    const { data: deck } = await supabase
      .from('decks')
      .select('id')
      .eq('slug', categorySlug)
      .is('owner_id', null)
      .maybeSingle();
    if (!deck) return null;

    const [sections, { data: cardRows }] = await Promise.all([
      DeckService.listSections(deck.id),
      supabase
        .from('cards')
        .select('id, front, back, section_id, position')
        .eq('deck_id', deck.id)
        .order('position', { ascending: true }),
    ]);

    const seedNum = hashSeed(`${categorySlug}:${date}:jeopardy`);
    const categories = buildCategories(sections, cardRows || [], seedNum);
    if (!categories.length) return null;

    const minCards = Math.min(...categories.map((c) => c.cards.length));
    const nValues = Math.min(JEOPARDY_VALUES.length, Math.max(3, minCards));
    const values = JEOPARDY_VALUES.slice(0, nValues);

    const ids = categories.flatMap((c) => c.cards.map((card) => card.id));
    const { data: stats } = ids.length
      ? await supabase
          .from('card_same_boat')
          .select('card_id, attempts, pct_correct')
          .in('card_id', ids)
      : { data: [] };
    const statMap = new Map(
      (stats || []).map((s) => [
        s.card_id,
        { attempts: s.attempts || 0, pctCorrect: s.pct_correct },
      ]),
    );

    const cells = buildCells(categories, values, seedNum, statMap);
    if (!cells.some((c) => c.cardId)) return null;

    const userId = AuthService.getUserId();
    const groupId = await parentGroupId(classId);
    const meta = {
      date,
      categories: categories.map((c) => ({ title: c.title })),
      values,
      cells,
    };

    const { data: inserted, error } = await supabase
      .from('game_challenges')
      .insert({
        game_type: GAME_TYPE.JEOPARDY,
        class_id: classId,
        group_id: groupId,
        challenger_id: userId,
        status: 'in_progress',
        card_ids: cells.map((c) => c.cardId).filter(Boolean),
        seed: date,
        meta,
      })
      .select('*')
      .single();

    if (error) {
      const { data: again } = await supabase
        .from('game_challenges')
        .select('*')
        .eq('game_type', GAME_TYPE.JEOPARDY)
        .eq('class_id', classId)
        .eq('seed', date)
        .order('created_at', { ascending: true })
        .limit(1);
      if (again?.[0]) return this._hydrate(again[0]);
      console.warn('[Jeopardy] create failed:', error.message);
      return null;
    }
    return this._hydrate(inserted);
  }

  static async refresh(challengeId) {
    if (!SUPABASE_CONFIGURED || !challengeId) return null;
    const { data } = await supabase
      .from('game_challenges')
      .select('*')
      .eq('id', challengeId)
      .maybeSingle();
    if (!data) return null;
    return this._hydrate(data);
  }

  static async _hydrate(row) {
    const meta = row.meta || {};
    const ids = (meta.cells || []).map((c) => c.cardId).filter(Boolean);
    const { data: cards } = ids.length
      ? await supabase.from('cards').select('id, front, back').in('id', ids)
      : { data: [] };
    const map = new Map((cards || []).map((c) => [c.id, c]));
    const cells = (meta.cells || []).map((c, i) => ({
      ...c,
      index: i,
      card: map.get(c.cardId) || null,
    }));
    return {
      id: row.id,
      classId: row.class_id,
      groupId: row.group_id,
      date: row.seed,
      categories: meta.categories || [],
      values: meta.values || JEOPARDY_VALUES,
      cells,
    };
  }

  static coinsFor(value) {
    return Math.max(1, Math.round(Number(value || 0) / 100));
  }

  static async tryClaim({ board, cellIndex, answer, elapsedMs }) {
    const cell = board.cells[cellIndex];
    if (!cell?.card) return { ok: false, reason: 'missing' };
    if (cell.claimedBy) return { ok: false, reason: 'taken', board };

    const graded = RecallService.grade(String(answer || '').trim(), cell.card.front);
    if (!graded.isCorrect) return { ok: false, reason: 'wrong', graded };

    const profile = await ProfileService.getMyProfile();
    const name = profile?.display_name || 'Student';
    const { data: claimed, error } = await supabase.rpc('claim_game_cell', {
      p_challenge_id: board.id,
      p_cell_index: cellIndex,
      p_display_name: name,
    });

    if (error) {
      console.warn('[Jeopardy] claim rpc:', error.message);
      return { ok: false, reason: 'error' };
    }

    const fresh = await this.refresh(board.id);
    if (!claimed) {
      return { ok: false, reason: 'taken', board: fresh || board };
    }

    const coins = this.coinsFor(cell.value);
    const existing = await GameRunService.getMyRunForChallenge(board.id);
    const run = await GameRunService.addToRun(board.id, {
      gameType: GAME_TYPE.JEOPARDY,
      classId: board.classId,
      deltaScore: cell.value,
      deltaCorrect: 1,
      elapsedMs,
      claim: { cellIndex, value: cell.value },
    });

    if (run?.id) {
      await CoinService.credit(
        coins,
        'jeopardy',
        `${board.id}:${cellIndex}`,
        `${cell.value} Jeopardy`,
      );
    }
    if (!existing) {
      await AchievementService.unlock('board_claimer');
      if (board.groupId) {
        const userId = AuthService.getUserId();
        await supabase.from('feed_posts').insert({
          author_id: userId,
          group_id: board.groupId,
          post_type: 'activity',
          payload: {
            event: 'jeopardy',
            text: `claimed a ${cell.value} on today's Jeopardy board`,
            challengeId: board.id,
          },
        });
      }
    }

    const leaderboard = await this.getTodayBoard(board.id);
    return {
      ok: true,
      coins,
      value: cell.value,
      term: cell.card.front,
      board: fresh || board,
      score: run?.score ?? cell.value,
      leaderboard,
    };
  }

  static async getTodayBoard(challengeId) {
    const runs = await GameRunService.getRunsForChallenge(challengeId);
    if (!runs.length) return [];
    const ids = [...new Set(runs.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', ids);
    const names = new Map((profiles || []).map((p) => [p.id, p.display_name || 'Student']));
    const myId = AuthService.getUserId();
    return [...runs]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({
        userId: r.user_id,
        displayName: r.user_id === myId ? 'You' : names.get(r.user_id) || 'Student',
        score: r.score,
        claims: r.correct_count,
        isMe: r.user_id === myId,
      }));
  }
}

export { JeopardyService };
export default JeopardyService;
