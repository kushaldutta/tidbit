/**
 * QueueService — due-first study queues with stage + section scope filtering.
 */
import { ClassService } from './ClassService';
import { ContentService } from './ContentService';
import { DeckService } from './DeckService';
import { StudyDeckService } from './StudyDeckService';
import { CardLearningService, isUuid } from './CardLearningService';
import { StudyPlanService } from './StudyPlanService';
import { QuizService } from './QuizService';

/** Default number of cards per Quiz / Recall session. */
export const LEARN_SESSION_CARD_LIMIT = 10;

const REVIEW_QUEUE_CACHE_MS = 8000;

/** Candidate terms sampled per multiple-choice question (3 become distractors). */
const DISTRACTOR_SAMPLE_SIZE = 10;

/** Below this many distinct wrong terms, a card is shown rather than quizzed. */
const MIN_REAL_DISTRACTORS = 2;

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cardToTidbit(card, category) {
  return {
    id: card.id,
    text: card.back || card.text,
    term: card.front && card.front !== card.back ? card.front : (card.term || null),
    category: category || card.category,
    deckId: card.deck_id || card.deckId,
    timestamp: new Date().toISOString(),
  };
}

function effectiveStage(state) {
  if (!state) return 'new';
  if (state.stage === 'new' && CardLearningService.isDue(state)) return 'introduced';
  return state.stage || 'new';
}

function resolvePinnedCard(cards, startCardId, categoryId) {
  if (!startCardId) return null;
  const pinned = cards.find((c) => c.id === startCardId);
  if (pinned) return pinned;
  if (!categoryId) return null;
  return cards.find((c) => {
    const hash = CardLearningService.legacyHashForCard(c, categoryId);
    return hash === startCardId;
  }) || null;
}

async function categoryIdForDeck(deckId) {
  const parsed = ContentService.parseCategoryDeckId(deckId);
  if (parsed) return parsed;
  try {
    const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
    if (!SUPABASE_CONFIGURED) return null;
    const { data } = await supabase
      .from('decks')
      .select('slug')
      .eq('id', deckId)
      .maybeSingle();
    return data?.slug || null;
  } catch {
    return null;
  }
}

class QueueService {
  static _reviewQueueCache = null;

  static invalidateReviewQueueCache() {
    this._reviewQueueCache = null;
  }

  static async loadCardsForCategory(categoryId, { bypassStudyScope = false } = {}) {
    const deckId = await ContentService.getPresetDeckIdForSlug(categoryId);
    if (deckId) {
      if (bypassStudyScope) {
        // Load every card in the deck — used by ForecastService so the exam-scope
        // filter operates on the full card set, not just the notification scope.
        return StudyDeckService.loadStudyCards(deckId, null);
      }
      const studyScope = await StudyDeckService.resolveStudyScope(deckId);
      return StudyDeckService.loadStudyCards(deckId, studyScope);
    }
    const studyCards = await ContentService.getStudyCardsForCategory(categoryId);
    return studyCards.map((c) => ({
      id: c.id,
      front: c.prompt || c.term,
      back: c.text,
      deck_id: c.deckId,
    }));
  }

  static async loadEligibleCards(categoryIds) {
    const lists = await Promise.all(
      (categoryIds || []).map(async (cat) => {
        const cards = await this.loadCardsForCategory(cat);
        return cards.map((card) => ({ ...card, categoryId: cat }));
      }),
    );
    return lists.flat();
  }

