-- W10: AI generation quota tracking
-- Logs every AI deck/snap-a-page generation for quota enforcement and analytics.

CREATE TABLE IF NOT EXISTS public.ai_generation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source          TEXT NOT NULL DEFAULT 'text_prompt', -- 'text_prompt' | 'paste_notes' | 'snap_page'
  deck_id         UUID REFERENCES public.decks(id) ON DELETE SET NULL,
  cards_generated INT NOT NULL DEFAULT 0,
  prompt_chars    INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_generation_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs (used client-side for "X/30 used" display)
CREATE POLICY "users can read own ai logs"
  ON public.ai_generation_log FOR SELECT
  USING (auth.uid() = user_id);

-- Index for fast monthly quota count
CREATE INDEX IF NOT EXISTS ai_generation_log_user_month
  ON public.ai_generation_log (user_id, created_at);
