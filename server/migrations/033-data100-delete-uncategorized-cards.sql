-- Migration 033: Remove legacy DATA 100 cards never assigned to a section.
-- These pre-date deck_sections (032) and would show up as "Uncategorized".
-- Safe to re-run: only deletes rows with section_id IS NULL on the data100 preset deck.

DELETE FROM public.cards c
USING public.decks d
WHERE c.deck_id = d.id
  AND d.slug = 'data100'
  AND c.section_id IS NULL;
