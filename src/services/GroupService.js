import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { DeckVoteService } from './DeckVoteService';

class GroupService {
  /**
   * Returns the groups the current user belongs to, enriched with class info
   * and member count.
   * Shape: [{ groupId, classId, code, title, subject, memberCount }]
   */
  static async getMyGroups() {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];

    // 1. Get classes the user is enrolled in
    const { data: memberships, error: mErr } = await supabase
      .from('class_memberships')
      .select('class_id, classes(id, code, title, subject)')
      .eq('user_id', userId);

    if (mErr || !memberships?.length) return [];

    const classIds = memberships.map((m) => m.class_id);

    // 2. Get corresponding groups
    const { data: groups, error: gErr } = await supabase
      .from('groups')
      .select('id, class_id')
      .in('class_id', classIds);

    if (gErr || !groups?.length) return [];

    // 3. Get member count per class
    const { data: counts, error: cErr } = await supabase
      .from('class_memberships')
      .select('class_id')
      .in('class_id', classIds);

    const countMap = {};
    if (!cErr && counts) {
      counts.forEach(({ class_id }) => {
        countMap[class_id] = (countMap[class_id] || 0) + 1;
      });
    }

    // 4. Merge everything
    return groups.map((g) => {
      const membership = memberships.find((m) => m.class_id === g.class_id);
      const cls = membership?.classes || {};
      return {
        groupId: g.id,
        classId: g.class_id,
        code: cls.code || g.class_id,
        title: cls.title || '',
        subject: cls.subject || '',
        memberCount: countMap[g.class_id] || 1,
      };
    });
  }

  /**
   * Returns profiles of all classmates in a given class (excluding self).
   * Shape: [{ id, display_name, grad_year, avatar_url }]
   */
  static async getClassmates(classId) {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('class_memberships')
      .select('profiles(id, display_name, grad_year, avatar_url)')
      .eq('class_id', classId)
      .neq('user_id', userId);

    if (error || !data) return [];
    return data.map((r) => r.profiles).filter(Boolean);
  }

  /**
   * Returns decks shared to the group, sorted by upvotes (desc).
   * Shape: [{ id, title, ownerId, cardCount, ownerName, upvotes, downvotes, score, myVote }]
   */
  static async getGroupDecks(groupId) {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();

    const { data: shareRows, error: shareErr } = await supabase
      .from('deck_shares')
      .select('deck_id, shared_at')
      .eq('group_id', groupId)
      .order('shared_at', { ascending: false });

    if (shareErr) {
      console.error('[GroupService] getGroupDecks shares error:', shareErr.message);
      return [];
    }
    if (!shareRows?.length) return [];

    const deckIds = shareRows.map((r) => r.deck_id);

    const [{ data: deckRows, error: deckErr }, { data: voteRows, error: voteErr }, { data: saveRows, error: saveErr }] =
      await Promise.all([
        supabase
          .from('decks')
          .select('id, title, owner_id, card_count')
          .in('id', deckIds),
        supabase
          .from('deck_votes')
          .select('deck_id, user_id, vote')
          .eq('group_id', groupId),
        supabase
          .from('deck_saves')
          .select('source_deck_id')
          .in('source_deck_id', deckIds),
      ]);

    if (deckErr) {
      console.error('[GroupService] getGroupDecks decks error:', deckErr.message);
      return [];
    }
    if (voteErr) {
      console.warn('[GroupService] getGroupDecks votes error:', voteErr.message);
    }
    if (saveErr) {
      console.warn('[GroupService] getGroupDecks saves error:', saveErr.message);
    }

    const saveCountMap = {};
    (saveRows || []).forEach((row) => {
      saveCountMap[row.source_deck_id] = (saveCountMap[row.source_deck_id] || 0) + 1;
    });

    const deckById = Object.fromEntries((deckRows || []).map((d) => [d.id, d]));
    const missingDeckIds = deckIds.filter((id) => !deckById[id]);
    if (missingDeckIds.length) {
      console.warn(
        '[GroupService] getGroupDecks: share rows exist but decks not readable',
        { groupId, missingDeckIds }
      );
    }

    const ownerIds = [
      ...new Set((deckRows || []).map((d) => d.owner_id).filter(Boolean)),
    ];
    const profileMap = {};
    if (ownerIds.length) {
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ownerIds);
      if (profileErr) {
        console.warn('[GroupService] getGroupDecks profiles error:', profileErr.message);
      } else {
        (profiles || []).forEach((p) => {
          profileMap[p.id] = p.display_name;
        });
      }
    }

    const voteMap = DeckVoteService.aggregateVotes(voteRows, userId);

    const decks = shareRows
      .map((share) => deckById[share.deck_id])
      .filter(Boolean)
      .map((d) => {
        const stats = voteMap[d.id] || { upvotes: 0, downvotes: 0, score: 0, myVote: 0 };
        return {
          id: d.id,
          title: d.title,
          ownerId: d.owner_id,
          cardCount: d.card_count ?? 0,
          saveCount: saveCountMap[d.id] || 0,
          ownerName: profileMap[d.owner_id] || 'Unknown',
          upvotes: stats.upvotes,
          downvotes: stats.downvotes,
          score: stats.score,
          myVote: stats.myVote,
        };
      });

    return DeckVoteService.sortDecksByUpvotes(decks);
  }
}

export { GroupService };
export default GroupService;
