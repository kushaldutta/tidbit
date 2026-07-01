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

  static async loadCardsForCategory(categoryId) {
    const deckId = await ContentService.getPresetDeckIdForSlug(categoryId);
    if (deckId) {
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

  static async buildQueue({
    categoryIds = null,
    limit = 20,
    stageFilter = null,
    includeNew = true,
    newRatio = 0.4,
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
    const combined = shuffleArray([...selectedDue, ...selectedNew]).map((item) => item.tidbit);

    return {
      due: selectedDue.map((i) => i.tidbit),
      fresh: selectedNew.map((i) => i.tidbit),
      combined,
      dueStates: selectedDue,
    };
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

    // Review Queue tap: due cards only, tapped card first — never mix in new cards
    if (startCardId) {
      const pinned = resolvePinnedCard(cards, startCardId, resolvedCategoryId);
      let ordered = dueCards.map((d) => d.card);

      if (pinned) {
        ordered = [pinned, ...ordered.filter((c) => c.id !== pinned.id)];
      }

      if (ordered.length > 0) {
        return ordered.slice(0, Math.min(limit, ordered.length));
      }
      if (pinned) return [pinned];
      return [];
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

    const [stateMap, presetEntries] = await Promise.all([
      CardLearningService.getStateMap(),
      Promise.all(
        categories.map(async (cat) => [cat, await ContentService.getPresetDeckIdForSlug(cat)]),
      ),
    ]);
    const presetDeckByCategory = Object.fromEntries(presetEntries);

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
        }
      }
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

  static async buildReviewSessionItems(
    deckId,
    studyScope,
    { limit = LEARN_SESSION_CARD_LIMIT, startCardId = null, categoryId = null } = {},
  ) {
    const resolvedCategoryId = categoryId || await categoryIdForDeck(deckId);
    const cards = await this.buildCardsForLearnMode(deckId, studyScope, {
      mode: 'review',
      limit,
      startCardId,
      categoryId: resolvedCategoryId,
    });
    const distractorPool = await StudyDeckService.loadStudyCards(deckId, studyScope);
    const stateMap = await CardLearningService.getStateMap();
    const items = [];

    for (const card of cards) {
      const state = CardLearningService.getEffectiveStateFromMap(card, resolvedCategoryId, stateMap);
      const stage = effectiveStage(state);
      const item = this._sessionItemForCard(card, stage, resolvedCategoryId, distractorPool);
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
    const poolByCategory = new Map();

    await Promise.all(
      categoriesNeeded.map(async (cat) => {
        const deckId = await ContentService.getPresetDeckIdForSlug(cat);
        if (!deckId) return;
        const studyScope = await StudyDeckService.resolveStudyScope(deckId);
        const cards = await StudyDeckService.loadStudyCards(deckId, studyScope);
        poolByCategory.set(cat, cards);
      }),
    );

    const items = [];
    for (const entry of picked) {
      const pool = poolByCategory.get(entry.categoryId);
      if (!pool?.length) continue;
      let card = pool.find((c) => c.id === entry.tidbit.id);
      if (!card) {
        card = pool.find((c) => {
          const hash = CardLearningService.legacyHashForCard(c, entry.categoryId);
          return hash === entry.tidbit.id;
        });
      }
      if (!card) continue;
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
