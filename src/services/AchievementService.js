/**
 * AchievementService — unlock titles next to your name.
 * Catalog lives in `achievements`; earning is insert-once on user_achievements.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { CoinService } from './CoinService';

class AchievementService {
  static async unlock(slug, { classId = null } = {}) {
    if (!SUPABASE_CONFIGURED || !slug) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;

    const row = {
      user_id: userId,
      achievement_slug: slug,
      class_id: classId,
    };

    const { error } = await supabase.from('user_achievements').insert(row);
    if (error) {
      // Unique violation = already earned
      if (error.code === '23505' || error.message?.includes('duplicate')) return false;
      console.warn('[AchievementService] unlock failed:', error.message);
      return false;
    }

    const { data: def } = await supabase
      .from('achievements')
      .select('coins, title')
      .eq('slug', slug)
      .maybeSingle();

    if (def?.coins > 0) {
      await CoinService.credit(
        def.coins,
        'achievement',
        classId ? `${slug}:${classId}` : slug,
        def.title,
      );
    }
    return true;
  }

  static async getMine() {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];
    const { data } = await supabase
      .from('user_achievements')
      .select('achievement_slug, class_id, earned_at, achievements(title, description, icon, kind)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    return (data || []).map((r) => ({
      slug: r.achievement_slug,
      classId: r.class_id,
      earnedAt: r.earned_at,
      title: r.achievements?.title,
      description: r.achievements?.description,
      icon: r.achievements?.icon,
      kind: r.achievements?.kind,
    }));
  }

  static async countWins(gameType) {
    if (!SUPABASE_CONFIGURED) return 0;
    const userId = AuthService.getUserId();
    if (!userId) return 0;
    const { count } = await supabase
      .from('game_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .contains('meta', { won: true });
    return count ?? 0;
  }
}

export { AchievementService };
export default AchievementService;
