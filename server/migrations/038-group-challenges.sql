-- Migration 038: Group Challenges
-- Class-scoped collective goals: "Midterm Prep Week — 500 reviews together"
-- group_challenges: created by class moderators or auto by server
-- group_challenge_contributions: per-user progress within a challenge
-- group_challenge_progress view: live aggregate for the progress bar

-- ─────────────────────────────────────────────────────────────
-- 1. group_challenges
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,  -- groups.id is UUID
  title         TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  description   TEXT CHECK (char_length(description) <= 280),
  goal_type     TEXT NOT NULL CHECK (goal_type IN ('reviews', 'accuracy', 'streak_days', 'coins')),
  goal_value    INTEGER NOT NULL CHECK (goal_value > 0),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gc_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_gc_group ON public.group_challenges (group_id, end_date DESC);

ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_gc_read ON public.group_challenges;
CREATE POLICY p_gc_read ON public.group_challenges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE g.id = group_challenges.group_id AND cm.user_id = auth.uid()
    )
  );

-- Only moderators or challenge creator can insert (via RPC below)
DROP POLICY IF EXISTS p_gc_insert ON public.group_challenges;
CREATE POLICY p_gc_insert ON public.group_challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_moderator = true)
      OR true  -- allow any class member to create challenges for now; tighten post-launch
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. group_challenge_contributions
-- Each card_attempt or study session contributes toward the class goal.
-- Separate from coin_ledger — tracks per-challenge progress (unit = review count by default).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_challenge_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES public.group_challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contribution    INTEGER NOT NULL DEFAULT 1 CHECK (contribution > 0),
  contributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type     TEXT NOT NULL DEFAULT 'card_attempt'
                    CHECK (source_type IN ('card_attempt', 'study_session', 'daily_challenge', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_gcc_challenge_user
  ON public.group_challenge_contributions (challenge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gcc_user
  ON public.group_challenge_contributions (user_id, contributed_at DESC);

ALTER TABLE public.group_challenge_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_gcc_read ON public.group_challenge_contributions;
CREATE POLICY p_gcc_read ON public.group_challenge_contributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_challenges gc
      JOIN public.groups g ON g.id = gc.group_id
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE gc.id = group_challenge_contributions.challenge_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_gcc_insert ON public.group_challenge_contributions;
CREATE POLICY p_gcc_insert ON public.group_challenge_contributions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. group_challenge_progress view
-- Returns per-challenge totals + per-user totals for leaderboard.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.group_challenge_progress AS
SELECT
  gc.id AS challenge_id,
  gc.group_id,
  gc.goal_type,
  gc.goal_value,
  gc.start_date,
  gc.end_date,
  COALESCE(SUM(gcc.contribution), 0) AS total_progress,
  COUNT(DISTINCT gcc.user_id)        AS participant_count
FROM public.group_challenges gc
LEFT JOIN public.group_challenge_contributions gcc
  ON gcc.challenge_id = gc.id
GROUP BY gc.id, gc.group_id, gc.goal_type, gc.goal_value, gc.start_date, gc.end_date;

CREATE OR REPLACE VIEW public.group_challenge_user_progress AS
SELECT
  gcc.challenge_id,
  gcc.user_id,
  p.display_name,
  SUM(gcc.contribution) AS user_total
FROM public.group_challenge_contributions gcc
JOIN public.profiles p ON p.id = gcc.user_id
GROUP BY gcc.challenge_id, gcc.user_id, p.display_name;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: contribute_to_challenge
-- Atomically adds a contribution row.  Called after study sessions.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.contribute_to_challenge(
  p_challenge_id UUID,
  p_amount       INTEGER DEFAULT 1,
  p_source_type  TEXT DEFAULT 'card_attempt'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify challenge is active and user is a group member
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_challenges gc
    JOIN public.groups g ON g.id = gc.group_id
    JOIN public.class_memberships cm ON cm.class_id = g.class_id
    WHERE gc.id = p_challenge_id
      AND cm.user_id = auth.uid()
      AND CURRENT_DATE BETWEEN gc.start_date AND gc.end_date
  ) THEN
    RAISE EXCEPTION 'Challenge not found, not a member, or challenge not active';
  END IF;

  INSERT INTO public.group_challenge_contributions
    (challenge_id, user_id, contribution, source_type)
  VALUES
    (p_challenge_id, auth.uid(), p_amount, p_source_type);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Auto-create a "Welcome Week" challenge for every group that
--    doesn't already have an active challenge (idempotent seed).
--    This gives new groups something to show immediately.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.group_challenges (group_id, title, description, goal_type, goal_value, start_date, end_date, created_by)
SELECT
  g.id,
  'Summer Study Sprint',
  'Complete 100 reviews together this week!',
  'reviews',
  100,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  NULL
FROM public.groups g
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_challenges gc
  WHERE gc.group_id = g.id
    AND gc.end_date >= CURRENT_DATE
)
ON CONFLICT DO NOTHING;
