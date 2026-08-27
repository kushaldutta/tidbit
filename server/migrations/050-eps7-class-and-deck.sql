-- Migration 050: EPS 7 — Introduction to Climate Change (Fall 2026)
-- Instructor: Prof. David Romps
-- Adds the class row, a system preset deck, and 8 topic sections + 2 exam-review
-- sections derived from the Fall 2026 syllabus.
-- Cards are intentionally empty — seed them separately once content is ready.
--
-- Exam dates (from syllabus):
--   Midterm 1: Thursday, Oct 8, 2026, 7–10 pm
--   Midterm 2: Wednesday, Nov 4, 2026, 7–10 pm
--   Final:     Thursday, Dec 17, 2026, 3–6 pm

-- ─────────────────────────────────────────────────────────────
-- 0. Fix missing unique constraint on groups.class_id
--    (required by create_group_for_class trigger)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'groups_class_id_key'
      AND conrelid = 'public.groups'::regclass
  ) THEN
    ALTER TABLE public.groups ADD CONSTRAINT groups_class_id_key UNIQUE (class_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. Seed the class
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.classes (id, code, title, subject, school_id)
VALUES (
  'uc-berkeley:eps7:fa26',
  'EPS 7',
  'Introduction to Climate Change',
  'Earth & Planetary Science',
  'uc-berkeley'
)
ON CONFLICT (id) DO UPDATE SET
  code     = EXCLUDED.code,
  title    = EXCLUDED.title,
  subject  = EXCLUDED.subject;

-- ─────────────────────────────────────────────────────────────
-- 2. Preset deck
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'eps7',
  'EPS 7',
  'Introduction to Climate Change — Prof. Romps, UC Berkeley Fall 2026',
  'uc-berkeley:eps7:fa26',
  'system',
  true,
  '🌍',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

-- ─────────────────────────────────────────────────────────────
-- 3. Deck sections (syllabus-aligned, 8 topics + 2 review)
-- ─────────────────────────────────────────────────────────────
-- Positions 0–9 so they display in lecture order.

INSERT INTO public.deck_sections (deck_id, title, slug, position, kind)
SELECT d.id, s.title, s.slug, s.pos, 'unit'
FROM public.decks d
CROSS JOIN (VALUES
  (0, 'Energy & Thermodynamics',        'energy-thermodynamics'),
  (1, 'Earth''s Atmosphere',            'earths-atmosphere'),
  (2, 'Greenhouse Effect',              'greenhouse-effect'),
  (3, 'Feedbacks & Climate Sensitivity','feedbacks-climate-sensitivity'),
  (4, 'Evidence & Impacts',             'evidence-impacts'),
  (5, 'Paleoclimate & Future Projections','paleoclimate-future'),
  (6, 'Energy Solutions',               'energy-solutions'),
  (7, 'Climate Policy & Action',        'climate-policy'),
  (8, 'Midterm 1 Review',               'midterm-1-review'),
  (9, 'Midterm 2 Review',               'midterm-2-review')
) AS s(pos, title, slug)
WHERE d.slug = 'eps7'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title    = EXCLUDED.title,
  position = EXCLUDED.position;
