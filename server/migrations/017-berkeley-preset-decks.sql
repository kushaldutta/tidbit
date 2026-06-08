-- Migration 017: Berkeley preset decks for every content-backed class.
-- slug = content category id, class_id links enrollment → deck (same model as AP / 014).
-- Syncs existing tidbits rows into cards on those decks.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES
  (NULL, 'math51',      'MATH 51',           'Calculus I',                                      'uc-berkeley:math51:fa26',      'system', true, '🧮', 0),
  (NULL, 'math52',      'MATH 52',           'Calculus II',                                     'uc-berkeley:math52:fa26',      'system', true, '🧮', 0),
  (NULL, 'math53',      'MATH 53',           'Multivariable Calculus',                          'uc-berkeley:math53:fa26',      'system', true, '🧮', 0),
  (NULL, 'math-54',     'MATH 54',           'Linear Algebra and Differential Equations',       'uc-berkeley:math54:fa26',      'system', true, '🧮', 0),
  (NULL, 'math55',      'MATH 55',           'Discrete Mathematics',                            'uc-berkeley:math55:fa26',      'system', true, '🧮', 0),
  (NULL, 'math128a',    'MATH 128A',         'Numerical Analysis',                              'uc-berkeley:math128a:fa26',    'system', true, '🧮', 0),
  (NULL, 'cs-61a',      'CS 61A',            'Structure and Interpretation of Computer Programs','uc-berkeley:cs61a:fa26',     'system', true, '💻', 0),
  (NULL, 'cs61b',       'CS 61B',            'Data Structures and Algorithms',                  'uc-berkeley:cs61b:fa26',       'system', true, '💻', 0),
  (NULL, 'cs61c',       'CS 61C',            'Great Ideas in Computer Architecture',            'uc-berkeley:cs61c:fa26',       'system', true, '⚙️', 0),
  (NULL, 'cs70',        'CS 70',             'Discrete Mathematics and Probability',            'uc-berkeley:cs70:fa26',        'system', true, '🎲', 0),
  (NULL, 'cs188',       'CS 188',            'Introduction to Artificial Intelligence',          'uc-berkeley:cs188:fa26',       'system', true, '🤖', 0),
  (NULL, 'cs161',       'CS 161',            'Computer Security',                               'uc-berkeley:cs161:fa26',       'system', true, '🔐', 0),
  (NULL, 'data-8',      'DATA 8',            'Foundations of Data Science',                     'uc-berkeley:data8:fa26',       'system', true, '📊', 0),
  (NULL, 'data100',     'DATA 100',          'Principles and Techniques of Data Science',       'uc-berkeley:data100:fa26',     'system', true, '📊', 0),
  (NULL, 'stat134',     'STAT 134',          'Concepts of Probability',                         'uc-berkeley:stat134:fa26',     'system', true, '📊', 0),
  (NULL, 'econ-1',      'ECON 1',            'Introduction to Economics',                       'uc-berkeley:econ1:fa26',       'system', true, '📈', 0),
  (NULL, 'econ100a',    'ECON 100A',         'Microeconomic Theory',                            'uc-berkeley:econ100a:fa26',    'system', true, '📈', 0),
  (NULL, 'econ100b',    'ECON 100B',         'Macroeconomic Theory',                            'uc-berkeley:econ100b:fa26',    'system', true, '📈', 0),
  (NULL, 'psych1',      'PSYCH 1',           'General Psychology',                              'uc-berkeley:psych1:fa26',      'system', true, '🧠', 0),
  (NULL, 'mcb102',      'MCB 102',           'Biochemistry and Molecular Biology',              'uc-berkeley:mcb102:fa26',      'system', true, '🔬', 0),
  (NULL, 'phys7a',      'PHYS 7A',           'Physics for Scientists and Engineers I',          'uc-berkeley:phys7a:fa26',      'system', true, '⚛️', 0),
  (NULL, 'phys7b',      'PHYS 7B',           'Physics for Scientists and Engineers II',         'uc-berkeley:phys7b:fa26',      'system', true, '⚛️', 0),
  (NULL, 'physics137a', 'PHYSICS 137A',      'Quantum Mechanics',                               'uc-berkeley:physics137a:fa26', 'system', true, '⚛️', 0),
  (NULL, 'nuc150',      'NUCENG 150',        'Introduction to Nuclear Reactor Theory',          'uc-berkeley:nuc150:fa26',      'system', true, '☢️', 0),
  (NULL, 'nuc155',      'NUCENG 155',        'Numerical Simulations in Radiation Transport',    'uc-berkeley:nuc155:fa26',      'system', true, '☢️', 0),
  (NULL, 'agrs28',      'AGRS 28',           'Greek and Roman Myths',                             'uc-berkeley:agrs28:fa26',      'system', true, '📜', 0),
  (NULL, 'bio1a',       'BIO 1A',            'General Biology',                                 'uc-berkeley:bio1a:fa26',       'system', true, '🔬', 0),
  (NULL, 'bio1b',       'BIO 1B',            'General Biology',                                 'uc-berkeley:bio1b:fa26',       'system', true, '🔬', 0),
  (NULL, 'chem1a',      'CHEM 1A',           'General Chemistry',                               'uc-berkeley:chem1a:fa26',      'system', true, '🧪', 0),
  (NULL, 'chem1b',      'CHEM 1B',           'General Chemistry',                               'uc-berkeley:chem1b:fa26',      'system', true, '🧪', 0),
  (NULL, 'eecs16a',     'EECS 16A',          'Designing Information Devices and Systems I',       'uc-berkeley:eecs16a:fa26',     'system', true, '⚡', 0),
  (NULL, 'eecs16b',     'EECS 16B',          'Designing Information Devices and Systems II',      'uc-berkeley:eecs16b:fa26',     'system', true, '⚡', 0)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

-- Copy tidbits → cards for every system preset deck (Berkeley + AP).
INSERT INTO public.cards (deck_id, front, back, card_type, position)
SELECT
  d.id,
  COALESCE(NULLIF(TRIM(t.term), ''), t.text),
  t.text,
  'basic',
  (ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY t.id)::integer - 1)
FROM public.tidbits t
JOIN public.decks d ON d.slug = t.category_id AND d.owner_id IS NULL
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.deck_id = d.id AND c.back = t.text
  );

-- Refresh deck card counts.
UPDATE public.decks d
SET card_count = sub.cnt
FROM (
  SELECT deck_id, COUNT(*)::integer AS cnt
  FROM public.cards
  GROUP BY deck_id
) sub
WHERE d.id = sub.deck_id
  AND d.owner_id IS NULL;
