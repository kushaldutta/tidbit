import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ClassService } from './ClassService';

/**
 * CRUD over decks + cards. RLS in the database enforces ownership.
 *
 * Deck identity:
 *   - System / preset decks have owner_id = NULL and a stable `slug`.
 *   - User decks have owner_id = current user.
 *   - "Visible" decks for a user = owned + public + shared-into-my-groups
 *     (RLS handles the union automatically).
 */
class DeckService {
  static MAX_CARDS_PER_DECK = 200;

  static async listMyDecks() {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('decks')
      .select('id, title, description, class_id, cover_emoji, card_count, source, is_premium_generated, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('[DECK] listMyDecks:', error);
      return [];
    }
    return data || [];
  }

  static async listPresetDecks() {
    if (!SUPABASE_CONFIGURED) return [];
    const { data, error } = await supabase
      .from('decks')
      .select('id, slug, title, description, class_id, cover_emoji, card_count, source, updated_at')
      .is('owner_id', null)
      .order('title', { ascending: true });
    if (error) {
      console.error('[DECK] listPresetDecks:', error);
      return [];
    }
    return data || [];
  }

  /** Preset decks matching the user's class enrollments (slug or class_id). */
  static presetDecksForClassIds(presets, classIds) {
    const categoryIds = new Set(ClassService.categoryIdsForClasses(classIds));
    const enrolled = new Set(classIds);
    return (presets || []).filter(
      (p) =>
        (p.slug && categoryIds.has(p.slug)) ||
        (p.class_id && enrolled.has(p.class_id))
    );
  }

  static async listEnrolledPresetDecks() {
    const [presets, classIds] = await Promise.all([
      this.listPresetDecks(),
      ClassService.getMyClassIds(),
    ]);
    return this.presetDecksForClassIds(presets, classIds);
  }

