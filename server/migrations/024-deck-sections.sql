-- Migration 024: deck sections for scoped notifications & study (CS 61A first).
-- Topic groupings align with cs61a.org lecture units (not calendar weeks).
-- Safe to re-run: ON CONFLICT DO NOTHING where noted.

-- =====================================================================
-- 1. Schema
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.deck_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  kind        TEXT NOT NULL DEFAULT 'topic'
                CHECK (kind IN ('topic', 'chapter', 'week', 'unit', 'custom')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deck_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_deck_sections_deck ON public.deck_sections(deck_id);

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.deck_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cards_section ON public.cards(section_id);

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS selected_deck_sections JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.device_tokens.selected_deck_sections IS
  'Map of deck UUID → array of section UUIDs eligible for notification cards. Empty array = none; missing key = all sections.';

ALTER TABLE public.deck_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_deck_sections_read ON public.deck_sections;
CREATE POLICY p_deck_sections_read ON public.deck_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.decks d
      WHERE d.id = deck_sections.deck_id
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

DROP POLICY IF EXISTS p_deck_sections_owner_write ON public.deck_sections;
CREATE POLICY p_deck_sections_owner_write ON public.deck_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_sections.deck_id AND d.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_sections.deck_id AND d.owner_id = auth.uid())
  );

-- =====================================================================
-- 2. CS 61A topic sections (8 units — mirrors cs61a.org lecture themes)
-- =====================================================================

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.position, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('functions-control', 'Functions & Control',
   'Functions, control flow, higher-order functions, and environments', 0),
  ('recursion', 'Recursion',
   'Recursion and tree recursion', 1),
  ('sequences-data', 'Sequences & Data',
   'Sequences, containers, mutability, and data abstraction', 2),
  ('trees-iterators', 'Trees & Iterators',
   'Trees, iterators, generators, and exceptions', 3),
  ('oop', 'Object-Oriented Programming',
   'Objects, inheritance, and mutable trees', 4),
  ('linked-lists', 'Linked Lists & Efficiency',
   'Linked lists and algorithmic efficiency', 5),
  ('scheme', 'Scheme',
   'Scheme, interpreters, and tail calls', 6),
  ('sql-review', 'SQL & Final Review',
   'SQL, databases, and exam review', 7)
) AS v(slug, title, description, position)
WHERE  d.slug = 'cs-61a'
ON CONFLICT (deck_id, slug) DO NOTHING;

-- =====================================================================
-- 3. CS 61A — Functions & Control starter cards (Summer Week 1 scope)
-- =====================================================================

INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'functions-control'
CROSS JOIN (VALUES
  (0,  'return value',        'A return value is the value passed back by a function when it finishes executing.'),
  (1,  'def',                 'In Python, def starts a function definition. The body is indented and runs when the function is called.'),
  (2,  'print vs return',     'print displays a value; return sends a value back to the caller. Only return can be used in an expression.'),
  (3,  'call expression',     'A call expression evaluates the operator (function), then the operands (arguments), then applies the function.'),
  (4,  'environment diagram', 'An environment diagram shows frames (calls) and bindings (names → values) as a program runs.'),
  (5,  'frame',               'Each function call creates a new frame. A frame stores local names and the parent frame link.'),
  (6,  'name binding',        'Assigning x = 3 creates or updates a binding of the name x to the value 3 in the current frame.'),
  (7,  'if / elif / else',    'Conditional blocks run at most one branch. elif chains extra conditions; else runs when all tests are false.'),
  (8,  'boolean operators',   'and, or, and not combine truth values. Python short-circuits: and stops at the first false, or at the first true.'),
  (9,  'while loop',          'A while loop repeats its body while the header condition is true. The condition is checked before each iteration.'),
  (10, 'for loop',            'for name in sequence: assigns name to each element of the sequence in order and runs the body each time.'),
  (11, 'lambda',              'lambda parameters: expression creates an anonymous function that returns the expression value.'),
  (12, 'higher-order function', 'A higher-order function takes other functions as arguments and/or returns a function.'),
  (13, 'environment diagram: call', 'To evaluate f(x), draw a new frame labeled f, bind the parameter to x, then evaluate the body in that frame.'),
  (14, 'trace',               'Tracing means stepping through code line by line and updating bindings and return values on paper or in a diagram.'),
  (15, 'try / except',        'try runs a block; if an exception occurs, except runs the handler instead of crashing the program.'),
  (16, 'NameError',           'NameError means Python looked up a name that is not bound in the current environment.'),
  (17, 'TypeError',           'TypeError means an operation was applied to a value of the wrong type (e.g. adding int and str).')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing
  WHERE existing.deck_id = d.id AND existing.section_id = s.id
);
