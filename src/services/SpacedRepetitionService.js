/**
 * SpacedRepetitionService — compatibility wrapper delegating to CardLearningService (v2.3).
 * @deprecated Use CardLearningService directly for new code.
 */
import { CardLearningService } from './CardLearningService';

class SpacedRepetitionService {
  static getStorageKey(tidbitId) {
    return `card_learning_${tidbitId}`;
  }

  static getTidbitState(tidbitId) {
    return CardLearningService.getTidbitState(tidbitId);
  }

  static async saveTidbitState(tidbitId, state) {
    const mapped = {
      contentId: tidbitId,
      cardId: tidbitId,
      stage: state.masteryLevel === 'mastered' ? 'mastered' : state.nextDue ? 'introduced' : 'new',
      dueAt: state.nextDue || null,
      lastSeenAt: state.lastSeen || null,
      correctStreak: state.correctStreak || 0,
      totalSeen: state.totalViews || 0,
      totalCorrect: state.totalCorrect || 0,
      isSaved: state.saved === true,
      isMastered: state.masteryLevel === 'mastered',
      wasShownAsDue: state.wasShownAsDue,
      shownAsDueAt: state.shownAsDueAt,
    };
    return CardLearningService.saveState(mapped);
  }

  static markTidbitAsShown(tidbitId) {
    return CardLearningService.markTidbitAsShown(tidbitId);
  }

  static clearDueStatus(tidbitId) {
    return CardLearningService.clearDueStatus(tidbitId);
  }

  static recordFeedback(tidbitId, action, categoryId = null) {
    return CardLearningService.recordFeedback(tidbitId, action, categoryId);
  }

  static getDueTidbits(targetTime) {
    return CardLearningService.getDueContentIds(targetTime);
  }

  static getScheduledTidbits() {
    return CardLearningService.getScheduledContentIds();
  }

  static getSavedTidbits() {
    return CardLearningService.getSavedContentIds();
  }

  static getMasteredTidbits() {
    return CardLearningService.getMasteredContentIds();
  }

  static async updateNextDue(tidbitId, hoursFromNow) {
    const state = await CardLearningService.getState(tidbitId);
    if (!state) return;
    const due = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    state.dueAt = due.toISOString();
    return CardLearningService.saveState(state);
  }

  static clearAllState() {
    return CardLearningService.clearAllState();
  }
}

export { SpacedRepetitionService };
