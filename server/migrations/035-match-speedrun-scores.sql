-- Migration 035: Match leaderboard + Speed Run scores
-- Both tables use deck_id TEXT (supports UUID decks and virtual 'category:...' slugs).
-- Leaderboard queries use a per-user best-score view (materialized via ORDER BY in app).

-- ─────────────────────────────────────────────────────────────
-- 1. Match scores
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.match_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id         TEXT NOT NULL,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pairs_count     SMALLINT NOT NULL CHECK (pairs_count > 0),
  elapsed_seconds INTEGER NOT NULL CHECK (elapsed_seconds >= 0),
  mistakes        SMALLINT NOT NULL DEFAULT 0 CHECK (mistakes >= 0),
  played_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_ms_read   ON public.match_scores;
DROP POLICY IF EXISTS p_ms_insert ON public.match_scores;
CREATE POLICY p_ms_read   ON public.match_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY p_ms_insert ON public.match_scores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ms_deck ON public.match_scores (deck_id, mistakes ASC, elapsed_seconds ASC);

-- ─────────────────────────────────────────────────────────────
-- 2. Speed Run scores
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.speed_run_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id           TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_seconds  SMALLINT NOT NULL CHECK (duration_seconds IN (60, 90)),
  correct_count     SMALLINT NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  total_attempted   SMALLINT NOT NULL DEFAULT 0 CHECK (total_attempted >= 0),
  played_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.speed_run_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_sr_read   ON public.speed_run_scores;
DROP POLICY IF EXISTS p_sr_insert ON public.speed_run_scores;
CREATE POLICY p_sr_read   ON public.speed_run_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY p_sr_insert ON public.speed_run_scores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sr_deck ON public.speed_run_scores (deck_id, duration_seconds, correct_count DESC);
