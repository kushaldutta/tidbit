-- Migration 021: Block users (hide their content from the blocker's feeds)

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
  ON public.user_blocks(blocker_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_user_blocks_self ON public.user_blocks;
CREATE POLICY p_user_blocks_self ON public.user_blocks
  FOR ALL USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());