  /**
   * @param {object} opts
   * @param {boolean} [opts.annotateStudyModes] — tag each tidbit with the stage
   *   and question style the session player should use. Off by default: the
   *   pre-built multiple-choice question is several hundred bytes and callers
   *   like the notification scheduler put the whole tidbit in a size-capped
   *   push payload. Turn it on for anything feeding StudySession.
   */
  static async buildQueue({
    categoryIds = null,
    limit = 20,
    stageFilter = null,
    includeNew = true,
    newRatio = 0.4,
    annotateStudyModes = false,
  } = {}) {
    const categories =
      categoryIds || (await StudyPlanService.resolveStudyCategories());
    if (!categories.length) return { due: [], fresh: [], combined: [] };

    const [eligible, stateMap] = await Promise.all([
      this.loadEligibleCards(categories),
      CardLearningService.getStateMap(),
    ]);
    const dueItems = [];
    const newItems = [];

    for (const card of eligible) {
      const state = CardLearningService.getEffectiveStateFromMap(card, card.categoryId, stateMap);
      const tidbit = cardToTidbit(card, card.categoryId);

      if (state && CardLearningService.isReviewQueueEligible(state)) {
        if (stageFilter?.length && !stageFilter.includes(effectiveStage(state))) continue;
        dueItems.push({
          tidbit,
          card,
          state,
          urgency: CardLearningService.reviewQueueUrgency(state),
          kind: 'due',
        });
      } else if (includeNew && (!state || state.stage === 'new')) {
        newItems.push({ tidbit, card, state: state || null, kind: 'new' });
      }
    }

    dueItems.sort((a, b) => a.urgency - b.urgency);

    const dueLimit = Math.min(dueItems.length, Math.ceil(limit * (1 - newRatio)));
    const newLimit = Math.min(newItems.length, limit - dueLimit);

    const selectedDue = dueItems.slice(0, dueLimit);
    const selectedNew = shuffleArray(newItems).slice(0, newLimit);

    // Distractor candidates, grouped by class. Built from the cards already
    // loaded above so annotating costs no extra fetches.
    const poolByCategory = new Map();
    if (annotateStudyModes) {
      for (const card of eligible) {
        const pool = poolByCategory.get(card.categoryId);
        if (pool) pool.push(card);
        else poolByCategory.set(card.categoryId, [card]);
      }
    }

    const annotate = (item) => (annotateStudyModes
      ? {
        ...item,
        tidbit: this._annotateStudyTidbit(item, poolByCategory.get(item.card.categoryId) || []),
      }
      : item);

    const annotatedDue = selectedDue.map(annotate);
    const annotatedNew = selectedNew.map(annotate);
    const combined = shuffleArray([...annotatedDue, ...annotatedNew]).map((item) => item.tidbit);

    return {
      due: annotatedDue.map((i) => i.tidbit),
      fresh: annotatedNew.map((i) => i.tidbit),
      combined,
      dueStates: selectedDue,
    };
  }

  /**
   * Mode ladder for focused study sessions.
   *
   * A session's job is to introduce material and then build memory for it, so
   * the question gets harder as the card climbs the stage ladder rather than
   * asking for blank-page recall of something the user has never met:
   *   new         -> flashcard, self-rated (this is the introduction)
   *   introduced  -> multiple choice (recognition)
   *   beyond that -> typed recall
   */
  static studyModeForStage(stage) {
    if (stage === 'new') return 'flashcard';
    if (stage === 'introduced') return 'quiz';
    return 'recall';
  }

  /**
   * Tag a queue item with the mode the session player should use, pre-building
   * the multiple-choice question while the distractor pool is still in hand.
   *
   * The daily plan persists what this returns, so a card promoted later the
   * same day is asked at the mode it had when the plan was built. That errs
   * toward the easier question, which is the harmless direction.
   */
  static _annotateStudyTidbit(item, categoryCards) {
    const stage = item.kind === 'due' ? effectiveStage(item.state) : 'new';
    let studyMode = this.studyModeForStage(stage);

    // Both graded modes ask for the term. With no term there is nothing to
    // ask, so the card is simply shown.
    if (!item.tidbit.term) studyMode = 'flashcard';

    let question = null;
    if (studyMode === 'quiz') {
      question = this._buildTermQuestion(item.card, categoryCards);
      if (!question) studyMode = 'flashcard';
    }

    return { ...item.tidbit, stage, studyMode, question };
  }

  /**
   * Definition-prompt multiple choice: the stem is the definition and the
   * options are terms, the same direction the recall step later asks in.
   * QuizService reads front as the prompt and back as the answer, so the cards
   * handed to it are deliberately flipped.
   *
   * Candidates are sampled rather than passed whole: buildQuestions builds a
   * question per card in the pool and we only keep the first, so handing it a
   * 500-card class would do 500x the work for one question.
   */
  static _buildTermQuestion(card, categoryCards) {
    const flip = (c) => ({
      id: c.id,
      front: (c.back || '').trim(),
      back: (c.front || '').trim(),
    });
    const self = flip(card);
    if (!self.front || !self.back) return null;

    const candidates = categoryCards
      .filter((c) => c.id !== card.id)
      .map(flip)
      .filter((c) => c.back && c.back !== self.back);
    // Too few real terms to choose between and QuizService pads the options
    // with "None of the above" filler, which makes the answer obvious and the
    // introduction worthless. Better to show the card than to fake a question.
    if (new Set(candidates.map((c) => c.back)).size < MIN_REAL_DISTRACTORS) return null;

    const sampled = shuffleArray(candidates).slice(0, DISTRACTOR_SAMPLE_SIZE);
    const [question] = QuizService.buildQuestions([self, ...sampled], { preserveOrder: true });
    return question || null;
  }

