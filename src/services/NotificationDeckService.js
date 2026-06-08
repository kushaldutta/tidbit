import { DeckService } from './DeckService';
import { ClassService } from './ClassService';
import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

/**
 * Which decks feed push-notification tidbits (preset class decks + user decks).
 */
class NotificationDeckService {
  static async getSelectedDeckIds() {
    return StorageService.getSelectedDeckIds();
  }

  static async setSelectedDeckIds(deckIds) {
    const unique = [...new Set((deckIds || []).filter(Boolean))];
    await StorageService.setSelectedDeckIds(unique);
    await NotificationService.syncPreferences();
  }

  static async toggleDeck(deckId, enabled) {
    const ids = await this.getSelectedDeckIds();
    const next = enabled
      ? [...new Set([...ids, deckId])]
      : ids.filter((id) => id !== deckId);
    await this.setSelectedDeckIds(next);
    return next;
  }

  /** Preset system decks for enrolled classes (slug = content category). */
  static presetDeckIdsForClasses(classIds, presets) {
    const categoryIds = new Set(ClassService.categoryIdsForClasses(classIds));
    const enrolled = new Set(classIds);
    return (presets || [])
      .filter(
        (p) =>
          (p.card_count || 0) > 0 &&
          ((p.slug && categoryIds.has(p.slug)) ||
            (p.class_id && enrolled.has(p.class_id)))
      )
      .map((p) => p.id);
  }

  static async listAvailableDecks() {
    const [mine, presets, classIds, selectedIds] = await Promise.all([
      DeckService.listMyDecks(),
      DeckService.listPresetDecks(),
      ClassService.getMyClassIds(),
      this.getSelectedDeckIds(),
    ]);

    const selected = new Set(selectedIds);
    const classDecks = presets
      .filter(
        (p) =>
          (p.card_count || 0) > 0 &&
          NotificationDeckService.presetDeckIdsForClasses(classIds, [p]).length > 0
      )
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.description || 'Class deck',
        emoji: p.cover_emoji || '📚',
        cardCount: p.card_count || 0,
        kind: 'class',
        selected: selected.has(p.id),
      }));

    const myDecks = mine
      .filter((d) => (d.card_count || 0) > 0)
      .map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: `${d.card_count || 0} cards`,
        emoji: d.cover_emoji || '📝',
        cardCount: d.card_count || 0,
        kind: 'mine',
        selected: selected.has(d.id),
      }));

    return { classDecks, myDecks, selectedIds: [...selected] };
  }

  /** First-run: enable preset decks for current enrollments. */
  static async ensureDefaultsFromEnrollment() {
    const existing = await this.getSelectedDeckIds();
    if (existing.length > 0) return existing;

    const classIds = await ClassService.getMyClassIds();
    if (!classIds.length) return [];

    const presets = await DeckService.listPresetDecks();
    const presetIds = this.presetDeckIdsForClasses(classIds, presets);
    if (presetIds.length) {
      await StorageService.setSelectedDeckIds(presetIds);
    }
    return presetIds;
  }

  /**
   * After enrollment changes: keep user deck picks, sync class preset decks to match.
   */
  static async syncPresetsToEnrollment(enrolledClassIds) {
    const [presets, mine, selected] = await Promise.all([
      DeckService.listPresetDecks(),
      DeckService.listMyDecks(),
      this.getSelectedDeckIds(),
    ]);

    const myIds = new Set(mine.map((d) => d.id));
    const mySelected = selected.filter((id) => myIds.has(id));
    const presetIds = this.presetDeckIdsForClasses(enrolledClassIds, presets);
    await this.setSelectedDeckIds([...mySelected, ...presetIds]);
  }
}

export { NotificationDeckService };
export default NotificationDeckService;
