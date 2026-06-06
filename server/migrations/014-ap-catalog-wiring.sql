-- Migration 014: Wire AP catalog (groups + empty preset decks).
-- Classes already exist from 003; this adds study-group rows and deck shells.
-- Tidbit cards are added separately when content is ready.

-- Ensure every AP class has a study group.
INSERT INTO public.groups (class_id)
SELECT c.id
FROM public.classes c
WHERE c.school_id = 'high-school-ap'
  AND NOT EXISTS (
    SELECT 1 FROM public.groups g WHERE g.class_id = c.id
  );

-- Empty system preset decks (slug = content category id, linked to class).
INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES
  (NULL, 'ap-calc-ab',  'AP Calculus AB',                 'AP Calculus AB exam prep',                 'hs-ap:ap_calc_ab:ap26',  'system', true, '📐', 0),
  (NULL, 'ap-calc-bc',  'AP Calculus BC',                 'AP Calculus BC exam prep',                 'hs-ap:ap_calc_bc:ap26',  'system', true, '📐', 0),
  (NULL, 'ap-stats',    'AP Statistics',                  'AP Statistics exam prep',                  'hs-ap:ap_stats:ap26',    'system', true, '📊', 0),
  (NULL, 'ap-csa',      'AP Computer Science A',          'AP Computer Science A exam prep',          'hs-ap:ap_csa:ap26',      'system', true, '💻', 0),
  (NULL, 'ap-csp',      'AP Computer Science Principles', 'AP Computer Science Principles exam prep', 'hs-ap:ap_csp:ap26',      'system', true, '💻', 0),
  (NULL, 'ap-chem',     'AP Chemistry',                   'AP Chemistry exam prep',                   'hs-ap:ap_chem:ap26',     'system', true, '🧪', 0),
  (NULL, 'ap-bio',      'AP Biology',                     'AP Biology exam prep',                     'hs-ap:ap_bio:ap26',      'system', true, '🔬', 0),
  (NULL, 'ap-phys1',    'AP Physics 1',                   'AP Physics 1 exam prep',                   'hs-ap:ap_phys1:ap26',    'system', true, '⚛️', 0),
  (NULL, 'ap-phys2',    'AP Physics 2',                   'AP Physics 2 exam prep',                   'hs-ap:ap_phys2:ap26',    'system', true, '⚛️', 0),
  (NULL, 'ap-phys-c-m', 'AP Physics C: Mechanics',        'AP Physics C: Mechanics exam prep',        'hs-ap:ap_phys_cm:ap26',  'system', true, '⚛️', 0),
  (NULL, 'ap-phys-c-e', 'AP Physics C: E&M',              'AP Physics C: E&M exam prep',              'hs-ap:ap_phys_ce:ap26',  'system', true, '⚛️', 0),
  (NULL, 'ap-ush',      'AP US History',                  'AP US History exam prep',                  'hs-ap:ap_ush:ap26',      'system', true, '📜', 0),
  (NULL, 'ap-world',    'AP World History',               'AP World History exam prep',               'hs-ap:ap_wh:ap26',       'system', true, '📜', 0),
  (NULL, 'ap-euro',     'AP European History',            'AP European History exam prep',            'hs-ap:ap_euro:ap26',     'system', true, '📜', 0),
  (NULL, 'ap-gov',      'AP US Government',               'AP US Government exam prep',               'hs-ap:ap_gov:ap26',      'system', true, '🏛️', 0),
  (NULL, 'ap-macro',    'AP Macroeconomics',              'AP Macroeconomics exam prep',              'hs-ap:ap_macro:ap26',    'system', true, '📈', 0),
  (NULL, 'ap-micro',    'AP Microeconomics',              'AP Microeconomics exam prep',              'hs-ap:ap_micro:ap26',    'system', true, '📈', 0),
  (NULL, 'ap-psych',    'AP Psychology',                  'AP Psychology exam prep',                  'hs-ap:ap_psych:ap26',    'system', true, '🧠', 0),
  (NULL, 'ap-lang',     'AP English Language',            'AP English Language exam prep',            'hs-ap:ap_eng_lang:ap26', 'system', true, '📚', 0),
  (NULL, 'ap-lit',      'AP English Literature',          'AP English Literature exam prep',          'hs-ap:ap_eng_lit:ap26',  'system', true, '📚', 0),
  (NULL, 'ap-spanish',  'AP Spanish Language',            'AP Spanish Language exam prep',            'hs-ap:ap_span:ap26',     'system', true, '🌍', 0),
  (NULL, 'ap-hug',      'AP Human Geography',             'AP Human Geography exam prep',             'hs-ap:ap_hug:ap26',      'system', true, '🌎', 0),
  (NULL, 'ap-enviro',   'AP Environmental Science',       'AP Environmental Science exam prep',       'hs-ap:ap_enviro:ap26',   'system', true, '🌿', 0),
  (NULL, 'ap-art-hist', 'AP Art History',                 'AP Art History exam prep',                 'hs-ap:ap_art_hist:ap26', 'system', true, '🎨', 0)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;
