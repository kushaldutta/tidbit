-- Migration 027: Track how many times shared decks are saved to My Decks.
-- One save per user per source deck (re-saving updates timestamp, not count).

CREATE TABLE IF NOT EXISTS public.deck_saves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_deck_id  UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_deck_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deck_saves_source
  ON public.deck_saves(source_deck_id);

ALTER TABLE public.deck_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_deck_saves_read ON public.deck_saves;
CREATE POLICY p_deck_saves_read ON public.deck_saves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deck_shares ds
      JOIN public.groups g ON g.id = ds.group_id
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE ds.deck_id = deck_saves.source_deck_id
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.decks d
      WHERE d.id = deck_saves.source_deck_id AND d.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_deck_saves_insert ON public.deck_saves;
CREATE POLICY p_deck_saves_insert ON public.deck_saves
  FOR INSERT WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.deck_saves IS
  'Tracks Save to My Decks copies. One row per user per source deck.';
