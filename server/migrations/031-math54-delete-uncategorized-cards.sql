-- Migration 031: Remove legacy MATH 54 cards never assigned to a section.
-- These pre-date deck_sections (030) and show up as "Uncategorized" in study/notifications.
-- Safe to re-run: only deletes rows with section_id IS NULL on the math-54 preset deck.

DELETE FROM public.cards c
USING public.decks d
WHERE c.deck_id = d.id
  AND d.slug = 'math-54'
  AND c.section_id IS NULL;