  static async buildCardsForLearnMode(
    deckId,
    studyScope,
    { mode = 'quiz', limit = LEARN_SESSION_CARD_LIMIT, startCardId = null, categoryId = null } = {},
  ) {
    const cards = await StudyDeckService.loadStudyCards(deckId, studyScope);
    const resolvedCategoryId = categoryId || await categoryIdForDeck(deckId);
    const stateMap = await CardLearningService.getStateMap();
    const stageFilter = mode === 'review' ? null
      : mode === 'quiz' ? ['introduced', 'recognition', 'recall', 'mastered']
      : mode === 'recall' ? ['recognition', 'recall', 'mastered']
        : null;

    const dueCards = [];
    const newCards = [];

    for (const card of cards) {
      const state = CardLearningService.getEffectiveStateFromMap(card, resolvedCategoryId, stateMap);
      if (state && CardLearningService.isReviewQueueEligible(state)) {
        const stage = effectiveStage(state);
        if (!stageFilter || stageFilter.includes(stage)) {
          dueCards.push({
            card,
            state,
            urgency: CardLearningService.reviewQueueUrgency(state),
          });
        }
      } else if (!state || state.stage === 'new') {
        newCards.push(card);
      }
    }

    dueCards.sort((a, b) => a.urgency - b.urgency);

    // Review mode: due cards only — never mix in new cards.
    // startCardId pins a specific card first (legacy per-card tap path).
    if (mode === 'review') {
      let ordered = dueCards.map((d) => d.card);
      if (startCardId) {
        const pinned = resolvePinnedCard(cards, startCardId, resolvedCategoryId);
        if (pinned) ordered = [pinned, ...ordered.filter((c) => c.id !== pinned.id)];
        if (ordered.length === 0 && pinned) return [pinned];
      }
      return ordered.slice(0, limit);
    }

    const dueLimit = Math.min(dueCards.length, Math.ceil(limit * 0.7));
    const newLimit = Math.min(newCards.length, limit - dueLimit);

    let ordered = [
      ...dueCards.slice(0, dueLimit).map((d) => d.card),
      ...shuffleArray(newCards).slice(0, newLimit),
    ];

    if (ordered.length === 0) {
      ordered = shuffleArray(cards).slice(0, limit);
    }

    return ordered.slice(0, limit);
  }

  static async getReviewQueueGrouped(categoryIds = null, { bypassCache = false } = {}) {
    const categories =
      categoryIds || (await StudyPlanService.resolveStudyCategories());
    const cacheKey = [...categories].sort().join('|');
    const now = Date.now();
    if (
      !bypassCache
      && this._reviewQueueCache?.key === cacheKey
      && now - this._reviewQueueCache.at < REVIEW_QUEUE_CACHE_MS
    ) {
      return this._reviewQueueCache.groups;
    }

    const groups = await this._buildReviewQueueGrouped(categories);
    this._reviewQueueCache = { key: cacheKey, at: now, groups };
    return groups;
  }

