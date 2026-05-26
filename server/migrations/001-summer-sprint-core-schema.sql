-- Tidbit summer 2026 sprint: core schema migration.
-- Adds auth/profile/class/deck tables + RLS policies + a few RPC helpers.
-- Idempotent: safe to re-run on existing Supabase projects.
--
-- Run in Supabase SQL Editor or via `supabase db push`.

-- =====================================================================
-- 0. Helpers
-- =====================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. Schools + classes (catalog reference data)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.schools (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('college', 'highschool')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.schools (id, name, type) VALUES
  ('uc-berkeley',     'UC Berkeley',     'college'),
  ('high-school-ap',  'High School (AP)','highschool')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.classes (
  id          TEXT PRIMARY KEY,                          -- e.g. "uc-berkeley:cs61a:fa26"
  school_id   TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,                             -- "CS61A" or "AP_CALC_BC"
  title       TEXT NOT NULL,                             -- "Structure and Interpretation of Computer Programs"
  term        TEXT NOT NULL DEFAULT 'fa26',              -- "fa26", "sp27", "ap-2026" etc.
  subject     TEXT,                                      -- "Computer Science"
  units       NUMERIC,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, code, term)
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_code   ON public.classes(code);

-- =====================================================================
-- 2. Profiles (1:1 with auth.users)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  display_name    TEXT,
  school_id       TEXT REFERENCES public.schools(id) ON DELETE SET NULL,
  grad_year       TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,          -- mirrored from entitlements
  theme           TEXT NOT NULL DEFAULT 'default',
  notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb, -- mirror of device prefs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_touch ON public.profiles;
CREATE TRIGGER trg_profiles_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);

-- Auto-create a blank profile when a new auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 3. Class memberships + groups (groups are 1:1 with class+term)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id)
);

