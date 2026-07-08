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

    // Sections + cards fetched in parallel (rather than via listSectionsWithCounts,
    // which internally re-fetches the same card list) since DeckService.listCards
    // is cached, the cards result here is also reused by loadStudyCards below.
    const [sections, cards] = await Promise.all([
      DeckService.listSections(deckId),
      DeckService.listCards(deckId),
    ]);
    if (!sections.length) return null;

    const cardCountBySection = {};
    let hasUncategorized = false;
    for (const c of cards) {
      if (c.section_id) cardCountBySection[c.section_id] = (cardCountBySection[c.section_id] || 0) + 1;
      else hasUncategorized = true;
    }
    const activeSections = sections.filter((s) => (cardCountBySection[s.id] || 0) > 0);
    if (!activeSections.length) return null;

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
