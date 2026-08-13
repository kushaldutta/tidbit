/**
 * DailyTermService — one Wordle-style term per class per UTC day.
 * Same card for everyone (seeded like Daily Challenge). Guess the term.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { GameRunService } from './GameRunService';
import { CoinService } from './CoinService';
import { GAME_TYPE } from '../config/gameCatalog';

export const MAX_GUESSES = 6;

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeTerm(front) {
  return String(front || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function letterCount(term) {
  return term.replace(/ /g, '').length;
}

export function isWordleable(front) {
  const n = normalizeTerm(front);
  const letters = letterCount(n);
  const words = n.split(' ').filter(Boolean);
  return letters >= 4 && letters <= 12 && words.length <= 2 && n.length > 0;
}

export function expandGuess(letters, pattern) {
  let i = 0;
  return pattern
    .split('')
    .map((ch) => {
      if (ch === ' ') return ' ';
      return letters[i++] || '';
    })
    .join('');
}

/** Wordle coloring: correct / present / absent per character (spaces are locked). */
export function scoreGuess(guess, answer) {
  const g = guess.split('');
  const a = answer.split('');
  const result = Array(answer.length).fill('absent');
  const remaining = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === ' ') {
      result[i] = 'space';
      continue;
    }
    if (g[i] === a[i]) result[i] = 'correct';
    else remaining[a[i]] = (remaining[a[i]] || 0) + 1;
  }
  for (let i = 0; i < a.length; i++) {
    if (result[i] !== 'absent') continue;
    const ch = g[i];
    if (ch && remaining[ch] > 0) {
      result[i] = 'present';
      remaining[ch] -= 1;
    }
  }
  return result;
}

export function bestKeyStates(guesses, answer) {
  const best = {};
  const rank = { absent: 1, present: 2, correct: 3 };
  for (const guess of guesses) {
    const colors = scoreGuess(guess, answer);
    guess.split('').forEach((ch, i) => {
      if (!ch || ch === ' ') return;
      const c = colors[i];
      if (c === 'space') return;
      if (!best[ch] || rank[c] > rank[best[ch]]) best[ch] = c;
    });
  }
  return best;
}

function fragment(back, term) {
  let text = String(back || '').trim();
  const raw = String(term || '').trim();
  if (raw) {
    const re = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    text = text.replace(re, '_____');
  }
  const words = text.split(/\s+/);
  const n = Math.max(5, Math.min(12, Math.ceil(words.length * 0.45)));
  return words.slice(0, n).join(' ') + (words.length > n ? '…' : '');
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

class DailyTermService {
  static async getToday(classId, categorySlug) {
    if (!SUPABASE_CONFIGURED) return null;
    const date = todayUTC();
    const { data: rows } = await supabase
      .from('game_challenges')
      .select('*')
      .eq('game_type', GAME_TYPE.WORDLE)
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

    const { data: cards } = await supabase
      .from('cards')
      .select('id, front, back')
      .eq('deck_id', deck.id);
    const pool = (cards || []).filter((c) => isWordleable(c.front) && c.back?.trim());
    const fallback = (cards || []).filter((c) => {
      const n = normalizeTerm(c.front);
      return letterCount(n) >= 3 && letterCount(n) <= 16 && c.back?.trim();
    });
    const usable = pool.length ? pool : fallback;
    if (!usable.length) return null;

    const seed = hashSeed(`${categorySlug}:${date}:wordle`);
    const card = usable[seed % usable.length];
    const userId = AuthService.getUserId();
    const groupId = await parentGroupId(classId);

    const { data: inserted, error } = await supabase
      .from('game_challenges')
      .insert({
        game_type: GAME_TYPE.WORDLE,
        class_id: classId,
        group_id: groupId,
        challenger_id: userId,
        status: 'in_progress',
        card_ids: [card.id],
        seed: date,
        meta: { date },
      })
      .select('*')
      .single();

    if (error) {
      const { data: again } = await supabase
        .from('game_challenges')
        .select('*')
        .eq('game_type', GAME_TYPE.WORDLE)
        .eq('class_id', classId)
        .eq('seed', date)
        .order('created_at', { ascending: true })
        .limit(1);
      if (again?.[0]) return this._hydrate(again[0]);
      console.warn('[DailyTerm] create failed:', error.message);
      return null;
    }
    return this._hydrate(inserted);
  }

  static async _hydrate(row) {
    const cardId = row.card_ids?.[0];
    const { data: card } = await supabase
      .from('cards')
      .select('id, front, back')
      .eq('id', cardId)
      .maybeSingle();
    if (!card) return null;
    const answer = normalizeTerm(card.front);
    return {
      id: row.id,
      classId: row.class_id,
      groupId: row.group_id,
      date: row.seed,
      card,
      answer,
      fragment: fragment(card.back, card.front),
    };
  }

  static scoreForWin(guessesUsed) {
    return Math.max(1, 7 - guessesUsed);
  }

  static async submit({ challenge, guesses, won, elapsedMs }) {
    const guessesUsed = guesses.length;
    const score = won ? this.scoreForWin(guessesUsed) : 0;
    const run = await GameRunService.recordRun({
      challengeId: challenge.id,
      gameType: GAME_TYPE.WORDLE,
      classId: challenge.classId,
      score,
      correctCount: won ? 1 : 0,
      totalAttempted: guessesUsed,
      elapsedMs,
      meta: { guesses: guessesUsed, won, answer: challenge.answer },
    });

    let coins = 0;
    if (run?.id) {
      coins = 5 + (won ? 10 : 0) + (won && guessesUsed <= 2 ? 5 : 0);
      await CoinService.credit(coins, 'wordle', run.id, won ? `Daily Term in ${guessesUsed}` : 'Daily Term');
    }

    if (won && challenge.groupId) {
      const userId = AuthService.getUserId();
      await supabase.from('feed_posts').insert({
        author_id: userId,
        group_id: challenge.groupId,
        post_type: 'activity',
        payload: {
          event: 'daily_term',
          text: `got today's term in ${guessesUsed} guess${guessesUsed === 1 ? '' : 'es'}`,
          challengeId: challenge.id,
        },
      });
    }

    const leaderboard = await this.getTodayBoard(challenge.id);
    return { coins, score, won, guessesUsed, leaderboard };
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
      .sort((a, b) => b.score - a.score || a.elapsed_ms - b.elapsed_ms)
      .slice(0, 10)
      .map((r) => ({
        userId: r.user_id,
        displayName: r.user_id === myId ? 'You' : (names.get(r.user_id) || 'Student'),
        score: r.score,
        isMe: r.user_id === myId,
      }));
  }
}

export { DailyTermService };
export default DailyTermService;
