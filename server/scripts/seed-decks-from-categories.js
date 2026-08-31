/**
 * One-time migration: convert legacy `categories` + `tidbits` rows into the
 * new `decks` + `cards` schema as system-owned (owner_id NULL) preset decks.
 *
 * Idempotent: re-running only inserts new cards.
 *
 * Usage:
 *   node server/scripts/seed-decks-from-categories.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORY_EMOJI = {
  'math-54': '🧮', history: '🏛️', science: '🔬',
  'berkeley-fun-facts': '🐻', miscellaneous: '💡',
  'cs-61a': '💻', 'cs61b': '💻', 'cs61c': '⚙️', 'cs70': '🎲',
  'cs161': '🔐', 'cs162': '🖥️', 'cs170': '🧩', 'cs186': '🗄️', 'cs188': '🤖', 'cs189': '🧠', 'data-8': '📊', 'data100': '📊', 'data140': '🎲',
  econ100a: '📈', econ100b: '📈', 'physics137a': '⚛️',
  'math128a': '🧮', 'math51': '🧮', 'math52': '🧮', 'math53': '🧮', 'math55': '🧮',
  'nuc150': '☢️', 'nuc155': '☢️', 'agrs28': '📜', 'mcb102': '🔬',
  'phys7a': '⚛️', 'phys7b': '⚛️', 'stat134': '📊',
};

async function main() {
  console.log('[SEED] Loading categories + tidbits from legacy tables…');
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, description');
  if (catErr) throw catErr;
  console.log(`[SEED] Found ${categories.length} categories.`);

  let decksUpserted = 0;
  let cardsInserted = 0;

  for (const cat of categories) {
    // 1. Upsert the system deck for this category (slug = category id).
    const deckTitle = cat.name || cat.id;
    const deckDescription = cat.description || null;
    const coverEmoji = CATEGORY_EMOJI[cat.id] || '📚';

    const { data: existingDeck, error: findErr } = await supabase
      .from('decks')
      .select('id')
      .is('owner_id', null)
      .eq('slug', cat.id)
      .maybeSingle();
    if (findErr) {
      console.error('[SEED] find deck error:', findErr);
      continue;
    }

    let deckId;
    if (existingDeck) {
      deckId = existingDeck.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('decks')
        .insert({
          owner_id: null,
          slug: cat.id,
          title: deckTitle,
          description: deckDescription,
          cover_emoji: coverEmoji,
          source: 'system',
          is_public: true,
        })
        .select()
        .single();
      if (createErr) {
        console.error('[SEED] create deck error:', createErr);
        continue;
      }
      deckId = created.id;
      decksUpserted += 1;
    }

    // 2. Pull tidbits for this category and insert any new ones as cards.
    const { data: tidbits, error: tidErr } = await supabase
      .from('tidbits')
      .select('id, text')
      .eq('category_id', cat.id)
      .eq('is_active', true);
    if (tidErr) {
      console.error('[SEED] tidbits fetch error:', tidErr);
      continue;
    }

    if (!tidbits?.length) continue;

    // For tidbit-style content the "front" is the question prompt format and
    // the "back" is the fact itself. We use the fact as both since legacy
    // tidbits are one-liners; quiz/recall modes will derive prompts later.
    const { data: existingCards } = await supabase
      .from('cards')
      .select('back')
      .eq('deck_id', deckId);
    const existingBacks = new Set((existingCards || []).map((c) => c.back));

    const newRows = [];
    let pos = (existingCards || []).length;
    for (const t of tidbits) {
      if (existingBacks.has(t.text)) continue;
      newRows.push({
        deck_id: deckId,
        front: `Tell me about: ${deckTitle}`, // generic prompt; W7 quiz mode replaces this
        back: t.text,
        card_type: 'basic',
        meta: { legacy_tidbit_id: t.id },
        position: pos++,
      });
    }

    if (newRows.length) {
      // Insert in chunks to avoid statement size limits.
      for (let i = 0; i < newRows.length; i += 200) {
        const chunk = newRows.slice(i, i + 200);
        const { error: insErr } = await supabase.from('cards').insert(chunk);
        if (insErr) {
          console.error('[SEED] cards insert error:', insErr);
        } else {
          cardsInserted += chunk.length;
        }
      }
    }

    console.log(
      `[SEED] ${cat.id}: deck ${existingDeck ? 'exists' : 'created'}, ${newRows.length} new cards`
    );
  }

  console.log(
    `\n[SEED] Done. ${decksUpserted} new decks, ${cardsInserted} new cards.`
  );
}

main().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
