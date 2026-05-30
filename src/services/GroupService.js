import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

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
   * Returns decks shared to the group for this class.
   * Shape: [{ id, title, card_count, owner_name }]
   */
  static async getGroupDecks(groupId) {
    if (!SUPABASE_CONFIGURED) return [];

    const { data, error } = await supabase
      .from('deck_shares')
      .select(`
        decks(
          id, title,
          cards(count),
          profiles(display_name)
        )
      `)
      .eq('group_id', groupId);

    if (error || !data) return [];
    return data
      .map((r) => r.decks)
      .filter(Boolean)
      .map((d) => ({
        id: d.id,
        title: d.title,
        cardCount: d.cards?.[0]?.count ?? 0,
        ownerName: d.profiles?.display_name || 'Unknown',
      }));
  }
}

export { GroupService };
export default GroupService;
