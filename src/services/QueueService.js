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
    const all = [];
    for (const cat of categoryIds || []) {
      const cards = await this.loadCardsForCategory(cat);
      for (const card of cards) {
        all.push({ ...card, categoryId: cat });
      }
    }
    return all;
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

    const eligible = await this.loadEligibleCards(categories);
    const dueItems = [];
    const newItems = [];

    for (const card of eligible) {
      const contentId = card.id;
      const state = await CardLearningService.getEffectiveState(card, card.categoryId);
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
    const stageFilter = mode === 'review' ? null
      : mode === 'quiz' ? ['introduced', 'recognition', 'recall', 'mastered']
      : mode === 'recall' ? ['recognition', 'recall', 'mastered']
        : null;

    const dueCards = [];
    const newCards = [];

    for (const card of cards) {
      const state = await CardLearningService.getEffectiveState(card, resolvedCategoryId);
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

  static async getReviewQueueGrouped(categoryIds = null) {
    const categories =
      categoryIds || (await StudyPlanService.resolveStudyCategories());
    if (!categories.length) return [];

    const eligible = await this.loadEligibleCards(categories);
    const eligibleIds = new Set(eligible.map((c) => c.id));
    const presetDeckByCategory = {};
    await Promise.all(
      categories.map(async (cat) => {
        presetDeckByCategory[cat] = await ContentService.getPresetDeckIdForSlug(cat);
      }),
    );
    const groups = {};
    const seenIds = new Set();

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

    for (const card of eligible) {
      const state = await CardLearningService.getEffectiveState(card, card.categoryId);
      if (!state || !CardLearningService.isReviewQueueEligible(state)) continue;
      addItem(
        card.categoryId,
        cardToTidbit(card, card.categoryId),
        effectiveStage(state),
        state.dueAt,
      );
    }

    // Legacy hash tidbit IDs for bundled (non-deck) categories only
    const dueStates = await CardLearningService.getDueCards();
    for (const state of dueStates) {
      if (eligibleIds.has(state.contentId) || seenIds.has(state.contentId)) continue;

      let tidbit = null;
      let category = null;

      if (isUuid(state.contentId)) {
        try {
          const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
          if (SUPABASE_CONFIGURED) {
            const { data } = await supabase
              .from('cards')
              .select('id, front, back, deck_id, decks(slug)')
              .eq('id', state.contentId)
              .maybeSingle();
            if (data) {
              category = data.decks?.slug || null;
              tidbit = cardToTidbit(
                { id: data.id, front: data.front, back: data.back, deck_id: data.deck_id },
                category,
              );
            }
          }
        } catch {
          /* fall through */
        }
      }

      if (!tidbit) {
        tidbit = await ContentService.getTidbitById(state.contentId, false);
        category = tidbit?.category;
      }

      if (!tidbit || !category || !categories.includes(category)) continue;

      // Preset deck categories are covered via getEffectiveState on deck cards above
      if (presetDeckByCategory[category]) continue;

      addItem(
        category,
        ContentService.ensureTidbitHasId(tidbit),
        effectiveStage(state),
        state.dueAt,
      );
    }

    for (const g of Object.values(groups)) {
      g.items.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    }

    return Object.values(groups);
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
    const items = [];

    for (const card of cards) {
      const state = await CardLearningService.getEffectiveState(card, resolvedCategoryId);
      const stage = effectiveStage(state);
      const itemMode = this.modeForStage(stage);

      if (itemMode === 'quiz') {
        const pool = [card, ...distractorPool.filter((c) => c.id !== card.id)];
        const questions = QuizService.buildQuestions(pool, { preserveOrder: true });
        if (!questions[0]) continue;
        items.push({ card, mode: 'quiz', stage, question: questions[0] });
      } else {
        items.push({ card, mode: 'recall', stage });
      }
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
