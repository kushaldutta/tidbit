import { DeckService } from './DeckService';
import { ClassService } from './ClassService';
import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';
import { SyncService } from './SyncService';

/**
 * Notification sources: enrolled class tidbits (categories) + deck cards.
 * Decks with sections support per-section notification scoping.
 *
 * Per-deck section prefs (notification_deck_sections):
 *   - Legacy: string[] of section UUIDs (uncategorized included when non-empty)
 *   - Current: { sectionIds: string[], includeUncategorized: boolean }
 */
class NotificationDeckService {
  static normalizeDeckSectionPref(value) {
    if (value == null) return null;
    if (Array.isArray(value)) {
      return {
        sectionIds: value,
        includeUncategorized: value.length > 0,
      };
    }
    return {
      sectionIds: [...new Set(value.sectionIds || [])],
      includeUncategorized: !!value.includeUncategorized,
    };
  }

  static defaultDeckSectionPref(sectionsWithCounts, uncategorizedCount) {
    const active = (sectionsWithCounts || []).filter((s) => s.cardCount > 0);
    return {
      sectionIds: active.map((s) => s.id),
      includeUncategorized: uncategorizedCount > 0,
    };
  }

  static async getDeckSectionPref(deckId) {
    const map = await StorageService.getNotificationDeckSections();
    if (!Object.prototype.hasOwnProperty.call(map, deckId)) return null;
    return this.normalizeDeckSectionPref(map[deckId]);
  }

  static async setDeckSectionPref(deckId, pref) {
    const map = await StorageService.getNotificationDeckSections();
    map[deckId] = {
      sectionIds: [...new Set(pref.sectionIds || [])],
      includeUncategorized: !!pref.includeUncategorized,
    };
    await StorageService.setNotificationDeckSections(map);
    await NotificationService.syncPreferences();
    SyncService.syncProfilePreferences().catch(() => {});
  }

  static async getSelectedDeckIds() {
    return StorageService.getSelectedDeckIds();
  }

  static async setSelectedDeckIds(deckIds) {
    const unique = [...new Set((deckIds || []).filter(Boolean))];
    await StorageService.setSelectedDeckIds(unique);
    await NotificationService.syncPreferences();
    SyncService.syncProfilePreferences().catch(() => {});
  }

  static async getNotificationDeckSections() {
    return StorageService.getNotificationDeckSections();
  }

  static async setNotificationDeckSections(map) {
    await StorageService.setNotificationDeckSections(map || {});
    await NotificationService.syncPreferences();
    SyncService.syncProfilePreferences().catch(() => {});
  }

