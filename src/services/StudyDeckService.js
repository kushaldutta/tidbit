import { DeckService } from './DeckService';
import { StorageService } from './StorageService';
import { NotificationDeckService } from './NotificationDeckService';
import { ContentService } from './ContentService';

/**
 * Study scope for deck sections — defaults from notification prefs when unset.
 */
class StudyDeckService {
  static async resolveStudyScope(deckId) {
    const saved = await StorageService.getStudyScopeForDeck(deckId);
    if (saved) return saved;

    const sections = await DeckService.listSectionsWithCounts(deckId);
    const activeSections = sections.filter((s) => s.cardCount > 0);
    if (!activeSections.length) return null;

    const cards = await DeckService.listCards(deckId);
    const hasUncategorized = cards.some((c) => !c.section_id);
    const notifPref = await NotificationDeckService.getDeckSectionPref(deckId);
    if (notifPref !== null) {
      return {
        sectionIds: notifPref.sectionIds,
        includeUncategorized: notifPref.includeUncategorized,
      };
    }

    return {
      sectionIds: activeSections.map((s) => s.id),
      includeUncategorized: hasUncategorized,
    };
  }

  static async saveStudyScope(deckId, scope) {
    await StorageService.setStudyScopeForDeck(deckId, scope);
  }

  static countCardsInScope(cards, scope) {
    return DeckService.filterCardsBySections(cards, scope).length;
  }

  static async loadStudyCards(deckId, studyScope) {
    const categoryId = ContentService.parseCategoryDeckId(deckId);
    if (categoryId) {
      return ContentService.getStudyCardsForCategory(categoryId);
    }
    const cards = await DeckService.listCards(deckId);
    if (!studyScope) return cards;
    return DeckService.filterCardsBySections(cards, studyScope);
  }
}

export { StudyDeckService };
export default StudyDeckService;