  static async _buildReviewQueueGrouped(categories) {
    if (!categories.length) return [];

    // Batched lookup (1 query for all uncached slugs) instead of one Supabase
    // round trip per enrolled class — also warms the cache that loadEligibleCards
    // below relies on via ContentService.getPresetDeckIdForSlug.
    const [stateMap, presetDeckByCategory] = await Promise.all([
      CardLearningService.getStateMap(),
      ContentService.getPresetDeckIdsForSlugs(categories),
    ]);

    const queueStates = [...stateMap.values()].filter((s) =>
      CardLearningService.isReviewQueueEligible(s),
    );
    if (!queueStates.length) return [];

    const eligible = await this.loadEligibleCards(categories);
    const eligibleById = new Map();
    const hashToCard = new Map();
    for (const card of eligible) {
      eligibleById.set(card.id, card);
      const hash = CardLearningService.legacyHashForCard(card, card.categoryId);
      if (hash) hashToCard.set(hash, card);
    }

    const groups = {};
    const seenIds = new Set();
    const orphanUuids = [];
    // Legacy hash states that resolved to nothing — candidates for pruning.
    const unresolvable = [];

    const addItem = (cat, tidbit, stage, dueAt) => {
      if (!tidbit?.id || seenIds.has(tidbit.id)) return;
      seenIds.add(tidbit.id);
      if (!groups[cat]) {
        groups[cat] = {
          categoryId: cat,
          name: ContentService.formatCategoryName(cat),
          items: [],
        };
      }
      groups[cat].items.push({ tidbit, stage, dueAt });
    };

    for (const state of queueStates) {
      const card = eligibleById.get(state.contentId)
        || hashToCard.get(state.contentId);
      if (card) {
        addItem(
          card.categoryId,
          cardToTidbit(card, card.categoryId),
          effectiveStage(state),
          state.dueAt,
        );
        continue;
      }

      if (isUuid(state.contentId)) {
        orphanUuids.push(state.contentId);
      } else {
        const tidbit = await ContentService.getTidbitById(state.contentId, false);
        const category = tidbit?.category;
        if (tidbit && category && categories.includes(category) && !presetDeckByCategory[category]) {
          addItem(category, ContentService.ensureTidbitHasId(tidbit), effectiveStage(state), state.dueAt);
        } else if (!tidbit) {
          // Resolved to nothing at all. Note: a tidbit that resolves but is
          // filtered out above (not enrolled, or superseded by a preset deck) is
          // NOT unresolvable and must never be pruned.
          unresolvable.push(state.contentId);
        }
      }
    }

    // Prune only when content genuinely loaded. On fallback content, or when the
    // deck fetch failed, everything looks unresolvable and we would delete real
    // progress. Fire-and-forget so the queue never waits on it.
    if (
      unresolvable.length > 0
      && eligible.length > 0
      && !ContentService.isUsingFallbackContent()
    ) {
      CardLearningService.pruneUnresolvableStates(unresolvable).catch(() => {});
    }

    if (orphanUuids.length > 0) {
      const orphanCards = await this._fetchCardsByIds(orphanUuids);
      for (const state of queueStates) {
        if (!orphanUuids.includes(state.contentId) || seenIds.has(state.contentId)) continue;
        const data = orphanCards.get(state.contentId);
        if (!data) continue;
        const category = data.decks?.slug || null;
        if (!category || !categories.includes(category)) continue;
        addItem(
          category,
          cardToTidbit(
            { id: data.id, front: data.front, back: data.back, deck_id: data.deck_id },
            category,
          ),
          effectiveStage(state),
          state.dueAt,
        );
      }
    }

    for (const g of Object.values(groups)) {
      g.items.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    }

    return Object.values(groups);
  }

  static async _fetchCardsByIds(cardIds) {
    const byId = new Map();
    if (!cardIds?.length) return byId;
    try {
      const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
      if (!SUPABASE_CONFIGURED) return byId;
      const unique = [...new Set(cardIds)];
      for (let i = 0; i < unique.length; i += 100) {
        const chunk = unique.slice(i, i + 100);
        const { data } = await supabase
          .from('cards')
          .select('id, front, back, deck_id, decks(slug)')
          .in('id', chunk);
        for (const row of data || []) {
          byId.set(row.id, row);
        }
      }
    } catch {
      /* ignore */
    }
    return byId;
  }

  /** Due count that matches what the Review Queue actually shows. */
  static async getScopedDueCount(categoryIds = null) {
    const groups = await this.getReviewQueueGrouped(categoryIds);
    return groups.reduce((sum, g) => sum + g.items.length, 0);
  }

  static modeForStage(stage) {
    if (stage === 'introduced') return 'quiz';
    return 'recall';
  }

  static _sessionItemForCard(card, stage, categoryId, distractorPool) {
    const itemMode = this.modeForStage(stage);
    if (itemMode === 'quiz') {
      const pool = [card, ...distractorPool.filter((c) => c.id !== card.id)];
      const questions = QuizService.buildQuestions(pool, { preserveOrder: true });
      if (!questions[0]) return null;
      return { card, mode: 'quiz', stage, question: questions[0], categoryId };
    }
    return { card, mode: 'recall', stage, categoryId };
  }

