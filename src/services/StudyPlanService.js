import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardLearningService } from './CardLearningService';
import { ContentService } from './ContentService';
import { StorageService } from './StorageService';
import { ClassService } from './ClassService';
import { QueueService } from './QueueService';

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
 * Callers mutate the plan they receive (markPlanCompleted, updatePlanProgress),
 * so every caller must get its own copy. Plans are small — a few KB at most.
 */
function clonePlan(plan) {
  return plan ? JSON.parse(JSON.stringify(plan)) : null;
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
  /** Enrolled class categories (preferred), falling back to legacy selectedCategories. */
  static async resolveStudyCategories() {
    await ClassService.ensureCategoriesSyncedToEnrollments();
    const enrolled = await ClassService.getEnrollmentCategoryIds();
    if (enrolled.length > 0) return enrolled;
    return StorageService.getSelectedCategories();
  }

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
        
        // If plan is from today and has content (or is completed), return it
        if (isToday(plan.date) && (plan.totalCount > 0 || plan.completed)) {
          // Self-heal: ad-hoc sessions used to overwrite completedCount on finished plans
          if (plan.completed && plan.completedCount < plan.totalCount) {
            plan.completedCount = plan.totalCount;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
          }
          console.log('[STUDY_PLAN] Returning existing plan for today');
          return plan;
        }
        
        // Plan is from a different day or was empty — generate new one
        console.log('[STUDY_PLAN] Regenerating plan (new day or empty cached plan)');
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
  /**
   * In-flight generation, shared across concurrent callers.
   *
   * On a cold start HomeScreen triggers two loads in parallel. Both missed the
   * cache, both ran a full queue build, and both wrote the same AsyncStorage
   * key — visible in the logs as "Regenerating"/"Generating" twice with no
   * navigation between them. Sharing the build collapses that to one.
   *
   * Only the generation is coalesced, NOT getDailyPlan: its cache-hit path must
   * keep returning an independently parsed object, or the read-modify-write in
   * markPlanCompleted / updatePlanProgress would mutate a shared instance.
   */
  static _generateInFlight = null;

  static async generateDailyPlan() {
    if (this._generateInFlight) {
      return clonePlan(await this._generateInFlight);
    }

    const task = this._buildDailyPlan();
    this._generateInFlight = task;
    try {
      return clonePlan(await task);
    } finally {
      this._generateInFlight = null;
    }
  }

  /** The actual build. Never throws — returns null on failure. */
  static async _buildDailyPlan() {
    try {
      console.log('[STUDY_PLAN] Generating new daily plan...');
      
      const selectedCategories = await this.resolveStudyCategories();
      
      if (selectedCategories.length === 0) {
        console.log('[STUDY_PLAN] No enrolled classes or categories, cannot generate plan');
        return null;
      }

      const queue = await QueueService.buildQueue({
        categoryIds: selectedCategories,
        limit: PLAN_CONFIG.DEFAULT_TOTAL,
        includeNew: true,
        newRatio: 1 - PLAN_CONFIG.DUE_RATIO,
        annotateStudyModes: true,
      });

      const selectedDue = queue.due;
      const selectedNew = queue.fresh;
      const planTidbits = queue.combined;
      const actualTotal = planTidbits.length;

      console.log(`[STUDY_PLAN] Queue: ${selectedDue.length} due + ${selectedNew.length} new`);

      // 6. Estimate time (assume ~1 min per tidbit)
      const estimatedMinutes = actualTotal * PLAN_CONFIG.MINUTES_PER_TIDBIT;

      const plan = {
        tidbits: planTidbits.map((t) => ContentService.ensureTidbitHasId(t)),
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
        for (const item of categoryTidbits) {
          const text = typeof item === 'string' ? item : item?.text;
          const term = typeof item === 'string' ? null : (item?.term || null);
          if (!text) continue;
          const tidbit = ContentService.ensureTidbitHasId({ text, term, category });
          allTidbits.push(tidbit);
        }
      }

      // Filter out tidbits that have spaced repetition state (already seen)
      const newTidbits = [];
      for (const tidbit of allTidbits) {
        if (tidbit.id) {
          const hasState = await CardLearningService.hasState(tidbit.id);
          if (!hasState) {
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
      const selectedCategories =
        categoryFilter || (await this.resolveStudyCategories());

      if (selectedCategories.length === 0) {
        console.log('[STUDY_PLAN] No enrolled classes or categories, cannot generate session');
        return [];
      }

      const targetTotal = totalCount || PLAN_CONFIG.DEFAULT_TOTAL;
      const queue = await QueueService.buildQueue({
        categoryIds: selectedCategories,
        limit: targetTotal,
        includeNew: true,
        newRatio: 1 - PLAN_CONFIG.DUE_RATIO,
        annotateStudyModes: true,
      });

      const sessionTidbits = queue.combined.map((t) => ContentService.ensureTidbitHasId(t));
      const selectedDue = queue.due;
      const selectedNew = queue.fresh;

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
      if (!plan || plan.completed) return;
      plan.completed = true;
      plan.completedCount = completedCount;
      plan.completedAt = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      console.log(`[STUDY_PLAN] Marked plan as completed: ${completedCount}/${plan.totalCount} tidbits`);
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
      if (!plan || plan.completed) return;
      plan.completedCount = completedCount;
      if (completedCount >= plan.totalCount) {
        plan.completed = true;
        plan.completedAt = new Date().toISOString();
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
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

