-- Atomic first-claim for shared boards (Jeopardy, later Jeopardy-like modes).
CREATE OR REPLACE FUNCTION public.claim_game_cell(
  p_challenge_id UUID,
  p_cell_index INT,
  p_display_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claimed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT meta->'cells'->p_cell_index->>'claimedBy'
    INTO v_claimed
  FROM public.game_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_claimed IS NOT NULL AND btrim(v_claimed) <> '' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.game_challenges
  SET meta = jsonb_set(
        jsonb_set(
          meta,
          ARRAY['cells', p_cell_index::text, 'claimedBy'],
          to_jsonb(auth.uid()::text)
        ),
        ARRAY['cells', p_cell_index::text, 'claimedName'],
        to_jsonb(COALESCE(p_display_name, 'Student'))
      )
  WHERE id = p_challenge_id
    AND COALESCE(meta->'cells'->p_cell_index->>'claimedBy', '') = '';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_game_cell(UUID, INT, TEXT) TO authenticated;

-- Jeopardy (and any mode that accumulates one run per challenge) needs to
-- patch score/meta after the first insert.
DROP POLICY IF EXISTS p_gr_update ON public.game_runs;
CREATE POLICY p_gr_update ON public.game_runs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.achievements (slug, title, description, kind, icon, coins) VALUES
  ('board_claimer', 'Board Claimer', 'Claimed a square on the class Jeopardy board', 'personal', '🟦', 10)
ON CONFLICT (slug) DO NOTHING;
