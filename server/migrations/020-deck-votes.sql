-- Migration 020: Upvote / downvote shared decks per class group

CREATE TABLE IF NOT EXISTS public.deck_votes (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_id     UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  vote        SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, deck_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_deck_votes_group_deck
  ON public.deck_votes(group_id, deck_id);

ALTER TABLE public.deck_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_deck_votes_group_read ON public.deck_votes;
CREATE POLICY p_deck_votes_group_read ON public.deck_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE g.id = deck_votes.group_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_deck_votes_self_write ON public.deck_votes;
CREATE POLICY p_deck_votes_self_write ON public.deck_votes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_deck_vote(
  p_deck_id  UUID,
  p_group_id UUID,
  p_vote     SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_vote NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote';
  END IF;

  SELECT g.class_id INTO v_class_id
  FROM public.groups g
  WHERE g.id = p_group_id;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.class_memberships
    WHERE user_id = auth.uid() AND class_id = v_class_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this class';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.deck_shares
    WHERE deck_id = p_deck_id AND group_id = p_group_id
  ) THEN
    RAISE EXCEPTION 'Deck is not shared to this group';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.deck_votes
    WHERE user_id = auth.uid()
      AND deck_id = p_deck_id
      AND group_id = p_group_id
      AND vote = p_vote
  ) THEN
    DELETE FROM public.deck_votes
    WHERE user_id = auth.uid()
      AND deck_id = p_deck_id
      AND group_id = p_group_id;
    RETURN;
  END IF;

  INSERT INTO public.deck_votes (user_id, deck_id, group_id, vote)
  VALUES (auth.uid(), p_deck_id, p_group_id, p_vote)
  ON CONFLICT (user_id, deck_id, group_id)
  DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.set_deck_vote(UUID, UUID, SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_deck_vote(UUID, UUID, SMALLINT) TO authenticated;