  /** Interleave due items across classes so one deck does not dominate. */
  static _roundRobinPickDueItems(groups, limit) {
    const buckets = groups.map((g) => ({
      categoryId: g.categoryId,
      items: [...g.items],
    }));
    const selected = [];
    while (selected.length < limit && buckets.some((b) => b.items.length > 0)) {
      for (const bucket of buckets) {
        if (selected.length >= limit) break;
        const item = bucket.items.shift();
        if (item) selected.push({ ...item, categoryId: bucket.categoryId });
      }
    }
    return selected;
  }

  /**
   * Load all cards for a deck without any section-scope filter.
   * Used as distractor pool — we want the full deck, not just the user's current scope.
   */
  static async _loadFullDeckCards(deckId, categoryId) {
    // Category-based virtual deck (bundled JSON content)
    if (categoryId && ContentService.parseCategoryDeckId(deckId)) {
      return ContentService.getStudyCardsForCategory(categoryId);
    }
    if (deckId && ContentService.parseCategoryDeckId(deckId)) {
      const catId = ContentService.parseCategoryDeckId(deckId);
      return ContentService.getStudyCardsForCategory(catId);
    }
    // Preset / user deck — fetch all cards, no section filter
    try {
      const cards = await DeckService.listCards(deckId);
      return cards.map((c) => ({
        id: c.id,
        front: (c.front || '').trim(),
        back: (c.back || '').trim(),
        deck_id: deckId,
        section_id: c.section_id,
      }));
    } catch {
      return [];
    }
  }

  /** Synthesise a minimal card object from a tidbit when the card isn't in the pool. */
  static _cardFromTidbit(tidbit, deckId) {
    return {
      id: tidbit.id,
      front: (tidbit.term || tidbit.text || '').trim(),
      back: (tidbit.text || '').trim(),
      deck_id: deckId,
    };
  }

  /**
   * Deck card UUID for a tidbit id, resolving legacy hash ids through the
   * category's card pool. Returns null when no deck card matches, which is the
   * case for tidbits that only ever existed in the bundled JSON.
   */
  static async resolveCardUuid(tidbitId, categoryId) {
    if (!tidbitId) return null;
    if (isUuid(tidbitId)) return tidbitId;
    if (!categoryId) return null;
    try {
      const cards = await this.loadCardsForCategory(categoryId);
      const card = this._findCardInPool(cards, tidbitId, categoryId);
      return isUuid(card?.id) ? card.id : null;
    } catch (e) {
      console.warn('[QUEUE] resolveCardUuid failed:', e.message);
      return null;
    }
  }

  /** Find a card in pool by UUID or legacy hash. */
  static _findCardInPool(pool, tidbitId, categoryId) {
    const byId = pool.find((c) => c.id === tidbitId);
    if (byId) return byId;
    return pool.find((c) => {
      const hash = CardLearningService.legacyHashForCard(c, categoryId);
      return hash === tidbitId;
    }) || null;
  }

  /**
   * Build session items for a single-class review.
   * Derives the due-card list directly from the queue groups (same source as the
   * queue screen) so there is no double-lookup / scope-filter mismatch.
   */
  static async buildReviewSessionItems(
    deckId,
    studyScope,
    { limit = LEARN_SESSION_CARD_LIMIT, startCardId = null, categoryId = null } = {},
  ) {
    const resolvedCategoryId = categoryId || await categoryIdForDeck(deckId);

    // Pull due items from the queue — same set the queue screen shows.
    const groups = await this.getReviewQueueGrouped(
      resolvedCategoryId ? [resolvedCategoryId] : null,
    );
    const group = groups.find((g) => g.categoryId === resolvedCategoryId);
    let queueItems = group ? [...group.items] : [];

    if (startCardId) {
      const pinnedIdx = queueItems.findIndex((item) => item.tidbit.id === startCardId);
      if (pinnedIdx > 0) {
        const [pinned] = queueItems.splice(pinnedIdx, 1);
        queueItems = [pinned, ...queueItems];
      }
    }

    queueItems = queueItems.slice(0, limit);
    if (!queueItems.length) return [];

    // Full deck cards (no scope filter) — needed for MC distractor pool.
    const distractorPool = await this._loadFullDeckCards(deckId, resolvedCategoryId);

    const items = [];
    for (const qItem of queueItems) {
      const card = this._findCardInPool(distractorPool, qItem.tidbit.id, resolvedCategoryId)
        || this._cardFromTidbit(qItem.tidbit, deckId);
      const item = this._sessionItemForCard(card, qItem.stage, resolvedCategoryId, distractorPool);
      if (item) items.push(item);
    }

    return items;
  }

