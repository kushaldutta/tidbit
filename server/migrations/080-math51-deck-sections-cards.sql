-- Migration 080: MATH 51 — Calculus I (formerly Math 1A), full deck rebuild.
-- UC Berkeley Fall 2026: Alexander Paulin. Stewart, Single Variable
-- Calculus: Early Transcendentals, 9th ed. Lectures 00-25: functions
-- (1.1-1.5), limits (2.1-2.3, 2.5-2.6), derivative (2.7-2.8), rules
-- (3.1-3.6), applications (4.1-4.5, 4.7, 4.9), integrals (5.1-5.5),
-- area and volume (6.1-6.2). Cards are term (front) / definition (back)
-- for recall: student sees the definition and types the term.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math51');

DELETE FROM public.tidbits
WHERE category_id = 'math51';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math51');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math51');

UPDATE public.decks
SET title = 'MATH 51',
    description = 'Calculus I — functions, limits, derivatives, and the FTC',
    cover_emoji = '🧮'
WHERE slug = 'math51';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('foundations',     'Functions',
   'Domain, range, composition, transformations', 0),
  ('families',        'Elementary Functions and Inverses',
   'Polynomials, exp, trig, inverse functions', 1),
  ('limits',          'Limits and Continuity',
   'Secants, limit laws, squeeze theorem, IVT', 2),
  ('infinity-deriv',  'Infinity and the Derivative',
   'Asymptotes and the definition of the derivative', 3),
  ('rules',           'Differentiation Rules',
   'Power, exp, trig, product, quotient, chain', 4),
  ('implicit-extrema','Implicit Differentiation and Extrema',
   'Implicit, inverse derivatives, closed interval method', 5),
  ('shape',           'MVT, L''Hospital, and Graph Shape',
   'Rolle, MVT, L''Hospital, first and second derivative tests', 6),
  ('optimize',        'Sketching, Optimization, and Antiderivatives',
   'Curve sketching, max-min, undoing a derivative', 7),
  ('integrals',       'Integrals and the Fundamental Theorem',
   'Riemann sums, definite integrals, FTC, substitution', 8),
  ('volume',          'Area Between Curves and Volume',
   'Area between curves, disks, washers, slicing', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math51'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Functions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'foundations'
CROSS JOIN (VALUES
  (0,  'function',
       'A rule that assigns to each input in a domain exactly one output.'),
  (1,  'domain',
       'The set of allowable inputs of a function.'),
  (2,  'range',
       'The set of output values a function actually attains.'),
  (3,  'piecewise function',
       'A function defined by different formulas on different parts of its domain.'),
  (4,  'even function',
       'A function satisfying f(-x) = f(x) for every x in the domain; its graph is symmetric across the y-axis.'),
  (5,  'odd function',
       'A function satisfying f(-x) = -f(x) for every x in the domain; its graph is symmetric under a 180 degree rotation about the origin.'),
  (6,  'composition',
       '(f o g)(x) = f(g(x)): apply g first, then f. The domain is those x in the domain of g for which g(x) lies in the domain of f.'),
  (7,  'vertical shift',
       'Replacing y = f(x) by y = f(x) + k moves the graph up by k if k is positive, down if k is negative.'),
  (8,  'horizontal shift',
       'Replacing y = f(x) by y = f(x - h) moves the graph right by h if h is positive, left if h is negative.'),
  (9,  'one-to-one function',
       'A function for which f(x1) = f(x2) forces x1 = x2. Only one-to-one functions have inverses that are themselves functions.'),
  (10, 'vertical line test',
       'A graph in the plane is the graph of a function of x iff no vertical line meets it more than once.'),
  (11, 'horizontal line test',
       'A function is one-to-one iff no horizontal line meets its graph more than once.'),
  (12, 'implies',
       'P implies Q means: whenever P is true, Q must be true. The converse (Q implies P) is a separate claim.'),
  (13, 'if and only if',
       'P iff Q means both P implies Q and Q implies P. Definitions are written this way.'),
  (14, 'graph of a function',
       'The set of points (x, f(x)) for every x in the domain.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 2. Elementary Functions and Inverses
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'families'
CROSS JOIN (VALUES
  (0,  'polynomial',
       'A function of the form a_n x^n + ... + a_1 x + a_0. The domain is all real numbers.'),
  (1,  'power function',
       'A function of the form x^p. The variable is the base; the exponent is constant.'),
  (2,  'exponential function',
       'A function of the form a^x with a greater than 0 and a not equal to 1. The variable is the exponent.'),
  (3,  'logarithm',
       'The inverse of an exponential: y = log_a(x) means a^y = x. The domain is x greater than 0.'),
  (4,  'natural logarithm',
       'The logarithm with base e, written ln x. It is the inverse of e^x.'),
  (5,  'change of base formula',
       'log_a(x) = ln x / ln a (or log_b(x) / log_b(a) for any valid base b).'),
  (6,  'inverse function',
       'If f is one-to-one, f inverse is the function satisfying f(f inverse(x)) = x and f inverse(f(x)) = x on the appropriate domains. Its graph is the reflection of the graph of f across y = x.'),
  (7,  'arcsin',
       'The inverse of sine, with domain [-1, 1] and range [-pi/2, pi/2].'),
  (8,  'arctan',
       'The inverse of tangent, with domain all reals and range (-pi/2, pi/2).'),
  (9,  'arccos',
       'The inverse of cosine, with domain [-1, 1] and range [0, pi].'),
  (10, 'period of sine',
       'The smallest positive number p such that sin(x + p) = sin x for all x; here p = 2pi. Cosine has the same period.'),
  (11, 'Pythagorean identity',
       'sin^2 theta + cos^2 theta = 1 for every real theta.'),
  (12, 'radian',
       'The angle measure used in calculus: an angle of 1 radian intercepts an arc of length 1 on the unit circle. Derivatives of trig functions assume radians.'),
  (13, 'algebraic inverse',
       'To find f inverse, set y = f(x), solve for x in terms of y, then swap names. The original domain must be restricted first if f is not one-to-one.'),
  (14, 'laws of logarithms',
       'log(xy) = log x + log y, log(x/y) = log x - log y, and log(x^r) = r log x, on the natural domains.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 3. Limits and Continuity
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'limits'
CROSS JOIN (VALUES
  (0,  'limit',
       'lim x->a f(x) = L means f(x) can be made arbitrarily close to L by taking x sufficiently close to a, except possibly at a itself.'),
  (1,  'one-sided limit',
       'The left-hand limit uses only x less than a; the right-hand limit uses only x greater than a.'),
  (2,  'two-sided limit',
       'The two-sided limit at a exists iff both one-sided limits exist, are finite, and are equal.'),
  (3,  'infinite limit',
       'f(x) tends to infinity as x approaches a means f grows without bound. This describes a blow-up; it is not a finite limit.'),
  (4,  'limit laws',
       'The limit of a sum, product, or quotient is the sum, product, or quotient of the limits, provided the individual limits exist and (for a quotient) the denominator limit is not 0.'),
  (5,  'squeeze theorem',
       'If g(x) is less than or equal to f(x) is less than or equal to h(x) near a, and lim g = lim h = L, then lim f = L.'),
  (6,  'continuity at a point',
       'f is continuous at a if lim x->a f(x) = f(a). That requires f(a) to exist, the limit to exist, and the two to match.'),
  (7,  'removable discontinuity',
       'A discontinuity at a where the limit exists but f(a) is missing or does not equal the limit. Redefining f(a) can make f continuous there.'),
  (8,  'jump discontinuity',
       'A discontinuity where the left- and right-hand limits exist, are finite, and are unequal.'),
  (9,  'infinite discontinuity',
       'A discontinuity where f blows up (an infinite limit) as x approaches a from one side or both.'),
  (10, 'Intermediate Value Theorem',
       'If f is continuous on [a,b] and N lies between f(a) and f(b), then some c in (a,b) satisfies f(c) = N.'),
  (11, 'secant line',
       'The line through two points (a, f(a)) and (a+h, f(a+h)) on a graph. Its slope is the difference quotient [f(a+h) - f(a)] / h.'),
  (12, 'tangent line',
       'The line through (a, f(a)) whose slope is the limit of secant slopes as h approaches 0, when that limit exists.'),
  (13, 'instantaneous velocity',
       'The limit of average velocity [s(t+h) - s(t)] / h as h approaches 0; the derivative of position.'),
  (14, 'difference quotient',
       '[f(a+h) - f(a)] / h. The slope of a secant, and the expression whose limit as h approaches 0 is f''(a).')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 4. Infinity and the Derivative
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'infinity-deriv'
CROSS JOIN (VALUES
  (0,  'limit at infinity',
       'lim x->infinity f(x) = L means f(x) approaches L as x becomes arbitrarily large.'),
  (1,  'horizontal asymptote',
       'The line y = L is a horizontal asymptote of f if lim x->infinity f(x) = L or lim x->-infinity f(x) = L.'),
  (2,  'vertical asymptote',
       'The line x = a is a vertical asymptote if f(x) tends to plus or minus infinity as x approaches a from one side or both.'),
  (3,  'end behavior of a rational function',
       'For large |x|, a rational function behaves like the ratio of leading terms. If the denominator degree is larger, the limit is 0; if the degrees match, the limit is the ratio of leading coefficients; if the numerator degree is larger, the magnitude tends to infinity.'),
  (4,  'derivative at a point',
       'f''(a) = lim h->0 [f(a+h) - f(a)] / h, when the limit exists. Equivalently lim x->a [f(x) - f(a)] / (x - a).'),
  (5,  'derivative function',
       'The function f'' whose value at each x is the derivative of f at x. Its domain may be smaller than the domain of f.'),
  (6,  'differentiable',
       'f is differentiable at a if f''(a) exists (the two-sided difference-quotient limit exists and is finite).'),
  (7,  'differentiability implies continuity',
       'If f''(a) exists, then f is continuous at a. The converse is false: abs(x) is continuous at 0 but not differentiable there.'),
  (8,  'corner',
       'A point where the left- and right-hand derivatives exist but are unequal, so f'' does not exist (example: abs(x) at 0).'),
  (9,  'equation of the tangent line',
       'The line through (a, f(a)) with slope f''(a): y - f(a) = f''(a)(x - a), when f''(a) exists.'),
  (10, 'second derivative',
       'The derivative of f'', written f'''' or d^2 y / dx^2. For position s(t), this is acceleration.'),
  (11, 'left-hand derivative',
       'The difference-quotient limit using only h less than 0 (approaching 0 from the left).'),
  (12, 'right-hand derivative',
       'The difference-quotient limit using only h greater than 0. f''(a) exists iff both one-sided derivatives exist and are equal.'),
  (13, 'average rate of change',
       '[f(b) - f(a)] / (b - a), the slope of the secant over [a,b].'),
  (14, 'instantaneous rate of change',
       'The derivative f''(a): the limit of average rates of change as the interval shrinks to a.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 5. Differentiation Rules
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rules'
CROSS JOIN (VALUES
  (0,  'power rule',
       'd/dx [x^n] = n x^{n-1} for rational n (and more generally).'),
  (1,  'constant multiple rule',
       'd/dx [c f(x)] = c f''(x). Constants factor out of derivatives.'),
  (2,  'sum rule',
       'd/dx [f(x) + g(x)] = f''(x) + g''(x).'),
  (3,  'derivative of e^x',
       'd/dx e^x = e^x. Combined with the chain rule, d/dx e^{g(x)} = e^{g(x)} g''(x).'),
  (4,  'derivative of a^x',
       'd/dx a^x = a^x ln a for a greater than 0, a not equal to 1. Equivalent to rewriting a^x as e^{x ln a}.'),
  (5,  'derivative of sin x',
       'd/dx sin x = cos x, in radians.'),
  (6,  'derivative of cos x',
       'd/dx cos x = -sin x, in radians.'),
  (7,  'derivative of tan x',
       'd/dx tan x = sec^2 x, wherever cos x is not 0.'),
  (8,  'product rule',
       '(fg)'' = f'' g + f g''. Not the product of the derivatives.'),
  (9,  'quotient rule',
       '(f/g)'' = (f'' g - f g'') / g^2, wherever g is not 0.'),
  (10, 'chain rule',
       '(f o g)''(x) = f''(g(x)) g''(x): outer derivative at the inner function, times the inner derivative.'),
  (11, 'derivative of sec x',
       'd/dx sec x = sec x tan x.'),
  (12, 'linearity of differentiation',
       'Differentiation respects sums and constant multiples: (c f + g)'' = c f'' + g''.'),
  (13, 'generalized power rule',
       'd/dx [u(x)]^n = n [u(x)]^{n-1} u''(x). The chain rule applied to a power.'),
  (14, 'trig chain rule',
       'd/dx sin(u) = cos(u) u'' and d/dx cos(u) = -sin(u) u''. The same pattern holds for tan(u) and e^u.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 6. Implicit Differentiation and Extrema
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'implicit-extrema'
CROSS JOIN (VALUES
  (0,  'implicit differentiation',
       'Differentiate both sides of an equation F(x,y) = 0 with respect to x, treating y as a function of x, then solve for y''. Each y produces a factor of y'' by the chain rule.'),
  (1,  'inverse function derivative',
       'If f(b) = a and f''(b) is not 0, then (f inverse)''(a) = 1 / f''(b). The tangent slopes of inverse graphs are reciprocals.'),
  (2,  'derivative of ln x',
       'd/dx ln x = 1/x for x greater than 0. More generally d/dx ln|x| = 1/x for x not 0, and d/dx ln(g(x)) = g''(x)/g(x).'),
  (3,  'logarithmic differentiation',
       'Take ln of both sides of y = f(x), differentiate, then solve for y''. Useful for products, quotients, and variable exponents.'),
  (4,  'derivative of arcsin x',
       'd/dx arcsin x = 1 / sqrt(1 - x^2) on (-1, 1).'),
  (5,  'derivative of arctan x',
       'd/dx arctan x = 1 / (1 + x^2) for all real x.'),
  (6,  'derivative of arccos x',
       'd/dx arccos x = -1 / sqrt(1 - x^2) on (-1, 1).'),
  (7,  'absolute maximum',
       'A point c in D where f(c) is greater than or equal to f(x) for every x in D. Also called a global maximum.'),
  (8,  'local maximum',
       'A point c where f(c) is greater than or equal to f(x) for all x in some open interval around c (inside the domain).'),
  (9,  'critical number',
       'A point c in the domain of f where f''(c) = 0 or f'' is undefined. Candidates for local extrema.'),
  (10, 'Extreme Value Theorem',
       'If f is continuous on a closed bounded interval [a,b], then f attains an absolute max and an absolute min on [a,b].'),
  (11, 'closed interval method',
       'To find absolute extrema of a continuous f on [a,b]: find critical numbers in (a,b), evaluate f there and at the endpoints, then compare the values.'),
  (12, 'Fermat''s theorem',
       'If f has a local extremum at c and f''(c) exists, then f''(c) = 0. Local extrema that occur where f is differentiable are critical numbers.'),
  (13, 'vertical tangent',
       'On an implicit curve, a point where the solved y'' has denominator 0 and numerator not 0, so the tangent line is vertical.'),
  (14, 'second derivative implicitly',
       'Differentiate the already-solved formula for y'' a second time, then substitute y'' to express y'''' in terms of x and y only.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 7. MVT, L'Hospital, and Graph Shape
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'shape'
CROSS JOIN (VALUES
  (0,  'Rolle''s theorem',
       'If f is continuous on [a,b], differentiable on (a,b), and f(a) = f(b), then some c in (a,b) has f''(c) = 0.'),
  (1,  'Mean Value Theorem',
       'If f is continuous on [a,b] and differentiable on (a,b), then some c in (a,b) satisfies f''(c) = [f(b) - f(a)] / (b - a).'),
  (2,  'L''Hospital''s rule',
       'If lim f/g is the indeterminate form 0/0 or infinity/infinity, and lim f''/g'' exists, then lim f/g = lim f''/g'' (under the usual differentiability hypotheses). Differentiating top and bottom is not the quotient rule.'),
  (3,  'indeterminate form 0/0',
       'A limit of a quotient in which numerator and denominator both approach 0. A candidate for L''Hospital after the form is checked.'),
  (4,  'indeterminate form infinity/infinity',
       'A limit of a quotient in which numerator and denominator both tend to plus or minus infinity. A candidate for L''Hospital after the form is checked.'),
  (5,  'increasing',
       'f is increasing on an interval if f'' is greater than 0 there (f'' greater than or equal to 0, with extra care at isolated zeros, also works).'),
  (6,  'decreasing',
       'f is decreasing on an interval if f'' is less than 0 there.'),
  (7,  'first derivative test',
       'At a critical number c: if f'' changes from positive to negative, local max; from negative to positive, local min; no sign change, neither.'),
  (8,  'concave up',
       'f is concave up where f'' is increasing, equivalently (when it exists) where the second derivative is greater than 0. The graph lies above its tangent lines.'),
  (9,  'concave down',
       'f is concave down where f'' is decreasing, equivalently where the second derivative is less than 0. The graph lies below its tangent lines.'),
  (10, 'second derivative test',
       'If f''(c) = 0 and the second derivative at c is greater than 0, local min; less than 0, local max; equal to 0, the test fails (use the first derivative test).'),
  (11, 'inflection point',
       'A point on the graph where concavity changes. The second derivative being 0 (or undefined) is only a candidate; check a sign change.'),
  (12, 'constant function theorem',
       'If f'' = 0 on an interval, then f is constant there. If f'' = g'' on an interval, then f - g is constant. This is why antiderivatives differ by C.'),
  (13, 'indeterminate power',
       'Forms 1^infinity, 0^0, and infinity^0. Set y equal to the expression, take ln y, find lim ln y, then exponentiate to recover lim y.'),
  (14, 'sign chart',
       'A number line marked with zeros and undefined points of f'' (or the second derivative), with test-point signs on each interval, used to read increase/decrease or concavity.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 8. Sketching, Optimization, and Antiderivatives
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'optimize'
CROSS JOIN (VALUES
  (0,  'curve sketching',
       'A systematic graph: domain, intercepts, symmetry, asymptotes, intervals of increase/decrease, local extrema, concavity, and inflection points, then a labeled sketch.'),
  (1,  'optimization',
       'Finding the maximum or minimum of a quantity. Write a single-variable function from a constraint, state the realistic domain, then find extrema.'),
  (2,  'constraint',
       'A relation among variables (fixed perimeter, inscribed figure, etc.) used to eliminate extra variables so the objective depends on one input.'),
  (3,  'objective function',
       'The single-variable function that represents the quantity being maximized or minimized.'),
  (4,  'antiderivative',
       'A function F such that F'' = f on an interval. Also called an indefinite integral of f.'),
  (5,  'general antiderivative',
       'If F'' = f on a connected interval, every antiderivative has the form F(x) + C for a constant C.'),
  (6,  'particular antiderivative',
       'The unique antiderivative that also satisfies a given point or initial condition, which locks down C.'),
  (7,  'initial condition',
       'A specified value such as F(x0) = y0 or s(0) = s0, used to determine the constant in a general antiderivative.'),
  (8,  'power rule for antiderivatives',
       'An antiderivative of x^n is x^{n+1}/(n+1) + C, provided n is not equal to -1.'),
  (9,  'velocity',
       'The derivative of position: v(t) = s''(t). It is a signed rate; speed is abs(v).'),
  (10, 'acceleration',
       'The derivative of velocity, equivalently the second derivative of position: a(t) = v''(t) = s''''(t).'),
  (11, 'recovering position',
       'From a(t), integrate to get v(t) + C1 and use v(t0); integrate again to get s(t) + C2 and use s(t0).'),
  (12, 'justifying a maximum',
       'After finding critical points of a model, use the first derivative test, the second derivative test, or a closed-interval comparison of values.'),
  (13, 'intercept',
       'An x-intercept is a point where y = 0; a y-intercept is a point where x = 0. Both are starting marks on a sketch.'),
  (14, 'antiderivative of 1/x',
       'An antiderivative of 1/x is ln|x| + C.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 9. Integrals and the Fundamental Theorem
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'integrals'
CROSS JOIN (VALUES
  (0,  'Riemann sum',
       'A sum of the form Sum f(x_i*) Delta x over a partition of [a,b]. Its limit as the mesh goes to 0 is the definite integral, when the limit exists.'),
  (1,  'left Riemann sum',
       'A Riemann sum that samples each subinterval at its left endpoint. For equal width, x_i = a + (i-1) Delta x with Delta x = (b-a)/n.'),
  (2,  'right Riemann sum',
       'A Riemann sum that samples each subinterval at its right endpoint. For equal width, x_i = a + i Delta x.'),
  (3,  'midpoint Riemann sum',
       'A Riemann sum that samples each subinterval at its midpoint.'),
  (4,  'definite integral',
       'The number integral from a to b of f(x) dx, defined as the limit of Riemann sums. If f is continuous on [a,b], the limit exists.'),
  (5,  'signed area',
       'The definite integral counts area above the x-axis as positive and area below as negative. Geometric area of a region requires splitting where f changes sign, or integrating abs(f).'),
  (6,  'Fundamental Theorem of Calculus Part 1',
       'If f is continuous, then d/dx of the integral from a to x of f(t) dt equals f(x). With variable limits, d/dx of the integral from a to u(x) equals f(u(x)) u''(x).'),
  (7,  'Fundamental Theorem of Calculus Part 2',
       'If F'' = f and f is continuous on [a,b], then the integral from a to b of f equals F(b) - F(a).'),
  (8,  'net change theorem',
       'The integral from a to b of F''(x) dx equals F(b) - F(a): the integral of a rate is net change.'),
  (9,  'indefinite integral',
       'integral f(x) dx = F(x) + C means F'' = f. A family of functions, not a number. The definite integral has limits and is a number.'),
  (10, 'u-substitution',
       'Set u = g(x) and du = g''(x) dx, convert the whole integrand, integrate in u, then substitute back (or change the limits if the integral is definite).'),
  (11, 'changing limits',
       'In a definite u-substitution, replace the x-limits a and b by u(a) and u(b) and stay in u. Do not change the limits and also switch back to x.'),
  (12, 'dummy variable',
       'The variable of integration in a definite integral can be renamed without changing the value: integral f(x) dx from a to b equals integral f(t) dt from a to b.'),
  (13, 'additivity of integrals',
       'The integral from a to b equals the integral from a to c plus the integral from c to b. Flipping the endpoints changes the sign. The integral from a to a is 0.'),
  (14, 'FTC with two variable limits',
       'd/dx of the integral from u(x) to v(x) of f(t) dt equals f(v(x)) v''(x) - f(u(x)) u''(x).')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

-- =====================================================================
-- 10. Area Between Curves and Volume
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'volume'
CROSS JOIN (VALUES
  (0,  'area between curves',
       'If f is greater than or equal to g on [a,b], the area between them is the integral from a to b of [f(x) - g(x)] dx. Split the integral if the upper curve changes.'),
  (1,  'vertical slice',
       'An area integral with respect to x: top function minus bottom function, times dx.'),
  (2,  'horizontal slice',
       'An area integral with respect to y: right function minus left function, times dy, after writing x as a function of y.'),
  (3,  'intersection points',
       'Solutions of f(x) = g(x) (or the y-analog). They give the limits of integration for area between curves.'),
  (4,  'volume by slicing',
       'V = integral from a to b of A(x) dx, where A(x) is the area of the cross-section perpendicular to the x-axis.'),
  (5,  'disk method',
       'Volume of a solid of revolution whose cross-sections are disks: A(x) = pi [R(x)]^2, so V = integral pi [R(x)]^2 dx.'),
  (6,  'washer method',
       'Volume of a solid of revolution with a hole: A(x) = pi (R_outer^2 - R_inner^2). Subtract the squares of the radii, not the square of the difference.'),
  (7,  'outer radius',
       'In the washer method, the distance from the axis of rotation to the farther edge of the region.'),
  (8,  'inner radius',
       'In the washer method, the distance from the axis of rotation to the nearer edge (the hole). If it is 0, the washer is a disk.'),
  (9,  'axis of rotation',
       'The line the region is revolved around. Radii are always measured from this axis, not from the x-axis by default.'),
  (10, 'solid of revolution',
       'The solid obtained by rotating a planar region about a line. Disks and washers compute its volume from circular cross-sections.'),
  (11, 'known cross-section',
       'A solid whose slices perpendicular to an axis are a stated shape (square, triangle, semicircle). A(x) is the area of that shape, with the side length read from the base region.'),
  (12, 'cross-sectional area',
       'A(x) (or A(y)): the area of the slice at position x, which is what you integrate to get volume.'),
  (13, 'disk radius',
       'The distance from the axis of rotation to the curve. For rotation about the x-axis this is usually abs(y).'),
  (14, 'splitting an area integral',
       'When the identity of the top (or right) curve changes, break the integral at the intersection points and add the pieces.')
) AS c(pos, front, back)
WHERE d.slug = 'math51';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math51';
