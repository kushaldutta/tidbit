import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import { ContentService } from './ContentService';
import { StorageService } from './StorageService';

const STORAGE_KEY = 'daily_study_plan';
const PLAN_CONFIG = {
  DEFAULT_TOTAL: 10,
  DUE_RATIO: 0.6, // 60% due, 40% new
  MINUTES_PER_TIDBIT: 1, // Estimate: 1 minute per tidbit
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if a date is today (same day, month, year)
 */
function isToday(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

class StudyPlanService {
  /**
   * Get the current daily study plan
   * If no plan exists or plan is from a different day, generates a new one
   * @returns {Promise<Object|null>} Study plan object or null
   */
  static async getDailyPlan() {
    try {
      // Check if we have a plan stored
      const storedPlan = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (storedPlan) {
        const plan = JSON.parse(storedPlan);
        
        // If plan is from today, return it
        if (isToday(plan.date)) {
          console.log('[STUDY_PLAN] Returning existing plan for today');
          return plan;
        }
        
        // Plan is from a different day, generate new one
        console.log('[STUDY_PLAN] Plan is from a different day, generating new plan');
      }
      
      // Generate new plan
      return await this.generateDailyPlan();
    } catch (error) {
      console.error('[STUDY_PLAN] Error getting daily plan:', error);
      return await this.generateDailyPlan();
    }
  }

  /**
   * Generate a new daily study plan
   * Mixes due tidbits (60%) with new tidbits (40%)
   * @returns {Promise<Object>} Study plan object
   */
  static async generateDailyPlan() {
    try {
      console.log('[STUDY_PLAN] Generating new daily plan...');
      
      const selectedCategories = await StorageService.getSelectedCategories();
      
      if (selectedCategories.length === 0) {
        console.log('[STUDY_PLAN] No categories selected, cannot generate plan');
        return null;
      }

      // 1. Get due tidbits (from spaced repetition)
      const dueTidbitIds = await SpacedRepetitionService.getDueTidbits();
      const dueTidbits = [];
      
      // Filter due tidbits by selected categories
      for (const tidbitId of dueTidbitIds) {
        const tidbit = await ContentService.getTidbitById(tidbitId, false);
        if (tidbit && selectedCategories.includes(tidbit.category)) {
          dueTidbits.push(tidbit);
        }
      }
      
      console.log(`[STUDY_PLAN] Found ${dueTidbits.length} due tidbits in selected categories`);

      // 2. Get new tidbits (not seen before)
      const newTidbits = await this.getNewTidbits(selectedCategories);
      console.log(`[STUDY_PLAN] Found ${newTidbits.length} new tidbits available`);

      // 3. Calculate mix (60% due, 40% new)
      const totalCount = PLAN_CONFIG.DEFAULT_TOTAL;
      const dueCount = Math.min(
        dueTidbits.length,
        Math.ceil(totalCount * PLAN_CONFIG.DUE_RATIO)
      );
      const newCount = Math.min(
        newTidbits.length,
        totalCount - dueCount
      );
      
      // If we don't have enough due tidbits, fill with new ones
      const actualNewCount = Math.min(newCount, totalCount - dueCount);
      const actualTotal = dueCount + actualNewCount;

      // 4. Select random subset
      const selectedDue = shuffleArray(dueTidbits).slice(0, dueCount);
      const selectedNew = shuffleArray(newTidbits).slice(0, actualNewCount);

      // 5. Mix them together (shuffle order)
      const planTidbits = shuffleArray([...selectedDue, ...selectedNew]);

      // 6. Estimate time (assume ~1 min per tidbit)
      const estimatedMinutes = actualTotal * PLAN_CONFIG.MINUTES_PER_TIDBIT;

      const plan = {
        tidbits: planTidbits,
        dueCount: selectedDue.length,
        newCount: selectedNew.length,
        totalCount: planTidbits.length,
        estimatedMinutes,
        date: new Date().toISOString(),
        completed: false,
        completedCount: 0,
      };

      // Save plan
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      console.log(`[STUDY_PLAN] Generated plan: ${selectedDue.length} due + ${selectedNew.length} new (${estimatedMinutes} min)`);

      return plan;
    } catch (error) {
      console.error('[STUDY_PLAN] Error generating daily plan:', error);
      return null;
    }
  }

  /**
   * Get tidbits that haven't been seen before (no spaced repetition state)
   * @param {string[]} categories - Selected categories
   * @returns {Promise<Object[]>} Array of tidbit objects
   */
  static async getNewTidbits(categories) {
    try {
      // Get all tidbits from selected categories
      const allTidbits = [];
      for (const category of categories) {
        const categoryTidbits = ContentService.getTidbitsByCategory(category);
        for (const tidbitText of categoryTidbits) {
          const tidbit = ContentService.ensureTidbitHasId({
            text: tidbitText,
            category,
          });
          allTidbits.push(tidbit);
        }
      }

      // Filter out tidbits that have spaced repetition state (already seen)
      const newTidbits = [];
      for (const tidbit of allTidbits) {
        if (tidbit.id) {
          const state = await SpacedRepetitionService.getTidbitState(tidbit.id);
          if (!state) {
            // No state = never seen before = new tidbit
            newTidbits.push(tidbit);
          }
        }
      }

      return newTidbits;
    } catch (error) {
      console.error('[STUDY_PLAN] Error getting new tidbits:', error);
      return [];
    }
  }

  /**
   * Generate an ad-hoc session (for Study Mode)
   * Uses same mixing logic as daily plan but does not persist anything
   * @param {number} totalCount - Desired number of tidbits
   * @param {string[]} categoryFilter - Optional array of category IDs to filter by (if not provided, uses all selected categories)
   * @returns {Promise<Object[]>} Array of tidbit objects
   */
  static async generateSessionTidbits(totalCount, categoryFilter = null) {
    try {
      const selectedCategories = categoryFilter || await StorageService.getSelectedCategories();

      if (selectedCategories.length === 0) {
        console.log('[STUDY_PLAN] No categories selected, cannot generate session');
        return [];
      }

      // 1. Get due tidbits
      const dueTidbitIds = await SpacedRepetitionService.getDueTidbits();
      const dueTidbits = [];

      for (const tidbitId of dueTidbitIds) {
        const tidbit = await ContentService.getTidbitById(tidbitId, false);
        if (tidbit && selectedCategories.includes(tidbit.category)) {
          dueTidbits.push(tidbit);
        }
      }

      // 2. Get new tidbits (filtered to selected categories)
      const newTidbits = await this.getNewTidbits(selectedCategories);

      // 3. Calculate mix
      const targetTotal = totalCount || PLAN_CONFIG.DEFAULT_TOTAL;
      const dueCount = Math.min(
        dueTidbits.length,
        Math.ceil(targetTotal * PLAN_CONFIG.DUE_RATIO)
      );
      const newCount = Math.min(
        newTidbits.length,
        targetTotal - dueCount
      );

      const actualNewCount = Math.min(newCount, targetTotal - dueCount);

      const selectedDue = shuffleArray(dueTidbits).slice(0, dueCount);
      const selectedNew = shuffleArray(newTidbits).slice(0, actualNewCount);

      const sessionTidbits = shuffleArray([...selectedDue, ...selectedNew]);

      console.log(`[STUDY_PLAN] Generated session tidbits: ${selectedDue.length} due + ${selectedNew.length} new (total ${sessionTidbits.length})`);
      return sessionTidbits;
    } catch (error) {
      console.error('[STUDY_PLAN] Error generating session tidbits:', error);
      return [];
    }
  }

  /**
   * Mark the study plan as completed
   * @param {number} completedCount - Number of tidbits actually completed
   */
  static async markPlanCompleted(completedCount) {
    try {
      const plan = await this.getDailyPlan();
      if (plan) {
        plan.completed = true;
        plan.completedCount = completedCount;
        plan.completedAt = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
        console.log(`[STUDY_PLAN] Marked plan as completed: ${completedCount}/${plan.totalCount} tidbits`);
      }
    } catch (error) {
      console.error('[STUDY_PLAN] Error marking plan as completed:', error);
    }
  }

  /**
   * Update plan progress (when user completes a tidbit in session)
   * @param {number} completedCount - Current number of tidbits completed
   */
  static async updatePlanProgress(completedCount) {
    try {
      const plan = await this.getDailyPlan();
      if (plan) {
        plan.completedCount = completedCount;
        // Mark as completed if all tidbits are done
        if (completedCount >= plan.totalCount) {
          plan.completed = true;
          plan.completedAt = new Date().toISOString();
        }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      }
    } catch (error) {
      console.error('[STUDY_PLAN] Error updating plan progress:', error);
    }
  }

  /**
   * Clear the current plan (for testing/debugging)
   */
  static async clearPlan() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[STUDY_PLAN] Cleared study plan');
    } catch (error) {
      console.error('[STUDY_PLAN] Error clearing plan:', error);
    }
  }
}

export { StudyPlanService };

