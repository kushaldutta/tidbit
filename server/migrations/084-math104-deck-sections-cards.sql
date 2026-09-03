-- Migration 084: MATH 104 — Introduction to Analysis, new preset deck.
-- Department/catalog (Ross, Elementary Analysis): reals and completeness,
-- sequences, metric/open/closed/compact, series, continuity, uniform
-- continuity, MVT, Riemann integral, uniform convergence and power series.
-- FA26 has many independent lectures. Cards are term (front) / definition
-- (back) for recall.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'math104',
  'MATH 104',
  'Introduction to Analysis — reals, sequences, continuity, and the Riemann integral',
  'uc-berkeley:math104:fa26',
  'system',
  true,
  '🧮',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math104');

DELETE FROM public.tidbits
WHERE category_id = 'math104';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math104');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math104');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('reals',       'The Real Numbers and Completeness',
   'Ordered fields, suprema, Archimedean property', 0),
  ('sequences',   'Sequences and Limits',
   'Epsilon-N limits, algebra of limits, squeeze', 1),
  ('cauchy',      'Monotone Sequences, Cauchy, lim sup',
   'MCT, Cauchy, Bolzano-Weierstrass, lim inf', 2),
  ('topology',    'Open, Closed, Compact, Metric Spaces',
   'Metric, balls, Heine-Borel, sequential compactness', 3),
  ('series',      'Infinite Series',
   'Partial sums, tests, absolute vs conditional', 4),
  ('continuity',  'Continuous Functions and Limits',
   'Epsilon-delta, sequential continuity, discontinuities', 5),
  ('unif-cont',   'Uniform Continuity, EVT, and IVT',
   'Compactness, connectedness, extreme and intermediate values', 6),
  ('derivatives', 'Differentiation and the Mean Value Theorem',
   'Derivative, Rolle, MVT, L''Hospital, Taylor', 7),
  ('integral',    'The Riemann Integral and the FTC',
   'Upper and lower sums, integrability, FTC', 8),
  ('unif-conv',   'Uniform Convergence and Power Series',
   'M-test, interchange of limits, radius of convergence', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math104'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. The Real Numbers and Completeness
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'reals'
CROSS JOIN (VALUES
  (0,  'ordered field',
       'A field with a total order compatible with addition and multiplication: a less than b implies a+c less than b+c, and products of positives are positive. Q and R are ordered fields.'),
  (1,  'natural numbers',
       'The set N = {1, 2, 3, ...} (or including 0, depending on the text). It is well-ordered: every nonempty subset has a least element.'),
  (2,  'rational numbers',
       'The field Q of fractions p/q with p, q integers and q not 0. Q is an ordered field but is not complete.'),
  (3,  'irrational number',
       'A real number that is not rational. sqrt(2) is irrational: if it were p/q in lowest terms, then p^2 = 2 q^2, so p and q would both be even.'),
  (4,  'upper bound',
       'A number M such that x is less than or equal to M for every x in a set S. If S has an upper bound it is bounded above.'),
  (5,  'supremum',
       'The least upper bound of a set S, written sup S. It is an upper bound, and every smaller number fails to be an upper bound.'),
  (6,  'infimum',
       'The greatest lower bound of a set S, written inf S. Equivalently, inf S = -sup(-S).'),
  (7,  'completeness axiom',
       'Every nonempty subset of R that is bounded above has a supremum in R. This is the axiom that distinguishes R from Q.'),
  (8,  'Archimedean property',
       'For every real x there is a natural number n greater than x. Equivalently, inf{1/n : n in N} = 0, so the rationals and integers are unbounded in R.'),
  (9,  'density of the rationals',
       'Between any two reals a less than b there is a rational q. The irrationals are likewise dense in R.'),
  (10, 'maximum',
       'An element of a set that is greater than or equal to every other element. A maximum, if it exists, equals the supremum and belongs to the set; a supremum need not.'),
  (11, 'nested interval property',
       'A nested sequence of nonempty closed bounded intervals has nonempty intersection. If the lengths go to 0, the intersection is a single point.'),
  (12, 'induction',
       'To prove P(n) for every natural number: prove P(1), then prove that P(k) implies P(k+1). Equivalent to well-ordering of N.'),
  (13, 'absolute value',
       'abs(x) equals x if x is at least 0 and -x if x is negative. It satisfies the triangle inequality abs(x+y) less than or equal to abs(x)+abs(y).'),
  (14, 'triangle inequality',
       'abs(x+y) is at most abs(x)+abs(y). The reverse form is abs(abs(x)-abs(y)) at most abs(x-y).')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 2. Sequences and Limits
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sequences'
CROSS JOIN (VALUES
  (0,  'sequence',
       'A function from N to R, written (a_n). The values a_n are the terms.'),
  (1,  'limit of a sequence',
       'L is the limit of (a_n) if for every epsilon greater than 0 there exists N so that n greater than N implies abs(a_n - L) less than epsilon.'),
  (2,  'convergent sequence',
       'A sequence that has a finite limit. A sequence has at most one limit.'),
  (3,  'divergent sequence',
       'A sequence that does not converge to a finite limit. It may be unbounded, oscillate, or tend to plus or minus infinity.'),
  (4,  'bounded sequence',
       'A sequence for which some M satisfies abs(a_n) less than or equal to M for every n. Every convergent sequence is bounded.'),
  (5,  'unbounded sequence',
       'A sequence that is not bounded. An unbounded sequence cannot converge.'),
  (6,  'eventually',
       'A property holds eventually if it holds for all n greater than some N. Convergence is a statement about the tail, not the first terms.'),
  (7,  'algebraic limit theorem',
       'If a_n to A and b_n to B, then a_n + b_n to A+B, a_n b_n to A B, and a_n / b_n to A/B when B is not 0 and the b_n are eventually nonzero.'),
  (8,  'squeeze theorem',
       'If a_n less than or equal to c_n less than or equal to b_n and a_n, b_n both tend to L, then c_n tends to L.'),
  (9,  'diverges to infinity',
       'a_n to infinity means: for every M there exists N so that n greater than N implies a_n greater than M. This is a specific kind of divergence, not a real limit.'),
  (10, 'limit is unique',
       'A sequence cannot converge to two different numbers. If it did, the triangle inequality would force the two candidates to be equal.'),
  (11, 'constant sequence',
       'A sequence with a_n = c for every n. It converges to c. An eventually constant sequence likewise converges.'),
  (12, 'tail of a sequence',
       'The subsequence (a_n) for n greater than N. Two sequences that differ in only finitely many terms have the same convergence behavior.'),
  (13, 'order limit theorem',
       'If a_n to A, b_n to B, and a_n less than or equal to b_n for all large n, then A less than or equal to B. Strict inequalities need not survive the limit.'),
  (14, 'bounded away from zero',
       'A sequence with abs(a_n) at least some delta greater than 0 for all large n. Needed to pass to reciprocals in the algebraic limit theorem.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 3. Monotone Sequences, Cauchy, lim sup
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cauchy'
CROSS JOIN (VALUES
  (0,  'monotone sequence',
       'A sequence that is nondecreasing (a_n less than or equal to a_{n+1}) or nonincreasing. Monotone often includes the weak inequalities.'),
  (1,  'monotone convergence theorem',
       'A monotone sequence converges if and only if it is bounded. A bounded increasing sequence converges to its supremum.'),
  (2,  'Cauchy sequence',
       'A sequence such that for every epsilon greater than 0 there exists N so that m, n greater than N implies abs(a_m - a_n) less than epsilon. The terms become close to each other, not merely to a guessed limit.'),
  (3,  'Cauchy criterion',
       'A real sequence converges if and only if it is Cauchy. This characterizes completeness of R without naming the limit.'),
  (4,  'subsequence',
       'A sequence (a_{n_k}) obtained by choosing a strictly increasing index sequence n_k. Every subsequence of a convergent sequence converges to the same limit.'),
  (5,  'Bolzano-Weierstrass theorem',
       'Every bounded sequence in R has a convergent subsequence. Equivalently, every bounded infinite set of reals has a limit point.'),
  (6,  'subsequential limit',
       'A limit of some subsequence. The set of subsequential limits of a bounded sequence is nonempty, closed, and bounded.'),
  (7,  'lim sup',
       'limsup a_n = inf_n (sup of a_k for k at least n), the largest subsequential limit (allowing plus or minus infinity). The sequence converges to L if and only if limsup = liminf = L.'),
  (8,  'lim inf',
       'liminf a_n = sup_n (inf of a_k for k at least n), the smallest subsequential limit.'),
  (9,  'cluster point of a sequence',
       'A point L such that infinitely many terms lie in every neighborhood of L. Equivalent to L being a subsequential limit.'),
  (10, 'completeness via Cauchy',
       'R is complete: every Cauchy sequence of reals converges to a real. Q is not complete: there are Cauchy sequences of rationals with no rational limit.'),
  (11, 'nested interval theorem',
       'If I_1 contains I_2 contains ... are closed bounded intervals, the intersection is nonempty. If the lengths tend to 0, the intersection is a single point.'),
  (12, 'every subsequence converges',
       'If every subsequence of (a_n) converges (to possibly different limits), then in fact (a_n) itself converges. More useful: if every subsequence has a further subsequence to L, then a_n to L.'),
  (13, 'unbounded monotone sequence',
       'An increasing sequence that is not bounded above diverges to infinity. A decreasing sequence that is not bounded below diverges to minus infinity.'),
  (14, 'Cauchy implies bounded',
       'A Cauchy sequence is bounded: past N the terms lie in a ball of radius 1 about a_N, and the finite initial segment is automatically bounded.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 4. Open, Closed, Compact, Metric Spaces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'topology'
CROSS JOIN (VALUES
  (0,  'metric',
       'A distance function d(x,y) that is nonnegative, symmetric, zero exactly when x = y, and satisfies the triangle inequality d(x,z) at most d(x,y)+d(y,z).'),
  (1,  'metric space',
       'A set X together with a metric d. Examples include R with abs(x-y), R^n with the Euclidean metric, and any subset with the restricted metric.'),
  (2,  'open ball',
       'The set of points at distance strictly less than r from a center a, written B(a,r) = {x : d(x,a) less than r}.'),
  (3,  'open set',
       'A set U such that every point of U is the center of some open ball contained in U. Arbitrary unions and finite intersections of open sets are open.'),
  (4,  'closed set',
       'A set that contains all its limit points, equivalently whose complement is open. Finite unions and arbitrary intersections of closed sets are closed.'),
  (5,  'limit point',
       'A point x such that every open ball about x contains a point of S other than x. Sequences in S can approach x.'),
  (6,  'isolated point',
       'A point of S that is not a limit point: some ball about it meets S only at that point.'),
  (7,  'closure',
       'The set cl(S) obtained by adding all limit points of S. It is the smallest closed set containing S.'),
  (8,  'interior',
       'The largest open set contained in S, equivalently the set of points that have a ball entirely inside S.'),
  (9,  'boundary',
       'The set of points that are in the closure of S and of the complement of S. Equivalently, every ball about a boundary point meets both S and its complement.'),
  (10, 'compact set',
       'A set for which every open cover has a finite subcover. In R^n this is equivalent to closed and bounded, and to sequential compactness.'),
  (11, 'Heine-Borel theorem',
       'A subset of R (or R^n) is compact if and only if it is closed and bounded.'),
  (12, 'open cover',
       'A collection of open sets whose union contains the set of interest. Compactness says some finite subcollection already covers.'),
  (13, 'sequential compactness',
       'Every sequence in the set has a subsequence converging to a point of the set. In metric spaces this is equivalent to compactness.'),
  (14, 'Euclidean metric',
       'On R^n, d(x,y) = sqrt((x_1-y_1)^2 + ... + (x_n-y_n)^2). All the usual norms on R^n give equivalent metrics (the same open sets).')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 5. Infinite Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'series'
CROSS JOIN (VALUES
  (0,  'infinite series',
       'The formal sum a_1 + a_2 + a_3 + .... It converges when the sequence of partial sums converges to a finite limit, called the sum of the series.'),
  (1,  'sequence of partial sums',
       's_n = a_1 + ... + a_n. The series converges exactly when (s_n) converges.'),
  (2,  'geometric series',
       'The series sum r^n. It converges to 1/(1-r) when abs(r) less than 1, and diverges when abs(r) is at least 1 (for the usual indexing from n = 0).'),
  (3,  'harmonic series',
       'The series sum 1/n. It diverges, even though the terms go to 0: the partial sums grow like ln n.'),
  (4,  'p-series',
       'The series sum 1/n^p. It converges if and only if p is greater than 1.'),
  (5,  'term test',
       'If sum a_n converges, then a_n to 0. The converse is false: the harmonic series is the standard counterexample.'),
  (6,  'comparison test',
       'If 0 less than or equal to a_n less than or equal to b_n and sum b_n converges, then sum a_n converges. If sum a_n diverges, so does sum b_n.'),
  (7,  'limit comparison test',
       'If a_n, b_n are positive and a_n / b_n tends to a positive finite limit, then sum a_n and sum b_n both converge or both diverge.'),
  (8,  'ratio test',
       'Let L = lim abs(a_{n+1}/a_n). The series converges absolutely if L less than 1 and diverges if L greater than 1. L = 1 is inconclusive.'),
  (9,  'root test',
       'Let L = lim sup abs(a_n)^{1/n}. The series converges absolutely if L less than 1 and diverges if L greater than 1. L = 1 is inconclusive.'),
  (10, 'alternating series test',
       'If (b_n) is positive, decreasing, and tends to 0, then sum (-1)^{n+1} b_n converges. The error after n terms is at most the next term.'),
  (11, 'absolute convergence',
       'sum abs(a_n) converges. Absolute convergence implies convergence, and the sum is independent of rearrangement.'),
  (12, 'conditional convergence',
       'The series converges but sum abs(a_n) diverges. Rearrangements can change the sum, or even produce divergence (Riemann rearrangement theorem).'),
  (13, 'Cauchy criterion for series',
       'sum a_n converges if and only if for every epsilon greater than 0 there exists N so that n greater than m greater than N implies abs(a_{m+1}+...+a_n) less than epsilon.'),
  (14, 'rearrangement',
       'A series obtained by permuting the terms. If the original series converges absolutely, every rearrangement has the same sum.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 6. Continuous Functions and Limits
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'continuity'
CROSS JOIN (VALUES
  (0,  'limit of a function',
       'lim_{x to a} f(x) = L means: for every epsilon greater than 0 there exists delta greater than 0 so that 0 less than abs(x-a) less than delta implies abs(f(x)-L) less than epsilon. The value f(a) is irrelevant.'),
  (1,  'sequential characterization of a limit',
       'lim_{x to a} f(x) = L if and only if f(x_n) to L for every sequence x_n to a with x_n not equal to a (and x_n in the domain).'),
  (2,  'continuous at a point',
       'f is continuous at a if lim_{x to a} f(x) = f(a). Equivalently: for every epsilon greater than 0 there exists delta greater than 0 so that abs(x-a) less than delta implies abs(f(x)-f(a)) less than epsilon.'),
  (3,  'sequential characterization of continuity',
       'f is continuous at a if and only if x_n to a implies f(x_n) to f(a), for sequences in the domain.'),
  (4,  'continuous function',
       'A function that is continuous at every point of its domain. Polynomials, rationals (on their domain), sin, cos, and exp are continuous.'),
  (5,  'algebra of continuous functions',
       'Sums, products, and quotients (where the denominator is nonzero) of continuous functions are continuous. So is a composition g o f when the ranges match.'),
  (6,  'one-sided limit',
       'The left-hand limit uses only x less than a; the right-hand limit uses only x greater than a. The two-sided limit exists if and only if both one-sided limits exist and agree.'),
  (7,  'removable discontinuity',
       'A point where lim f exists and is finite, but either f(a) is missing or f(a) is not equal to the limit. Redefining f(a) removes the discontinuity.'),
  (8,  'jump discontinuity',
       'A point where the one-sided limits exist and are finite but unequal. Monotone functions have at most jump discontinuities, and only countably many of them.'),
  (9,  'infinite discontinuity',
       'A point where f tends to plus or minus infinity from one side or both, as with 1/x at 0.'),
  (10, 'continuity on a set',
       'f is continuous on S if it is continuous at every point of S, using neighborhoods relative to S when S is not open.'),
  (11, 'epsilon-delta definition',
       'The official definition of limits and continuity: epsilon is the allowed output error, and delta is a sufficiently small input window that enforces it.'),
  (12, 'unbounded on an interval',
       'A function with no bound on (a,b), such as 1/x on (0,1). Continuity on an open interval does not imply boundedness.'),
  (13, 'Thomae''s function',
       'The function that is 1/q at a rational p/q in lowest terms and 0 at irrationals. It is continuous at every irrational and discontinuous at every rational.'),
  (14, 'Dirichlet function',
       'The function that is 1 on the rationals and 0 on the irrationals. It is discontinuous at every point, because rationals and irrationals are dense.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 7. Uniform Continuity, EVT, and IVT
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'unif-cont'
CROSS JOIN (VALUES
  (0,  'uniform continuity',
       'For every epsilon greater than 0 there exists one delta greater than 0 that works at every point: abs(x-y) less than delta implies abs(f(x)-f(y)) less than epsilon. The delta does not depend on the location.'),
  (1,  'continuity vs uniform continuity',
       'Uniform continuity implies continuity. The converse fails on noncompact domains: 1/x is continuous but not uniformly continuous on (0,1), and x^2 fails on R.'),
  (2,  'continuous on a compact set is uniformly continuous',
       'If f is continuous on a compact set K, then f is uniformly continuous on K. In particular this holds on every closed bounded interval.'),
  (3,  'extreme value theorem',
       'A continuous function on a compact set attains its maximum and minimum. On [a,b], there exist c, d with f(c) the global min and f(d) the global max.'),
  (4,  'boundedness theorem',
       'A continuous function on a compact set is bounded. This is the first half of the extreme value theorem; attainment uses sequential compactness or a sup argument.'),
  (5,  'intermediate value theorem',
       'If f is continuous on [a,b] and k lies between f(a) and f(b), then f(c) = k for some c in [a,b]. Continuous images of intervals are intervals.'),
  (6,  'connected set',
       'A set that cannot be written as the union of two nonempty, disjoint, relatively open pieces. In R, the connected sets are exactly the intervals.'),
  (7,  'continuous image of a connected set',
       'If f is continuous and E is connected, then f(E) is connected. This is the general form of the intermediate value theorem.'),
  (8,  'continuous image of a compact set',
       'If f is continuous and K is compact, then f(K) is compact. In R this says f(K) is closed and bounded, which yields the extreme value theorem.'),
  (9,  'preservation of compactness',
       'Compactness is preserved by continuous maps, but not by inverse images: a continuous preimage of a compact set need not be compact.'),
  (10, 'inverse of a continuous bijection',
       'A continuous bijection from a compact space onto a Hausdorff space has a continuous inverse. On R, a continuous strictly monotone function on an interval has a continuous inverse.'),
  (11, 'Lipschitz function',
       'A function satisfying abs(f(x)-f(y)) less than or equal to K abs(x-y) for some constant K. Lipschitz implies uniformly continuous.'),
  (12, 'example not uniformly continuous',
       'f(x) = 1/x on (0,1): points 1/n and 1/(n+1) become arbitrarily close while the function values stay distance 1 apart.'),
  (13, 'fixed-point from IVT',
       'If f : [0,1] to [0,1] is continuous, then f(c) = c for some c, because g(x) = f(x) - x changes sign (or is zero) at the endpoints.'),
  (14, 'uniformly continuous functions extend',
       'A uniformly continuous function on a dense subset of a metric space extends uniquely to a continuous function on the closure. This is how one defines exp or sqrt by completing Q.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 8. Differentiation and the Mean Value Theorem
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'derivatives'
CROSS JOIN (VALUES
  (0,  'derivative',
       'f''(a) = lim_{h to 0} (f(a+h)-f(a))/h, when the limit exists. Equivalently the limit of (f(x)-f(a))/(x-a) as x to a.'),
  (1,  'differentiable implies continuous',
       'If f''(a) exists, then f is continuous at a. The converse is false: abs(x) is continuous everywhere and not differentiable at 0.'),
  (2,  'product rule',
       '(fg)'' = f'' g + f g''. The quotient and chain rules have the usual calculus formulas; the proofs use the definition and algebraic limits.'),
  (3,  'chain rule',
       '(g o f)''(a) = g''(f(a)) f''(a) when the inner and outer derivatives exist.'),
  (4,  'Rolle''s theorem',
       'If f is continuous on [a,b], differentiable on (a,b), and f(a) = f(b), then f''(c) = 0 for some c in (a,b).'),
  (5,  'mean value theorem',
       'If f is continuous on [a,b] and differentiable on (a,b), then f(b)-f(a) = f''(c)(b-a) for some c in (a,b). The graph has a tangent parallel to the chord.'),
  (6,  'Cauchy mean value theorem',
       'If f and g are continuous on [a,b] and differentiable on (a,b), then (f(b)-f(a)) g''(c) = (g(b)-g(a)) f''(c) for some c, provided the derivatives exist.'),
  (7,  'L''Hospital''s rule',
       'If f/g is a 0/0 or infinity/infinity form and f''/g'' has a limit, then f/g has the same limit (under the usual hypotheses that g'' is eventually nonzero).'),
  (8,  'Taylor''s theorem',
       'f(x) = T_n(x) + R_n(x), where T_n is the degree-n Taylor polynomial at a and the Lagrange remainder is f^{(n+1)}(c) (x-a)^{n+1} / (n+1)! for some c between a and x.'),
  (9,  'Taylor polynomial',
       'T_n(x) = sum_{k=0}^n f^{(k)}(a) (x-a)^k / k!, the unique polynomial of degree at most n that matches f and its first n derivatives at a.'),
  (10, 'critical point',
       'A point where f'' is 0 or fails to exist. Interior local extrema of a differentiable function occur at critical points (Fermat''s interior extremum theorem).'),
  (11, 'monotone from the derivative',
       'If f'' is at least 0 on an interval, then f is nondecreasing. If f'' is greater than 0, then f is strictly increasing. The converse needs care at isolated zeros of f''.'),
  (12, 'inverse function derivative',
       'If f is differentiable at a with f''(a) not 0, and f has a continuous inverse near f(a), then (f^{-1})''(f(a)) = 1 / f''(a).'),
  (13, 'Darboux''s theorem',
       'Derivatives have the intermediate value property even when they are discontinuous: if f'' exists on [a,b], then f'' attains every value between f''(a) and f''(b).'),
  (14, 'higher derivative',
       'f^{(n)} is the derivative of f^{(n-1)}. Existence of f^{(n)} on an interval requires f^{(n-1)} to exist on that interval and be differentiable there.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 9. The Riemann Integral and the FTC
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'integral'
CROSS JOIN (VALUES
  (0,  'partition',
       'A finite set a = x_0 less than x_1 less than ... less than x_n = b that chops [a,b] into subintervals. The mesh is the length of the longest subinterval.'),
  (1,  'upper sum',
       'U(f,P) = sum M_i Delta x_i, where M_i is the supremum of f on the ith subinterval of the partition P.'),
  (2,  'lower sum',
       'L(f,P) = sum m_i Delta x_i, where m_i is the infimum of f on the ith subinterval. Always L(f,P) is at most U(f,P).'),
  (3,  'Riemann integrable',
       'A bounded f on [a,b] is Riemann integrable when the supremum of lower sums equals the infimum of upper sums. That common value is the integral of f from a to b.'),
  (4,  'refinement of a partition',
       'A partition Q that contains every point of P. Refining P can only raise the lower sum and lower the upper sum.'),
  (5,  'Riemann criterion',
       'f is Riemann integrable if and only if for every epsilon greater than 0 there is a partition P with U(f,P) - L(f,P) less than epsilon.'),
  (6,  'continuous functions are integrable',
       'A continuous function on [a,b] is Riemann integrable. Uniform continuity makes U - L small once the mesh is small.'),
  (7,  'monotone functions are integrable',
       'A monotone function on [a,b] is Riemann integrable, even if it has jump discontinuities (of which there are at most countably many).'),
  (8,  'discontinuities and integrability',
       'A bounded function on [a,b] is Riemann integrable if and only if its set of discontinuities has measure zero (Lebesgue''s criterion). A single jump is fine; the Dirichlet function is not integrable.'),
  (9,  'additivity of the integral',
       'The integral from a to b plus the integral from b to c equals the integral from a to c. The integral is also linear in f and monotone: f less than or equal to g implies the integrals compare the same way.'),
  (10, 'fundamental theorem of calculus I',
       'If f is integrable on [a,b] and F(x) = integral from a to x of f, then F is continuous on [a,b]. If f is continuous at c, then F''(c) = f(c).'),
  (11, 'fundamental theorem of calculus II',
       'If F'' = f on [a,b] and f is integrable, then the integral of f from a to b equals F(b) - F(a). Antiderivatives compute Riemann integrals.'),
  (12, 'integration by parts',
       'integral u dv = u v - integral v du, obtained by integrating the product rule and applying FTC II.'),
  (13, 'change of variables',
       'If g is continuously differentiable and f is continuous, the integral of (f o g) g'' equals the integral of f along the image, with the usual endpoint substitution.'),
  (14, 'mean value theorem for integrals',
       'If f is continuous on [a,b], then integral_a^b f = f(c)(b-a) for some c in [a,b]. The average value of f is attained.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

-- =====================================================================
-- 10. Uniform Convergence and Power Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'unif-conv'
CROSS JOIN (VALUES
  (0,  'pointwise convergence',
       'f_n to f pointwise on S means f_n(x) to f(x) for each fixed x in S. The rate may depend on x.'),
  (1,  'uniform convergence',
       'f_n to f uniformly on S means sup_{x in S} abs(f_n(x)-f(x)) to 0. One N works for every x at once.'),
  (2,  'Weierstrass M-test',
       'If abs(g_n(x)) is at most M_n for all x in S and sum M_n converges, then sum g_n converges uniformly (and absolutely) on S.'),
  (3,  'uniform limit of continuous functions',
       'If each f_n is continuous on S and f_n to f uniformly, then f is continuous on S. Pointwise limits of continuous functions need not be continuous.'),
  (4,  'interchange of limit and integral',
       'If f_n to f uniformly on [a,b] and each f_n is integrable, then the integrals of f_n tend to the integral of f. Uniformity lets one pass the limit inside.'),
  (5,  'interchange of limit and derivative',
       'If f_n to f pointwise, each f_n is differentiable, and f_n'' converges uniformly, then f is differentiable and f'' equals the uniform limit of f_n''. Pointwise convergence of f_n'' is not enough.'),
  (6,  'power series',
       'A series sum a_n (x-c)^n centered at c. On the interior of its interval of convergence it defines an infinitely differentiable function.'),
  (7,  'radius of convergence',
       'The number R in [0, infinity] such that the series converges when abs(x-c) less than R and diverges when abs(x-c) greater than R. At the endpoints abs(x-c) = R one must test separately.'),
  (8,  'interval of convergence',
       'The set of x for which a power series converges: an interval (c-R, c+R), possibly including one or both endpoints.'),
  (9,  'Cauchy-Hadamard formula',
       '1/R = lim sup abs(a_n)^{1/n}, with the conventions 1/0 = infinity and 1/infinity = 0. The ratio abs(a_n / a_{n+1}) gives R when that limit exists.'),
  (10, 'term-by-term differentiation',
       'Inside the open interval of convergence, a power series may be differentiated term by term. The differentiated series has the same radius of convergence.'),
  (11, 'term-by-term integration',
       'Inside the interval of convergence, a power series may be integrated term by term. The integrated series has the same radius of convergence.'),
  (12, 'Taylor series',
       'The power series sum f^{(n)}(c) (x-c)^n / n!. It may have radius 0, or converge to something other than f (a smooth non-analytic function).'),
  (13, 'analytic function',
       'A function that equals its Taylor series in a neighborhood of every point of its domain. Power series sums are analytic on the interior of the interval of convergence.'),
  (14, 'uniform convergence on compact subintervals',
       'A power series converges uniformly on every compact subset of the open interval of convergence. This justifies integrating and differentiating term by term on those subintervals.')
) AS c(pos, front, back)
WHERE d.slug = 'math104';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math104';