  static async listClassDecks(classId) {
    if (!SUPABASE_CONFIGURED || !classId) return [];
    const { data, error } = await supabase
      .from('decks')
      .select('id, title, description, class_id, cover_emoji, card_count, owner_id, source, updated_at')
      .eq('class_id', classId)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('[DECK] listClassDecks:', error);
      return [];
    }
    return data || [];
  }

  static async getDeck(deckId) {
    if (!SUPABASE_CONFIGURED || !deckId) return null;
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .maybeSingle();
    if (error) {
      console.error('[DECK] getDeck:', error);
      return null;
    }
    return data;
  }

  static async createDeck({
    title,
    description = '',
    classId = null,
    coverEmoji = '📚',
    isPublic = false,
    source = 'user',
  }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');
    if (!title?.trim()) throw new Error('Title is required');

    const { data, error } = await supabase
      .from('decks')
      .insert({
        owner_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        class_id: classId,
        cover_emoji: coverEmoji,
        is_public: isPublic,
        source,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateDeck(deckId, updates) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.classId !== undefined) payload.class_id = updates.classId;
    if (updates.coverEmoji !== undefined) payload.cover_emoji = updates.coverEmoji;
    if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;

    const { data, error } = await supabase
      .from('decks')
      .update(payload)
      .eq('id', deckId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteDeck(deckId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.from('decks').delete().eq('id', deckId);
    if (error) throw error;
  }

  /** Copy a shared deck into the current user's library (editable personal copy). */
  static async copyDeckToMyDecks(sourceDeckId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const source = await this.getDeck(sourceDeckId);
    if (!source) throw new Error('Deck not found');

    const cards = await this.listCards(sourceDeckId);
    if (!cards.length) throw new Error('This deck has no cards to copy');

    const sourceSections = await this.listSections(sourceDeckId);
    const sectionIdMap = {};

    const newDeck = await this.createDeck({
      title: source.title,
      description: source.description || '',
      classId: source.class_id,
      coverEmoji: source.cover_emoji || '📚',
      isPublic: false,
      source: 'saved_copy',
    });

    for (const section of sourceSections) {
      const created = await this.createSection(newDeck.id, {
        title: section.title,
        description: section.description || '',
        kind: section.kind || 'custom',
      });
      sectionIdMap[section.id] = created.id;
    }

    await this.bulkAddCards(
      newDeck.id,
      cards.map((c) => ({
        front: c.front,
        back: c.back,
        cardType: c.card_type,
        meta: c.meta || {},
        sectionId: c.section_id ? sectionIdMap[c.section_id] || null : null,
      }))
    );

    return newDeck;
  }

  // -- Cards --

  static async listCards(deckId, { sectionIds = null } = {}) {
    if (!SUPABASE_CONFIGURED || !deckId) return [];
    let query = supabase
      .from('cards')
      .select('id, deck_id, front, back, card_type, meta, position, section_id, updated_at')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (sectionIds?.length) {
      query = query.in('section_id', sectionIds);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[DECK] listCards:', error);
      return [];
    }
    return data || [];
  }

  static filterCardsBySections(cards, scope) {
    if (!scope) return cards || [];
    const { sectionIds = [], includeUncategorized = false } = scope;
    return (cards || []).filter((c) => {
      if (!c.section_id) return includeUncategorized;
      return sectionIds.includes(c.section_id);
    });
  }

  static async listSections(deckId) {
    if (!SUPABASE_CONFIGURED || !deckId) return [];
    const { data, error } = await supabase
      .from('deck_sections')
      .select('id, deck_id, slug, title, description, position, kind')
      .eq('deck_id', deckId)
      .order('position', { ascending: true });
    if (error) {
      console.error('[DECK] listSections:', error);
      return [];
    }
    return data || [];
  }

  /** Sections with card counts for notification UI and study scoping. */
  static async listSectionsWithCounts(deckId) {
    const [sections, cards] = await Promise.all([
      this.listSections(deckId),
      this.listCards(deckId),
    ]);
    if (!sections.length) return [];
    const counts = {};
    cards.forEach((c) => {
      if (!c.section_id) return;
      counts[c.section_id] = (counts[c.section_id] || 0) + 1;
    });
    return sections.map((s) => ({
      ...s,
      cardCount: counts[s.id] || 0,
    }));
  }

  static _slugifySectionTitle(title, existingSlugs) {
    let base = String(title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!base) base = 'section';
    let slug = base;
    let n = 2;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  static async createSection(deckId, { title, description = '', kind = 'custom' }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const trimmed = title?.trim();
    if (!trimmed) throw new Error('Section title is required');

    const existing = await this.listSections(deckId);
    const slug = this._slugifySectionTitle(
      trimmed,
      new Set(existing.map((s) => s.slug))
    );
    const position = existing.length;

    const { data, error } = await supabase
      .from('deck_sections')
      .insert({
        deck_id: deckId,
        slug,
        title: trimmed,
        description: description?.trim() || null,
        position,
        kind,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateSection(sectionId, { title, description, position }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const payload = {};
    if (title !== undefined) payload.title = title.trim();
    if (description !== undefined) payload.description = description?.trim() || null;
    if (position !== undefined) payload.position = position;

    const { data, error } = await supabase
      .from('deck_sections')
      .update(payload)
      .eq('id', sectionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteSection(sectionId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('deck_sections')
      .delete()
      .eq('id', sectionId);
    if (error) throw error;
  }

  static async addCard(deckId, { front, back, cardType = 'basic', meta = {}, sectionId = null }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    if (!front?.trim() || !back?.trim()) {
      throw new Error('Front and back are required');
    }
    const existing = await this.listCards(deckId);
    if (existing.length >= this.MAX_CARDS_PER_DECK) {
      throw new Error(
        `This deck already has ${this.MAX_CARDS_PER_DECK} cards (the maximum).`
      );
    }
    const position = existing.length;

    const { data, error } = await supabase
      .from('cards')
      .insert({
        deck_id: deckId,
        front: front.trim(),
        back: back.trim(),
        card_type: cardType,
        meta,
        position,
        section_id: sectionId || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateCard(cardId, updates) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const payload = {};
    if (updates.front !== undefined) payload.front = updates.front;
    if (updates.back !== undefined) payload.back = updates.back;
    if (updates.cardType !== undefined) payload.card_type = updates.cardType;
    if (updates.meta !== undefined) payload.meta = updates.meta;
    if (updates.position !== undefined) payload.position = updates.position;
    if (updates.sectionId !== undefined) payload.section_id = updates.sectionId;

    const { data, error } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', cardId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteCard(cardId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.from('cards').delete().eq('id', cardId);
    if (error) throw error;
  }

  static async bulkAddCards(deckId, cards) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    if (!cards?.length) return [];

    const existing = await this.listCards(deckId);
    let pos = existing.length;
    const rows = cards
      .filter((c) => c?.front?.trim() && c?.back?.trim())
      .slice(0, this.MAX_CARDS_PER_DECK - existing.length)
      .map((c) => ({
        deck_id: deckId,
        front: c.front.trim(),
        back: c.back.trim(),
        card_type: c.cardType || 'basic',
        meta: c.meta || {},
        position: pos++,
        section_id: c.sectionId || null,
      }));

    if (!rows.length) return [];

    const { data, error } = await supabase
      .from('cards')
      .insert(rows)
      .select();
    if (error) throw error;
    return data || [];
  }

  // -- Sharing --

  static async shareDeckToGroup(deckId, groupId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const userId = AuthService.getUserId();
    if (!userId) throw new Error('Not signed in');
    const { error } = await supabase
      .from('deck_shares')
      .upsert(
        { deck_id: deckId, group_id: groupId, shared_by: userId },
        { onConflict: 'deck_id,group_id' }
      );
    if (error) throw error;
  }

  static async unshareDeckFromGroup(deckId, groupId) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('deck_shares')
      .delete()
      .match({ deck_id: deckId, group_id: groupId });
    if (error) throw error;
  }

  /** Returns group IDs this deck is currently shared to. */
  static async getSharedGroupIds(deckId) {
    if (!SUPABASE_CONFIGURED) return [];
    const { data, error } = await supabase
      .from('deck_shares')
      .select('group_id')
      .eq('deck_id', deckId);
    if (error) return [];
    return (data || []).map((r) => r.group_id);
  }
}

export { DeckService };
export default DeckService;
