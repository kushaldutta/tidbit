-- Migration 023: Miscellaneous topic catalog for community deck groups.
-- Safe to re-run: ON CONFLICT DO NOTHING on schools/classes; groups back-fill is idempotent.

-- Allow a general-purpose catalog alongside college and high school.
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_type_check;
ALTER TABLE public.schools ADD CONSTRAINT schools_type_check
  CHECK (type IN ('college', 'highschool', 'general'));

INSERT INTO public.schools (id, name, type) VALUES
  ('miscellaneous', 'Miscellaneous', 'general')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (id, school_id, code, title, term, subject) VALUES
  ('misc:literature:na',         'miscellaneous', 'Literature',           'Book guides, characters, and terms from the community',              'na', 'Books'),
  ('misc:personal-finance:na',  'miscellaneous', 'Personal Finance',     'Budgeting, investing, and money basics',                             'na', 'Life Skills'),
  ('misc:language-learning:na', 'miscellaneous', 'Language Learning',    'Vocabulary and phrases for any language',                            'na', 'Languages'),
  ('misc:history:na',           'miscellaneous', 'History',              'World and US history beyond the classroom',                          'na', 'History'),
  ('misc:philosophy:na',        'miscellaneous', 'Philosophy & Big Ideas','Stoicism, ethics, and thought experiments',                         'na', 'Philosophy'),
  ('misc:fun-facts:na',         'miscellaneous', 'Fun Facts',            'Trivia and interesting knowledge',                                     'na', 'General Knowledge'),
  ('misc:science-nature:na',    'miscellaneous', 'Science & Nature',     'How the world works',                                                'na', 'Science'),
  ('misc:health-wellness:na',   'miscellaneous', 'Health & Wellness',    'Sleep, fitness, and mental health',                                  'na', 'Life Skills'),
  ('misc:tech-for-everyone:na', 'miscellaneous', 'Tech for Everyone',    'Technology explained for everyday life',                             'na', 'Technology')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.groups (class_id)
SELECT c.id
FROM   public.classes c
WHERE  c.id IN (
  'misc:literature:na',
  'misc:personal-finance:na',
  'misc:language-learning:na',
  'misc:history:na',
  'misc:philosophy:na',
  'misc:fun-facts:na',
  'misc:science-nature:na',
  'misc:health-wellness:na',
  'misc:tech-for-everyone:na'
)
AND NOT EXISTS (
  SELECT 1 FROM public.groups g WHERE g.class_id = c.id
);
