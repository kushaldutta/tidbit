import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

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

  // -- Cards --

  static async listCards(deckId) {
    if (!SUPABASE_CONFIGURED || !deckId) return [];
    const { data, error } = await supabase
      .from('cards')
      .select('id, deck_id, front, back, card_type, meta, position, updated_at')
      .eq('deck_id', deckId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[DECK] listCards:', error);
      return [];
    }
    return data || [];
  }

  static async addCard(deckId, { front, back, cardType = 'basic', meta = {} }) {
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
}

export { DeckService };
export default DeckService;
