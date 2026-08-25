/**
 * StreakService — consecutive local-calendar days with study activity.
 *
 * Home used to infer a streak from leftover `spaced_repetition_*` keys.
 * Learning state now lives in `card_learning_*` / Supabase, so that scan
 * stayed at 0 even after a daily challenge, focused session, or game.
 *
 * Activity is recorded from CardLearningService.recordReview (sessions,
 * daily challenge, most games) and GameRunService.recordRun (Speed Duel
 * and other run-based modes). Dates are local YYYY-MM-DD, persisted on
 * device, and synced to user_stats.current_streak / longest_streak.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { StorageService } from './StorageService';

const DATES_KEY = 'study_activity_days_v1';
const CLOUD_HYDRATED_KEY = 'study_streak_cloud_hydrated_v1';
const MAX_DATES = 400;
const CLOUD_LOOKBACK_DAYS = 90;
const STREAK_ACHIEVEMENT_SLUG = '7_day_streak';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function localDateKeyFromIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localDateKey(d);
}

function shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localDateKey(dt);
}

function computeStreak(dateKeys, todayKey = localDateKey()) {
  const set = new Set(dateKeys);
  let cursor = todayKey;
  if (!set.has(cursor)) {
    // Today can still be empty — the streak holds if yesterday was active.
    cursor = shiftDateKey(cursor, -1);
    if (!set.has(cursor)) return 0;
  }
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return n;
}

function computeLongest(dateKeys) {
  const sorted = [...new Set(dateKeys)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    if (prev && shiftDateKey(prev, 1) === key) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = key;
  }
  return best;
}

function trimDates(dateKeys) {
  const unique = [...new Set(dateKeys.filter(Boolean))].sort();
  return unique.slice(-MAX_DATES);
}

class StreakService {
  static _syncTimer = null;
  static _hydratingCloud = false;

  static async loadDates() {
    try {
      const raw = await AsyncStorage.getItem(DATES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveDates(dateKeys) {
    const trimmed = trimDates(dateKeys);
    await AsyncStorage.setItem(DATES_KEY, JSON.stringify(trimmed));
    return trimmed;
  }

  static async mergeDates(extraKeys) {
    if (!extraKeys?.length) return this.loadDates();
    const existing = await this.loadDates();
    return this.saveDates([...existing, ...extraKeys]);
  }

  /**
   * Mark the local calendar day as studied. Safe to call on every card
   * review — same-day repeats are a no-op after the first write.
   */
  static async recordActivity(at = new Date()) {
    const key = localDateKey(at);
    const dates = await this.mergeDates([key]);
    const current = computeStreak(dates);
    this.scheduleCloudSync(dates);
    try {
      const { AchievementService } = require('./AchievementService');
      if (current >= 7) {
        AchievementService.unlock(STREAK_ACHIEVEMENT_SLUG).catch(() => {});
      }
      AchievementService.recordNightOwl(at).catch(() => {});
    } catch {
      /* optional */
    }
    return current;
  }

  static async getCurrentStreak() {
    await this.ensureLocalDates();
    await this.hydrateFromCloudIfNeeded();
    return computeStreak(await this.loadDates());
  }

  /** Fold in on-device sources so a pre-update study day still counts. */
  static async ensureLocalDates() {
    const extras = [];

    try {
      const { CardLearningService } = require('./CardLearningService');
      const states = await CardLearningService.getAllLocalStates();
      for (const state of states) {
        extras.push(localDateKeyFromIso(state.lastReviewAt));
        extras.push(localDateKeyFromIso(state.lastSeenAt));
      }
    } catch {
      /* ignore */
    }

    try {
      const { StudySessionService } = require('./StudySessionService');
      const history = await StudySessionService.getSessionHistory();
      for (const session of history) {
        extras.push(localDateKeyFromIso(session.endTime || session.startTime));
      }
    } catch {
      /* ignore */
    }

    return this.mergeDates(extras.filter(Boolean));
  }

  static async hydrateFromCloudIfNeeded() {
    if (!SUPABASE_CONFIGURED || this._hydratingCloud) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    const today = localDateKey();
    try {
      const last = await AsyncStorage.getItem(CLOUD_HYDRATED_KEY);
      if (last === today) return;
    } catch {
      /* continue */
    }

    this._hydratingCloud = true;
    try {
      const extras = await this.fetchCloudActivityDates(userId);
      const dates = await this.mergeDates(extras);
      await AsyncStorage.setItem(CLOUD_HYDRATED_KEY, today);
      this.scheduleCloudSync(dates);
    } catch (e) {
      console.warn('[Streak] cloud hydrate failed:', e.message);
    } finally {
      this._hydratingCloud = false;
    }
  }

  static async fetchCloudActivityDates(userId) {
    const since = new Date();
    since.setDate(since.getDate() - CLOUD_LOOKBACK_DAYS);
    const sinceIso = since.toISOString();
    const extras = [];

    const collect = (rows, field) => {
      for (const row of rows || []) {
        extras.push(localDateKeyFromIso(row[field]));
      }
    };

    const [attemptsRes, runsRes, entriesRes, statsRes] = await Promise.all([
      supabase
        .from('card_attempts')
        .select('attempted_at')
        .eq('user_id', userId)
        .gte('attempted_at', sinceIso)
        .order('attempted_at', { ascending: false })
        .limit(3000),
      supabase
        .from('game_runs')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', sinceIso)
        .limit(500),
      supabase
        .from('daily_challenge_entries')
        .select('answered_at')
        .eq('user_id', userId)
        .gte('answered_at', sinceIso)
        .limit(1000),
      supabase
        .from('user_stats')
        .select('last_active_date')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    collect(attemptsRes.data, 'attempted_at');
    collect(runsRes.data, 'created_at');
    collect(entriesRes.data, 'answered_at');
    if (statsRes.data?.last_active_date) {
      extras.push(String(statsRes.data.last_active_date).slice(0, 10));
    }

    return extras.filter(Boolean);
  }

  static scheduleCloudSync(dates) {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this.syncToCloud(dates).catch(() => {});
    }, 1500);
  }

  static async syncToCloud(dates) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    const keys = dates || (await this.loadDates());
    const current = computeStreak(keys);
    const longestFromDates = computeLongest(keys);
    const lastActive = [...new Set(keys)].sort().pop() || null;
    const tidbitsSeen = await StorageService.getTidbitsSeen();

    let longest = longestFromDates;
    try {
      const { data } = await supabase
        .from('user_stats')
        .select('longest_streak')
        .eq('user_id', userId)
        .maybeSingle();
      longest = Math.max(longest, data?.longest_streak || 0);
    } catch {
      /* use local longest */
    }

    const row = {
      user_id: userId,
      tidbits_seen: tidbitsSeen || 0,
      current_streak: current,
      longest_streak: longest,
      updated_at: new Date().toISOString(),
    };
    if (lastActive) row.last_active_date = lastActive;

    const { error } = await supabase
      .from('user_stats')
      .upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.warn('[Streak] user_stats upsert failed:', error.message);
    }
  }
}

export { StreakService, computeStreak, localDateKey };
export default StreakService;
