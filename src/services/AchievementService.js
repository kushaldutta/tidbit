/**
 * AchievementService — unlock titles next to your name.
 * Catalog lives in `achievements`; earning is insert-once on user_achievements.
 *
 * Display metadata (icon, locked-state copy) lives in
 * src/config/achievementCatalog.js — keep the two in sync when adding a slug.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { CoinService } from './CoinService';

const NIGHT_OWL_KEY = '@tidbit:night_owl_dates';
const NIGHT_OWL_NIGHTS = 3;
const MASTERY_MILESTONE = 100;

/** Local calendar date, so "last night at 1am" counts as its own night. */
function dateKey(at) {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Once per app session — these checks are idempotent but not free. */
let milestonesChecked = false;

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

  /**
   * Milestones that depend on cumulative server state rather than a single
   * action. Cheap enough to run once per session on Home load.
   */
  static async syncMilestones({ force = false } = {}) {
    if (!SUPABASE_CONFIGURED) return;
    if (milestonesChecked && !force) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    milestonesChecked = true;

    try {
      const { data } = await supabase
        .from('user_stats')
        .select('cards_mastered')
        .eq('user_id', userId)
        .maybeSingle();
      if ((data?.cards_mastered ?? 0) >= MASTERY_MILESTONE) {
        await this.unlock('first_100_mastered');
      }
    } catch (err) {
      console.warn('[AchievementService] syncMilestones failed:', err.message);
      milestonesChecked = false;
    }
  }

  /**
   * Called on every recorded study moment. Studying between midnight and 4am
   * on three separate nights earns Night Owl.
   */
  static async recordNightOwl(at = new Date()) {
    const hour = at.getHours();
    if (hour >= 4) return false;
    try {
      const raw = await AsyncStorage.getItem(NIGHT_OWL_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const nights = new Set(Array.isArray(parsed) ? parsed : []);
      const before = nights.size;
      nights.add(dateKey(at));
      if (nights.size === before) return false;

      const list = [...nights].slice(-NIGHT_OWL_NIGHTS);
      await AsyncStorage.setItem(NIGHT_OWL_KEY, JSON.stringify(list));
      if (list.length >= NIGHT_OWL_NIGHTS) return this.unlock('night_owl');
      return false;
    } catch {
      return false;
    }
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