  static async buildDeckNotificationState(deckId, deckSelected) {
    const [sections, cards] = await Promise.all([
      DeckService.listSectionsWithCounts(deckId),
      DeckService.listCards(deckId),
    ]);
    const uncategorizedCount = cards.filter((c) => !c.section_id).length;
    if (!sections.length) {
      return {
        sections: [],
        uncategorizedCount: 0,
        uncategorizedSelected: false,
        hasSections: false,
      };
    }

    const saved = await this.getDeckSectionPref(deckId);
    const pref = saved || this.defaultDeckSectionPref(sections, uncategorizedCount);
    const enabledSet = new Set(pref.sectionIds);

    return {
      sections: sections.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        cardCount: s.cardCount,
        hasCards: s.cardCount > 0,
        selected: deckSelected && enabledSet.has(s.id),
      })),
      uncategorizedCount,
      uncategorizedSelected:
        deckSelected && pref.includeUncategorized && uncategorizedCount > 0,
      hasSections: true,
    };
  }

  static async toggleDeck(deckId, enabled) {
    const ids = await this.getSelectedDeckIds();
    const next = enabled
      ? [...new Set([...ids, deckId])]
      : ids.filter((id) => id !== deckId);
    await this.setSelectedDeckIds(next);

    if (enabled) {
      const sections = await DeckService.listSectionsWithCounts(deckId);
      if (sections.length) {
        const saved = await this.getDeckSectionPref(deckId);
        if (!saved) {
          const cards = await DeckService.listCards(deckId);
          const uncategorizedCount = cards.filter((c) => !c.section_id).length;
          await this.setDeckSectionPref(
            deckId,
            this.defaultDeckSectionPref(sections, uncategorizedCount)
          );
        }
      }
    }

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

    const sources = [];
    for (const cls of classes) {
      const preset = DeckService.presetDecksForClassIds(presets, [cls.id])[0];
      if (!preset) continue;
      const categoryId = ClassService.getCategoryForClass(cls.id) || preset.slug;
      if (!categoryId) continue;

      const disabled = disabledSet.has(categoryId);
      const deckOn = selectedDeckSet.has(preset.id);
      const sectionState = await this.buildDeckNotificationState(preset.id, !disabled && deckOn);

      sources.push({
        classId: cls.id,
        categoryId,
        deckId: preset.id,
        title: preset.title || cls.code,
        subtitle: cls.title,
        emoji: preset.cover_emoji || '📚',
        deckCards: preset.card_count || 0,
        selected: !disabled && deckOn,
        sections: sectionState.sections,
        uncategorizedCount: sectionState.uncategorizedCount,
        uncategorizedSelected: sectionState.uncategorizedSelected,
        hasSections: sectionState.hasSections,
      });
    }
    return sources;
  }

  /** Toggle preset deck notifications for one enrolled class. */
  static async toggleClassNotification(classId, enabled) {
    const presets = await DeckService.listPresetDecks();
    const preset = DeckService.presetDecksForClassIds(presets, [classId])[0];
    if (!preset) return;
    const categoryId = ClassService.getCategoryForClass(classId) || preset.slug;
    if (!categoryId) return;

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
      const sections = await DeckService.listSectionsWithCounts(preset.id);
      if (sections.length) {
        const saved = await this.getDeckSectionPref(preset.id);
        if (!saved) {
          const cards = await DeckService.listCards(preset.id);
          const uncategorizedCount = cards.filter((c) => !c.section_id).length;
          await this.setDeckSectionPref(
            preset.id,
            this.defaultDeckSectionPref(sections, uncategorizedCount)
          );
        }
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
    SyncService.syncProfilePreferences().catch(() => {});
  }

  static async _ensureDeckPref(deckId) {
    const saved = await this.getDeckSectionPref(deckId);
    if (saved) return saved;

    const [sections, cards] = await Promise.all([
      DeckService.listSectionsWithCounts(deckId),
      DeckService.listCards(deckId),
    ]);
    const uncategorizedCount = cards.filter((c) => !c.section_id).length;
    const pref = this.defaultDeckSectionPref(sections, uncategorizedCount);
    await this.setDeckSectionPref(deckId, pref);
    return pref;
  }

  /** Toggle one section within a deck for notifications. */
  static async toggleSectionNotification(deckId, sectionId, enabled) {
    const sections = await DeckService.listSectionsWithCounts(deckId);
    const section = sections.find((s) => s.id === sectionId);
    if (!section?.cardCount) return;

    let deckIds = await this.getSelectedDeckIds();
    if (!deckIds.includes(deckId)) {
      deckIds = [...deckIds, deckId];
      await StorageService.setSelectedDeckIds(deckIds);
    }

    const pref = await this._ensureDeckPref(deckId);
    const nextIds = enabled
      ? [...new Set([...pref.sectionIds, sectionId])]
      : pref.sectionIds.filter((id) => id !== sectionId);

    await this.setDeckSectionPref(deckId, {
      sectionIds: nextIds,
      includeUncategorized: pref.includeUncategorized,
    });
  }

  /** Toggle uncategorized cards for notifications on a sectioned deck. */
  static async toggleUncategorizedNotification(deckId, enabled) {
    const cards = await DeckService.listCards(deckId);
    const uncategorizedCount = cards.filter((c) => !c.section_id).length;
    if (!uncategorizedCount) return;

    let deckIds = await this.getSelectedDeckIds();
    if (!deckIds.includes(deckId)) {
      deckIds = [...deckIds, deckId];
      await StorageService.setSelectedDeckIds(deckIds);
    }

    const pref = await this._ensureDeckPref(deckId);
    await this.setDeckSectionPref(deckId, {
      sectionIds: pref.sectionIds,
      includeUncategorized: enabled,
    });
  }

  static async listAvailableDecks() {
    const [mine, selectedIds, classSources] = await Promise.all([
      DeckService.listMyDecks(),
      this.getSelectedDeckIds(),
      this.listClassNotificationSources(),
    ]);

    const selected = new Set(selectedIds);

    const myDecksRaw = mine.filter((d) => (d.card_count || 0) > 0);
    const myDecks = await Promise.all(
      myDecksRaw.map(async (d) => {
        const deckSelected = selected.has(d.id);
        const sectionState = await this.buildDeckNotificationState(d.id, deckSelected);
        return {
          id: d.id,
          deckId: d.id,
          title: d.title,
          subtitle: `${d.card_count || 0} cards`,
          emoji: d.cover_emoji || '📝',
          cardCount: d.card_count || 0,
          kind: 'mine',
          selected: deckSelected,
          sections: sectionState.sections,
          uncategorizedCount: sectionState.uncategorizedCount,
          uncategorizedSelected: sectionState.uncategorizedSelected,
          hasSections: sectionState.hasSections,
        };
      })
    );

    return { classSources, myDecks, selectedIds: [...selected] };
  }

  /** First-run: enable preset decks + categories for current enrollments. */
  static async ensureDefaultsFromEnrollment() {
    const classIds = await ClassService.getMyClassIds();
    if (!classIds.length) return [];

    const [existingDecks, existingCats, disabledCats] = await Promise.all([
      this.getSelectedDeckIds(),
      StorageService.getSelectedCategories(),
      StorageService.getNotificationDisabledCategories(),
    ]);

    const hasExplicitPrefs =
      existingDecks.length > 0 ||
      existingCats.length > 0 ||
      disabledCats.length > 0;

    if (!hasExplicitPrefs) {
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
      const preset = DeckService.presetDecksForClassIds(presets, [classId])[0];
      if (!preset) return;
      const categoryId = ClassService.getCategoryForClass(classId) || preset.slug;
      if (!categoryId || disabledSet.has(categoryId)) return;
      classSelected.push(preset.id);
    });

    const uniqueClass = [...new Set(classSelected)];
    await this.setSelectedDeckIds([...mySelected, ...uniqueClass]);
  }
}

export { NotificationDeckService };
export default NotificationDeckService;
