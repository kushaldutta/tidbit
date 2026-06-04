-- Migration 010: add all UC Berkeley classes that have dedicated tidbit content
-- but were missing from the class catalog (Categories tab lists enrollable classes).
-- Safe to re-run: ON CONFLICT DO NOTHING on classes; groups back-fill is idempotent.

INSERT INTO public.classes (id, school_id, code, title, term, subject) VALUES
  ('uc-berkeley:math51:fa26',      'uc-berkeley', 'MATH 51',      'Linear Algebra and Differential Equations',                        'fa26', 'Mathematics'),
  ('uc-berkeley:math52:fa26',      'uc-berkeley', 'MATH 52',      'Integral Calculus of Several Variables',                           'fa26', 'Mathematics'),
  ('uc-berkeley:math128a:fa26',    'uc-berkeley', 'MATH 128A',    'Numerical Analysis',                                               'fa26', 'Mathematics'),
  ('uc-berkeley:cs188:fa26',       'uc-berkeley', 'CS 188',       'Introduction to Artificial Intelligence',                          'fa26', 'Computer Science'),
  ('uc-berkeley:cs161:fa26',       'uc-berkeley', 'CS 161',       'Computer Security',                                                'fa26', 'Computer Science'),
  ('uc-berkeley:physics137a:fa26', 'uc-berkeley', 'PHYSICS 137A', 'Quantum Mechanics',                                                'fa26', 'Physics'),
  ('uc-berkeley:nuc150:fa26',      'uc-berkeley', 'NUCENG 150',   'Introduction to Nuclear Reactor Theory',                           'fa26', 'Nuclear Engineering'),
  ('uc-berkeley:nuc155:fa26',      'uc-berkeley', 'NUCENG 155',   'Introduction to Numerical Simulations in Radiation Transport',    'fa26', 'Nuclear Engineering'),
  ('uc-berkeley:agrs28:fa26',      'uc-berkeley', 'AGRS 28',      'Greek and Roman Myths',                                            'fa26', 'Classics')
ON CONFLICT (id) DO NOTHING;

-- Back-fill groups for any class missing one (including rows inserted above).
INSERT INTO public.groups (class_id)
SELECT c.id
FROM   public.classes c
WHERE  c.id IN (
  'uc-berkeley:math51:fa26',
  'uc-berkeley:math52:fa26',
  'uc-berkeley:math128a:fa26',
  'uc-berkeley:cs188:fa26',
  'uc-berkeley:cs161:fa26',
  'uc-berkeley:physics137a:fa26',
  'uc-berkeley:nuc150:fa26',
  'uc-berkeley:nuc155:fa26',
  'uc-berkeley:agrs28:fa26'
)
AND NOT EXISTS (
  SELECT 1 FROM public.groups g WHERE g.class_id = c.id
);
