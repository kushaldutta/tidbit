-- Migration 037: Study Buddies
-- Pair with up to 3 classmates per class for shared accountability.
-- buddy_requests: pending/accepted/declined flow
-- buddy_pairs: active buddy relationships with shared streak tracking
-- presence enhancement: getLiveUsers can join profiles for avatar display

-- ─────────────────────────────────────────────────────────────
-- 1. Buddy requests
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buddy_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id     TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, target_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_requests_target
  ON public.buddy_requests (target_id, status);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_requester
  ON public.buddy_requests (requester_id);

ALTER TABLE public.buddy_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_br_read ON public.buddy_requests;
CREATE POLICY p_br_read ON public.buddy_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());

DROP POLICY IF EXISTS p_br_insert ON public.buddy_requests;
CREATE POLICY p_br_insert ON public.buddy_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS p_br_update ON public.buddy_requests;
CREATE POLICY p_br_update ON public.buddy_requests
  FOR UPDATE TO authenticated
  USING (target_id = auth.uid())
  WITH CHECK (status IN ('accepted', 'declined'));

-- ─────────────────────────────────────────────────────────────
-- 2. Active buddy pairs (created when a request is accepted)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buddy_pairs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id          TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  shared_streak     INTEGER NOT NULL DEFAULT 0,
  last_nudge_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Always store smaller UUID first to enforce one row per pair
  CONSTRAINT buddy_pairs_order CHECK (user1_id < user2_id),
  UNIQUE (user1_id, user2_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_pairs_user1 ON public.buddy_pairs (user1_id);
CREATE INDEX IF NOT EXISTS idx_buddy_pairs_user2 ON public.buddy_pairs (user2_id);

ALTER TABLE public.buddy_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_bp_read ON public.buddy_pairs;
CREATE POLICY p_bp_read ON public.buddy_pairs
  FOR SELECT TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. RPC: accept_buddy_request
-- Atomically: marks request accepted + creates buddy_pairs row.
-- Enforces max 3 buddies per class per user.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_buddy_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req       RECORD;
  v_u1        UUID;
  v_u2        UUID;
  v_my_count  INTEGER;
BEGIN
  SELECT * INTO v_req FROM public.buddy_requests
  WHERE id = p_request_id AND target_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not addressable by this user';
  END IF;

  -- Enforce max 3 buddies per class
  SELECT COUNT(*) INTO v_my_count
  FROM public.buddy_pairs
  WHERE class_id = v_req.class_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid());

  IF v_my_count >= 3 THEN
    RAISE EXCEPTION 'You already have 3 study buddies in this class';
  END IF;

  -- Normalise ordering (smaller UUID = user1)
  IF v_req.requester_id < v_req.target_id THEN
    v_u1 := v_req.requester_id; v_u2 := v_req.target_id;
  ELSE
    v_u1 := v_req.target_id;    v_u2 := v_req.requester_id;
  END IF;

  UPDATE public.buddy_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.buddy_pairs (user1_id, user2_id, class_id)
  VALUES (v_u1, v_u2, v_req.class_id)
  ON CONFLICT (user1_id, user2_id, class_id) DO NOTHING;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: nudge_buddy — sends a coin-free nudge, rate-limited to once/hour
-- Records nudge in last_nudge_at; push notification handled client-side
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nudge_buddy(p_pair_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pair RECORD;
BEGIN
  SELECT * INTO v_pair FROM public.buddy_pairs
  WHERE id = p_pair_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buddy pair not found';
  END IF;

  -- Rate limit: once per hour
  IF v_pair.last_nudge_at IS NOT NULL
     AND v_pair.last_nudge_at > NOW() - INTERVAL '1 hour' THEN
    RETURN false;
  END IF;

  UPDATE public.buddy_pairs
  SET last_nudge_at = NOW()
  WHERE id = p_pair_id;

  RETURN true;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. buddy_streak_updates: written by server cron when both buddies
--    study on the same UTC day — increments shared_streak.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.buddy_pairs
  ADD COLUMN IF NOT EXISTS last_shared_study_date DATE;

-- ─────────────────────────────────────────────────────────────
-- 6. Presence enhancement: expose display names on class_live_presence
--    so the client can show avatars without a second query.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.class_live_presence AS
SELECT
  cm.class_id,
  cm.user_id,
  p.display_name,
  MAX(ca.attempted_at) AS last_attempt_at
FROM public.class_memberships cm
JOIN public.card_attempts ca ON ca.user_id = cm.user_id
JOIN public.profiles p ON p.id = cm.user_id
WHERE ca.attempted_at > NOW() - INTERVAL '5 minutes'
GROUP BY cm.class_id, cm.user_id, p.display_name;
