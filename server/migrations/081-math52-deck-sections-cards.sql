-- Migration 081: MATH 52 — Calculus II (formerly Math 1B), full deck rebuild.
-- Continuation of 51. Department outline (Stewart Single Variable Calculus):
-- Ch 7 Techniques of Integration (skip 7.6), Ch 8.1 Arc Length, Ch 11
-- Infinite Sequences and Series, Ch 9 Differential Equations, Ch 17
-- Second-Order Differential Equations. FA26 lectures: Stankova (LEC 001),
-- Hass (LEC 002). Cards are term (front) / definition (back) for recall.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math52');

DELETE FROM public.tidbits
WHERE category_id = 'math52';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math52');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math52');

UPDATE public.decks
SET title = 'MATH 52',
    description = 'Calculus II — techniques of integration, series, and differential equations',
    cover_emoji = '🧮'
WHERE slug = 'math52';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('parts-trig',        'Integration by Parts and Trig Integrals',
   'Parts, cyclic products, sin/cos and tan/sec integrals', 0),
  ('trigsub-partial',   'Trig Sub and Partial Fractions',
   'Roots of quadratics, rational functions', 1),
  ('approx-improper',   'Approximation, Improper Integrals, Arc Length',
   'Midpoint/Trapezoid/Simpson, Type I/II, arc length', 2),
  ('sequences-series',  'Sequences and Infinite Series',
   'Limits of sequences, geometric and harmonic series', 3),
  ('tests-integral',    'Integral, Comparison, and Alternating Tests',
   'p-series, comparison, Leibniz, absolute vs conditional', 4),
  ('tests-ratio',       'Ratio, Root, and Test Strategy',
   'Ratio and root tests, when each test applies', 5),
  ('power-series',      'Power Series',
   'Radius and interval of convergence, term-by-term calculus', 6),
  ('taylor',            'Taylor and Maclaurin Series',
   'Taylor polynomials, remainder, standard expansions', 7),
  ('first-order',       'First-Order Differential Equations',
   'Separable and linear first-order equations, models', 8),
  ('second-order',      'Second-Order Differential Equations',
   'Constant-coefficient, undetermined coefficients, oscillation', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math52'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Integration by Parts and Trig Integrals
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'parts-trig'
CROSS JOIN (VALUES
  (0,  'integration by parts',
       'The formula integral u dv = u v - integral v du, the inverse of the product rule.'),
  (1,  'choosing u',
       'In integration by parts, pick u so that du is simpler than u, and dv is easy to integrate. A common priority is logs, inverse trig, algebraic, trig, exponential.'),
  (2,  'tabular integration',
       'A bookkeeping method for repeated integration by parts: differentiate one factor in a column, integrate the other, and combine with alternating signs.'),
  (3,  'cyclic integration by parts',
       'When parts returns a multiple of the original integral (typical for e^{ax} sin(bx)), isolate the original integral and solve for it algebraically.'),
  (4,  'definite integration by parts',
       'integral from a to b of u dv = [u v] from a to b minus integral from a to b of v du. Evaluate the boundary term before integrating v du.'),
  (5,  'reduction formula',
       'An identity that expresses an integral of a power in terms of an integral of a lower power, obtained by parts (or a trig identity).'),
  (6,  'odd power of sine or cosine',
       'If the power of sin or cos is odd, peel off one factor to make du, and convert the rest with sin^2 + cos^2 = 1.'),
  (7,  'even powers of sine and cosine',
       'If both powers of sin and cos are even, use half-angle identities: sin^2 x = (1 - cos 2x)/2 and cos^2 x = (1 + cos 2x)/2.'),
  (8,  'half-angle identities',
       'sin^2 theta = (1 - cos 2theta)/2 and cos^2 theta = (1 + cos 2theta)/2. Used to integrate even powers of sine and cosine.'),
  (9,  'tan-sec integrals',
       'For integral tan^n x sec^m x: if m is even, save sec^2 x as du; if n is odd, save sec x tan x as du. Convert leftover factors with 1 + tan^2 = sec^2.'),
  (10, 'integral of sec x',
       'integral sec x dx = ln|sec x + tan x| + C.'),
  (11, 'integral of sec cubed x',
       'integral sec^3 x dx is done by parts (u = sec x, dv = sec^2 x dx) and the identity 1 + tan^2 = sec^2, then solving for the original integral.'),
  (12, 'integral of tan x',
       'integral tan x dx = ln|sec x| + C, or equivalently -ln|cos x| + C.'),
  (13, 'product-to-sum identities',
       'Identities such as sin A cos B = [sin(A+B) + sin(A-B)] / 2, used to integrate products of sines and cosines of different arguments.'),
  (14, 'parts on a definite log integral',
       'For integral ln x dx, take u = ln x and dv = dx, so the antiderivative is x ln x - x + C.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 2. Trig Sub and Partial Fractions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'trigsub-partial'
CROSS JOIN (VALUES
  (0,  'trigonometric substitution',
       'A substitution that removes a square root of a quadratic by matching a Pythagorean identity, then converting back with a reference triangle.'),
  (1,  'sqrt(a^2 - x^2) substitution',
       'Set x = a sin theta (or a cos theta), so a^2 - x^2 becomes a^2 cos^2 theta. Use a right triangle with opposite x and hypotenuse a.'),
  (2,  'sqrt(a^2 + x^2) substitution',
       'Set x = a tan theta, so a^2 + x^2 becomes a^2 sec^2 theta. The triangle has opposite x and adjacent a.'),
  (3,  'sqrt(x^2 - a^2) substitution',
       'Set x = a sec theta, so x^2 - a^2 becomes a^2 tan^2 theta. The triangle has hypotenuse x and adjacent a.'),
  (4,  'reference triangle',
       'The right triangle that records the trig substitution, used to rewrite sin, cos, or tan of theta back in terms of x after integrating.'),
  (5,  'completing the square',
       'Rewrite ax^2 + bx + c as a(x - h)^2 + k so a remaining square root or quadratic denominator matches a trig-sub or arctan form.'),
  (6,  'partial fractions',
       'Decompose a proper rational function into a sum of simpler rational pieces (linear and irreducible quadratic denominators) that can be integrated term by term.'),
  (7,  'distinct linear factors',
       'If the denominator factors as (x - a)(x - b) with a not equal to b, write A/(x - a) + B/(x - b) and solve for A and B.'),
  (8,  'repeated linear factors',
       'A factor (x - a)^k in the denominator contributes terms A1/(x - a) + A2/(x - a)^2 + ... + Ak/(x - a)^k.'),
  (9,  'irreducible quadratic factor',
       'A quadratic factor that does not factor over the reals contributes a term (Bx + C) / (x^2 + p x + q). The linear-over-quadratic piece integrates to a log plus an arctan after completing the square.'),
  (10, 'improper rational function',
       'A rational function whose numerator degree is at least the denominator degree. Divide first (polynomial long division); partial fractions apply only to the proper remainder.'),
  (11, 'polynomial long division',
       'The algebra that writes p(x)/q(x) as a polynomial plus a proper rational remainder, the first step for an improper rational integrand.'),
  (12, 'cover-up method',
       'For distinct linear factors, the coefficient of 1/(x - a) is the rest of the rational function evaluated at x = a after removing the (x - a) factor.'),
  (13, 'arctan from a quadratic denominator',
       'After completing the square, integral 1 / (u^2 + a^2) du = (1/a) arctan(u/a) + C.'),
  (14, 'log from a linear factor',
       'integral 1/(x - a) dx = ln|x - a| + C. This is the basic piece produced by a simple linear factor in a partial-fraction decomposition.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 3. Approximation, Improper Integrals, Arc Length
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'approx-improper'
CROSS JOIN (VALUES
  (0,  'strategy for integration',
       'A checklist: simplify, look for a substitution, then parts, trig integrals, trig sub, or partial fractions, in that rough order.'),
  (1,  'Midpoint rule',
       'Approximate integral_a^b f(x) dx by Sum f(midpoint of each subinterval) Delta x. Uses the value at the center of each strip.'),
  (2,  'Trapezoidal rule',
       'Approximate the integral by trapezoids: (Delta x / 2) [y0 + 2 y1 + ... + 2 y_{n-1} + yn]. Equivalent to averaging left and right Riemann sums.'),
  (3,  'Simpson''s rule',
       'Approximate the integral with parabolas on pairs of subintervals: (Delta x / 3) [y0 + 4 y1 + 2 y2 + 4 y3 + ... + yn], requiring n even.'),
  (4,  'error bound',
       'An upper estimate on |E| for a numerical rule, typically in terms of a bound on |f''''| (trapezoid/midpoint) or |f^{(4)}| (Simpson) and the interval length and n.'),
  (5,  'improper integral',
       'A definite integral over an infinite interval, or of a function that becomes unbounded on the interval. Defined as a limit of ordinary definite integrals.'),
  (6,  'Type I improper integral',
       'An integral over an infinite interval, such as integral from a to infinity of f(x) dx = lim b->infinity of integral_a^b f.'),
  (7,  'Type II improper integral',
       'An integral whose integrand becomes unbounded at a point in the interval. Split at the singularity and take one-sided limits.'),
  (8,  'convergent improper integral',
       'An improper integral whose defining limit exists and is finite.'),
  (9,  'divergent improper integral',
       'An improper integral whose defining limit is infinite or fails to exist.'),
  (10, 'p-integral',
       'integral from 1 to infinity of 1/x^p dx converges iff p is greater than 1. Near 0, integral from 0 to 1 of 1/x^p dx converges iff p is less than 1.'),
  (11, 'comparison test for improper integrals',
       'If 0 is less than or equal to f(x) is less than or equal to g(x) for large x, then convergence of integral g implies convergence of integral f, and divergence of integral f implies divergence of integral g.'),
  (12, 'limit comparison for integrals',
       'If f and g are positive and lim f/g is a positive finite number, then integral f and integral g either both converge or both diverge.'),
  (13, 'arc length',
       'The length of the graph of a smooth y = f(x) from x = a to x = b is integral_a^b sqrt(1 + [f''(x)]^2) dx.'),
  (14, 'arc length differential',
       'ds = sqrt(1 + (dy/dx)^2) dx, or sqrt(1 + (dx/dy)^2) dy if x is the function of y. Arc length is the integral of ds.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 4. Sequences and Infinite Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sequences-series'
CROSS JOIN (VALUES
  (0,  'sequence',
       'A function whose domain is the positive integers; written a1, a2, a3, ... or (a_n).'),
  (1,  'limit of a sequence',
       'lim n->infinity a_n = L means a_n can be made arbitrarily close to L by taking n sufficiently large.'),
  (2,  'convergent sequence',
       'A sequence that has a finite limit. Otherwise the sequence diverges.'),
  (3,  'divergent sequence',
       'A sequence that does not approach a finite limit (it may go to infinity or oscillate).'),
  (4,  'monotonic sequence',
       'A sequence that is either nondecreasing (a_{n+1} greater than or equal to a_n for all n) or nonincreasing.'),
  (5,  'bounded sequence',
       'A sequence for which some M satisfies |a_n| less than or equal to M for every n.'),
  (6,  'monotone convergence theorem',
       'A monotonic sequence converges iff it is bounded. A bounded increasing sequence converges to its least upper bound.'),
  (7,  'infinite series',
       'An expression Sum_{n=1}^infinity a_n, defined as the limit of its sequence of partial sums (when that limit exists).'),
  (8,  'partial sum',
       's_N = a1 + a2 + ... + a_N, the sum of the first N terms. The series converges to s if s_N -> s.'),
  (9,  'sum of a series',
       'The limit of the partial sums, when it exists. Writing Sum a_n = s means s_N approaches s.'),
  (10, 'geometric series',
       'Sum ar^{n} (from n = 0) equals a / (1 - r) when |r| is less than 1, and diverges when |r| is greater than or equal to 1 (unless a = 0).'),
  (11, 'harmonic series',
       'Sum 1/n from n = 1 to infinity. It diverges (partial sums grow like ln n), even though the terms go to 0.'),
  (12, 'telescoping series',
       'A series whose partial sums cancel in pairs, typically after a partial-fraction split such as 1/(n(n+1)) = 1/n - 1/(n+1).'),
  (13, 'divergence test',
       'If lim a_n is not 0 (or fails to exist), then Sum a_n diverges. The converse is false: a_n -> 0 does not imply convergence.'),
  (14, 'necessary condition for convergence',
       'If Sum a_n converges, then a_n must tend to 0. This is used only to detect divergence, never to prove convergence.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 5. Integral, Comparison, and Alternating Tests
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'tests-integral'
CROSS JOIN (VALUES
  (0,  'integral test',
       'If f is positive, continuous, and eventually decreasing, then Sum f(n) and integral_1^infinity f(x) dx either both converge or both diverge.'),
  (1,  'integral test remainder',
       'If the hypotheses of the integral test hold and s is the sum, the tail after s_N satisfies integral_{N+1}^infinity f(x) dx less than or equal to the remainder less than or equal to integral_N^infinity f(x) dx.'),
  (2,  'p-series',
       'Sum 1/n^p converges iff p is greater than 1. The case p = 1 is the harmonic series.'),
  (3,  'comparison test',
       'For 0 less than or equal to a_n less than or equal to b_n: if Sum b_n converges then Sum a_n converges; if Sum a_n diverges then Sum b_n diverges.'),
  (4,  'limit comparison test',
       'If a_n and b_n are positive and lim a_n / b_n is a positive finite number, then Sum a_n and Sum b_n both converge or both diverge.'),
  (5,  'alternating series',
       'A series whose terms alternate in sign, typically written Sum (-1)^{n-1} b_n with b_n greater than 0.'),
  (6,  'alternating series test',
       'If b_n is positive, decreasing, and tends to 0, then Sum (-1)^{n-1} b_n converges. Also called the Leibniz test.'),
  (7,  'alternating series remainder',
       'If the alternating series test applies, the error after N terms is at most the next term b_{N+1}, and has the same sign as that next term.'),
  (8,  'absolute convergence',
       'Sum a_n converges absolutely if Sum |a_n| converges. Absolute convergence implies convergence.'),
  (9,  'conditional convergence',
       'Sum a_n converges, but Sum |a_n| diverges. The alternating harmonic series is the standard example.'),
  (10, 'alternating harmonic series',
       'Sum (-1)^{n-1} / n. It converges (alternating series test) but not absolutely (harmonic series), so it is conditionally convergent.'),
  (11, 'when the integral test applies',
       'f obtained by replacing n with x must be eventually positive, continuous, and decreasing. The test does not give the sum, only convergence.'),
  (12, 'limit comparison with a p-series',
       'For a rational-like term, compare with 1/n^p by looking at the degree difference of the denominator and numerator in n.'),
  (13, 'harmonic vs p-series',
       'Sum 1/n diverges; Sum 1/n^2 converges. The exponent p = 1 is the boundary for p-series.'),
  (14, 'rearrangement',
       'A conditionally convergent series can be rearranged to sum to a different number (or to diverge). An absolutely convergent series may be rearranged freely.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 6. Ratio, Root, and Test Strategy
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'tests-ratio'
CROSS JOIN (VALUES
  (0,  'ratio test',
       'Let L = lim |a_{n+1} / a_n|. If L is less than 1 the series converges absolutely; if L is greater than 1 (or infinite) it diverges; if L = 1 the test is inconclusive.'),
  (1,  'root test',
       'Let L = lim ( |a_n| )^{1/n}. If L is less than 1 the series converges absolutely; if L is greater than 1 it diverges; if L = 1 the test is inconclusive.'),
  (2,  'ratio test inconclusive',
       'L = 1 gives no information. p-series and the harmonic series all have ratio-test limit 1, so use another test.'),
  (3,  'root test inconclusive',
       'The same boundary L = 1 as the ratio test. Try a comparison, integral, or alternating test instead.'),
  (4,  'absolute convergence via ratio',
       'The ratio and root tests, when they conclude convergence, conclude absolute convergence: they control Sum |a_n|.'),
  (5,  'factorials in a series',
       'Terms with n! are natural candidates for the ratio test, because (n+1)! / n! = n+1 simplifies the limit.'),
  (6,  'exponential factors in a series',
       'Terms with a^n are natural for the ratio or root test. The root test sends ( |c|^n )^{1/n} to |c|.'),
  (7,  'n^n in a series',
       'Terms involving n^n often suit the root test, since (n^n)^{1/n} = n.'),
  (8,  'strategy for testing series',
       'Check the divergence test first. Identify geometric or p-series. Try alternating, comparison, or integral next. Use ratio or root when factorials or exponentials appear.'),
  (9,  'divergence test first',
       'Before any finer test, check whether a_n -> 0. If not, the series diverges and you are done.'),
  (10, 'geometric series identification',
       'A series is geometric if the ratio of consecutive terms is a constant r. Then use |r| less than 1 for convergence, and the closed form for the sum.'),
  (11, 'p-series identification',
       'A series of the form constant over n to a fixed power. Convergence is decided by whether that power is greater than 1.'),
  (12, 'combining tests',
       'You may need a limit comparison to reach a p-series or geometric series after algebraically simplifying a_n.'),
  (13, 'absolute vs conditional checklist',
       'First test Sum |a_n|. If it converges, the original series converges absolutely. If it diverges, test the signed series (often alternating) for possible conditional convergence.'),
  (14, 'root vs ratio',
       'The two tests have the same conclusions and the same inconclusive case. Prefer ratio when neighboring terms have a simple quotient; prefer root when a_n is already an nth power.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 7. Power Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'power-series'
CROSS JOIN (VALUES
  (0,  'power series',
       'A series of the form Sum c_n (x - a)^n, a series of powers of (x - a). It defines a function of x on its interval of convergence.'),
  (1,  'center of a power series',
       'The number a in Sum c_n (x - a)^n. The series is expanded about x = a.'),
  (2,  'radius of convergence',
       'The number R (0, finite, or infinity) such that the series converges for |x - a| less than R and diverges for |x - a| greater than R.'),
  (3,  'interval of convergence',
       'The set of x for which the power series converges: (a - R, a + R), possibly including either endpoint, both, or neither. Endpoints must be checked separately.'),
  (4,  'ratio test for radius',
       'If L = lim |c_{n+1} / c_n| exists, then R = 1/L (with the conventions 1/0 = infinity and 1/infinity = 0). Equivalently solve lim |a_{n+1}/a_n| less than 1 for |x - a|.'),
  (5,  'endpoint check',
       'After finding R, plug x = a - R and x = a + R into the series and test those numerical series (often alternating, p-series, or harmonic).'),
  (6,  'differentiation of a power series',
       'Inside the open interval of convergence, the series may be differentiated term by term. The radius stays R; endpoints must be rechecked.'),
  (7,  'integration of a power series',
       'Inside the open interval of convergence, the series may be integrated term by term. The radius stays R; endpoints must be rechecked.'),
  (8,  'geometric power series',
       '1 / (1 - x) = Sum x^n for |x| less than 1, the generating example for representing functions as power series.'),
  (9,  'representing a function as a power series',
       'Rewrite the function by algebra so it matches a known series (often geometric), then substitute, differentiate, or integrate.'),
  (10, 'substituting into a geometric series',
       'Replace x by an expression g(x) in Sum x^n to get 1/(1 - g(x)) = Sum [g(x)]^n, valid when |g(x)| is less than 1.'),
  (11, 'uniqueness of power series',
       'If a function equals a power series about a on an interval, the coefficients are uniquely determined (they match the Taylor coefficients).'),
  (12, 'term-by-term operations',
       'Addition, multiplication by a constant, differentiation, and integration of power series, valid inside the common open interval of convergence.'),
  (13, 'expansion of 1/(1+x)',
       '1/(1+x) = Sum (-1)^n x^n for |x| less than 1, the geometric series with x replaced by -x.'),
  (14, 'open interval of a power series',
       'The series always converges (absolutely) on (a - R, a + R) when R is positive. Behavior at the two endpoints is independent and must be tested.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 8. Taylor and Maclaurin Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'taylor'
CROSS JOIN (VALUES
  (0,  'Taylor series',
       'The series Sum f^{(n)}(a) / n! * (x - a)^n, formed from the derivatives of f at a. When it converges to f(x), it is the Taylor expansion of f about a.'),
  (1,  'Maclaurin series',
       'A Taylor series centered at 0: Sum f^{(n)}(0) / n! * x^n.'),
  (2,  'Taylor polynomial',
       'The nth-degree polynomial T_n(x) obtained by truncating the Taylor series after the (x - a)^n term. It matches f and its first n derivatives at a.'),
  (3,  'Lagrange remainder',
       'f(x) - T_n(x) = f^{(n+1)}(c) / (n+1)! * (x - a)^{n+1} for some c between x and a. Also called Taylor''s remainder in Lagrange form.'),
  (4,  'Taylor''s inequality',
       'If |f^{(n+1)}(z)| is less than or equal to M on an interval about a, then |R_n(x)| is less than or equal to M |x - a|^{n+1} / (n+1)!. Used to prove a series equals f, or to bound approximation error.'),
  (5,  'Maclaurin series for e^x',
       'e^x = Sum x^n / n! for all real x.'),
  (6,  'Maclaurin series for sin x',
       'sin x = x - x^3/3! + x^5/5! - x^7/7! + ... for all real x.'),
  (7,  'Maclaurin series for cos x',
       'cos x = 1 - x^2/2! + x^4/4! - x^6/6! + ... for all real x.'),
  (8,  'Maclaurin series for 1/(1-x)',
       '1/(1-x) = Sum x^n for |x| less than 1, which is both geometric and the Maclaurin series of that function.'),
  (9,  'binomial series',
       '(1 + x)^k = Sum C(k,n) x^n for |x| less than 1, where C(k,n) = k(k-1)...(k-n+1)/n!. Valid for any real k.'),
  (10, 'using a known series',
       'To expand a related function, start from e^x, sin x, cos x, or 1/(1-x) and substitute, multiply, differentiate, or integrate rather than computing every derivative from scratch.'),
  (11, 'multiplying Taylor series',
       'The product of two series is obtained by collecting like powers of (x - a), valid inside the common open interval of convergence.'),
  (12, 'composing Taylor series',
       'Substitute one series into another when the inner series stays inside the outer series'' interval of convergence (for example sin(x^2) from the sine series).'),
  (13, 'order of a Taylor polynomial',
       'The degree n of T_n. The error is controlled by the next derivative and (x - a)^{n+1}.'),
  (14, 'approximating with a Taylor polynomial',
       'Replace f(x) by T_n(x) on an interval about a, and bound the error with Taylor''s inequality or the Lagrange remainder.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 9. First-Order Differential Equations
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'first-order'
CROSS JOIN (VALUES
  (0,  'differential equation',
       'An equation involving an unknown function and its derivatives. A solution is a function that satisfies the equation on an interval.'),
  (1,  'order of a differential equation',
       'The order of the highest derivative that appears. y'' = y is first-order; y'''' + y = 0 is second-order.'),
  (2,  'initial-value problem',
       'A differential equation together with a specified value of the unknown (and enough derivatives) at one point, used to lock down constants.'),
  (3,  'general solution',
       'A family of solutions containing arbitrary constants, equal in number to the order of the equation (under the usual existence hypotheses).'),
  (4,  'particular solution',
       'One solution obtained by assigning values to the arbitrary constants, often to satisfy initial conditions.'),
  (5,  'direction field',
       'A plot of short line segments with slope f(x,y) at sample points, picturing solutions of y'' = f(x,y) without solving the equation.'),
  (6,  'Euler''s method',
       'A numerical approximation to an IVP y'' = f(x,y), y(x0) = y0: step x by h and update y by y + h f(x,y). The graph is a polygonal path.'),
  (7,  'separable equation',
       'A first-order equation that can be written dy/dx = g(x) h(y). Rewrite as dy/h(y) = g(x) dx and integrate both sides.'),
  (8,  'exponential growth',
       'The model y'' = k y with k greater than 0. Solutions are y = y0 e^{kt}.'),
  (9,  'exponential decay',
       'The model y'' = k y with k less than 0 (or y'' = -lambda y with lambda greater than 0). Solutions decay exponentially to 0.'),
  (10, 'logistic equation',
       'y'' = k y (1 - y/M). Solutions level off at the carrying capacity M instead of growing without bound.'),
  (11, 'carrying capacity',
       'The equilibrium population M in the logistic model: y approaches M as t goes to infinity if 0 less than y0 less than M.'),
  (12, 'first-order linear equation',
       'An equation y'' + P(x) y = Q(x). Solved by multiplying through by an integrating factor.'),
  (13, 'integrating factor',
       'For y'' + P y = Q, the factor mu(x) = e^{integral P dx}. Multiplying through makes the left side (mu y)''.'),
  (14, 'mixing problem',
       'A tank model leading to a first-order linear equation: rate of change of salt equals rate in minus rate out, with concentration = amount / volume.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

-- =====================================================================
-- 10. Second-Order Differential Equations
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'second-order'
CROSS JOIN (VALUES
  (0,  'second-order linear equation',
       'An equation y'''' + p(x) y'' + q(x) y = g(x). It is homogeneous if g = 0 and nonhomogeneous otherwise.'),
  (1,  'homogeneous equation',
       'The equation y'''' + p y'' + q y = 0. The zero function is always a solution, and sums and constant multiples of solutions are solutions.'),
  (2,  'characteristic equation',
       'For y'''' + a y'' + b y = 0 with constant coefficients, the quadratic r^2 + a r + b = 0. Its roots determine the form of the general solution.'),
  (3,  'distinct real roots',
       'If the characteristic equation has roots r1 not equal to r2, the general solution is y = C1 e^{r1 x} + C2 e^{r2 x}.'),
  (4,  'repeated real root',
       'If the characteristic equation has a double root r, the general solution is y = (C1 + C2 x) e^{r x}.'),
  (5,  'complex roots',
       'If the characteristic roots are alpha plus or minus i beta, the general real solution is y = e^{alpha x} (C1 cos(beta x) + C2 sin(beta x)).'),
  (6,  'superposition principle',
       'If y1 and y2 solve a linear homogeneous equation, so does C1 y1 + C2 y2. For a nonhomogeneous equation, the general solution is y_h + y_p.'),
  (7,  'Wronskian',
       'W(y1, y2) = y1 y2'' - y2 y1''. Two solutions of a second-order linear homogeneous equation form a fundamental set on an interval if W is not 0 there.'),
  (8,  'undetermined coefficients',
       'A method for finding a particular solution when g(x) is a polynomial, exponential, sine, cosine, or a product of these: guess a matching form and solve for the coefficients. Multiply by x or x^2 if the guess already solves the homogeneous equation.'),
  (9,  'variation of parameters',
       'A method that produces a particular solution y = u1 y1 + u2 y2 from a fundamental set, by solving a linear system for u1'' and u2''. It applies to a general continuous g(x).'),
  (10, 'simple harmonic motion',
       'The equation y'''' + omega^2 y = 0. Solutions are sinusoids with angular frequency omega: y = C1 cos(omega t) + C2 sin(omega t).'),
  (11, 'damping',
       'A first-derivative term c y'' in a spring-mass equation that dissipates energy. The sign of the discriminant of the characteristic equation classifies the decay.'),
  (12, 'overdamped',
       'Two distinct negative real characteristic roots: the mass returns to equilibrium without oscillating.'),
  (13, 'underdamped',
       'Complex characteristic roots with negative real part: the mass oscillates with amplitude decaying like e^{alpha t}.'),
  (14, 'series solution of a DE',
       'Assume y = Sum c_n (x - a)^n, substitute into the differential equation, and solve the recurrence for the coefficients. Used when constant-coefficient methods do not apply.')
) AS c(pos, front, back)
WHERE d.slug = 'math52';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math52';
