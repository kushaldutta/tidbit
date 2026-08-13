-- Migration 040: Generic game platform
-- One schema for every Space A / Space B mode so new games never need a table.
-- Also: saved_tidbits (notification save was writing a missing table),
-- and a real unique index for one-section-per-class (039's subquery index is invalid).

-- ─────────────────────────────────────────────────────────────
-- 0. saved_tidbits (notification "save" cloud sync)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_tidbits (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tidbit_id  TEXT NOT NULL,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tidbit_id)
);

ALTER TABLE public.saved_tidbits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_st_all ON public.saved_tidbits;
CREATE POLICY p_st_all ON public.saved_tidbits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 1. game_challenges — async matches + scheduled class events
--    game_type is free TEXT on purpose (speed_duel, wordle, jeopardy,
--    battle_royale, dungeon, runner, tower_defense, rhythm, boss, city, …)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_challenges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type      TEXT NOT NULL,
  class_id       TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
  group_id       UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  deck_id        TEXT,
  challenger_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'awaiting_opponent', 'in_progress', 'completed', 'expired', 'declined')),
  card_ids       UUID[] NOT NULL DEFAULT '{}',
  seed           TEXT,
  window_start   TIMESTAMPTZ,
  window_end     TIMESTAMPTZ,
  meta           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gc_class_type ON public.game_challenges (class_id, game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gc_opponent   ON public.game_challenges (opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_gc_challenger ON public.game_challenges (challenger_id, status);

ALTER TABLE public.game_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_gch_read ON public.game_challenges;
CREATE POLICY p_gch_read ON public.game_challenges
  FOR SELECT TO authenticated
  USING (
    challenger_id = auth.uid()
    OR opponent_id = auth.uid()
    OR (
      class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.class_memberships cm
        WHERE cm.class_id = game_challenges.class_id AND cm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS p_gch_insert ON public.game_challenges;
CREATE POLICY p_gch_insert ON public.game_challenges
  FOR INSERT TO authenticated
  WITH CHECK (challenger_id = auth.uid());

DROP POLICY IF EXISTS p_gch_update ON public.game_challenges;
CREATE POLICY p_gch_update ON public.game_challenges
  FOR UPDATE TO authenticated
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid())
  WITH CHECK (challenger_id = auth.uid() OR opponent_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. game_runs — one row per play of any mode
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID REFERENCES public.game_challenges(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type       TEXT NOT NULL,
  class_id        TEXT REFERENCES public.classes(id) ON DELETE SET NULL,
  deck_id         TEXT,
  score           INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  total_attempted INTEGER NOT NULL DEFAULT 0,
  elapsed_ms      INTEGER NOT NULL DEFAULT 0,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One run per user per challenge (duels, daily term, royale window)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gr_challenge_user
  ON public.game_runs (challenge_id, user_id)
  WHERE challenge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gr_type_class ON public.game_runs (game_type, class_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_gr_user       ON public.game_runs (user_id, created_at DESC);

ALTER TABLE public.game_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_gr_read ON public.game_runs;
CREATE POLICY p_gr_read ON public.game_runs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.class_memberships cm
        WHERE cm.class_id = game_runs.class_id AND cm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.game_challenges ch
      WHERE ch.id = game_runs.challenge_id
        AND (ch.challenger_id = auth.uid() OR ch.opponent_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS p_gr_insert ON public.game_runs;
CREATE POLICY p_gr_insert ON public.game_runs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. Achievements
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'personal' CHECK (kind IN ('personal', 'class')),
  icon         TEXT NOT NULL DEFAULT '🏅',
  coins        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_slug TEXT NOT NULL REFERENCES public.achievements(slug) ON DELETE CASCADE,
  class_id         TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
  earned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ua_personal
  ON public.user_achievements (user_id, achievement_slug)
  WHERE class_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ua_class
  ON public.user_achievements (user_id, achievement_slug, class_id)
  WHERE class_id IS NOT NULL;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_ach_read ON public.achievements;
CREATE POLICY p_ach_read ON public.achievements FOR SELECT TO authenticated USING (true);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_ua_read ON public.user_achievements;
CREATE POLICY p_ua_read ON public.user_achievements
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_ua_insert ON public.user_achievements;
CREATE POLICY p_ua_insert ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

INSERT INTO public.achievements (slug, title, description, kind, icon, coins) VALUES
  ('first_duel',          'First Blood',           'Played your first Speed Duel',                    'personal', '⚔️', 10),
  ('duel_win',            'Warlord',               'Won a Speed Duel',                                'personal', '🏆', 15),
  ('warlord_3',           'Warlord III',           'Won 3 Speed Duels',                               'personal', '👑', 25),
  ('daily_challenger',    'Daily Challenger',      'Completed a Daily Class Challenge',               'personal', '⚡', 5),
  ('speed_demon',         'Speed Demon',           'Scored 15+ correct in a Speed Run',               'personal', '💨', 15),
  ('7_day_streak',        '7-Day Streak',          'Studied 7 days in a row',                         'personal', '🔥', 20),
  ('first_100_mastered',  'Century',               'Mastered 100 cards',                              'personal', '💯', 30),
  ('night_owl',           'Night Owl',             'Studied after midnight 3 nights',                 'personal', '🦉', 10),
  ('dungeon_diver',       'Dungeon Diver',         'Cleared a dungeon floor',                         'personal', '🗡️', 20),
  ('runner_1k',           'On the Run',            'Ran 1000m in Infinite Runner',                    'personal', '🏃', 15),
  ('section_dominance',   'Section Dominance',     'Your section won a weekly challenge',             'class',    '🏛️', 0),
  ('study_blitz',         'Study Blitz',           'Your whole class studied in one day',             'class',    '🚀', 0)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. Study pet
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_pets (
  user_id      UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Tidbit',
  stage        SMALLINT NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 5),
  xp           INTEGER NOT NULL DEFAULT 0,
  last_fed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_pets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_pet_read ON public.study_pets;
CREATE POLICY p_pet_read ON public.study_pets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_pet_write ON public.study_pets;
CREATE POLICY p_pet_write ON public.study_pets
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 5. Class city (section vs section later; class-scoped now)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_cities (
  class_id    TEXT PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  bricks      INTEGER NOT NULL DEFAULT 0,
  gold        INTEGER NOT NULL DEFAULT 0,
  food        INTEGER NOT NULL DEFAULT 0,
  buildings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.city_contributions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_type  TEXT NOT NULL CHECK (resource_type IN ('bricks', 'gold', 'food')),
  amount         INTEGER NOT NULL CHECK (amount > 0),
  source_type    TEXT NOT NULL,
  source_id      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_class ON public.city_contributions (class_id, created_at DESC);

ALTER TABLE public.class_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_city_read ON public.class_cities;
CREATE POLICY p_city_read ON public.class_cities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_memberships cm
      WHERE cm.class_id = class_cities.class_id AND cm.user_id = auth.uid()
    )
  );

ALTER TABLE public.city_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_cc_read ON public.city_contributions;
CREATE POLICY p_cc_read ON public.city_contributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_memberships cm
      WHERE cm.class_id = city_contributions.class_id AND cm.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS p_cc_insert ON public.city_contributions;
CREATE POLICY p_cc_insert ON public.city_contributions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 6. Fix one-section-per-class (039 unique index was invalid SQL)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.section_memberships
  ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE;

UPDATE public.section_memberships sm
SET class_id = g.class_id
FROM public.groups g
WHERE sm.group_id = g.id AND sm.class_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_section_memberships_user_class
  ON public.section_memberships (user_id, class_id)
  WHERE class_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.join_section(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id TEXT;
BEGIN
  SELECT class_id INTO v_class_id
  FROM public.groups
  WHERE id = p_group_id AND section_name IS NOT NULL;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Group is not a section group';
  END IF;

  INSERT INTO public.class_memberships (user_id, class_id)
  VALUES (auth.uid(), v_class_id)
  ON CONFLICT (user_id, class_id) DO NOTHING;

  INSERT INTO public.section_memberships (user_id, group_id, class_id)
  VALUES (auth.uid(), p_group_id, v_class_id)
  ON CONFLICT (user_id, group_id) DO NOTHING;
END;
$$;
