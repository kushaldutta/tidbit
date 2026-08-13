-- Migration 036: Feed Comments
-- feed_comments: threaded replies on feed_posts (notes, dumb_questions, deck_shares)
-- Moderated via existing ModerationService RPCs (post-level delete cascade handles it).
-- Realtime enabled so open post threads update live.

-- ─────────────────────────────────────────────────────────────
-- 1. feed_comments table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text        TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_post
  ON public.feed_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_feed_comments_author
  ON public.feed_comments (author_id);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS
-- Readable by anyone who can read the parent post's group.
-- Writable only by the authenticated author.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_fc_read ON public.feed_comments;
CREATE POLICY p_fc_read ON public.feed_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.feed_posts fp
      JOIN public.class_memberships cm ON cm.class_id = (
        SELECT class_id FROM public.groups WHERE id = fp.group_id LIMIT 1
      )
      WHERE fp.id = feed_comments.post_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_fc_insert ON public.feed_comments;
CREATE POLICY p_fc_insert ON public.feed_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS p_fc_delete ON public.feed_comments;
CREATE POLICY p_fc_delete ON public.feed_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. Moderator delete RPC (mirrors moderator_delete_feed_post pattern)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.moderator_delete_feed_comment(
  p_comment_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_moderator BOOLEAN;
BEGIN
  SELECT is_moderator INTO v_moderator
  FROM public.profiles WHERE id = auth.uid();

  IF NOT COALESCE(v_moderator, false) THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  INSERT INTO public.moderation_actions (moderator_id, action_type, target_id, reason)
  VALUES (auth.uid(), 'delete_comment', p_comment_id::TEXT, p_reason);

  DELETE FROM public.feed_comments WHERE id = p_comment_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. comment_count denorm on feed_posts (for quick display in post lists)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.trg_update_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_count ON public.feed_comments;
CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_comment_count();

-- ─────────────────────────────────────────────────────────────
-- 5. Enable Realtime for live comment threads
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comments;
