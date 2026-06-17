-- Migration 019: Phase 2 moderation — user reports + mod review queue

CREATE TABLE IF NOT EXISTS public.content_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('feed_post', 'deck')),
  target_id    UUID NOT NULL,
  group_id     UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  category     TEXT NOT NULL CHECK (category IN (
    'inappropriate', 'spam', 'harassment', 'off_topic', 'other'
  )),
  details      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON public.content_reports(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_pending_dedupe
  ON public.content_reports(reporter_id, target_type, target_id)
  WHERE status = 'pending';

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_content_reports_reporter_read ON public.content_reports;
CREATE POLICY p_content_reports_reporter_read ON public.content_reports
  FOR SELECT USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS p_content_reports_mod_read ON public.content_reports;
CREATE POLICY p_content_reports_mod_read ON public.content_reports
  FOR SELECT USING (public.current_user_is_moderator());

DROP POLICY IF EXISTS p_content_reports_mod_update ON public.content_reports;
CREATE POLICY p_content_reports_mod_update ON public.content_reports
  FOR UPDATE USING (public.current_user_is_moderator())
  WITH CHECK (public.current_user_is_moderator());

CREATE OR REPLACE FUNCTION public.submit_content_report(
  p_target_type TEXT,
  p_target_id   UUID,
  p_group_id    UUID,
  p_category    TEXT,
  p_details     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter UUID := auth.uid();
  v_metadata JSONB := '{}'::jsonb;
  v_report_id UUID;
  v_post public.feed_posts%ROWTYPE;
  v_deck public.decks%ROWTYPE;
  v_group_code TEXT;
BEGIN
  IF v_reporter IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_target_type NOT IN ('feed_post', 'deck') THEN
    RAISE EXCEPTION 'Invalid target type';
  END IF;

  IF p_category NOT IN ('inappropriate', 'spam', 'harassment', 'off_topic', 'other') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;

  IF p_category = 'other' AND NULLIF(trim(COALESCE(p_details, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Details are required when category is other';
  END IF;

  IF p_group_id IS NOT NULL THEN
    SELECT c.code INTO v_group_code
    FROM public.groups g
    JOIN public.classes c ON c.id = g.class_id
    WHERE g.id = p_group_id;
  END IF;

  IF p_target_type = 'feed_post' THEN
    SELECT * INTO v_post FROM public.feed_posts WHERE id = p_target_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Post not found';
    END IF;
    IF v_post.author_id = v_reporter THEN
      RAISE EXCEPTION 'Cannot report your own post';
    END IF;

    v_metadata := jsonb_build_object(
      'post_type', v_post.post_type,
      'preview', left(COALESCE(v_post.payload->>'text', v_post.payload->>'deckTitle', ''), 280),
      'author_id', v_post.author_id,
      'group_id', COALESCE(p_group_id, v_post.group_id),
      'group_code', v_group_code
    );
  ELSE
    SELECT * INTO v_deck FROM public.decks WHERE id = p_target_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Deck not found';
    END IF;
    IF v_deck.owner_id = v_reporter THEN
      RAISE EXCEPTION 'Cannot report your own deck';
    END IF;
    IF p_group_id IS NULL THEN
      RAISE EXCEPTION 'group_id is required for deck reports';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.deck_shares
      WHERE deck_id = p_target_id AND group_id = p_group_id
    ) THEN
      RAISE EXCEPTION 'Deck is not shared to this group';
    END IF;

    v_metadata := jsonb_build_object(
      'deck_title', v_deck.title,
      'owner_id', v_deck.owner_id,
      'group_id', p_group_id,
      'group_code', v_group_code
    );
  END IF;

  INSERT INTO public.content_reports (
    reporter_id, target_type, target_id, group_id, category, details, metadata
  ) VALUES (
    v_reporter,
    p_target_type,
    p_target_id,
    p_group_id,
    p_category,
    NULLIF(trim(COALESCE(p_details, '')), ''),
    v_metadata
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You already reported this content';
END;
$$;

CREATE OR REPLACE FUNCTION public.moderator_update_report_status(
  p_report_id UUID,
  p_status    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_moderator() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('dismissed', 'resolved') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.content_reports
  SET
    status = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = NOW()
  WHERE id = p_report_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found or already reviewed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_content_report(TEXT, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_content_report(TEXT, UUID, UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.moderator_update_report_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderator_update_report_status(UUID, TEXT) TO authenticated;
