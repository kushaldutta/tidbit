-- Migration 016: deck IDs eligible for push notification tidbits.
-- JSON array of deck UUIDs (preset class decks + user custom decks).

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS selected_deck_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.device_tokens.selected_deck_ids IS
  'Deck UUIDs whose cards may be sent as notification tidbits alongside category tidbits.';
