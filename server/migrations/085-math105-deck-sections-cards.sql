-- Migration 085: MATH 105 — Second Course in Analysis, new preset deck.
-- Catalog: derivative as a linear map on R^n, chain rule, inverse and
-- implicit function theorems; Lebesgue integration on the line vs Riemann;
-- convergence theorems; Fourier series and L^2; Fubini and change of
-- variables. Standard text: Pugh, Real Mathematical Analysis, Ch 5-6.
-- Often a spring course (SP26: Wodzicki). Cards are term / definition.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'math105',
  'MATH 105',
  'Second Course in Analysis — multivariable derivatives, Lebesgue integration, and Fourier series',
  'uc-berkeley:math105:fa26',
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
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math105');

DELETE FROM public.tidbits
WHERE category_id = 'math105';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math105');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math105');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('linear-maps',      'Linear Maps and the Derivative in R^n',
   'Operator norm, Jacobian, Frechet derivative', 0),
  ('chain-mvt',        'Chain Rule and Mean Value',
   'Multivariable chain rule, mean value inequality, Taylor', 1),
  ('inverse-implicit', 'Inverse and Implicit Function Theorems',
   'Local inverses, regular points, level sets', 2),
  ('measure',          'Measure and Measurable Sets',
   'Outer measure, null sets, Caratheodory, Borel', 3),
  ('measurable-fn',    'Measurable Functions',
   'Simple functions, a.e. equality, Egorov and Lusin', 4),
  ('lebesgue-int',     'The Lebesgue Integral',
   'Simple functions, L^1, comparison with Riemann', 5),
  ('convergence-thms', 'Convergence Theorems',
   'MCT, Fatou, dominated convergence', 6),
  ('lp-spaces',        'L^p Spaces',
   'Holder, Minkowski, completeness, L^infty', 7),
  ('fubini-change',    'Fubini and Change of Variables',
   'Product measure, Tonelli, Jacobian factor', 8),
  ('fourier',          'Fourier Series and L^2',
   'Coefficients, Bessel, Parseval, kernels', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math105'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Linear Maps and the Derivative in R^n
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linear-maps'
CROSS JOIN (VALUES
  (0,  'linear map',
       'A function T : R^n to R^m satisfying T(ax + by) = a T(x) + b T(y). In coordinates it is multiplication by an m by n matrix.'),
  (1,  'operator norm',
       'The number abs(T) = sup{abs(Tx) : abs(x) = 1}, the smallest Lipschitz constant of T. It makes the space of linear maps a normed space.'),
  (2,  'equivalent norms',
       'Two norms whose open sets coincide: each is bounded by a constant times the other. All norms on a finite-dimensional space are equivalent.'),
  (3,  'Jacobian matrix',
       'The m by n matrix of partial derivatives of f : R^n to R^m at a point. When f is differentiable, this matrix represents Df(a).'),
  (4,  'Frechet derivative',
       'The unique linear map Df(a) such that f(a+h) = f(a) + Df(a) h + r(h) with abs(r(h))/abs(h) to 0 as h to 0. This is the derivative as a linear map.'),
  (5,  'differentiable at a point',
       'f is differentiable at a if a Frechet derivative Df(a) exists. Existence of all partials is not enough; the partials must approximate f linearly.'),
  (6,  'continuously differentiable',
       'f is C^1 if it is differentiable on an open set and the map x to Df(x) is continuous (equivalently, all first partials exist and are continuous).'),
  (7,  'directional derivative',
       'The derivative of t to f(a + t v) at t = 0, equal to Df(a) v when f is differentiable. Partials are the directional derivatives along the standard basis.'),
  (8,  'gradient',
       'For a real-valued f, the vector of first partials. If f is differentiable, Df(a) v = grad f(a) · v, so the gradient is the Riesz representative of Df(a).'),
  (9,  'little-o remainder',
       'The condition abs(f(a+h) - f(a) - T h) / abs(h) to 0, written r(h) = o(abs(h)). It is what distinguishes a true derivative T from a mere first-order guess.'),
  (10, 'partials vs differentiability',
       'Continuous partials imply differentiability. Bare existence of partials does not: there are functions with all directional derivatives that fail to be Frechet differentiable.'),
  (11, 'total derivative',
       'Another name for the Frechet derivative Df(a), as opposed to the separate partial derivatives that make up its matrix.'),
  (12, 'C^1 implies locally Lipschitz',
       'If Df is continuous at a, then f is Lipschitz on a neighborhood of a, with constant a bit larger than abs(Df(a)).'),
  (13, 'derivative of a linear map',
       'A linear map T is differentiable everywhere, and DT(a) = T at every a. The remainder is identically 0.'),
  (14, 'affine approximation',
       'The map h to f(a) + Df(a) h, the best first-order approximation to f near a. Differentiability says the error is o(abs(h)).')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 2. Chain Rule and Mean Value
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'chain-mvt'
CROSS JOIN (VALUES
  (0,  'multivariable chain rule',
       'If g is differentiable at a and f is differentiable at g(a), then D(f o g)(a) = Df(g(a)) composed with Dg(a). In matrices, multiply the Jacobians.'),
  (1,  'path derivative',
       'If r is a curve and f is differentiable, then (f o r)''(t) = Df(r(t)) r''(t). Used to reduce multivariable statements to one-variable calculus.'),
  (2,  'mean value inequality',
       'If f is C^1 on a convex set containing a and a+h, then abs(f(a+h)-f(a)) is at most (sup abs(Df)) times abs(h). There is no single-point MVT for maps to R^m when m is greater than 1.'),
  (3,  'mean value theorem in several variables',
       'For a real-valued C^1 function on a segment, f(a+h)-f(a) = Df(a+t h) h for some t in (0,1). The vector-valued version uses the inequality instead of equality.'),
  (4,  'increment formula',
       'f(a+h)-f(a) = integral_0^1 Df(a+t h) h dt when f is C^1. This integral form of the remainder is the usual tool for inverse-function estimates.'),
  (5,  'Lipschitz estimate from the derivative',
       'If abs(Df) is at most K on a convex set, then f is K-Lipschitz there. A bound on the derivative controls increments.'),
  (6,  'C^k function',
       'A function whose partial derivatives through order k exist and are continuous. C^infty means C^k for every k.'),
  (7,  'Hessian',
       'The symmetric matrix of second partials of a real-valued C^2 function. It represents the second derivative, a bilinear form.'),
  (8,  'second-order Taylor expansion',
       'f(a+h) = f(a) + Df(a)h + (1/2) h^T Hess(f)(a) h + o(abs(h)^2) when f is C^2. The quadratic form of the Hessian governs local shape.'),
  (9,  'equality of mixed partials',
       'If the second partials are continuous, then f_{x_i x_j} = f_{x_j x_i}. Continuity of the second partials is the usual sufficient condition.'),
  (10, 'critical point in R^n',
       'A point where Df(a) = 0 (the zero linear map). Necessary for an interior local extremum of a differentiable real-valued function.'),
  (11, 'second derivative test in R^n',
       'At a critical point, a positive definite Hessian gives a local minimum, a negative definite Hessian a local maximum, and an indefinite Hessian a saddle. Degenerate Hessians are inconclusive.'),
  (12, 'positive definite Hessian',
       'A symmetric matrix H with v^T H v greater than 0 for every nonzero v. Equivalently, all eigenvalues are positive.'),
  (13, 'saddle in several variables',
       'A critical point where the Hessian is indefinite: f increases in some directions and decreases in others.'),
  (14, 'higher-order derivative',
       'The kth derivative D^k f(a) is a symmetric k-linear map, represented in coordinates by the kth partials. Taylor''s theorem packages them into a degree-k polynomial plus remainder.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 3. Inverse and Implicit Function Theorems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'inverse-implicit'
CROSS JOIN (VALUES
  (0,  'inverse function theorem',
       'If f is C^1 near a and Df(a) is invertible, then f is a local C^1 diffeomorphism: it has a C^1 inverse on a neighborhood of f(a), and D(f^{-1})(f(a)) = Df(a)^{-1}.'),
  (1,  'local inverse',
       'A C^1 inverse defined only on a neighborhood of f(a), not necessarily on the whole range. The inverse function theorem produces a local inverse, not a global one.'),
  (2,  'Jacobian determinant',
       'det Df(a). For maps R^n to R^n it is nonzero exactly when Df(a) is invertible, the hypothesis of the inverse function theorem.'),
  (3,  'diffeomorphism',
       'A C^1 bijection whose inverse is also C^1. Local diffeomorphisms look like invertible linear maps after a coordinate change.'),
  (4,  'implicit function theorem',
       'If F(x,y) is C^1, F(a,b) = 0, and D_y F(a,b) is invertible, then near (a,b) the zero set is the graph y = g(x) of a C^1 function, and Dg(a) = - (D_y F)^{-1} D_x F.'),
  (5,  'regular point',
       'A point a where DF(a) has full rank (maximal possible rank). Level sets are nice manifolds near regular points.'),
  (6,  'regular value',
       'A point c such that every point of F^{-1}(c) is regular. By the implicit function theorem, F^{-1}(c) is a C^1 manifold (or empty).'),
  (7,  'level set as a graph',
       'Near a regular point, a level set F = c can be written as a graph of some coordinates over the others. That is the geometric content of the implicit function theorem.'),
  (8,  'tangent space to a level set',
       'At a regular point of F = c, the tangent space is the kernel of DF(a). For a real-valued F it is the hyperplane orthogonal to grad F(a).'),
  (9,  'Lagrange multiplier',
       'To extremize f on g = c, at a regular constrained extremum one has grad f = lambda grad g. The gradients are parallel, so the level sets are tangent.'),
  (10, 'rank theorem',
       'If Df has constant rank k near a, then after C^1 coordinate changes f looks like the linear projection (x,y) to (x, 0). It interpolates the inverse and implicit theorems.'),
  (11, 'immersion',
       'A C^1 map whose derivative is injective at every point. Locally it is an embedding: the domain looks like a submanifold of the target.'),
  (12, 'submersion',
       'A C^1 map whose derivative is surjective at every point. Locally it is a projection, and fibers are manifolds of the expected dimension.'),
  (13, 'constraint set',
       'The set g^{-1}(c) on which one extremizes f. Regularity of c makes it a manifold so that Lagrange multipliers apply.'),
  (14, 'local coordinates',
       'A C^1 chart that flattens a manifold so it looks like an open set of R^k. The inverse and implicit function theorems are the tools that produce such charts.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 4. Measure and Measurable Sets
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'measure'
CROSS JOIN (VALUES
  (0,  'outer measure',
       'm*(E) = inf of sum of lengths of open intervals that cover E. It is defined for every subset of R, is monotone, and is countably subadditive.'),
  (1,  'Lebesgue measure',
       'The restriction of outer measure to the measurable sets. On intervals it agrees with length, and it is countably additive.'),
  (2,  'measurable set',
       'A set E that splits every test set A additively: m*(A) = m*(A intersect E) + m*(A minus E). This is Caratheodory''s criterion.'),
  (3,  'null set',
       'A set of outer measure zero. Countable sets are null. A property holds almost everywhere if it fails only on a null set.'),
  (4,  'almost everywhere',
       'A statement is true almost everywhere when the set where it fails has measure zero. Integrals and limits in measure theory ignore null sets.'),
  (5,  'sigma-algebra',
       'A family of sets containing the whole space, closed under complements and countable unions (hence countable intersections). Measurable sets form a sigma-algebra.'),
  (6,  'Borel set',
       'A set in the smallest sigma-algebra containing the open sets. Every Borel set is Lebesgue measurable, but there are extra measurable sets obtained by adding null sets.'),
  (7,  'Caratheodory criterion',
       'E is measurable if it splits every A additively in outer measure. Open sets, closed sets, and null sets all pass the test.'),
  (8,  'countable additivity',
       'The measure of a countable disjoint union equals the sum of the measures. Outer measure is only countably subadditive until one restricts to measurable sets.'),
  (9,  'translation invariance',
       'm(E + t) = m(E) for every real t. Lebesgue measure cannot see where a set sits, only its size.'),
  (10, 'Cantor set',
       'The standard middle-thirds Cantor set is uncountable, compact, nowhere dense, and has measure zero. It shows that null sets can be large in cardinality.'),
  (11, 'Vitali set',
       'A nonmeasurable subset of R, built by choosing one representative from each coset of Q in R. Its existence uses the axiom of choice; it cannot be assigned a Lebesgue measure.'),
  (12, 'G_delta set',
       'A countable intersection of open sets. Every measurable set is a G_delta set union (or minus) a null set: Lebesgue measure is regular.'),
  (13, 'F_sigma set',
       'A countable union of closed sets. Complements of G_delta sets. Used in regularity statements for measurable sets.'),
  (14, 'interval measure',
       'The outer measure of an interval is its length, whether the interval is open, closed, or half-open. Endpoints are null and do not affect measure.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 5. Measurable Functions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'measurable-fn'
CROSS JOIN (VALUES
  (0,  'measurable function',
       'A function f such that {x : f(x) greater than a} is measurable for every real a. Equivalent conditions use greater than or equal, less than, or preimages of opens.'),
  (1,  'simple function',
       'A finite linear combination of indicator functions of measurable sets: s = sum c_i 1_{E_i}. Simple functions are the building blocks of the Lebesgue integral.'),
  (2,  'indicator function',
       'The function 1_E that is 1 on E and 0 off E. It is measurable if and only if E is measurable, and its integral is m(E).'),
  (3,  'approximation by simple functions',
       'Every nonnegative measurable f is the pointwise increasing limit of simple functions 0 less than or equal to s_n less than or equal to f. This is how the integral is defined.'),
  (4,  'Borel measurable',
       'A function for which preimages of opens are Borel, not merely Lebesgue measurable. Continuous functions are Borel measurable.'),
  (5,  'almost-everywhere equality',
       'f = g a.e. means {f not equal g} is null. Measurability and integrals are unchanged by altering a function on a null set.'),
  (6,  'pointwise limit of measurable functions',
       'A pointwise limit (or limsup, liminf) of measurable functions is measurable. Sequential limits stay in the class.'),
  (7,  'positive and negative parts',
       'f^+ = max(f,0) and f^- = max(-f,0), so f = f^+ - f^- and abs(f) = f^+ + f^-. Integrability of f is integrability of both parts.'),
  (8,  'truncated function',
       'f_n = max(-n, min(f,n)), a bounded measurable approximation to f. Truncations pass to the limit by the convergence theorems.'),
  (9,  'Egorov''s theorem',
       'On a finite-measure set, pointwise a.e. convergence of measurable functions is almost uniform: off a small-measure set, the convergence is uniform.'),
  (10, 'Lusin''s theorem',
       'A measurable function on a finite-measure set agrees with a continuous function off a small-measure set. Measurable functions are nearly continuous.'),
  (11, 'characteristic function',
       'Another name for the indicator 1_E. In Fourier analysis the same words mean the Fourier transform of 1_E; context decides.'),
  (12, 'essential supremum',
       'The infimum of numbers M such that abs(f) is at most M almost everywhere. It is the L^infty norm, ignoring values on null sets.'),
  (13, 'composition of measurable functions',
       'A Borel function composed with a measurable function is measurable. Lebesgue-measurable outer functions need extra care, because non-Borel measurable sets exist.'),
  (14, 'support of a function',
       'The closure of the set where f is nonzero (or the set itself, in measure theory). Integrals only see the support.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 6. The Lebesgue Integral
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'lebesgue-int'
CROSS JOIN (VALUES
  (0,  'Lebesgue integral of a simple function',
       'For s = sum c_i 1_{E_i} with the E_i disjoint and measurable, integral s = sum c_i m(E_i). This is well-defined and linear.'),
  (1,  'Lebesgue integral of a nonnegative function',
       'integral f = sup{integral s : 0 less than or equal to s less than or equal to f, s simple}. It may be infinite. This is the definition that makes MCT automatic.'),
  (2,  'integrable function',
       'A measurable f with integral abs(f) finite. Then integral f = integral f^+ - integral f^- is a well-defined real number. The class is L^1.'),
  (3,  'L^1',
       'The space of integrable functions (modulo a.e. equality), with norm integral abs(f). It is a Banach space: Cauchy sequences in the integral norm converge.'),
  (4,  'Riemann vs Lebesgue',
       'A bounded function on a compact interval is Riemann integrable if and only if it is continuous a.e. Such a function is then Lebesgue integrable, and the integrals agree.'),
  (5,  'Dirichlet function is Lebesgue integrable',
       'The function that is 1 on rationals and 0 on irrationals equals 0 a.e., so its Lebesgue integral is 0. It is not Riemann integrable.'),
  (6,  'improper Riemann vs Lebesgue',
       'An improperly Riemann integrable function need not be Lebesgue integrable (oscillatory cancellations, like sin(x)/x on R). Absolute improper Riemann integrability does imply Lebesgue integrability.'),
  (7,  'integral over a set',
       'integral_E f = integral f 1_E. The integral is countably additive in the set when f is nonnegative or integrable.'),
  (8,  'linearity of the Lebesgue integral',
       'integral (a f + b g) = a integral f + b integral g for integrable f, g. For nonnegative measurable functions the same holds in [0, infinity].'),
  (9,  'monotonicity of the integral',
       'If 0 less than or equal to f less than or equal to g are measurable, then integral f is at most integral g. In particular integral f = 0 with f nonnegative implies f = 0 a.e.'),
  (10, 'Markov inequality',
       'If f is nonnegative and measurable, then m({f greater than or equal to a}) is at most (1/a) integral f for a greater than 0. Also called Chebyshev''s inequality in this setting.'),
  (11, 'integral ignores null sets',
       'If f = g a.e. and either is integrable, so is the other, and the integrals agree. Changing f on a null set does not change the integral.'),
  (12, 'absolutely integrable',
       'integral abs(f) is finite. For Lebesgue integration this is the definition of integrability: no conditional-only integrals as in some improper Riemann examples.'),
  (13, 'integral of an indicator',
       'integral 1_E = m(E). This ties the integral back to measure and is the simple-function case with one piece.'),
  (14, '1/sqrt(x) on (0,1)',
       'An unbounded function that is improperly Riemann integrable and Lebesgue integrable on (0,1). Unboundedness alone does not block the Lebesgue integral.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 7. Convergence Theorems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'convergence-thms'
CROSS JOIN (VALUES
  (0,  'monotone convergence theorem',
       'If 0 less than or equal to f_n increases pointwise to f, then integral f_n increases to integral f (both sides allowed to be infinite). The basic convergence theorem for nonnegative functions.'),
  (1,  'Fatou''s lemma',
       'For nonnegative measurable f_n, integral liminf f_n is at most liminf integral f_n. Mass can escape; the inequality can be strict.'),
  (2,  'dominated convergence theorem',
       'If f_n to f a.e., and abs(f_n) is at most an integrable g for every n, then f is integrable, integral f_n to integral f, and integral abs(f_n - f) to 0.'),
  (3,  'bounded convergence theorem',
       'On a finite-measure set, if f_n to f a.e. and the f_n are uniformly bounded, then integral f_n to integral f. A special case of DCT with g constant.'),
  (4,  'counterexample without domination',
       'A moving bump: f_n = n 1_{(0,1/n)} tends to 0 pointwise, but each integral is 1. DCT fails because no single integrable g dominates all f_n.'),
  (5,  'Fatou can be strict',
       'The same moving-bump sequence has liminf f_n = 0, so integral liminf is 0, while liminf of the integrals is 1. Fatou does not claim equality.'),
  (6,  'interchange of sum and integral',
       'If f_n are nonnegative, integral sum f_n = sum integral f_n. If sum integral abs(f_n) is finite, the same holds without a sign assumption (DCT for series).'),
  (7,  'differentiation under the integral',
       'If f(x,t) is differentiable in t and the partial is dominated by an integrable function of x, then d/dt of integral f equals integral of the partial. DCT applied to difference quotients.'),
  (8,  'convergence in measure',
       'f_n to f in measure if m({abs(f_n-f) greater than epsilon}) to 0 for every epsilon greater than 0. A.e. convergence on a finite-measure space implies convergence in measure.'),
  (9,  'almost everywhere convergence',
       'f_n(x) to f(x) for almost every x. On a finite-measure space, Egorov upgrades this to almost-uniform convergence.'),
  (10, 'L^1 convergence',
       'integral abs(f_n - f) to 0. DCT gives L^1 convergence, which implies a subsequence converging a.e., but not conversely (moving bumps).'),
  (11, 'MCT for series',
       'If a_n are nonnegative measurable, integral sum a_n = sum integral a_n. Used constantly to justify term-by-term integration of positive series.'),
  (12, 'continuity of the integral in the set',
       'If f is integrable and E_n shrink to a null set (or expand to the whole space), the integrals over E_n tend to 0 (or to integral f). Absolute continuity of the integral.'),
  (13, 'uniform integrability',
       'A family whose integrals over small-measure sets are uniformly small. On finite-measure spaces it is the extra hypothesis that upgrades convergence in measure to L^1 convergence.'),
  (14, 'DCT is the workhorse',
       'Once a dominating integrable function is in hand, one may pass limits inside integrals. Finding the dominate is the usual analytic step.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 8. L^p Spaces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'lp-spaces'
CROSS JOIN (VALUES
  (0,  'L^p space',
       'The space of measurable functions with integral abs(f)^p finite (modulo a.e. equality), for 1 less than or equal to p less than infinity. The norm is (integral abs(f)^p)^{1/p}.'),
  (1,  'L^2 inner product',
       'The pairing integral f conjugate(g), which makes L^2 a Hilbert space. Orthogonality and Fourier series live here.'),
  (2,  'Holder''s inequality',
       'integral abs(f g) is at most abs(f)_p abs(g)_q when 1/p + 1/q = 1. The p = q = 2 case is Cauchy-Schwarz.'),
  (3,  'Minkowski''s inequality',
       'abs(f+g)_p is at most abs(f)_p + abs(g)_p. It is the triangle inequality that makes L^p a normed space.'),
  (4,  'L^p is a Banach space',
       'Every Cauchy sequence in L^p converges in the L^p norm to an L^p function. Completeness is proved by passing to an a.e. convergent subsequence and using Fatou or MCT.'),
  (5,  'L^infty',
       'The space of essentially bounded measurable functions, with norm the essential supremum. It is a Banach space, and Holder pairs it with L^1.'),
  (6,  'dense simple functions',
       'Simple functions (and, on R, continuous compactly supported functions) are dense in L^p for 1 less than or equal to p less than infinity. Used to extend operators defined on a nice subclass.'),
  (7,  'inclusions on a finite-measure space',
       'If m(E) is finite and p less than q, then L^q(E) sits inside L^p(E). On sets of infinite measure the inclusion can fail (and can reverse for some examples).'),
  (8,  'Cauchy sequence in L^p',
       'A sequence with abs(f_n - f_m)_p to 0 as n, m to infinity. Completeness says it converges; a subsequence converges a.e.'),
  (9,  'L^p Cauchy subsequence converges a.e.',
       'From a Cauchy sequence in L^p one can extract a subsequence converging both a.e. and almost uniformly on sets of finite measure. The L^p limit agrees with that a.e. limit.'),
  (10, 'conjugate exponents',
       'p and q with 1/p + 1/q = 1. Holder pairs L^p with L^q. The conjugate of 1 is infinity, and of 2 is 2.'),
  (11, 'Hilbert space',
       'A complete inner-product space. L^2 is the Hilbert space of analysis; orthogonality, projections, and orthonormal bases are available.'),
  (12, 'orthogonal functions',
       'f and g in L^2 with integral f conjugate(g) = 0. The trigonometric system is orthogonal on [0, 2 pi] (or [-pi, pi]).'),
  (13, 'modulus of integrability',
       'The function delta to sup{integral_E abs(f) : m(E) less than delta}, which tends to 0 as delta to 0 for each integrable f. This is absolute continuity of the integral.'),
  (14, 'closed subspace of L^2',
       'A norm-closed linear subspace. The orthogonal projection onto a closed subspace exists and is unique, which is the geometric engine of Fourier expansions.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 9. Fubini and Change of Variables
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'fubini-change'
CROSS JOIN (VALUES
  (0,  'product measure',
       'The unique measure on the product sigma-algebra such that m(A × B) = m(A) m(B) for measurable rectangles. On R^2 it is two-dimensional Lebesgue measure.'),
  (1,  'measurable rectangle',
       'A product A × B with A, B measurable. These generate the product sigma-algebra, and Fubini begins with them.'),
  (2,  'slice',
       'The set E_x = {y : (x,y) in E}, or the function y to f(x,y) for fixed x. Fubini and Tonelli are statements about integrating slices.'),
  (3,  'Tonelli''s theorem',
       'If f is nonnegative and measurable on a product, then the iterated integrals of the slices exist (in [0, infinity]) and equal the double integral, in either order.'),
  (4,  'Fubini''s theorem',
       'If f is integrable on the product (integral abs(f) finite), then almost every slice is integrable, the slice-integrals are integrable, and both iterated integrals equal the double integral.'),
  (5,  'Tonelli first, Fubini second',
       'Check that integral abs(f) is finite by Tonelli (no signs). If it is finite, Fubini lets you rearrange the signed integral. Skipping the abs check is the usual mistake.'),
  (6,  'counterexample without integrability',
       'There are signed functions whose iterated integrals exist and disagree, because integral abs(f) is infinite. Fubini''s hypothesis is not optional.'),
  (7,  'iterated integral',
       'integral dx integral dy f(x,y), or the reverse order. Fubini/Tonelli say when this equals the integral against product measure.'),
  (8,  'change of variables',
       'If T is a C^1 diffeomorphism, then integral_{T(U)} f = integral_U (f o T) abs(det DT). The absolute Jacobian is the local volume distortion.'),
  (9,  'Jacobian factor',
       'abs(det DT(x)), the factor by which T stretches volume at x. Linear maps scale measure by abs(det A).'),
  (10, 'polar coordinates',
       'The map (r, theta) to (r cos theta, r sin theta) has Jacobian factor r, so dA = r dr d(theta). A standard change-of-variables example.'),
  (11, 'linear change of variables',
       'For an invertible linear map A, m(A(E)) = abs(det A) m(E). The proof reduces to elementary matrices, or follows from the C^1 theorem.'),
  (12, 'Cavalieri''s principle',
       'The volume of a solid is the integral of the areas of its slices. This is Tonelli applied to the indicator of the solid.'),
  (13, 'completion of product measure',
       'The product of complete measures need not be complete. Lebesgue measure on R^2 is the completion of the product of one-dimensional Lebesgue measures.'),
  (14, 'Fubini for indicators',
       'm_2(E) = integral m(E_x) dx = integral m(E_y) dy when E is measurable in the product (or nonnegative). Area is the integral of slice lengths.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

-- =====================================================================
-- 10. Fourier Series and L^2
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'fourier'
CROSS JOIN (VALUES
  (0,  'Fourier series',
       'The expansion f ~ a_0/2 + sum (a_n cos(nx) + b_n sin(nx)), or equivalently sum c_n e^{i n x}. The coefficients are the inner products against the trigonometric system.'),
  (1,  'trigonometric system',
       'The functions 1, cos(nx), sin(nx) (or e^{i n x}) on [0, 2 pi] or [-pi, pi]. They form an orthogonal system in L^2, and are complete: their span is dense.'),
  (2,  'Fourier coefficient',
       'c_n = (1/(2 pi)) integral f(x) e^{-i n x} dx, or the corresponding a_n, b_n formulas with cos and sin. They are the coordinates of f in the trigonometric basis.'),
  (3,  'Bessel''s inequality',
       'The sum of abs(c_n)^2 (with the right normalization) is at most abs(f)_2^2. Partial Fourier sums are orthogonal projections, so they cannot be longer than f.'),
  (4,  'Parseval''s identity',
       'The Bessel inequality becomes equality because the trigonometric system is complete: the sum of the squared coefficients equals abs(f)_2^2. This is the Pythagorean theorem in L^2.'),
  (5,  'orthonormal basis of L^2',
       'A complete orthonormal set: every f is the L^2-limit of its partial expansions, and Parseval holds. The complex exponentials e^{i n x} / sqrt(2 pi) form one.'),
  (6,  'complete orthonormal set',
       'An orthonormal set whose span is dense, equivalently whose only orthogonal complement is 0. Completeness of the trigonometric system is the deep fact behind Fourier series in L^2.'),
  (7,  'L^2 convergence of Fourier series',
       'The symmetric partial sums s_N f converge to f in L^2 for every f in L^2. This does not imply pointwise convergence.'),
  (8,  'pointwise convergence of Fourier series',
       'At a point of continuity (or a jump, with the average of the one-sided limits) a reasonably regular f has s_N(x) to f(x). There exist continuous functions whose Fourier series diverge at a point.'),
  (9,  'Riemann-Lebesgue lemma',
       'The Fourier coefficients of an L^1 function tend to 0 as abs(n) to infinity. Oscillatory integrals against high frequencies vanish.'),
  (10, 'Dirichlet kernel',
       'The kernel D_N such that s_N f = D_N * f. It has L^1 norm growing like log N, which is why uniform boundedness fails and pointwise convergence is delicate.'),
  (11, 'Fejer kernel',
       'The Cesaro means of the Dirichlet kernels: nonnegative, integral 1, and concentrating at 0. Convolution with Fejer kernels recovers continuous functions uniformly (Fejer''s theorem).'),
  (12, 'Cesaro means',
       'The averages sigma_N = (s_0 + ... + s_N)/(N+1) of partial Fourier sums. They converge better than s_N: uniformly to a continuous f, and in L^p to an L^p function.'),
  (13, 'convolution',
       ' (K * f)(x) = integral K(x-y) f(y) dy. Fourier partial sums and Fejer means are convolutions against the Dirichlet and Fejer kernels.'),
  (14, 'Gibbs phenomenon',
       'Near a jump, the partial sums overshoot by a fixed percentage (about 9 percent) no matter how large N is. The overshoot shrinks in width but not in height.')
) AS c(pos, front, back)
WHERE d.slug = 'math105';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math105';
