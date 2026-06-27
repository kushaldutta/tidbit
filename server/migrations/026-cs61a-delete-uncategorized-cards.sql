-- Migration 026: Remove legacy CS 61A cards that were never assigned to a section.
-- These pre-date deck_sections (024) and show up as "Uncategorized" in study/notifications.
-- Safe to re-run: only deletes rows with section_id IS NULL on the cs-61a preset deck.

-- Preview (optional — run first to confirm count):
-- SELECT COUNT(*) AS uncategorized_cards
-- FROM public.cards c
-- JOIN public.decks d ON d.id = c.deck_id
-- WHERE d.slug = 'cs-61a' AND c.section_id IS NULL;

DELETE FROM public.cards c
USING public.decks d
WHERE c.deck_id = d.id
  AND d.slug = 'cs-61a'
  AND c.section_id IS NULL;
