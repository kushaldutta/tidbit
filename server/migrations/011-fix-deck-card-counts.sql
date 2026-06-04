-- Recalculate decks.card_count from actual card rows.
-- Fixes AI decks that were inserted with card_count preset before the
-- trg_cards_count trigger incremented it again (double count).

UPDATE public.decks d
SET card_count = sub.cnt,
    updated_at = NOW()
FROM (
  SELECT deck_id, COUNT(*)::int AS cnt
  FROM public.cards
  GROUP BY deck_id
) sub
WHERE d.id = sub.deck_id
  AND d.card_count != sub.cnt;

-- Decks with no cards should read 0
UPDATE public.decks d
SET card_count = 0,
    updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.deck_id = d.id)
  AND d.card_count != 0;
