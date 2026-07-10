-- Migration 034: Daily Class Challenge + Study Coins
-- daily_challenges: one row per class per UTC day (deterministic card set)
-- daily_challenge_entries: one row per user per question
-- coin_ledger: immutable log of all coin credits/debits
-- profiles.coin_balance + profiles.total_coins_earned: display counters

-- ─────────────────────────────────────────────────────────────
-- 1. Coin balance on profiles
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coin_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_coins_earned INTEGER NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────
-- 2. Daily challenges (one per class per day)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug   TEXT NOT NULL,
  challenge_date  DATE NOT NULL,
  card_ids        UUID[] NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_slug, challenge_date)
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_dc_read ON public.daily_challenges;
CREATE POLICY p_dc_read ON public.daily_challenges
  FOR SELECT TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────
-- 3. Daily challenge entries (one per user per question)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_challenge_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_index  SMALLINT NOT NULL CHECK (question_index >= 0 AND question_index < 10),
  mode            TEXT NOT NULL CHECK (mode IN ('recall', 'quiz')),
  was_correct     BOOLEAN NOT NULL,
  points_earned   SMALLINT NOT NULL DEFAULT 0,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, user_id, question_index)
);

ALTER TABLE public.daily_challenge_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_dce_read ON public.daily_challenge_entries;
DROP POLICY IF EXISTS p_dce_write ON public.daily_challenge_entries;
CREATE POLICY p_dce_read ON public.daily_challenge_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_dce_write ON public.daily_challenge_entries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_dce_challenge_user
  ON public.daily_challenge_entries (challenge_id, user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Coin ledger (immutable — never update, only insert)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,        -- positive = credit, negative = debit
  source_type     TEXT NOT NULL,           -- 'daily_challenge_participation' | 'daily_challenge_rank' | 'study_session' | etc.
  source_id       TEXT,                    -- e.g. challenge_id, session_id
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_cl_read ON public.coin_ledger;
DROP POLICY IF EXISTS p_cl_write ON public.coin_ledger;
CREATE POLICY p_cl_read ON public.coin_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY p_cl_write ON public.coin_ledger
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user
  ON public.coin_ledger (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: credit_study_coins — atomically credits coins + logs ledger
--    Prevents double-crediting via unique (user_id, source_type, source_id).
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_cl_unique_source
  ON public.coin_ledger (user_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_study_coins(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_source_type TEXT,
  p_source_id  TEXT DEFAULT NULL,
  p_note       TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.coin_ledger (user_id, amount, source_type, source_id, note)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_note)
  ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles
    SET
      coin_balance       = coin_balance + p_amount,
      total_coins_earned = total_coins_earned + GREATEST(p_amount, 0)
    WHERE id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
