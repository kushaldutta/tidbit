import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './StorageService';
import { ContentService } from './ContentService';

const STORAGE_PREFIX = 'spaced_repetition_';

function safePercent(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * CategoryProgressService
 * Computes per-category learning stats using:
 * - total tidbits per category (from ContentService)
 * - spaced repetition states stored in AsyncStorage
 */
class CategoryProgressService {
  /**
   * Get progress for selected categories.
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
      const categoryIds = (categories || []).filter(Boolean);
      if (categoryIds.length === 0) return [];

      // Initialize per-category buckets
      const statsByCategory = {};
      for (const categoryId of categoryIds) {
        const total = ContentService.getTidbitsByCategory(categoryId).length;
        statsByCategory[categoryId] = {
          categoryId,
          name: ContentService.formatCategoryName(categoryId),
          total,
          seen: 0,
          learning: 0,
          mastered: 0,
          due: 0,
        };
      }

      // Pull all spaced repetition states
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));

      const now = new Date();

      for (const key of spacedRepKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          const state = JSON.parse(raw);
          const tidbitId = state?.tidbitId || key.replace(STORAGE_PREFIX, '');
          if (!tidbitId) continue;

          // Derive category from tidbitId by looking it up (costly) — avoid doing that here.
          // Instead, infer category by regenerating id? Not possible without text/category.
          // So we only count states when we can map to a category via ContentService.getTidbitById.
          const tidbit = await ContentService.getTidbitById(tidbitId, false);
          if (!tidbit?.category) continue;

          const cat = tidbit.category;
          if (!statsByCategory[cat]) continue; // not selected / not tracked

          statsByCategory[cat].seen += 1;

          if (state?.masteryLevel === 'mastered') {
            statsByCategory[cat].mastered += 1;
          } else if (state?.masteryLevel === 'learning' || state?.nextDue) {
            statsByCategory[cat].learning += 1;
          }

          if (state?.nextDue) {
            const nextDueDate = new Date(state.nextDue);
            if (nextDueDate <= now) {
              statsByCategory[cat].due += 1;
            }
          }
        } catch (e) {
          // ignore bad entries
        }
      }

      // Finalize percents + sorting helpers
      const result = Object.values(statsByCategory).map((s) => ({
        ...s,
        masteryPercent: safePercent(s.mastered, s.total),
      }));

      return result;
    } catch (error) {
      console.error('[CATEGORY_PROGRESS] Error computing progress:', error);
      return [];
    }
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


