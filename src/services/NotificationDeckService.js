import { DeckService } from './DeckService';
import { ClassService } from './ClassService';
import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

/**
 * Notification sources: enrolled class tidbits (categories) + deck cards.
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

  /** Preset decks with cards for enrolled classes. */
  static presetDeckIdsForClasses(classIds, presets) {
    return DeckService.presetDecksForClassIds(presets, classIds)
      .filter((p) => (p.card_count || 0) > 0)
      .map((p) => p.id);
  }

  /** All preset decks for enrolled classes (including empty shells). */
  static allPresetDeckIdsForClasses(classIds, presets) {
    return DeckService.presetDecksForClassIds(presets, classIds).map((p) => p.id);
  }

  /**
   * Enrolled classes that can send tidbits (category tidbits and/or preset deck cards).
   */
  static async listClassNotificationSources() {
    const [classIds, selectedDeckIds, disabledCats, presets] = await Promise.all([
      ClassService.getMyClassIds(),
      this.getSelectedDeckIds(),
      StorageService.getNotificationDisabledCategories(),
      DeckService.listPresetDecks(),
    ]);

    if (!classIds.length) return [];

    const classes = await ClassService.getClassesByIds(classIds);
    const selectedDeckSet = new Set(selectedDeckIds);
    const disabledSet = new Set(disabledCats);

    return classes
      .map((cls) => {
        const categoryId = ClassService.getCategoryForClass(cls.id);
        if (!categoryId) return null;

        const preset = DeckService.presetDecksForClassIds(presets, [cls.id])[0];
        if (!preset) return null;

        const disabled = disabledSet.has(categoryId);
        const deckOn = selectedDeckSet.has(preset.id);

        return {
          classId: cls.id,
          categoryId,
          deckId: preset.id,
          title: preset.title || cls.code,
          subtitle: cls.title,
          emoji: preset.cover_emoji || '📚',
          deckCards: preset.card_count || 0,
          selected: !disabled && deckOn,
        };
      })
      .filter(Boolean);
  }

  /** Toggle preset deck notifications for one enrolled class. */
  static async toggleClassNotification(classId, enabled) {
    const categoryId = ClassService.getCategoryForClass(classId);
    if (!categoryId) return;

    const presets = await DeckService.listPresetDecks();
    const preset = DeckService.presetDecksForClassIds(presets, [classId])[0];
    if (!preset) return;

    let categories = await StorageService.getSelectedCategories();
    let deckIds = await this.getSelectedDeckIds();
    let disabled = await StorageService.getNotificationDisabledCategories();

    if (enabled) {
      disabled = disabled.filter((c) => c !== categoryId);
      if (!categories.includes(categoryId)) {
        categories = [...categories, categoryId];
      }
      if (!deckIds.includes(preset.id)) {
        deckIds = [...deckIds, preset.id];
      }
    } else {
      if (!disabled.includes(categoryId)) {
        disabled = [...disabled, categoryId];
      }
      categories = categories.filter((c) => c !== categoryId);
      deckIds = deckIds.filter((id) => id !== preset.id);
    }

    await StorageService.setNotificationDisabledCategories(disabled);
    await StorageService.setSelectedCategories(categories);
    await StorageService.setSelectedDeckIds(deckIds);
    await NotificationService.syncPreferences();
  }

  static async listAvailableDecks() {
    const [mine, selectedIds, classSources] = await Promise.all([
      DeckService.listMyDecks(),
      this.getSelectedDeckIds(),
      this.listClassNotificationSources(),
    ]);

    const selected = new Set(selectedIds);

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

    return { classSources, myDecks, selectedIds: [...selected] };
  }

  /** First-run: enable preset decks + categories for current enrollments. */
  static async ensureDefaultsFromEnrollment() {
    const classIds = await ClassService.getMyClassIds();
    if (!classIds.length) return [];

    const [existingDecks, existingCats] = await Promise.all([
      this.getSelectedDeckIds(),
      StorageService.getSelectedCategories(),
    ]);

    if (existingDecks.length === 0 && existingCats.length === 0) {
      await ClassService.replaceCategoriesToEnrollment(classIds);
      return this.getSelectedDeckIds();
    }

    if (existingDecks.length === 0) {
      const presets = await DeckService.listPresetDecks();
      const presetIds = this.presetDeckIdsForClasses(classIds, presets);
      if (presetIds.length) {
        await StorageService.setSelectedDeckIds(presetIds);
        await NotificationService.syncPreferences();
      }
    }

    return this.getSelectedDeckIds();
  }

  /**
   * After enrollment changes: keep notification opt-outs; drop unenrolled sources.
   */
  static async syncPresetsToEnrollment(enrolledClassIds) {
    const [presets, mine, selected, disabled] = await Promise.all([
      DeckService.listPresetDecks(),
      DeckService.listMyDecks(),
      this.getSelectedDeckIds(),
      StorageService.getNotificationDisabledCategories(),
    ]);

    const disabledSet = new Set(disabled);
    const myIds = new Set(mine.map((d) => d.id));
    const mySelected = selected.filter((id) => myIds.has(id));
    const classSelected = [];

    enrolledClassIds.forEach((classId) => {
      const categoryId = ClassService.getCategoryForClass(classId);
      if (!categoryId || disabledSet.has(categoryId)) return;
      const preset = DeckService.presetDecksForClassIds(presets, [classId])[0];
      if (preset) classSelected.push(preset.id);
    });

    const uniqueClass = [...new Set(classSelected)];
    await this.setSelectedDeckIds([...mySelected, ...uniqueClass]);
  }
}

export { NotificationDeckService };
export default NotificationDeckService;
