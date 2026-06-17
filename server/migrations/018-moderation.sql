-- Migration 018: Phase 1 moderation (app moderators)
-- Run in Supabase SQL editor, then flag your account:
--   UPDATE public.profiles SET is_moderator = TRUE WHERE email = 'you@example.com';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('delete_feed_post', 'remove_deck_from_group')),
  target_type   TEXT NOT NULL,
  target_id     UUID NOT NULL,
  group_id      UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_created
  ON public.moderation_actions(created_at DESC);

CREATE OR REPLACE FUNCTION public.current_user_is_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_moderator FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_moderator() TO authenticated;

CREATE OR REPLACE FUNCTION public.moderator_delete_feed_post(
  p_post_id UUID,
  p_reason  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.feed_posts%ROWTYPE;
BEGIN
  IF NOT public.current_user_is_moderator() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  SELECT * INTO v_post FROM public.feed_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  INSERT INTO public.moderation_actions (
    moderator_id, action, target_type, target_id, group_id, reason, metadata
  ) VALUES (
    auth.uid(),
    'delete_feed_post',
    'feed_post',
    p_post_id,
    v_post.group_id,
    trim(p_reason),
    jsonb_build_object(
      'post_type', v_post.post_type,
      'author_id', v_post.author_id,
      'payload', v_post.payload
    )
  );

  DELETE FROM public.feed_posts WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderator_remove_deck_from_group(
  p_deck_id  UUID,
  p_group_id UUID,
  p_reason   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deck_title TEXT;
BEGIN
  IF NOT public.current_user_is_moderator() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.deck_shares
    WHERE deck_id = p_deck_id AND group_id = p_group_id
  ) THEN
    RAISE EXCEPTION 'Deck is not shared to this group';
  END IF;

  SELECT title INTO v_deck_title FROM public.decks WHERE id = p_deck_id;

  INSERT INTO public.moderation_actions (
    moderator_id, action, target_type, target_id, group_id, reason, metadata
  ) VALUES (
    auth.uid(),
    'remove_deck_from_group',
    'deck',
    p_deck_id,
    p_group_id,
    trim(p_reason),
    jsonb_build_object('deck_title', v_deck_title)
  );

  DELETE FROM public.deck_shares
  WHERE deck_id = p_deck_id AND group_id = p_group_id;

  DELETE FROM public.feed_posts
  WHERE group_id = p_group_id
    AND post_type = 'deck_share'
    AND payload->>'deckId' = p_deck_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.moderator_delete_feed_post(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderator_delete_feed_post(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.moderator_remove_deck_from_group(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderator_remove_deck_from_group(UUID, UUID, TEXT) TO authenticated;

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_moderation_actions_mod_read ON public.moderation_actions;
CREATE POLICY p_moderation_actions_mod_read ON public.moderation_actions
  FOR SELECT USING (public.current_user_is_moderator());
