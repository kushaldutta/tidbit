-- v2.3: Intelligence layer — extend per-user card learning state for FSRS + stage ladder

ALTER TABLE public.user_card_state
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'introduced', 'recognition', 'recall', 'mastered')),
  ADD COLUMN IF NOT EXISTS stability REAL,
  ADD COLUMN IF NOT EXISTS difficulty REAL,
  ADD COLUMN IF NOT EXISTS lapses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_review_mode TEXT;

CREATE INDEX IF NOT EXISTS idx_ucs_user_stage_due
  ON public.user_card_state (user_id, stage, due_at);

-- Exam dates per class for Exam Readiness (Premium Insights)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_dates JSONB NOT NULL DEFAULT '{}'::jsonb;
