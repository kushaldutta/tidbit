/**
 * CoinService — Study Coins balance, credits, and ledger queries.
 *
 * Coins are the unified reward currency. They are credited via the
 * `credit_study_coins` security-definer RPC which prevents double-awarding
 * through a unique index on (user_id, source_type, source_id).
 *
 * The balance is cached locally so Home shows it without a round-trip.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

const CACHE_KEY = 'coin_balance_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minute

class CoinService {
  static _cache = null; // { balance, fetchedAt }

  // ─── Balance ────────────────────────────────────────────────

  static async getBalance({ bypassCache = false } = {}) {
    if (
      !bypassCache &&
      this._cache &&
      Date.now() - this._cache.fetchedAt < CACHE_TTL_MS
    ) {
      return this._cache.balance;
    }

    // Try local AsyncStorage first (works offline)
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    const local = stored ? JSON.parse(stored) : null;
    if (
      !bypassCache &&
      local &&
      Date.now() - local.fetchedAt < CACHE_TTL_MS
    ) {
      this._cache = local;
      return local.balance;
    }

    if (!SUPABASE_CONFIGURED) return local?.balance ?? 0;
    const userId = AuthService.getUserId();
    if (!userId) return local?.balance ?? 0;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', userId)
        .maybeSingle();
      const balance = data?.coin_balance ?? 0;
      await this._writeCache(balance);
      return balance;
    } catch (err) {
      console.warn('[CoinService] getBalance failed:', err.message);
      return local?.balance ?? 0;
    }
  }

  static async _writeCache(balance) {
    const entry = { balance, fetchedAt: Date.now() };
    this._cache = entry;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  }

  static invalidateCache() {
    this._cache = null;
  }

  // ─── Credit ─────────────────────────────────────────────────

  /**
   * Credit coins via the server-side RPC.
   * Returns true if coins were actually awarded (false = already awarded).
   */
  static async credit(amount, sourceType, sourceId = null, note = null) {
    if (!SUPABASE_CONFIGURED || amount <= 0) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;

    try {
      const { data, error } = await supabase.rpc('credit_study_coins', {
        p_user_id: userId,
        p_amount: amount,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_note: note,
      });
      if (error) throw error;
      if (data) {
        // Optimistically update cache
        const current = await this.getBalance();
        await this._writeCache(current + amount);
      }
      return !!data;
    } catch (err) {
      console.warn('[CoinService] credit failed:', err.message);
      return false;
    }
  }

  // ─── Ledger ──────────────────────────────────────────────────

  static async getRecentLedger(limit = 20) {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];

    try {
      const { data } = await supabase
        .from('coin_ledger')
        .select('amount, source_type, source_id, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (err) {
      console.warn('[CoinService] getRecentLedger failed:', err.message);
      return [];
    }
  }

  /**
   * Check whether coins for a given (sourceType, sourceId) have already been awarded.
   */
  static async alreadyCredited(sourceType, sourceId) {
    if (!SUPABASE_CONFIGURED || !sourceId) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;

    try {
      const { count } = await supabase
        .from('coin_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);
      return (count ?? 0) > 0;
    } catch {
      return false;
    }
  }
}

export { CoinService };
export default CoinService;