CREATE TABLE IF NOT EXISTS public.class_memberships (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id    TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_class_memberships_class ON public.class_memberships(class_id);

-- Auto-create a group when a class is created.
CREATE OR REPLACE FUNCTION public.create_group_for_class()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.groups (class_id) VALUES (NEW.id)
  ON CONFLICT (class_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_created ON public.classes;
CREATE TRIGGER trg_class_created
  AFTER INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.create_group_for_class();

-- =====================================================================
-- 4. Decks + cards
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.decks (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- A preset/system deck is owned by NULL and has slug populated.
  slug                   TEXT UNIQUE,
  title                  TEXT NOT NULL,
  description            TEXT,
  class_id               TEXT REFERENCES public.classes(id) ON DELETE SET NULL,
  is_public              BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  source                 TEXT,         -- 'user' | 'system' | 'ai' | 'snap'
  cover_emoji            TEXT,
  card_count             INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_decks_touch ON public.decks;
CREATE TRIGGER trg_decks_touch
  BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_decks_owner ON public.decks(owner_id);
CREATE INDEX IF NOT EXISTS idx_decks_class ON public.decks(class_id);

CREATE TABLE IF NOT EXISTS public.cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  card_type   TEXT NOT NULL DEFAULT 'basic' CHECK (card_type IN ('basic','mc','cloze')),
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_cards_touch ON public.cards;
CREATE TRIGGER trg_cards_touch
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_cards_deck ON public.cards(deck_id);

-- Maintain decks.card_count automatically.
CREATE OR REPLACE FUNCTION public.bump_deck_card_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.decks SET card_count = card_count + 1, updated_at = NOW()
      WHERE id = NEW.deck_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.decks SET card_count = GREATEST(card_count - 1, 0), updated_at = NOW()
      WHERE id = OLD.deck_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cards_count ON public.cards;
CREATE TRIGGER trg_cards_count
  AFTER INSERT OR DELETE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.bump_deck_card_count();

CREATE TABLE IF NOT EXISTS public.deck_shares (
  deck_id     UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  shared_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (deck_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_deck_shares_group ON public.deck_shares(group_id);

-- =====================================================================
-- 5. Per-user state: cloud-synced spaced repetition + stats
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_card_state (
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id           UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  ease              REAL NOT NULL DEFAULT 2.5,
  interval_days     INTEGER NOT NULL DEFAULT 0,
  due_at            TIMESTAMPTZ,
  last_seen_at      TIMESTAMPTZ,
  correct_streak    INTEGER NOT NULL DEFAULT 0,
  total_seen        INTEGER NOT NULL DEFAULT 0,
  total_correct     INTEGER NOT NULL DEFAULT 0,
  is_mastered       BOOLEAN NOT NULL DEFAULT FALSE,
  is_saved          BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);

DROP TRIGGER IF EXISTS trg_user_card_state_touch ON public.user_card_state;
CREATE TRIGGER trg_user_card_state_touch
  BEFORE UPDATE ON public.user_card_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_ucs_due ON public.user_card_state(user_id, due_at);

CREATE TABLE IF NOT EXISTS public.card_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id         UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  was_correct     BOOLEAN NOT NULL,
  confidence      SMALLINT,                 -- 1..4 if confidence-rating used
  source          TEXT,                     -- 'session'|'quiz'|'notification'|'recall'
  response_ms     INTEGER,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_attempts_card ON public.card_attempts(card_id);
CREATE INDEX IF NOT EXISTS idx_card_attempts_user ON public.card_attempts(user_id, attempted_at DESC);

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tidbits_seen       INTEGER NOT NULL DEFAULT 0,
  cards_mastered     INTEGER NOT NULL DEFAULT 0,
  current_streak     INTEGER NOT NULL DEFAULT 0,
  longest_streak     INTEGER NOT NULL DEFAULT 0,
  last_active_date   DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_stats_touch ON public.user_stats;
CREATE TRIGGER trg_user_stats_touch
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- 6. Feed posts + reactions (W6 prep)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES public.groups(id) ON DELETE CASCADE, -- null = friends-feed scoped
  post_type       TEXT NOT NULL CHECK (post_type IN ('activity','note','deck_share','dumb_question')),
  is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_group ON public.feed_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON public.feed_posts(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reactions (
  post_id     UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id, kind)
);

-- =====================================================================
-- 7. Entitlements (W9 prep)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product      TEXT NOT NULL,                 -- 'premium_monthly' etc.
  source       TEXT,                          -- 'revenuecat' | 'manual' | 'promo'
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product)
);

DROP TRIGGER IF EXISTS trg_entitlements_touch ON public.entitlements;
CREATE TRIGGER trg_entitlements_touch
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Mirror "is_premium" onto profile for cheap RLS checks.
CREATE OR REPLACE FUNCTION public.sync_profile_premium()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  has_active BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO has_active;

  UPDATE public.profiles
    SET is_premium = has_active, updated_at = NOW()
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_entitlements_sync ON public.entitlements;
CREATE TRIGGER trg_entitlements_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_premium();

-- =====================================================================
-- 8. AI generation quota (W10 prep)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ai_generation_quota (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,            -- 'YYYY-MM'
  used         INTEGER NOT NULL DEFAULT 0,
  limit_count  INTEGER NOT NULL DEFAULT 30,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

-- =====================================================================
-- 9. device_tokens: add user_id FK (backfill via separate task)
-- =====================================================================

ALTER TABLE public.device_tokens
  DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.device_tokens
  ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);

-- =====================================================================
-- 10. Row Level Security policies
-- =====================================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_shares         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_quota ENABLE ROW LEVEL SECURITY;

-- Schools / classes / groups are reference data; anyone can read them.
ALTER TABLE public.schools  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_schools_read ON public.schools;
CREATE POLICY p_schools_read ON public.schools FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS p_classes_read ON public.classes;
CREATE POLICY p_classes_read ON public.classes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS p_groups_read ON public.groups;
CREATE POLICY p_groups_read ON public.groups FOR SELECT USING (TRUE);

-- profiles: user can read+update their own. Other profiles readable only when
-- the viewer shares at least one class with the target (classmate visibility).
DROP POLICY IF EXISTS p_profiles_self_select ON public.profiles;
CREATE POLICY p_profiles_self_select ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Classmate visibility delegated to a SECURITY DEFINER helper to avoid
-- recursive RLS evaluation through class_memberships (see migration 002).
DROP POLICY IF EXISTS p_profiles_classmate_select ON public.profiles;
CREATE POLICY p_profiles_classmate_select ON public.profiles
  FOR SELECT USING (public.is_classmate(id));

DROP POLICY IF EXISTS p_profiles_self_upsert ON public.profiles;
CREATE POLICY p_profiles_self_upsert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS p_profiles_self_update ON public.profiles;
CREATE POLICY p_profiles_self_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- class_memberships: a user manages their own.
DROP POLICY IF EXISTS p_cm_self_all ON public.class_memberships;
CREATE POLICY p_cm_self_all ON public.class_memberships
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Classmate-read via SECURITY DEFINER helper (see migration 002).
DROP POLICY IF EXISTS p_cm_classmate_read ON public.class_memberships;
CREATE POLICY p_cm_classmate_read ON public.class_memberships
  FOR SELECT USING (class_id IN (SELECT public.my_class_ids()));

-- decks: owners + public + shared via deck_shares with my groups
DROP POLICY IF EXISTS p_decks_owner_all ON public.decks;
CREATE POLICY p_decks_owner_all ON public.decks
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS p_decks_public_read ON public.decks;
CREATE POLICY p_decks_public_read ON public.decks
  FOR SELECT USING (is_public = TRUE OR owner_id IS NULL);

DROP POLICY IF EXISTS p_decks_shared_read ON public.decks;
CREATE POLICY p_decks_shared_read ON public.decks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deck_shares ds
      JOIN public.groups g ON g.id = ds.group_id
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE ds.deck_id = decks.id AND cm.user_id = auth.uid()
    )
  );

-- cards: readable iff parent deck is readable; writable only by deck owner.
DROP POLICY IF EXISTS p_cards_read ON public.cards;
CREATE POLICY p_cards_read ON public.cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decks d
      WHERE d.id = cards.deck_id
        AND (
          d.owner_id = auth.uid()
          OR d.is_public = TRUE
          OR d.owner_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.deck_shares ds
            JOIN public.groups g ON g.id = ds.group_id
            JOIN public.class_memberships cm ON cm.class_id = g.class_id
            WHERE ds.deck_id = d.id AND cm.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS p_cards_owner_write ON public.cards;
CREATE POLICY p_cards_owner_write ON public.cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.decks d WHERE d.id = cards.deck_id AND d.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.decks d WHERE d.id = cards.deck_id AND d.owner_id = auth.uid())
  );

