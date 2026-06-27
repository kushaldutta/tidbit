-- Migration 025: CS 61A preset cards for all topic sections (except functions-control in 024).
-- Safe to re-run: skips any section that already has cards.

-- =====================================================================
-- Recursion
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'recursion'
CROSS JOIN (VALUES
  (0,  'base case',              'The base case is the simplest input where a recursive function returns without calling itself.'),
  (1,  'recursive case',         'The recursive case calls the function again on a smaller or simpler version of the problem.'),
  (2,  'recursive function',     'A recursive function solves a problem by calling itself with modified arguments until a base case is reached.'),
  (3,  'tree recursion',         'Tree recursion makes more than one recursive call in the same frame (e.g. fib or tree traversal).'),
  (4,  'linear recursion',       'Linear recursion makes at most one recursive call per frame, forming a single chain of calls.'),
  (5,  'mutual recursion',       'Mutual recursion is when function f calls g and g calls f (directly or through a cycle).'),
  (6,  'recursive leap of faith', 'Trust that recursive calls on smaller inputs work correctly; focus on reducing to the base case.'),
  (7,  'factorial (recursive)',  'fact(n) returns 1 if n <= 1, else n * fact(n - 1). Each call waits for the next to return.'),
  (8,  'Fibonacci (inefficient)', 'fib(n) = fib(n-1) + fib(n-2) with base cases fib(0)=0, fib(1)=1. Tree recursion recomputes subproblems.'),
  (9,  'recursive sum',          'sum_digits(n) can return n if n < 10, else (n % 10) + sum_digits(n // 10).'),
  (10, 'helper function pattern', 'Use a nested def helper with extra parameters to carry state through recursive calls (e.g. accumulator).'),
  (11, 'recursion vs iteration', 'Any recursive function can be rewritten iteratively with a loop and stack; recursion uses the call stack implicitly.'),
  (12, 'stack overflow',         'Too many recursive calls without reaching a base case can exceed Python''s recursion limit and raise RecursionError.'),
  (13, 'count change (tree rec)', 'Counting ways to make change with coins is tree recursive: try using the first coin or skipping it.'),
  (14, 'recursive tree traversal', 'On a tree, recursively process left branches, then the root label, then right branches (or pre/in/post order).')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Sequences & Data
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sequences-data'
CROSS JOIN (VALUES
  (0,  'sequence',               'A sequence is an ordered collection of values accessed by index: strings, lists, tuples, and ranges.'),
  (1,  'list',                   'A list is a mutable sequence created with []. Elements can be added, removed, or changed in place.'),
  (2,  'tuple',                  'A tuple is an immutable sequence created with (). Once created, its elements cannot be reassigned.'),
  (3,  'range',                  'range(start, stop) produces integers from start up to but not including stop. Often used in for loops.'),
  (4,  'slicing',                's[i:j] returns elements from index i up to but not including j. Omitting i or j uses the start or end.'),
  (5,  'list mutation',          'Methods like append, extend, and pop modify a list in place and return None (not a new list).'),
  (6,  'list concatenation',     's + t creates a new list with elements of s followed by t. + does not mutate the original lists.'),
  (7,  'mutability',             'Mutable objects can change after creation (lists). Immutable objects cannot (ints, strings, tuples).'),
  (8,  'identity vs equality',   'a is b checks same object in memory; a == b checks equal values. Two equal lists may not be the same object.'),
  (9,  'data abstraction',       'Data abstraction hides implementation details behind constructors and selectors so programs use a simple interface.'),
  (10, 'constructor / selector', 'A constructor builds a compound value; selectors extract parts (e.g. rational: rational(n,d), numer(x), denom(x)).'),
  (11, 'nonlocal',               'nonlocal name in a nested function rebinds name in the nearest enclosing function frame (not global).'),
  (12, 'list comprehension',     '[f(x) for x in s if cond] builds a new list by applying f to each x in s that satisfies cond.'),
  (13, 'dictionary',             'A dict maps keys to values with {} or dict(). Keys are unique; lookup by key is average O(1).'),
  (14, 'dictionary mutation',    'd[key] = value adds or updates an entry. del d[key] removes it. Keys must be hashable (immutable types).')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Trees & Iterators
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'trees-iterators'
CROSS JOIN (VALUES
  (0,  'tree (61A)',             'A tree has a root label and a list of branches; each branch is itself a tree. [] is the empty tree.'),
  (1,  'tree label',             'label(t) returns the root value of tree t. branches(t) returns its list of child trees.'),
  (2,  'tree recursion pattern', 'Base case: empty tree. Recursive case: combine label with results from each branch (often sum or max).'),
  (3,  'leaf',                   'A leaf is a tree whose branches list is empty (no children).'),
  (4,  'height of a tree',       'Height is 1 + max height of branches, or 0 for an empty tree (definition varies—know your exam''s convention).'),
  (5,  'iterable',               'An iterable is any value you can loop over with for. It must implement __iter__ or be a sequence.'),
  (6,  'iterator',               'An iterator is an object with __next__ that produces values one at a time until StopIteration is raised.'),
  (7,  'iter vs next',           'iter(s) returns an iterator over s. next(it) returns the next item or raises StopIteration when exhausted.'),
  (8,  'generator function',     'A def with yield is a generator function. Calling it returns a generator iterator (lazy, one value at a time).'),
  (9,  'yield',                  'yield pauses the function, saves its state, and produces a value. Resuming continues after the yield line.'),
  (10, 'generator expression',   '(x * x for x in s) is a lazy generator like a list comp but does not build the whole list in memory.'),
  (11, 'StopIteration',          'Raised when a iterator has no more items. for loops catch this automatically to end the loop.'),
  (12, 'raise',                  'raise Exception("msg") creates and throws an exception, unwinding the stack until a matching except handles it.'),
  (13, 'assert',                 'assert condition, message tests a condition; if false, raises AssertionError with optional message.'),
  (14, 'exception handling flow', 'When an exception is raised, Python skips remaining code in the try block and jumps to the matching except clause.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Object-Oriented Programming
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'oop'
CROSS JOIN (VALUES
  (0,  'class',                  'A class defines a type. Instances are created by calling the class like a function: Account("kusha").'),
  (1,  'instance',               'An instance is a concrete object of a class, with its own attribute values stored in its __dict__.'),
  (2,  'method',                 'A method is a function defined in a class body. The first parameter is conventionally self (the instance).'),
  (3,  'self',                   'self refers to the instance receiving the method call. obj.method(x) binds self to obj.'),
  (4,  '__init__',               'The initializer runs after a new instance is created to set up attributes: def __init__(self, ...).'),
  (5,  'attribute',              'Instance attributes are accessed with dot notation: self.balance = 0 or account.balance.'),
  (6,  'inheritance',            'class Child(Parent): makes Child inherit methods and attributes from Parent unless overridden.'),
  (7,  'method overriding',      'A subclass redefines a method with the same name to change behavior while keeping the interface.'),
  (8,  'super()',                'super() calls a method on the parent class—commonly super().__init__(...) in the child''s __init__.'),
  (9,  'isinstance',             'isinstance(obj, cls) returns True if obj is an instance of cls or a subclass of cls.'),
  (10, '__repr__',               '__repr__ returns a Python-style string for debugging. Called by repr(obj) and in the interactive interpreter.'),
  (11, '__str__',                '__str__ returns a human-readable string. print(obj) uses str(obj), which falls back to __repr__ if missing.'),
  (12, 'class attribute',        'Variables assigned in the class body (not in __init__) are shared by all instances unless shadowed.'),
  (13, 'mutable tree (OOP)',     'A tree implemented as a class can mutate branches in place—e.g. add_branch changes the object without copying.'),
  (14, 'encapsulation',          'Bundling data and behavior in objects and exposing a clear interface hides internal representation details.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Linked Lists & Efficiency
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linked-lists'
CROSS JOIN (VALUES
  (0,  'linked list',            'A linked list is a sequence of Link objects: each holds a value (first) and a reference to the rest of the list.'),
  (1,  'Link class',             'Link(first, rest=empty) constructs a node. empty is typically Link() with no first attribute set.'),
  (2,  'len_link',               'Length of a linked list: 0 if empty, else 1 + len_link(s.rest). Recursive on the rest pointer.'),
  (3,  'linked list indexing',   'get_item_link(s, i): if i==0 return first; else get_item_link(rest, i-1). Linear time in index.'),
  (4,  'linked vs Python list',  'Python lists are array-based (fast index); Link lists require traversal (slow index, cheap prepend).'),
  (5,  'big O notation',         'Big O describes worst-case growth rate as input size n grows. Constants and lower terms are dropped.'),
  (6,  'O(1)',                   'Constant time: runtime does not grow with n (e.g. indexing a Python list by position).'),
  (7,  'O(n)',                   'Linear time: runtime grows proportionally to n (e.g. scanning a list once).'),
  (8,  'O(n²)',                  'Quadratic time: nested loops over n often yield O(n²) (e.g. naive duplicate checking).'),
  (9,  'O(log n)',               'Logarithmic time: halving the problem each step (e.g. balanced binary search on sorted data).'),
  (10, 'dominant term',          'In 3n² + 10n + 5, the dominant term 3n² determines O(n²) for large n.'),
  (11, 'space complexity',       'Space complexity measures extra memory used as a function of input size, not just time.'),
  (12, 'fib memoization idea',   'Caching fib(n) results avoids exponential recomputation—trade memory for time (dynamic programming idea).'),
  (13, 'amortized',              'Some operations average O(1) over many calls even if a single call is expensive (e.g. list append).'),
  (14, 'worst vs average case',  'Big O usually means worst case unless stated otherwise. Average case can be better (e.g. hash table lookup).')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Scheme
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'scheme'
CROSS JOIN (VALUES
  (0,  'Scheme prefix notation', '(operator operand1 operand2 ...) — the operator comes first, then operands.'),
  (1,  'define in Scheme',       '(define name value) binds name to value. (define (f x) body) defines a function.'),
  (2,  'lambda in Scheme',       '(lambda (x) (+ x 1)) creates an anonymous function of one argument x.'),
  (3,  'if in Scheme',           '(if predicate consequent alternative) evaluates predicate; if true, consequent, else alternative.'),
  (4,  'cond',                   '(cond (p1 e1) (p2 e2) ... (else en)) chains conditional clauses like elif.'),
  (5,  'cons',                   '(cons first rest) constructs a pair: the Scheme list building block.'),
  (6,  'car',                    '(car pair) returns the first element of a pair (contents of address register).'),
  (7,  'cdr',                    '(cdr pair) returns the rest of the pair (must be a pair or nil).'),
  (8,  'nil / empty list',       'nil or () is the empty list in Scheme. (cdr of a one-element list is nil).'),
  (9,  'Scheme list literal',    '(list 1 2 3) builds a linked structure equivalent to (cons 1 (cons 2 (cons 3 nil))).'),
  (10, 'map in Scheme',          '(map proc lst) applies proc to each element and returns a new list of results.'),
  (11, 'filter in Scheme',       '(filter pred lst) keeps elements for which pred returns true.'),
  (12, 'reduce in Scheme',       '(reduce proc init lst) folds lst into a single value using proc and initial value init.'),
  (13, 'interpreter components', 'An interpreter evaluates expressions: primitives, special forms (if, define), and calls.'),
  (14, 'tail call',              'A tail call is a call made as the final action of a function—can reuse the current stack frame.'),
  (15, 'tail recursion',         'Tail-recursive functions use tail calls for recursion; Scheme optimizes them to constant stack space.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- SQL & Final Review
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sql-review'
CROSS JOIN (VALUES
  (0,  'SELECT',                 'SELECT columns FROM table retrieves data. * selects all columns.'),
  (1,  'WHERE',                  'WHERE filters rows before they are returned: SELECT * FROM t WHERE score > 90.'),
  (2,  'ORDER BY',               'ORDER BY column sorts results ascending by default; use DESC for descending.'),
  (3,  'LIMIT',                  'LIMIT n returns at most n rows—useful with ORDER BY for top-k queries.'),
  (4,  'DISTINCT',               'SELECT DISTINCT col removes duplicate values from the result column.'),
  (5,  'JOIN',                   'JOIN combines rows from two tables on a matching condition (often foreign key = primary key).'),
  (6,  'INNER JOIN',             'INNER JOIN keeps only rows with matches in both tables.'),
  (7,  'aggregate COUNT',        'COUNT(*) counts rows in a group. COUNT(col) counts non-null values in col.'),
  (8,  'GROUP BY',               'GROUP BY column collapses rows with the same key so aggregates apply per group.'),
  (9,  'HAVING',                 'HAVING filters groups after aggregation (like WHERE but for GROUP BY results).'),
  (10, 'SUM / AVG / MAX / MIN',  'Aggregate functions compute summary statistics over a column or grouped columns.'),
  (11, 'AS (alias)',             'SELECT expr AS name or FROM table AS t renames columns or tables in the result.'),
  (12, 'SQL injection (awareness)', 'Never build SQL by concatenating user strings; use parameterized queries in real apps.'),
  (13, 'exam strategy: diagrams', 'For 61A finals, practice environment diagrams, tree recursion traces, and OOP object diagrams.'),
  (14, 'exam strategy: interpreters', 'Know how eval/apply work at a high level: expressions, special forms, and call mechanics.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs-61a'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- Fix deck card_count if trigger missed bulk historical inserts (idempotent).
UPDATE public.decks d
SET    card_count = sub.cnt, updated_at = NOW()
FROM (
  SELECT deck_id, COUNT(*)::int AS cnt
  FROM   public.cards
  GROUP  BY deck_id
) sub
WHERE d.id = sub.deck_id AND d.slug = 'cs-61a';
