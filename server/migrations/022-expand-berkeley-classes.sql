-- Migration 022: expand UC Berkeley class catalog for user deck sharing (no preset tidbits required).
-- Safe to re-run: ON CONFLICT DO NOTHING on classes; groups back-fill is idempotent.

INSERT INTO public.classes (id, school_id, code, title, term, subject) VALUES
  -- Mathematics
  ('uc-berkeley:math104:fa26',  'uc-berkeley', 'MATH 104',   'Introduction to Analysis',                          'fa26', 'Mathematics'),
  ('uc-berkeley:math105:fa26',  'uc-berkeley', 'MATH 105',   'Second Course in Analysis',                         'fa26', 'Mathematics'),
  ('uc-berkeley:math110:fa26',  'uc-berkeley', 'MATH 110',   'Abstract Linear Algebra',                           'fa26', 'Mathematics'),
  ('uc-berkeley:math113:fa26',  'uc-berkeley', 'MATH 113',   'Abstract Algebra',                                  'fa26', 'Mathematics'),
  ('uc-berkeley:math185:fa26',  'uc-berkeley', 'MATH 185',   'Introduction to Complex Analysis',                  'fa26', 'Mathematics'),
  -- Computer Science
  ('uc-berkeley:cs162:fa26',    'uc-berkeley', 'CS 162',     'Operating Systems and System Programming',          'fa26', 'Computer Science'),
  ('uc-berkeley:cs170:fa26',    'uc-berkeley', 'CS 170',     'Efficient Algorithms and Intractable Problems',       'fa26', 'Computer Science'),
  ('uc-berkeley:cs186:fa26',    'uc-berkeley', 'CS 186',     'Introduction to Database Systems',                  'fa26', 'Computer Science'),
  ('uc-berkeley:cs189:fa26',    'uc-berkeley', 'CS 189',     'Introduction to Machine Learning',                  'fa26', 'Computer Science'),
  -- EECS
  ('uc-berkeley:eecs127:fa26',  'uc-berkeley', 'EECS 127',   'Optimization Models in Engineering',                'fa26', 'EECS'),
  ('uc-berkeley:eecs149:fa26',  'uc-berkeley', 'EECS 149',   'Introduction to Embedded and Real-Time Software',    'fa26', 'EECS'),
  -- Data Science / Statistics
  ('uc-berkeley:data140:fa26',  'uc-berkeley', 'DATA 140',   'Probability for Data Science',                      'fa26', 'Data Science'),
  ('uc-berkeley:stat133:fa26',  'uc-berkeley', 'STAT 133',   'Concepts in Computing with Data',                   'fa26', 'Statistics'),
  ('uc-berkeley:stat135:fa26',  'uc-berkeley', 'STAT 135',   'Concepts of Statistics',                            'fa26', 'Statistics'),
  -- Physics / Chemistry / Biology
  ('uc-berkeley:phys7c:fa26',   'uc-berkeley', 'PHYS 7C',    'Physics for Scientists and Engineers III',          'fa26', 'Physics'),
  ('uc-berkeley:phys8a:fa26',   'uc-berkeley', 'PHYS 8A',    'Introductory Physics I',                            'fa26', 'Physics'),
  ('uc-berkeley:phys8b:fa26',   'uc-berkeley', 'PHYS 8B',    'Introductory Physics II',                           'fa26', 'Physics'),
  ('uc-berkeley:chem3a:fa26',   'uc-berkeley', 'CHEM 3A',    'Chemical Structure and Reactivity',                   'fa26', 'Chemistry'),
  ('uc-berkeley:chem3b:fa26',   'uc-berkeley', 'CHEM 3B',    'Chemical Structure and Reactivity II',              'fa26', 'Chemistry'),
  ('uc-berkeley:mcb100:fa26',   'uc-berkeley', 'MCB 100',    'Biochemistry and Molecular Biology',                'fa26', 'Molecular Biology'),
  -- Economics / Business
  ('uc-berkeley:econ101:fa26',  'uc-berkeley', 'ECON 101',   'Macroeconomic Theory',                              'fa26', 'Economics'),
  ('uc-berkeley:ugba101a:fa26', 'uc-berkeley', 'UGBA 101A',  'The Microeconomics of Business',                    'fa26', 'Business'),
  -- Humanities
  ('uc-berkeley:hist7a:fa26',   'uc-berkeley', 'HISTORY 7A', 'Introduction to the History of the United States: Settlement to Civil War', 'fa26', 'History'),
  ('uc-berkeley:phil25a:fa26',  'uc-berkeley', 'PHILOS 25A', 'Ancient Philosophy',                                'fa26', 'Philosophy')
ON CONFLICT (id) DO NOTHING;

-- Back-fill groups for any class missing one (including rows inserted above).
INSERT INTO public.groups (class_id)
SELECT c.id
FROM   public.classes c
WHERE  c.id IN (
  'uc-berkeley:math104:fa26',
  'uc-berkeley:math105:fa26',
  'uc-berkeley:math110:fa26',
  'uc-berkeley:math113:fa26',
  'uc-berkeley:math185:fa26',
  'uc-berkeley:cs162:fa26',
  'uc-berkeley:cs170:fa26',
  'uc-berkeley:cs186:fa26',
  'uc-berkeley:cs189:fa26',
  'uc-berkeley:eecs127:fa26',
  'uc-berkeley:eecs149:fa26',
  'uc-berkeley:data140:fa26',
  'uc-berkeley:stat133:fa26',
  'uc-berkeley:stat135:fa26',
  'uc-berkeley:phys7c:fa26',
  'uc-berkeley:phys8a:fa26',
  'uc-berkeley:phys8b:fa26',
  'uc-berkeley:chem3a:fa26',
  'uc-berkeley:chem3b:fa26',
  'uc-berkeley:mcb100:fa26',
  'uc-berkeley:econ101:fa26',
  'uc-berkeley:ugba101a:fa26',
  'uc-berkeley:hist7a:fa26',
  'uc-berkeley:phil25a:fa26'
)
AND NOT EXISTS (
  SELECT 1 FROM public.groups g WHERE g.class_id = c.id
);
