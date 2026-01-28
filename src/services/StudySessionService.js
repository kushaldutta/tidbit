import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import { StorageService } from './StorageService';

const STORAGE_KEY = 'study_session_history';
const SESSION_STORAGE_KEY = 'current_study_session';

class StudySessionService {
  /**
   * Start a new study session
   * @param {Object[]} tidbits - Array of tidbit objects to study
   * @param {Object} options - Session options (duration, etc.)
   * @returns {Promise<Object>} Session object
   */
  static async startSession(tidbits, options = {}) {
    try {
      const session = {
        id: `session_${Date.now()}`,
        tidbits: tidbits || [],
        startTime: new Date().toISOString(),
        currentIndex: 0,
        completedTidbits: [],
        stats: {
          total: tidbits?.length || 0,
          completed: 0,
          knew: 0,
          didntKnow: 0,
          saved: 0,
        },
        options: {
          duration: options.duration || null, // Optional duration in minutes
          ...options,
        },
      };

      // Save current session
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      console.log(`[STUDY_SESSION] Started session with ${tidbits?.length || 0} tidbits`);
      
      return session;
    } catch (error) {
      console.error('[STUDY_SESSION] Error starting session:', error);
      return null;
    }
  }

  /**
   * Get the current active session
   * @returns {Promise<Object|null>} Current session or null
   */
  static async getCurrentSession() {
    try {
      const data = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[STUDY_SESSION] Error getting current session:', error);
      return null;
    }
  }

  /**
   * Record feedback for a tidbit in the current session
   * @param {string} tidbitId - Tidbit ID
   * @param {string} action - 'knew', 'didnt_know', or 'save'
   * @returns {Promise<Object>} Updated session
   */
  static async recordTidbitFeedback(tidbitId, action) {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        console.warn('[STUDY_SESSION] No active session to record feedback');
        return null;
      }

      // Record feedback with spaced repetition service
      await SpacedRepetitionService.recordFeedback(tidbitId, action);

      // Update session stats
      if (action === 'knew') {
        session.stats.knew++;
      } else if (action === 'didnt_know') {
        session.stats.didntKnow++;
      } else if (action === 'save') {
        session.stats.saved++;
      }

      // Mark tidbit as completed
      const tidbit = session.tidbits.find(t => t.id === tidbitId);
      if (tidbit && !session.completedTidbits.find(ct => ct.id === tidbitId)) {
        session.completedTidbits.push({
          ...tidbit,
          action,
          completedAt: new Date().toISOString(),
        });
        session.stats.completed++;
        session.currentIndex++;
      }

      // Save updated session
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      
      return session;
    } catch (error) {
      console.error('[STUDY_SESSION] Error recording feedback:', error);
      return null;
    }
  }

  /**
   * Get the next tidbit in the current session
   * @returns {Promise<Object|null>} Next tidbit or null if session complete
   */
  static async getNextTidbit() {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        return null;
      }

      if (session.currentIndex >= session.tidbits.length) {
        // Session complete
        return null;
      }

      return session.tidbits[session.currentIndex];
    } catch (error) {
      console.error('[STUDY_SESSION] Error getting next tidbit:', error);
      return null;
    }
  }

  /**
   * End the current study session and save to history
   * @returns {Promise<Object>} Final session stats
   */
  static async endSession() {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        console.warn('[STUDY_SESSION] No active session to end');
        return null;
      }

      // Calculate final stats
      const endTime = new Date();
      const startTime = new Date(session.startTime);
      const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

      const finalSession = {
        ...session,
        endTime: endTime.toISOString(),
        durationMinutes,
        stats: {
          ...session.stats,
          accuracy: session.stats.completed > 0
            ? (session.stats.knew / session.stats.completed) * 100
            : 0,
        },
      };

      // Save to history
      await this.saveToHistory(finalSession);

      // Clear current session
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);

      console.log(`[STUDY_SESSION] Ended session: ${finalSession.stats.completed}/${finalSession.stats.total} completed, ${finalSession.durationMinutes} min`);

      return finalSession;
    } catch (error) {
      console.error('[STUDY_SESSION] Error ending session:', error);
      return null;
    }
  }

  /**
   * Save session to history
   * @param {Object} session - Session to save
   */
  static async saveToHistory(session) {
    try {
      const history = await this.getSessionHistory();
      history.unshift(session);
      
      // Keep only last 50 sessions
      const trimmedHistory = history.slice(0, 50);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('[STUDY_SESSION] Error saving to history:', error);
    }
  }

  /**
   * Get session history
   * @returns {Promise<Object[]>} Array of past sessions
   */
  static async getSessionHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[STUDY_SESSION] Error getting session history:', error);
      return [];
    }
  }

  /**
   * Clear current session (without saving to history)
   */
  static async clearCurrentSession() {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      console.log('[STUDY_SESSION] Cleared current session');
    } catch (error) {
      console.error('[STUDY_SESSION] Error clearing session:', error);
    }
  }
}

export { StudySessionService };

