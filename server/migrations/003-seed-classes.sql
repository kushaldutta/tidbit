-- Seed Berkeley + AP class catalog.
-- Idempotent: ON CONFLICT (school_id, code, term) DO NOTHING.

-- ── UC Berkeley (Fall 2026) ──────────────────────────────────────────────────
INSERT INTO public.classes (id, school_id, code, title, term, subject) VALUES
  ('uc-berkeley:math1a:fa26',   'uc-berkeley', 'MATH 1A',   'Calculus',                                        'fa26', 'Mathematics'),
  ('uc-berkeley:math1b:fa26',   'uc-berkeley', 'MATH 1B',   'Calculus',                                        'fa26', 'Mathematics'),
  ('uc-berkeley:math53:fa26',   'uc-berkeley', 'MATH 53',   'Multivariable Calculus',                          'fa26', 'Mathematics'),
  ('uc-berkeley:math54:fa26',   'uc-berkeley', 'MATH 54',   'Linear Algebra and Differential Equations',       'fa26', 'Mathematics'),
  ('uc-berkeley:math55:fa26',   'uc-berkeley', 'MATH 55',   'Discrete Mathematics',                            'fa26', 'Mathematics'),
  ('uc-berkeley:cs61a:fa26',    'uc-berkeley', 'CS 61A',    'Structure and Interpretation of Computer Programs','fa26','Computer Science'),
  ('uc-berkeley:cs61b:fa26',    'uc-berkeley', 'CS 61B',    'Data Structures and Algorithms',                  'fa26', 'Computer Science'),
  ('uc-berkeley:cs61c:fa26',    'uc-berkeley', 'CS 61C',    'Great Ideas in Computer Architecture',            'fa26', 'Computer Science'),
  ('uc-berkeley:cs70:fa26',     'uc-berkeley', 'CS 70',     'Discrete Mathematics and Probability Theory',     'fa26', 'Computer Science'),
  ('uc-berkeley:eecs16a:fa26',  'uc-berkeley', 'EECS 16A',  'Designing Information Devices and Systems I',     'fa26', 'EECS'),
  ('uc-berkeley:eecs16b:fa26',  'uc-berkeley', 'EECS 16B',  'Designing Information Devices and Systems II',    'fa26', 'EECS'),
  ('uc-berkeley:data8:fa26',    'uc-berkeley', 'DATA 8',    'Foundations of Data Science',                     'fa26', 'Data Science'),
  ('uc-berkeley:data100:fa26',  'uc-berkeley', 'DATA 100',  'Principles and Techniques of Data Science',       'fa26', 'Data Science'),
  ('uc-berkeley:stat134:fa26',  'uc-berkeley', 'STAT 134',  'Concepts of Probability',                         'fa26', 'Statistics'),
  ('uc-berkeley:phys7a:fa26',   'uc-berkeley', 'PHYS 7A',   'Physics for Scientists and Engineers I',          'fa26', 'Physics'),
  ('uc-berkeley:phys7b:fa26',   'uc-berkeley', 'PHYS 7B',   'Physics for Scientists and Engineers II',         'fa26', 'Physics'),
  ('uc-berkeley:chem1a:fa26',   'uc-berkeley', 'CHEM 1A',   'General Chemistry',                               'fa26', 'Chemistry'),
  ('uc-berkeley:chem1b:fa26',   'uc-berkeley', 'CHEM 1B',   'General Chemistry',                               'fa26', 'Chemistry'),
  ('uc-berkeley:bio1a:fa26',    'uc-berkeley', 'BIO 1A',    'General Biology',                                 'fa26', 'Biology'),
  ('uc-berkeley:bio1b:fa26',    'uc-berkeley', 'BIO 1B',    'General Biology',                                 'fa26', 'Biology'),
  ('uc-berkeley:econ1:fa26',    'uc-berkeley', 'ECON 1',    'Introduction to Economics',                       'fa26', 'Economics'),
  ('uc-berkeley:econ100a:fa26', 'uc-berkeley', 'ECON 100A', 'Microeconomic Theory',                            'fa26', 'Economics'),
  ('uc-berkeley:econ100b:fa26', 'uc-berkeley', 'ECON 100B', 'Macroeconomic Theory',                            'fa26', 'Economics'),
  ('uc-berkeley:mcb102:fa26',   'uc-berkeley', 'MCB 102',   'Biochemistry and Molecular Biology',              'fa26', 'Molecular Biology'),
  ('uc-berkeley:psych1:fa26',   'uc-berkeley', 'PSYCH 1',   'General Psychology',                              'fa26', 'Psychology')