  /**
   * A drill session scoped to one topic (deck section), weakest cards first.
   *
   * Unlike buildReviewSessionItems this deliberately ignores due dates: tapping
   * a weak topic means "study this now", and the cards dragging a topic down are
   * usually the ones the scheduler has not surfaced yet — never-seen cards, or
   * ones whose next review is still days out.
   *
   * Pass `sectionId: null` to drill the whole class, still weakest-first.
   */
  static async buildTopicSessionItems(
    categoryId,
    { sectionId = null, startCardId = null, limit = LEARN_SESSION_CARD_LIMIT } = {},
  ) {
    if (!categoryId) return [];

    const [cards, stateMap] = await Promise.all([
      this.loadCardsForCategory(categoryId),
      CardLearningService.getStateMap(),
    ]);
    const scoped = sectionId ? cards.filter((c) => c.section_id === sectionId) : cards;
    if (!scoped.length) return [];

    const now = new Date();
    const ranked = scoped
      .map((card) => {
        const state = CardLearningService.getEffectiveStateFromMap(card, categoryId, stateMap);
        const stage = state ? effectiveStage(state) : 'new';
        return {
          card,
          // A card the user has never answered gets introduced with a quiz
          // rather than thrown at them as blank-page recall.
          stage: stage === 'new' ? 'introduced' : stage,
          recall: CardLearningService.predictedRecall(state, now),
        };
      })
      .sort((a, b) => a.recall - b.recall);

    const matchesStart = (r) => !!startCardId
      && (r.card.id === startCardId
        || CardLearningService.legacyHashForCard(r.card, categoryId) === startCardId);

    // Guarantee the requested card survives the cut, however strong it looks.
    const startIdx = ranked.findIndex(matchesStart);
    if (startIdx > 0) {
      const [pinned] = ranked.splice(startIdx, 1);
      ranked.unshift(pinned);
    }

    // Pick weakest-first, then present in random order. Selection is the part
    // that should be deterministic; a fixed running order just teaches the
    // sequence, which is the opposite of what drilling a weak topic is for.
    const picked = shuffleArray(ranked.slice(0, limit));

    // A weak-spot tap names one specific card, so that one still leads.
    const pinnedIdx = picked.findIndex(matchesStart);
    if (pinnedIdx > 0) {
      const [pinned] = picked.splice(pinnedIdx, 1);
      picked.unshift(pinned);
    }

    const deckId = await ContentService.getPresetDeckIdForSlug(categoryId);
    const distractorPool = await this._loadFullDeckCards(deckId, categoryId);

    const items = [];
    for (const { card, stage } of picked) {
      const item = this._sessionItemForCard(card, stage, categoryId, distractorPool);
      if (item) items.push(item);
    }
    return items;
  }

  /** Up to `limit` due cards mixed across enrolled classes (round-robin by class). */
  static async buildMixedReviewSessionItems(
    categoryIds = null,
    { limit = LEARN_SESSION_CARD_LIMIT } = {},
  ) {
    const groups = await this.getReviewQueueGrouped(categoryIds);
    if (!groups.length) return [];

    const picked = this._roundRobinPickDueItems(groups, limit);
    const categoriesNeeded = [...new Set(picked.map((e) => e.categoryId))];

    // Load full deck cards per category (no scope filter) for distractor pools.
    const poolByCategory = new Map();
    await Promise.all(
      categoriesNeeded.map(async (cat) => {
        const presetDeckId = await ContentService.getPresetDeckIdForSlug(cat);
        const cards = await this._loadFullDeckCards(
          presetDeckId || ContentService.categoryDeckId(cat),
          cat,
        );
        poolByCategory.set(cat, { deckId: presetDeckId, cards });
      }),
    );

    const items = [];
    for (const entry of picked) {
      const poolEntry = poolByCategory.get(entry.categoryId);
      if (!poolEntry) continue;
      const { deckId: entryDeckId, cards: pool } = poolEntry;
      const card = this._findCardInPool(pool, entry.tidbit.id, entry.categoryId)
        || this._cardFromTidbit(entry.tidbit, entryDeckId || entry.categoryId);
      const item = this._sessionItemForCard(card, entry.stage, entry.categoryId, pool);
      if (item) items.push(item);
    }

    return items;
  }

  /** @deprecated Use modeForStage — review queue now uses ReviewSession */
  static routeForStage(stage) {
    return 'ReviewSession';
  }
}

export { QueueService };
export default QueueService;
