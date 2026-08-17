-- user_stats.cards_mastered was incremented once per correct answer by two
-- separate client paths (notification feedback and study-session sync), so it
-- counted correct answers rather than mastered cards and never decreased.
-- user_card_state.is_mastered is the source of truth; derive the count from it
-- in the database so no client can drift it again.

CREATE INDEX IF NOT EXISTS idx_ucs_user_mastered
  ON public.user_card_state (user_id) WHERE is_mastered;

CREATE OR REPLACE FUNCTION public.refresh_cards_mastered(p_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_stats (user_id, cards_mastered)
  VALUES (
    p_user,
    (SELECT COUNT(*) FROM public.user_card_state
      WHERE user_id = p_user AND is_mastered)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET cards_mastered = EXCLUDED.cards_mastered;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_cards_mastered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_cards_mastered(OLD.user_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_cards_mastered(NEW.user_id);

  -- A card moving between users is not expected, but recount the old owner too
  -- so a stale count can never be stranded.
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.refresh_cards_mastered(OLD.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Only fire when the mastered flag actually changes; a routine review that
-- leaves is_mastered untouched must not trigger a recount.
DROP TRIGGER IF EXISTS trg_ucs_mastered_insert ON public.user_card_state;
CREATE TRIGGER trg_ucs_mastered_insert
  AFTER INSERT ON public.user_card_state
  FOR EACH ROW WHEN (NEW.is_mastered)
  EXECUTE FUNCTION public.sync_cards_mastered();

DROP TRIGGER IF EXISTS trg_ucs_mastered_update ON public.user_card_state;
CREATE TRIGGER trg_ucs_mastered_update
  AFTER UPDATE ON public.user_card_state
  FOR EACH ROW WHEN (
    OLD.is_mastered IS DISTINCT FROM NEW.is_mastered
    OR OLD.user_id IS DISTINCT FROM NEW.user_id
  )
  EXECUTE FUNCTION public.sync_cards_mastered();

DROP TRIGGER IF EXISTS trg_ucs_mastered_delete ON public.user_card_state;
CREATE TRIGGER trg_ucs_mastered_delete
  AFTER DELETE ON public.user_card_state
  FOR EACH ROW WHEN (OLD.is_mastered)
  EXECUTE FUNCTION public.sync_cards_mastered();

REVOKE ALL ON FUNCTION public.refresh_cards_mastered(UUID) FROM PUBLIC;

-- Backfill every existing row, including users whose real count is zero.
UPDATE public.user_stats s
SET cards_mastered = (
  SELECT COUNT(*) FROM public.user_card_state u
  WHERE u.user_id = s.user_id AND u.is_mastered
)
WHERE s.cards_mastered IS DISTINCT FROM (
  SELECT COUNT(*) FROM public.user_card_state u
  WHERE u.user_id = s.user_id AND u.is_mastered
);