ON CONFLICT (school_id, code, term) DO NOTHING;

-- ── High School AP Courses ───────────────────────────────────────────────────
INSERT INTO public.classes (id, school_id, code, title, term, subject) VALUES
  ('hs-ap:ap_calc_ab:ap26',    'high-school-ap', 'AP Calc AB',     'AP Calculus AB',                      'ap26', 'Mathematics'),
  ('hs-ap:ap_calc_bc:ap26',    'high-school-ap', 'AP Calc BC',     'AP Calculus BC',                      'ap26', 'Mathematics'),
  ('hs-ap:ap_stats:ap26',      'high-school-ap', 'AP Stats',       'AP Statistics',                       'ap26', 'Mathematics'),
  ('hs-ap:ap_csa:ap26',        'high-school-ap', 'AP CS A',        'AP Computer Science A',               'ap26', 'Computer Science'),
  ('hs-ap:ap_csp:ap26',        'high-school-ap', 'AP CS P',        'AP Computer Science Principles',      'ap26', 'Computer Science'),
  ('hs-ap:ap_chem:ap26',       'high-school-ap', 'AP Chemistry',   'AP Chemistry',                        'ap26', 'Chemistry'),
  ('hs-ap:ap_bio:ap26',        'high-school-ap', 'AP Biology',     'AP Biology',                          'ap26', 'Biology'),
  ('hs-ap:ap_phys1:ap26',      'high-school-ap', 'AP Physics 1',   'AP Physics 1: Algebra-Based',         'ap26', 'Physics'),
  ('hs-ap:ap_phys2:ap26',      'high-school-ap', 'AP Physics 2',   'AP Physics 2: Algebra-Based',         'ap26', 'Physics'),
  ('hs-ap:ap_phys_cm:ap26',    'high-school-ap', 'AP Physics C: M','AP Physics C: Mechanics',             'ap26', 'Physics'),
  ('hs-ap:ap_phys_ce:ap26',    'high-school-ap', 'AP Physics C: E','AP Physics C: Electricity & Magnetism','ap26','Physics'),
  ('hs-ap:ap_ush:ap26',        'high-school-ap', 'AP US History',  'AP United States History',            'ap26', 'History'),
  ('hs-ap:ap_wh:ap26',         'high-school-ap', 'AP World History','AP World History: Modern',           'ap26', 'History'),
  ('hs-ap:ap_gov:ap26',        'high-school-ap', 'AP Gov',         'AP US Government and Politics',       'ap26', 'Social Studies'),
  ('hs-ap:ap_macro:ap26',      'high-school-ap', 'AP Macro',       'AP Macroeconomics',                   'ap26', 'Economics'),
  ('hs-ap:ap_micro:ap26',      'high-school-ap', 'AP Micro',       'AP Microeconomics',                   'ap26', 'Economics'),
  ('hs-ap:ap_psych:ap26',      'high-school-ap', 'AP Psychology',  'AP Psychology',                       'ap26', 'Psychology'),
  ('hs-ap:ap_eng_lang:ap26',   'high-school-ap', 'AP Lang',        'AP English Language and Composition', 'ap26', 'English'),
  ('hs-ap:ap_eng_lit:ap26',    'high-school-ap', 'AP Lit',         'AP English Literature and Composition','ap26','English'),
  ('hs-ap:ap_span:ap26',       'high-school-ap', 'AP Spanish',     'AP Spanish Language and Culture',     'ap26', 'Language'),
  ('hs-ap:ap_euro:ap26',       'high-school-ap', 'AP Euro',        'AP European History',                 'ap26', 'History'),
  ('hs-ap:ap_hug:ap26',        'high-school-ap', 'AP Human Geo',   'AP Human Geography',                  'ap26', 'Geography'),
  ('hs-ap:ap_enviro:ap26',     'high-school-ap', 'AP Enviro',      'AP Environmental Science',            'ap26', 'Science'),
  ('hs-ap:ap_art_hist:ap26',   'high-school-ap', 'AP Art History', 'AP Art History',                      'ap26', 'Art')
ON CONFLICT (school_id, code, term) DO NOTHING;
