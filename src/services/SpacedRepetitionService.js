import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'spaced_repetition_';

class SpacedRepetitionService {
  /**
   * Get the storage key for a tidbit's state
   */
  static getStorageKey(tidbitId) {
    return `${STORAGE_PREFIX}${tidbitId}`;
  }

  /**
   * Get the current state for a tidbit
   * Returns null if tidbit has no state yet
   */
  static async getTidbitState(tidbitId) {
    if (!tidbitId) return null;
    
    try {
      const key = this.getStorageKey(tidbitId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting tidbit state for ${tidbitId}:`, error);
      return null;
    }
  }

  /**
   * Save tidbit state to storage
   */
  static async saveTidbitState(tidbitId, state) {
    if (!tidbitId) return;
    
    try {
      const key = this.getStorageKey(tidbitId);
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving tidbit state for ${tidbitId}:`, error);
    }
  }

  /**
   * Record user feedback for a tidbit
   * @param {string} tidbitId - The tidbit ID
   * @param {string} action - 'knew', 'didnt_know', or 'save'
   */
  static async recordFeedback(tidbitId, action) {
    if (!tidbitId) {
      console.warn('Cannot record feedback: tidbitId is missing');
      return;
    }

    const now = new Date();
    const nowISO = now.toISOString();
    
    // Get existing state or create new
    let state = await this.getTidbitState(tidbitId);
    
    if (!state) {
      // First time user interacts with this tidbit
      state = {
        tidbitId,
        lastSeen: nowISO,
        correctStreak: 0,
        nextDue: null,
        masteryLevel: 'new',
        saved: false,
        totalViews: 0,
        totalCorrect: 0,
      };
    }

    // Update lastSeen and totalViews
    state.lastSeen = nowISO;
    state.totalViews = (state.totalViews || 0) + 1;

    // Handle different actions
    if (action === 'didnt_know') {
      // "I didn't know" → Repeat in 3-6 hours
      const hoursFromNow = 3 + Math.random() * 3; // Random between 3-6 hours
      const nextDueDate = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
      state.nextDue = nextDueDate.toISOString();
      state.correctStreak = 0; // Reset streak
      state.masteryLevel = 'learning';
      // Don't clear saved status - user explicitly saved it
      
    } else if (action === 'knew') {
      // "I knew it" → Repeat tomorrow (first time) or 2-3 days (subsequent)
      state.totalCorrect = (state.totalCorrect || 0) + 1;
      state.correctStreak = (state.correctStreak || 0) + 1;
      
      if (state.correctStreak === 1) {
        // First time correct: repeat tomorrow (24 hours)
        const nextDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        state.nextDue = nextDueDate.toISOString();
      } else {
        // Subsequent times: repeat in 2-3 days
        const daysFromNow = 2 + Math.random(); // Random between 2-3 days
        const nextDueDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
        state.nextDue = nextDueDate.toISOString();
      }
      
      // Update mastery level
      if (state.correctStreak >= 3) {
        state.masteryLevel = 'mastered';
      } else {
        state.masteryLevel = 'learning';
      }
      
    } else if (action === 'save') {
      // "Save" → Just mark as saved, don't change schedule
      state.saved = true;
      // Keep existing nextDue if it exists
      // If no nextDue, don't set one (user can view in saved section)
    } else if (action === 'unsave') {
      // "Unsave" → Remove saved status
      state.saved = false;
      // Keep existing nextDue and other state
    }

    // Save updated state
    await this.saveTidbitState(tidbitId, state);
  }

  /**
   * Get all tidbits that are due for review
   * @param {Date} targetTime - Time to check against (defaults to now)
   * @returns {Promise<string[]>} Array of tidbit IDs that are due
   */
  static async getDueTidbits(targetTime = new Date()) {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
      
      const dueTidbits = [];
      
      for (const key of spacedRepKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const state = JSON.parse(data);
            
            // Check if tidbit is due
            if (state.nextDue) {
              const nextDueDate = new Date(state.nextDue);
              if (nextDueDate <= targetTime) {
                dueTidbits.push(state.tidbitId);
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing state for key ${key}:`, error);
        }
      }
      
      return dueTidbits;
    } catch (error) {
      console.error('Error getting due tidbits:', error);
      return [];
    }
  }

  /**
   * Get all tidbits that have a nextDue scheduled (even if in the future)
   * @returns {Promise<string[]>} Array of tidbit IDs that are scheduled
   */
  static async getScheduledTidbits() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
      
      const scheduledTidbits = [];
      
      for (const key of spacedRepKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const state = JSON.parse(data);
            
            // Check if tidbit has a nextDue set
            if (state.nextDue) {
              scheduledTidbits.push(state.tidbitId);
            }
          }
        } catch (error) {
          console.error(`Error parsing state for key ${key}:`, error);
        }
      }
      
      return scheduledTidbits;
    } catch (error) {
      console.error('Error getting scheduled tidbits:', error);
      return [];
    }
  }

  /**
   * Get all saved tidbits
   * @returns {Promise<string[]>} Array of tidbit IDs that are saved
   */
  static async getSavedTidbits() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
      
      const savedTidbits = [];
      
      for (const key of spacedRepKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const state = JSON.parse(data);
            if (state.saved === true) {
              // Extract tidbitId from state or from the key itself
              const tidbitId = state.tidbitId || key.replace(STORAGE_PREFIX, '');
              if (tidbitId) {
                savedTidbits.push(tidbitId);
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing state for key ${key}:`, error);
        }
      }
      
      return savedTidbits;
    } catch (error) {
      console.error('Error getting saved tidbits:', error);
      return [];
    }
  }

  /**
   * Get all mastered tidbits
   * @returns {Promise<string[]>} Array of tidbit IDs that are mastered
   */
  static async getMasteredTidbits() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
      
      const masteredTidbits = [];
      
      for (const key of spacedRepKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const state = JSON.parse(data);
            if (state.masteryLevel === 'mastered') {
              // Extract tidbitId from state or from the key itself
              const tidbitId = state.tidbitId || key.replace(STORAGE_PREFIX, '');
              if (tidbitId) {
                masteredTidbits.push(tidbitId);
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing state for key ${key}:`, error);
        }
      }
      
      return masteredTidbits;
    } catch (error) {
      console.error('Error getting mastered tidbits:', error);
      return [];
    }
  }

  /**
   * Update nextDue time for a tidbit
   * @param {string} tidbitId - The tidbit ID
   * @param {number} hoursFromNow - Hours from now to set nextDue
   */
  static async updateNextDue(tidbitId, hoursFromNow) {
    const state = await this.getTidbitState(tidbitId);
    if (!state) {
      console.warn(`Cannot update nextDue: tidbit ${tidbitId} has no state`);
      return;
    }

    const nextDueDate = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    state.nextDue = nextDueDate.toISOString();
    await this.saveTidbitState(tidbitId, state);
  }

  /**
   * Clear all learning state (for testing/debugging)
   */
  static async clearAllState() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const spacedRepKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(spacedRepKeys);
      console.log(`Cleared ${spacedRepKeys.length} tidbit states`);
    } catch (error) {
      console.error('Error clearing all state:', error);
    }
  }
}

export { SpacedRepetitionService };

