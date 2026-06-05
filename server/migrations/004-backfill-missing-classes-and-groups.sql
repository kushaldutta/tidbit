-- Migration 004: add missing UC Berkeley classes that exist in the app's
-- content catalog but were absent from the 003 seed, then back-fill groups
-- for any class that doesn't have one yet.

-- ── Insert missing UC Berkeley classes ───────────────────────────────────────
INSERT INTO public.classes (id, school_id, code, title, term, subject) VALUES
  ('uc-berkeley:math51:fa26',  'uc-berkeley', 'MATH 51',  'Calculus I',                                       'fa26', 'Mathematics'),
  ('uc-berkeley:math52:fa26',  'uc-berkeley', 'MATH 52',  'Calculus II',                                      'fa26', 'Mathematics'),
  ('uc-berkeley:math128a:fa26','uc-berkeley', 'MATH 128A','Numerical Analysis',                               'fa26', 'Mathematics'),
  ('uc-berkeley:cs188:fa26',   'uc-berkeley', 'CS 188',   'Introduction to Artificial Intelligence',          'fa26', 'Computer Science'),
  ('uc-berkeley:cs161:fa26',   'uc-berkeley', 'CS 161',   'Computer Security',                                'fa26', 'Computer Science')
ON CONFLICT (id) DO NOTHING;

-- ── Back-fill groups for any class that doesn't have one ─────────────────────
-- The create_group_for_class trigger only fires on INSERT, so classes that
-- were inserted before the trigger existed (or via a conflict-skipped upsert)
-- may be missing their group row.
INSERT INTO public.groups (class_id)
SELECT c.id
FROM   public.classes c
WHERE  NOT EXISTS (
  SELECT 1 FROM public.groups g WHERE g.class_id = c.id
);