-- deck_shares: shared_by user only; readable by all members of the group.
DROP POLICY IF EXISTS p_deck_shares_write ON public.deck_shares;
CREATE POLICY p_deck_shares_write ON public.deck_shares
  FOR ALL USING (shared_by = auth.uid()) WITH CHECK (shared_by = auth.uid());

DROP POLICY IF EXISTS p_deck_shares_member_read ON public.deck_shares;
CREATE POLICY p_deck_shares_member_read ON public.deck_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE g.id = deck_shares.group_id AND cm.user_id = auth.uid()
    )
  );

-- user_card_state & card_attempts & user_stats: strict per-user.
DROP POLICY IF EXISTS p_ucs_self ON public.user_card_state;
CREATE POLICY p_ucs_self ON public.user_card_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS p_attempts_self ON public.card_attempts;
CREATE POLICY p_attempts_self ON public.card_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- card_attempts: read-only aggregates for classmates via Same-Boat view (below)
DROP POLICY IF EXISTS p_attempts_classmate_read ON public.card_attempts;
CREATE POLICY p_attempts_classmate_read ON public.card_attempts
  FOR SELECT USING (public.is_classmate(user_id));

DROP POLICY IF EXISTS p_user_stats_self ON public.user_stats;
CREATE POLICY p_user_stats_self ON public.user_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- feed_posts: author can write; readable by group members (or globally for
-- friends-feed posts where group_id is NULL, scoped to classmates of author).
DROP POLICY IF EXISTS p_feed_author_write ON public.feed_posts;
CREATE POLICY p_feed_author_write ON public.feed_posts
  FOR ALL USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS p_feed_group_read ON public.feed_posts;
CREATE POLICY p_feed_group_read ON public.feed_posts
  FOR SELECT USING (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.class_memberships cm ON cm.class_id = g.class_id
      WHERE g.id = feed_posts.group_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_reactions_self ON public.reactions;
CREATE POLICY p_reactions_self ON public.reactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS p_reactions_read ON public.reactions;
CREATE POLICY p_reactions_read ON public.reactions
  FOR SELECT USING (TRUE);

-- entitlements: user can read their own; only service role writes.
DROP POLICY IF EXISTS p_ent_self_read ON public.entitlements;
CREATE POLICY p_ent_self_read ON public.entitlements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS p_quota_self ON public.ai_generation_quota;
CREATE POLICY p_quota_self ON public.ai_generation_quota
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 11. Helpful aggregate views
-- =====================================================================

-- Same-Boat: percentage of attempts for a card that were correct, plus
-- attempt count, scoped naturally by RLS (you only see attempts from
-- classmates per the policy above).
CREATE OR REPLACE VIEW public.card_same_boat AS
SELECT
  card_id,
  COUNT(*) AS attempts,
  SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) AS correct,
  ROUND(100.0 * SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS pct_correct
FROM public.card_attempts
GROUP BY card_id;

-- Live presence: classmates with any card attempt in the last 5 minutes.
CREATE OR REPLACE VIEW public.class_live_presence AS
SELECT
  cm.class_id,
  cm.user_id,
  MAX(ca.attempted_at) AS last_attempt_at
FROM public.class_memberships cm
JOIN public.card_attempts ca ON ca.user_id = cm.user_id
WHERE ca.attempted_at > NOW() - INTERVAL '5 minutes'
GROUP BY cm.class_id, cm.user_id;

-- =====================================================================
-- 12. RPCs
-- =====================================================================

-- Allow a user to delete their own account (cascades via FK).
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Atomic: claim/release a class membership.
CREATE OR REPLACE FUNCTION public.join_class(p_class_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.class_memberships (user_id, class_id)
  VALUES (auth.uid(), p_class_id)
  ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_class(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_class(p_class_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.class_memberships
    WHERE user_id = auth.uid() AND class_id = p_class_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.leave_class(TEXT) TO authenticated;
