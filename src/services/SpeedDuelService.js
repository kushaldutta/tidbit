/**
 * SpeedDuelService — async 1v1 on the same 10 cards (definition → term).
 * Challenger plays immediately; opponent gets an inbox item + class feed post.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ClassService } from './ClassService';
import { GameRunService } from './GameRunService';
import { CoinService } from './CoinService';
import { AchievementService } from './AchievementService';
import { GAME_TYPE } from '../config/gameCatalog';

export const DUEL_QUESTION_COUNT = 10;
const COIN_PLAY = 5;
const COIN_WIN = 20;

async function loadDeckCardsForCategory(categorySlug) {
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
}

function pickCards(cards, n) {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
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

async function displayName(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();
  return data?.display_name || 'a classmate';
}

async function postActivity(groupId, authorId, text, extra = {}) {
  if (!groupId) return;
  await supabase.from('feed_posts').insert({
    author_id: authorId,
    group_id: groupId,
    post_type: 'activity',
    payload: { event: 'speed_duel', text, ...extra },
  });
}

function mapChallenge(row) {
  if (!row) return null;
  return {
    id: row.id,
    gameType: row.game_type,
    classId: row.class_id,
    groupId: row.group_id,
    challengerId: row.challenger_id,
    opponentId: row.opponent_id,
    status: row.status,
    cardIds: row.card_ids || [],
    meta: row.meta || {},
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

class SpeedDuelService {
  static async createChallenge(classId, opponentId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const myId = AuthService.getUserId();
    if (!myId) throw new Error('Not signed in');
    if (myId === opponentId) throw new Error('Cannot duel yourself');

    const slug = ClassService.getCategoryForClass(classId);
    if (!slug) throw new Error('This class has no preset deck yet');

    const cards = await loadDeckCardsForCategory(slug);
    if (cards.length < 4) throw new Error('Need at least 4 cards to duel');

    const selected = pickCards(cards, DUEL_QUESTION_COUNT);
    const groupId = await parentGroupId(classId);

    const { data, error } = await supabase
      .from('game_challenges')
      .insert({
        game_type: GAME_TYPE.SPEED_DUEL,
        class_id: classId,
        group_id: groupId,
        challenger_id: myId,
        opponent_id: opponentId,
        status: 'in_progress',
        card_ids: selected.map((c) => c.id),
        meta: { questionCount: selected.length },
      })
      .select('*')
      .single();

    if (error) throw error;

    const oppName = await displayName(opponentId);
    await postActivity(groupId, myId, `challenged ${oppName} to a Speed Duel`, {
      challengeId: data.id,
      opponentId,
    });

    return mapChallenge(data);
  }

  static async getChallenge(challengeId) {
    if (!SUPABASE_CONFIGURED) return null;
    const { data, error } = await supabase
      .from('game_challenges')
      .select('*')
      .eq('id', challengeId)
      .maybeSingle();
    if (error) {
      console.warn('[SpeedDuel] getChallenge:', error.message);
      return null;
    }
    return mapChallenge(data);
  }

  static async getChallengeCards(challenge) {
    if (!challenge?.cardIds?.length) return [];
    const { data: cards } = await supabase
      .from('cards')
      .select('id, front, back')
      .in('id', challenge.cardIds);
    const byId = new Map((cards || []).map((c) => [c.id, c]));
    return challenge.cardIds.map((id) => byId.get(id)).filter((c) => c?.front && c?.back);
  }

  /**
   * Duels waiting for me to play (I am opponent, no run yet)
   * plus ones I started that the opponent hasn't finished.
   */
  static async getInbox() {
    if (!SUPABASE_CONFIGURED) return [];
    const myId = AuthService.getUserId();
    if (!myId) return [];

    const { data, error } = await supabase
      .from('game_challenges')
      .select(`
        id, game_type, class_id, group_id, challenger_id, opponent_id, status, card_ids, meta, created_at, completed_at,
        classes!class_id(code, title),
        challenger:profiles!challenger_id(display_name),
        opponent:profiles!opponent_id(display_name)
      `)
      .eq('game_type', GAME_TYPE.SPEED_DUEL)
      .in('status', ['pending', 'in_progress', 'awaiting_opponent'])
      .or(`challenger_id.eq.${myId},opponent_id.eq.${myId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[SpeedDuel] getInbox:', error.message);
      return [];
    }

    const challenges = data || [];
    const ids = challenges.map((c) => c.id);
    const { data: runs } = ids.length
      ? await supabase.from('game_runs').select('challenge_id, user_id').in('challenge_id', ids)
      : { data: [] };
    const runSet = new Set((runs || []).map((r) => `${r.challenge_id}:${r.user_id}`));

    return challenges
      .map((row) => {
        const mapped = mapChallenge(row);
        const iPlayed = runSet.has(`${row.id}:${myId}`);
        const theyId = row.challenger_id === myId ? row.opponent_id : row.challenger_id;
        const theyPlayed = runSet.has(`${row.id}:${theyId}`);
        return {
          ...mapped,
          classCode: row.classes?.code || '',
          classTitle: row.classes?.title || '',
          challengerName: row.challenger?.display_name || 'Classmate',
          opponentName: row.opponent?.display_name || 'Classmate',
          iPlayed,
          theyPlayed,
          awaitingMe: !iPlayed,
          role: row.challenger_id === myId ? 'challenger' : 'opponent',
        };
      })
      .filter((c) => c.awaitingMe || (c.iPlayed && !c.theyPlayed));
  }

  static async submitRun(challenge, { correctCount, totalAttempted, elapsedMs, answers }) {
    if (!SUPABASE_CONFIGURED) return { coins: 0, result: null };
    const myId = AuthService.getUserId();
    if (!myId) return { coins: 0, result: null };

    const score = correctCount * 1000 + Math.max(0, 120000 - elapsedMs);

    await GameRunService.recordRun({
      challengeId: challenge.id,
      gameType: GAME_TYPE.SPEED_DUEL,
      classId: challenge.classId,
      score,
      correctCount,
      totalAttempted,
      elapsedMs,
      meta: { answers },
    });

    await CoinService.credit(
      COIN_PLAY,
      'speed_duel',
      `${challenge.id}:play:${myId}`,
      'Speed Duel played',
    );
    await AchievementService.unlock('first_duel');

    const runs = await GameRunService.getRunsForChallenge(challenge.id);
    if (runs.length < 2) {
      await supabase
        .from('game_challenges')
        .update({ status: 'awaiting_opponent' })
        .eq('id', challenge.id);
      return { coins: COIN_PLAY, result: 'waiting', myScore: score, correctCount, elapsedMs };
    }

    const mine = runs.find((r) => r.user_id === myId);
    const theirs = runs.find((r) => r.user_id !== myId);
    const iWon =
      mine.score > theirs.score ||
      (mine.score === theirs.score && mine.elapsed_ms < theirs.elapsed_ms);
    const tie = mine.score === theirs.score && mine.elapsed_ms === theirs.elapsed_ms;

    await supabase
      .from('game_challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', challenge.id);

    let coins = COIN_PLAY;
    if (iWon && !tie) {
      await supabase
        .from('game_runs')
        .update({ meta: { ...(mine.meta || {}), won: true, answers } })
        .eq('challenge_id', challenge.id)
        .eq('user_id', myId);
      const awarded = await CoinService.credit(
        COIN_WIN,
        'speed_duel_win',
        `${challenge.id}:win`,
        'Speed Duel win',
      );
      if (awarded) coins += COIN_WIN;
      await AchievementService.unlock('duel_win');
      const wins = await AchievementService.countWins(GAME_TYPE.SPEED_DUEL);
      if (wins >= 3) await AchievementService.unlock('warlord_3');
    }

    const winnerId = tie ? null : (iWon ? myId : theirs.user_id);
    if (challenge.groupId) {
      const winnerName = winnerId ? await displayName(winnerId) : null;
      await postActivity(
        challenge.groupId,
        myId,
        tie
          ? 'tied a Speed Duel'
          : `${winnerName} won a Speed Duel`,
        { challengeId: challenge.id, winnerId },
      );
    }

    return {
      coins,
      result: tie ? 'tie' : iWon ? 'win' : 'loss',
      myScore: mine.score,
      theirScore: theirs.score,
      myCorrect: mine.correct_count,
      theirCorrect: theirs.correct_count,
      myElapsedMs: mine.elapsed_ms,
      theirElapsedMs: theirs.elapsed_ms,
    };
  }
}

export { SpeedDuelService };
export default SpeedDuelService;
