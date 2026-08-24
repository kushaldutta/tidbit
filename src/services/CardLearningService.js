/**
 * CardLearningService — unified learning state (local cache + Supabase user_card_state).
 * Replaces SpacedRepetitionService for scheduling; supports deck card UUIDs and legacy hash tidbit IDs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleReview,
  ratingFromReview,
  advanceStage,
  isMasteredStage,
  retrievability,
  STAGES,
} from './fsrs';

const LOCAL_PREFIX = 'card_learning_';
const LEGACY_SR_PREFIX = 'spaced_repetition_';
const MIGRATION_KEY = 'card_learning_migrated_v23';
const SYNC_DEBOUNCE_MS = 2000;

/** Time after "I knew it" before the verification quiz appears in Review Queue. */
const INTRODUCED_QUIZ_DELAY_MS = 60 * 60 * 1000; // 1 hour

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id) {
  return UUID_RE.test(String(id || ''));
}

function defaultState(contentId) {
  return {
    contentId,
    cardId: isUuid(contentId) ? contentId : null,
    legacyTidbitId: isUuid(contentId) ? null : contentId,
    stage: 'new',
    ease: 2.5,
    stability: null,
    difficulty: null,
    intervalDays: 0,
    dueAt: null,
    lastSeenAt: null,
    lastReviewAt: null,
    lastReviewMode: null,
    correctStreak: 0,
    totalSeen: 0,
    totalCorrect: 0,
    lapses: 0,
    reps: 0,
    isMastered: false,
    isSaved: false,
    wasShownAsDue: false,
    shownAsDueAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function localKey(contentId) {
  return `${LOCAL_PREFIX}${contentId}`;
}

function rowToState(row) {
  if (!row) return null;
  const contentId = row.card_id || row.legacy_tidbit_id;
  return {
    contentId,
    cardId: row.card_id || null,
    legacyTidbitId: row.legacy_tidbit_id || null,
    stage: row.stage || 'new',
    ease: row.ease ?? 2.5,
    stability: row.stability ?? null,
    difficulty: row.difficulty ?? null,
    intervalDays: row.interval_days ?? 0,
    dueAt: row.due_at || null,
    lastSeenAt: row.last_seen_at || null,
    lastReviewAt: row.last_review_at || null,
    lastReviewMode: row.last_review_mode || null,
    correctStreak: row.correct_streak ?? 0,
    totalSeen: row.total_seen ?? 0,
    totalCorrect: row.total_correct ?? 0,
    lapses: row.lapses ?? 0,
    // Rows written before migration 047 have no reps column; total_seen is the
    // closest proxy and, crucially, is non-zero for anything already reviewed,
    // which keeps scheduleReview out of its first-encounter branch.
    reps: row.reps ?? row.total_seen ?? 0,
    isMastered: row.is_mastered ?? false,
    isSaved: row.is_saved ?? false,
    wasShownAsDue: false,
    shownAsDueAt: null,
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function stateToBaseRow(userId, state) {
  const cardId = state.cardId || (isUuid(state.contentId) ? state.contentId : null);
  if (!cardId) return null;
  return {
    user_id: userId,
    card_id: cardId,
    ease: state.ease ?? 2.5,
    interval_days: state.intervalDays ?? 0,
    due_at: state.dueAt,
    last_seen_at: state.lastSeenAt,
    correct_streak: state.correctStreak ?? 0,
    total_seen: state.totalSeen ?? 0,
    total_correct: state.totalCorrect ?? 0,
    is_mastered: state.isMastered ?? false,
    is_saved: state.isSaved ?? false,
    updated_at: state.updatedAt,
  };
}

function stateToRow(userId, state) {
  const base = stateToBaseRow(userId, state);
  if (!base) return null;
  return {
    ...base,
    stage: state.stage || 'new',
    stability: state.stability,
    difficulty: state.difficulty,
    lapses: state.lapses ?? 0,
    reps: state.reps ?? 0,
    last_review_at: state.lastReviewAt,
    last_review_mode: state.lastReviewMode,
  };
}

function legacySrToState(tidbitId, sr) {
  const stage =
    sr.masteryLevel === 'mastered' ? 'mastered'
      : sr.masteryLevel === 'learning' ? 'introduced'
        : sr.nextDue ? 'introduced' : 'new';
  return {
    ...defaultState(tidbitId),
    stage,
    dueAt: sr.nextDue || null,
    lastSeenAt: sr.lastSeen || null,
    correctStreak: sr.correctStreak || 0,
    totalSeen: sr.totalViews || 0,
    totalCorrect: sr.totalCorrect || 0,
    isSaved: sr.saved === true,
    isMastered: sr.masteryLevel === 'mastered',
    wasShownAsDue: sr.wasShownAsDue === true,
    shownAsDueAt: sr.shownAsDueAt || null,
    updatedAt: sr.lastSeen || new Date().toISOString(),
  };
}

function stateToLegacySr(state) {
  const masteryLevel =
    state.stage === 'mastered' || state.isMastered ? 'mastered'
      : state.stage === 'new' ? 'new' : 'learning';
  return {
    tidbitId: state.contentId,
    lastSeen: state.lastSeenAt,
    correctStreak: state.correctStreak,
    nextDue: state.dueAt,
    masteryLevel,
    saved: state.isSaved,
    totalViews: state.totalSeen,
    totalCorrect: state.totalCorrect,
    wasShownAsDue: state.wasShownAsDue,
    shownAsDueAt: state.shownAsDueAt,
  };
}

class CardLearningService {
  static _syncTimer = null;
  static _pendingSync = new Set();

  static async upsertStateRow(row) {
    const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
    if (!SUPABASE_CONFIGURED || !row) return false;

    let { error } = await supabase
      .from('user_card_state')
      .upsert(row, { onConflict: 'user_id,card_id' });

    if (error && /column|stage|schema cache/i.test(error.message || '')) {
      const {
        stage,
        stability,
        difficulty,
        lapses,
        reps,
        last_review_at,
        last_review_mode,
        ...baseOnly
      } = row;
      ({ error } = await supabase
        .from('user_card_state')
        .upsert(baseOnly, { onConflict: 'user_id,card_id' }));
    }

    if (error) {
      console.warn('[CardLearning] cloud sync failed:', error.message, error.details || '');
      return false;
    }
    return true;
  }

  /**
   * Attach a deck card UUID to a legacy hash-keyed state. user_card_state is
   * keyed by card UUID with no legacy equivalent, so until a state is linked
   * its review history can never leave the device.
   */
  static async linkLegacyStateToCard(contentId, cardId) {
    if (!contentId || isUuid(contentId) || !isUuid(cardId)) return false;
    const state = await this.getState(contentId);
    if (!state || state.cardId === cardId) return false;
    state.cardId = cardId;
    await AsyncStorage.setItem(localKey(contentId), JSON.stringify(state));
    return true;
  }

  static async syncCardToCloud(contentId) {
    const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
    const { AuthService } = require('./AuthService');
    // Legacy hash ids are allowed through: stateToRow yields null unless the
    // state carries a card UUID, so unlinked ones still no-op.
    if (!SUPABASE_CONFIGURED || !contentId) return false;

    const userId = AuthService.getUserId();
    if (!userId) {
      console.warn('[CardLearning] cloud sync skipped: not logged in');
      return false;
    }

    const state = await this.getState(contentId);
    const row = state ? stateToRow(userId, state) : null;
    if (!row) return false;

    const ok = await this.upsertStateRow(row);
    if (ok) {
      console.log(`[CardLearning] synced user_card_state for card ${contentId.slice(0, 8)}…`);
    }
    return ok;
  }

  static async getState(contentId) {
    if (!contentId) return null;
    try {
      const raw = await AsyncStorage.getItem(localKey(contentId));
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('[CardLearning] getState local error:', e.message);
    }
    return null;
  }

  /** Stable hash id for a deck card's back text (legacy tidbit id). */
  static legacyHashForCard(card, categoryId) {
    if (!categoryId || !card?.back?.trim()) return null;
    const { ContentService } = require('./ContentService');
    return ContentService.generateTidbitId(card.back.trim(), categoryId);
  }

  /**
   * Learning state for a deck card — checks UUID first, then legacy hash id.
   * Keeps review queue + quiz aligned after v2.3 deck-card migration.
   */
  static async getEffectiveState(card, categoryId) {
    if (!card?.id) return null;
    const direct = await this.getState(card.id);
    const hashId = this.legacyHashForCard(card, categoryId);
    const legacy = hashId && hashId !== card.id ? await this.getState(hashId) : null;

    if (direct && legacy) {
      const directReviewed = direct.lastReviewAt || direct.totalSeen > 0;
      if (directReviewed) return direct;
      if (this.isDue(legacy) && !this.isDue(direct)) return legacy;
      return direct;
    }
    return direct || legacy || null;
  }

  /** Remove orphaned hash-id state after a deck card UUID is reviewed. */
  static async retireLegacyDuplicate(cardId, categoryId = null) {
    if (!isUuid(cardId)) return;
    const { ContentService } = require('./ContentService');
    let cat = categoryId;
    let back = null;
    const cardTidbit = await ContentService.getCardAsTidbit(cardId);
    if (cardTidbit) {
      back = cardTidbit.text;
      cat = cat || cardTidbit.category;
    }
    if (!cat || !back?.trim()) return;
    const hashId = ContentService.generateTidbitId(back.trim(), cat);
    if (hashId === cardId) return;
    try {
      await AsyncStorage.removeItem(localKey(hashId));
    } catch {
      /* ignore */
    }
  }

  static async saveState(state) {
    if (!state?.contentId) return;
    state.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(localKey(state.contentId), JSON.stringify(state));
    const { QueueService } = require('./QueueService');
    QueueService.invalidateReviewQueueCache();
    if (isUuid(state.contentId) || state.cardId) {
      await this.syncCardToCloud(state.contentId);
    }
  }

  static _scheduleSync() {
    if (this._syncTimer) return;
    this._syncTimer = setTimeout(() => {
      this._syncTimer = null;
      this.syncPendingToCloud().catch(() => {});
    }, SYNC_DEBOUNCE_MS);
  }

  static async syncPendingToCloud() {
    const ids = [...this._pendingSync];
    this._pendingSync.clear();
    for (const id of ids) {
      await this.syncCardToCloud(id);
    }
  }

  static async pullFromCloud() {
    const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
    const { AuthService } = require('./AuthService');
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_card_state')
        .select('*')
        .eq('user_id', userId);
      if (error || !data?.length) return;

      for (const row of data) {
        const remote = rowToState(row);
        const local = await this.getState(remote.contentId);
        if (!local || new Date(remote.updatedAt) >= new Date(local.updatedAt || 0)) {
          await AsyncStorage.setItem(localKey(remote.contentId), JSON.stringify(remote));
        }
      }
    } catch (e) {
      console.warn('[CardLearning] pullFromCloud error:', e.message);
    }
  }

  static async migrateLegacySpacedRepetition() {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done === 'true') return;

    try {
      const keys = await AsyncStorage.getAllKeys();
      const srKeys = keys.filter((k) => k.startsWith(LEGACY_SR_PREFIX));
      for (const key of srKeys) {
        const tidbitId = key.replace(LEGACY_SR_PREFIX, '');
        const existing = await this.getState(tidbitId);
        if (existing) continue;
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const sr = JSON.parse(raw);
        const state = legacySrToState(tidbitId, sr);
        await this.saveState(state);
      }
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      console.log(`[CardLearning] Migrated ${srKeys.length} legacy SR entries`);
    } catch (e) {
      console.warn('[CardLearning] migration error:', e.message);
    }
  }

  static async initForUser() {
    await this.migrateLegacySpacedRepetition();
    await this.pullFromCloud();
  }

  /**
   * Record a review event and update FSRS schedule + stage ladder.
   */
  static async recordReview(contentId, {
    wasCorrect,
    mode = 'session',
    confidence = 3,
    action,
    categoryId = null,
  } = {}) {
    if (!contentId) return null;

    let state = (await this.getState(contentId)) || defaultState(contentId);
    const now = new Date();
    const nowIso = now.toISOString();

    if (action === 'save') {
      state.isSaved = true;
      state.lastSeenAt = nowIso;
      state.totalSeen += 1;
      await this.saveState(state);
      return state;
    }
    if (action === 'unsave') {
      state.isSaved = false;
      await this.saveState(state);
      return state;
    }

    const rating = action === 'knew' ? 3
      : action === 'didnt_know' ? 1
        : ratingFromReview({ wasCorrect, confidence, mode });

    const elapsedDays = state.lastReviewAt
      ? Math.max(0, (now - new Date(state.lastReviewAt)) / 86400000)
      : 0;

    const fsrs = scheduleReview(
      {
        stability: state.stability || 0,
        difficulty: state.difficulty || 0,
        elapsedDays,
        reps: state.reps || 0,
        lapses: state.lapses || 0,
      },
      rating,
      now,
    );

    state.stability = fsrs.stability;
    state.difficulty = fsrs.difficulty;
    state.intervalDays = fsrs.intervalDays;
    state.dueAt = fsrs.dueAt.toISOString();
    state.lapses = fsrs.lapses;
    state.reps = fsrs.reps;
    state.lastReviewAt = nowIso;
    state.lastSeenAt = nowIso;
    state.lastReviewMode = mode;
    state.totalSeen += 1;
    state.wasShownAsDue = false;
    state.shownAsDueAt = null;

    if (wasCorrect || action === 'knew') {
      state.totalCorrect += 1;
      state.correctStreak += 1;
    } else {
      state.correctStreak = 0;
    }

    const reviewMode = action === 'knew' ? 'notification'
      : action === 'didnt_know' ? 'notification'
        : mode;

    state.stage = advanceStage(state.stage, {
      wasCorrect: wasCorrect || action === 'knew',
      mode: reviewMode,
    });

    if (isMasteredStage(state.stage, state.intervalDays, state.correctStreak)) {
      state.stage = 'mastered';
      state.isMastered = true;
    } else if (state.stage !== 'mastered') {
      state.isMastered = false;
    }

    await this.saveState(state);
    if (isUuid(state.contentId)) {
      await this.retireLegacyDuplicate(state.contentId, categoryId);
    }
    try {
      const { StreakService } = require('./StreakService');
      StreakService.recordActivity(now).catch(() => {});
    } catch {
      /* streak is non-fatal */
    }
    return state;
  }

  static async markAsShown(contentId) {
    const state = await this.getState(contentId);
    if (!state?.dueAt) return;
    const due = new Date(state.dueAt);
    if (due <= new Date()) {
      state.wasShownAsDue = true;
      state.shownAsDueAt = new Date().toISOString();
      await this.saveState(state);
    }
  }

  static async clearDueStatus(contentId) {
    const state = await this.getState(contentId);
    if (!state) return;
    state.dueAt = null;
    state.wasShownAsDue = false;
    state.shownAsDueAt = null;
    await this.saveState(state);
  }

  /**
   * True when a card has a real review behind it.
   *
   * Deliberately does not look at `reps`: that field is the one piece of FSRS
   * state that can come back as 0 from an older cloud row, so anything that
   * gates display or scoring on it will silently forget the user's work.
   * `lastReviewAt` and `stability` are only ever set by recordReview and both
   * survive the round trip.
   */
  static hasBeenReviewed(state) {
    return !!(state && state.lastReviewAt && state.stability);
  }

  /**
   * Probability the user still recalls this card at `at` — the same forgetting
   * curve the scheduler uses, read forward instead of asked "is it due yet".
   * A card that was never actually reviewed scores 0: not seen is not known.
   */
  static predictedRecall(state, at = new Date()) {
    if (!this.hasBeenReviewed(state)) return 0;
    const elapsedDays = (at.getTime() - new Date(state.lastReviewAt).getTime()) / 86400000;
    return retrievability(elapsedDays, state.stability);
  }

  static isDue(state, targetTime = new Date()) {
    if (!state?.dueAt) return false;
    return new Date(state.dueAt) <= targetTime;
  }

  /** Cards that belong in the Review Queue (due by FSRS or pending first quiz). */
  static isReviewQueueEligible(state, targetTime = new Date()) {
    if (!state) return false;
    if (state.stage === 'introduced') return this.isIntroducedQuizReady(state, targetTime);
    return this.isDue(state, targetTime);
  }

  /** Introduced cards waiting out the post–"I knew it" delay. */
  static isIntroducedPendingQuiz(state, targetTime = new Date()) {
    return state?.stage === 'introduced' && !this.isIntroducedQuizReady(state, targetTime);
  }

  static isIntroducedQuizReady(state, targetTime = new Date()) {
    if (state?.stage !== 'introduced') return false;
    if (!state.lastReviewAt) return true;
    const eligibleAt = new Date(state.lastReviewAt).getTime() + INTRODUCED_QUIZ_DELAY_MS;
    return targetTime.getTime() >= eligibleAt;
  }

  static getIntroducedQuizEligibleAt(state) {
    if (state?.stage !== 'introduced' || !state.lastReviewAt) return null;
    return new Date(new Date(state.lastReviewAt).getTime() + INTRODUCED_QUIZ_DELAY_MS);
  }

  static reviewQueueUrgency(state) {
    if (!state) return Number.MAX_SAFE_INTEGER;
    if (state.stage === 'introduced') {
      const eligibleAt = this.getIntroducedQuizEligibleAt(state);
      return eligibleAt ? eligibleAt.getTime() : 0;
    }
    return state.dueAt ? new Date(state.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  }

  static async getAllLocalStates() {
    const keys = await AsyncStorage.getAllKeys();
    const clKeys = keys.filter((k) => k.startsWith(LOCAL_PREFIX));
    if (!clKeys.length) return [];
    const pairs = await AsyncStorage.multiGet(clKeys);
    const states = [];
    for (const [, raw] of pairs) {
      try {
        if (raw) states.push(JSON.parse(raw));
      } catch {
        /* skip */
      }
    }
    return states;
  }

  /** One-shot map of contentId → state (uses multiGet). */
  static async getStateMap() {
    const states = await this.getAllLocalStates();
    return new Map(states.map((s) => [s.contentId, s]));
  }

  /** Sync effective-state lookup when a state map is already loaded. */
  static getEffectiveStateFromMap(card, categoryId, stateMap) {
    if (!card?.id || !stateMap) return null;
    const direct = stateMap.get(card.id) || null;
    const hashId = this.legacyHashForCard(card, categoryId);
    const legacy = hashId && hashId !== card.id ? stateMap.get(hashId) || null : null;

    if (direct && legacy) {
      const directReviewed = direct.lastReviewAt || direct.totalSeen > 0;
      if (directReviewed) return direct;
      if (this.isDue(legacy) && !this.isDue(direct)) return legacy;
      return direct;
    }
    return direct || legacy || null;
  }

  static async getDueContentIds(targetTime = new Date()) {
    const states = await this.getAllLocalStates();
    return states
      .filter((s) => this.isDue(s, targetTime))
      .map((s) => s.contentId);
  }

  static async getDueCards({ stageFilter = null, targetTime = new Date() } = {}) {
    const states = await this.getAllLocalStates();
    return states
      .filter((s) => {
        if (!this.isDue(s, targetTime)) return false;
        if (stageFilter?.length && !stageFilter.includes(s.stage)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }

  static async getNewContentIds() {
    const states = await this.getAllLocalStates();
    const seen = new Set(states.map((s) => s.contentId));
    return { seen, states: states.filter((s) => s.stage === 'new' && !s.dueAt) };
  }

  static async hasState(contentId) {
    return !!(await this.getState(contentId));
  }

  static async getSavedContentIds() {
    const states = await this.getAllLocalStates();
    return states.filter((s) => s.isSaved).map((s) => s.contentId);
  }

  static async getMasteredContentIds() {
    const states = await this.getAllLocalStates();
    return states.filter((s) => s.stage === 'mastered' || s.isMastered).map((s) => s.contentId);
  }

  static async getScheduledContentIds() {
    const states = await this.getAllLocalStates();
    return states.filter((s) => s.dueAt).map((s) => s.contentId);
  }

  static async getDueCountsByClass(categoryIds) {
    const { ContentService } = require('./ContentService');
    const counts = {};
    for (const cat of categoryIds || []) {
      counts[cat] = 0;
    }

    const dueStates = await this.getDueCards();
    for (const state of dueStates) {
      let category = null;
      if (isUuid(state.contentId)) {
        try {
          const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
          if (SUPABASE_CONFIGURED) {
            const { data } = await supabase
              .from('cards')
              .select('deck_id, decks(slug)')
              .eq('id', state.contentId)
              .maybeSingle();
            category = data?.decks?.slug || null;
          }
        } catch {
          /* skip */
        }
      }
      if (!category) {
        const tidbit = await ContentService.getTidbitById(state.contentId, false);
        category = tidbit?.category;
      }
      if (category && counts[category] !== undefined) {
        counts[category] += 1;
      }
    }
    return counts;
  }

  static async getTotalDueCount() {
    const { QueueService } = require('./QueueService');
    return QueueService.getScopedDueCount();
  }

  /**
   * Cards worth re-drilling. Note that a first-exposure "didn't know" from a
   * notification counts as a lapse by design — that repetition is how a
   * discovered card keeps coming back — so newly discovered cards surface here
   * alongside genuinely forgotten ones.
   */
  static async getWeakSpots(limit = 10, cardIdsInScope = null) {
    const states = await this.getAllLocalStates();
    const scopeSet = cardIdsInScope ? new Set(cardIdsInScope) : null;
    return states
      .filter((s) => {
        if (scopeSet && !scopeSet.has(s.contentId)) return false;
        return s.lapses > 0 || (s.totalSeen > 0 && s.totalCorrect / s.totalSeen < 0.6);
      })
      .sort((a, b) => {
        const accA = a.totalSeen ? a.totalCorrect / a.totalSeen : 0;
        const accB = b.totalSeen ? b.totalCorrect / b.totalSeen : 0;
        if (accA !== accB) return accA - accB;
        return b.lapses - a.lapses;
      })
      .slice(0, limit);
  }

  /**
   * Delete local learning states that can never resolve to a card.
   *
   * These accumulate whenever a content migration rebuilds a deck: the old
   * hash-keyed state survives locally but the card it pointed at is gone. They
   * contribute nothing to any due count yet are re-resolved on every Review
   * Queue and Home open, and the set only grows.
   *
   * This deletes user data, so the rules are deliberately narrow:
   *  - UUID ids are NEVER pruned. A UUID names a real cards row that may simply
   *    be unreachable right now (offline, deck still syncing).
   *  - Saved states are kept even when unresolvable — that is explicit user intent.
   *  - The matching legacy spaced_repetition_ key is removed too, otherwise
   *    migrateLegacySpacedRepetition would resurrect the state if MIGRATION_KEY
   *    were ever cleared (clearAllState does exactly that).
   *
   * Callers must confirm content actually loaded first — see
   * ContentService.isUsingFallbackContent().
   *
   * @returns {Promise<number>} how many states were removed
   */
  static async pruneUnresolvableStates(contentIds) {
    if (!contentIds?.length) return 0;

    const candidates = [];
    for (const id of new Set(contentIds)) {
      if (!id || isUuid(id)) continue;
      const state = await this.getState(id);
      if (state?.isSaved) continue;
      candidates.push(id);
    }
    if (!candidates.length) return 0;

    // Report what was actually deleted, not what was considered. Concurrent
    // callers can compute the same candidate list from the same pre-prune
    // snapshot, and multiRemove on an already-removed key is a silent no-op —
    // counting candidates made the log overstate the real figure.
    const keys = [];
    for (const id of candidates) {
      keys.push(localKey(id));
      keys.push(`${LEGACY_SR_PREFIX}${id}`);
    }

    try {
      const existing = (await AsyncStorage.multiGet(keys))
        .filter(([, raw]) => raw != null)
        .map(([key]) => key);
      if (!existing.length) return 0;

      await AsyncStorage.multiRemove(existing);

      // One state may own up to two keys, so count distinct content ids.
      const removedIds = new Set(
        existing.map((k) => k.replace(LOCAL_PREFIX, '').replace(LEGACY_SR_PREFIX, '')),
      );
      console.log(`[CardLearning] Pruned ${removedIds.size} unresolvable state(s)`);
      return removedIds.size;
    } catch (e) {
      console.warn('[CardLearning] prune failed:', e.message);
      return 0;
    }
  }

  static async clearAllState() {
    const keys = await AsyncStorage.getAllKeys();
    const clKeys = keys.filter((k) => k.startsWith(LOCAL_PREFIX));
    await AsyncStorage.multiRemove(clKeys);
    await AsyncStorage.removeItem(MIGRATION_KEY);
  }

  /** Legacy SpacedRepetitionService compatibility */
  static async getTidbitState(tidbitId) {
    const state = await this.getState(tidbitId);
    return state ? stateToLegacySr(state) : null;
  }

  static async recordFeedback(tidbitId, action, categoryId = null) {
    if (action === 'save') {
      return this.recordReview(tidbitId, { action: 'save', categoryId });
    }
    if (action === 'unsave') {
      return this.recordReview(tidbitId, { action: 'unsave', categoryId });
    }
    const wasCorrect = action === 'knew';
    return this.recordReview(tidbitId, {
      wasCorrect,
      action,
      mode: 'notification',
      categoryId,
    });
  }

  static async markTidbitAsShown(tidbitId) {
    return this.markAsShown(tidbitId);
  }
}

export { CardLearningService, STAGES, isUuid, INTRODUCED_QUIZ_DELAY_MS };
export default CardLearningService;
