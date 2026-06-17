import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class DeckVoteService {
  static aggregateVotes(votes, userId) {
    const byDeck = {};
    (votes || []).forEach((row) => {
      if (!byDeck[row.deck_id]) {
        byDeck[row.deck_id] = { upvotes: 0, downvotes: 0, score: 0, myVote: 0 };
      }
      const bucket = byDeck[row.deck_id];
      if (row.vote === 1) {
        bucket.upvotes += 1;
        bucket.score += 1;
      } else if (row.vote === -1) {
        bucket.downvotes += 1;
        bucket.score -= 1;
      }
      if (row.user_id === userId) {
        bucket.myVote = row.vote;
      }
    });
    return byDeck;
  }

  static sortDecksByUpvotes(decks) {
    return [...decks].sort((a, b) => {
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      if (b.score !== a.score) return b.score - a.score;
      return (a.title || '').localeCompare(b.title || '');
    });
  }

  static applyVoteChange(deck, voteDelta) {
    const next = { ...deck };
    if (voteDelta.removed === 1) next.upvotes = Math.max(0, next.upvotes - 1);
    if (voteDelta.removed === -1) next.downvotes = Math.max(0, next.downvotes - 1);
    if (voteDelta.added === 1) next.upvotes += 1;
    if (voteDelta.added === -1) next.downvotes += 1;
    next.score = next.upvotes - next.downvotes;
    next.myVote = voteDelta.myVote;
    return next;
  }

  static voteDeltaFromToggle(previousVote, newVote) {
    if (previousVote === newVote) {
      return { removed: previousVote, added: 0, myVote: 0 };
    }
    return {
      removed: previousVote || 0,
      added: newVote,
      myVote: newVote,
    };
  }

  /** Set upvote (+1) or downvote (-1). Tapping the same vote again removes it. */
  static async setVote(deckId, groupId, vote) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    if (!AuthService.getUserId()) throw new Error('Not signed in');
    if (vote !== 1 && vote !== -1) throw new Error('Invalid vote');

    const { error } = await supabase.rpc('set_deck_vote', {
      p_deck_id: deckId,
      p_group_id: groupId,
      p_vote: vote,
    });
    if (error) throw error;
  }
}

export { DeckVoteService };
export default DeckVoteService;
