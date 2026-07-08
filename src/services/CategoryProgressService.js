import { ContentService } from './ContentService';
import { ClassService } from './ClassService';
import { StorageService } from './StorageService';

function safePercent(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * CategoryProgressService
 * Computes per-category learning stats using:
 * - total cards per category (same source QueueService uses for the Review Queue —
 *   preset deck cards within the user's study scope, or bundled tidbits as a fallback)
 * - card learning states from CardLearningService (local AsyncStorage cache)
 */
class CategoryProgressService {
  /**
   * Progress for enrolled classes (source of truth for the Home progress UI).
   * Unlike selectedCategories, this is not affected by notification opt-outs.
   */
  static async getEnrollmentCategoriesProgress() {
    const categories = await ClassService.getEnrollmentCategoryIds();
    if (categories.length === 0) {
      return this.getSelectedCategoriesProgress();
    }
    return this.getCategoriesProgress(categories);
  }

  /**
   * Get progress for selected categories (notification-enabled subset).
   * @returns {Promise<Array>} array of category progress objects
   */
  static async getSelectedCategoriesProgress() {
    const selected = await StorageService.getSelectedCategories();
    return await this.getCategoriesProgress(selected);
  }

  /**
   * Get progress for specified categories.
   * @param {string[]} categories
   * @returns {Promise<Array>}
   */
  static async getCategoriesProgress(categories) {
    try {
      const categoryIds = [...new Set((categories || []).filter(Boolean))];
      if (categoryIds.length === 0) return [];

      const { QueueService } = require('./QueueService');
      const { CardLearningService } = require('./CardLearningService');

      // Same card source the Review Queue uses (preset deck cards within study
      // scope, or bundled tidbits as a fallback) — keeps totals consistent
      // with what the user actually sees to review.
      const cardsByCategory = await Promise.all(
        categoryIds.map(async (categoryId) => ({
          categoryId,
          cards: await QueueService.loadCardsForCategory(categoryId),
        })),
      );

      const statsByCategory = {};
      const categoryByCardId = new Map();
      for (const { categoryId, cards } of cardsByCategory) {
        statsByCategory[categoryId] = {
          categoryId,
          name: ContentService.formatCategoryName(categoryId),
          total: cards.length,
          seen: 0,
          learning: 0,
          mastered: 0,
          due: 0,
        };
        for (const card of cards) {
          if (card?.id) categoryByCardId.set(card.id, categoryId);
        }
      }

      // One multiGet across all local learning state — no per-key round trips.
      const states = await CardLearningService.getAllLocalStates();
      const now = new Date();

      for (const state of states) {
        const categoryId = categoryByCardId.get(state.contentId);
        if (!categoryId) continue; // state for a card outside these categories' current scope
        const bucket = statsByCategory[categoryId];
        if (!bucket) continue;

        bucket.seen += 1;

        if (state.stage === 'mastered' || state.isMastered) {
          bucket.mastered += 1;
        } else if (state.stage && state.stage !== 'new') {
          bucket.learning += 1;
        }

        if (CardLearningService.isReviewQueueEligible(state, now)) {
          bucket.due += 1;
        }
      }

      return Object.values(statsByCategory).map((s) => ({
        ...s,
        masteryPercent: safePercent(s.mastered, s.total),
      }));
    } catch (error) {
      console.error('[CATEGORY_PROGRESS] Error computing progress:', error);
      return [];
    }
  }

  /**
   * Get progress for a single category
   * @param {string} categoryId
   * @returns {Promise<Object|null>} Category progress object or null
   */
  static async getCategoryProgress(categoryId) {
    if (!categoryId) return null;

    const results = await this.getCategoriesProgress([categoryId]);
    if (results.length === 0) return null;

    const progress = results[0];

    // Add description if available
    progress.description = ContentService.getCategoryDescription(categoryId);

    return progress;
  }

  /**
   * Sort categories for the Home "top 3" view:
   * - due desc (most urgent first)
   * - masteryPercent asc (lowest mastery first)
   * - total desc (bigger classes first)
   */
  static sortForHome(progressList) {
    return [...(progressList || [])].sort((a, b) => {
      if ((b.due || 0) !== (a.due || 0)) return (b.due || 0) - (a.due || 0);
      if ((a.masteryPercent || 0) !== (b.masteryPercent || 0)) return (a.masteryPercent || 0) - (b.masteryPercent || 0);
      return (b.total || 0) - (a.total || 0);
    });
  }
}

export { CategoryProgressService };
