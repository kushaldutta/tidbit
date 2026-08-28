-- Migration 053: MATH 128A — Numerical Analysis, full deck rebuild.
-- Instructor: Prof. Per-Olof Persson, UC Berkeley Fall 2026.
-- Textbook: Burden, Faires & Burden, Numerical Analysis, 10th ed. (Cengage).
-- Covers Chapters 1–6 as taught in 128A.
--
-- Exam dates:
--   Midterm: Friday, Oct 23, 2026, 12:10pm–1:00pm (covers Ch 1–4)
--   Final:   Friday, Dec 18, 2026, 11:30am–2:30pm

-- ─────────────────────────────────────────────────────────────
-- 0. Wipe existing hand-entered cards and sections so we start clean
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math128a');

DELETE FROM public.tidbits
WHERE category_id = 'math128a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math128a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math128a');

-- ─────────────────────────────────────────────────────────────
-- 1. Sections
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('error-analysis',        'Errors & Floating Point',
   'Review of calculus, round-off errors, machine epsilon, stability (Ch 1)', 0),
  ('root-finding',          'Root Finding',
   'Bisection, fixed-point, Newton''s, secant, convergence orders (Ch 2)', 1),
  ('interpolation',         'Interpolation & Polynomial Approximation',
   'Lagrange, divided differences, Hermite, cubic splines (Ch 3)', 2),
  ('diff-integration',      'Numerical Differentiation & Integration',
   'Finite differences, Richardson, trapezoidal, Simpson, Gaussian (Ch 4)', 3),
  ('odes',                  'Initial-Value Problems for ODEs',
   'Euler, Taylor, Runge-Kutta, multistep, stability, stiff ODEs (Ch 5)', 4),
  ('linear-systems',        'Direct Methods for Linear Systems',
   'Gaussian elimination, LU, pivoting, Cholesky, condition number (Ch 6)', 5),
  ('midterm-review',        'Midterm Review',
   'Ch 1–4 (Oct 23 exam)', 6),
  ('final-review',          'Final Review',
   'Ch 1–6 (Dec 18 exam)', 7)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math128a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- Ch 1 — Errors & Floating Point  (§1.1–1.3)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'error-analysis'
CROSS JOIN (VALUES
  (0,  'round-off error',
       'Error introduced when a real number is stored with a finite number of digits; present in virtually every floating-point computation.'),
  (1,  'truncation error',
       'Error from approximating a mathematical procedure (e.g., replacing an infinite Taylor series with a finite sum); distinct from round-off error.'),
  (2,  'absolute error',
       '|p − p*| where p is the true value and p* is the approximation; measures the magnitude of the error in the same units as p.'),
  (3,  'relative error',
       '|p − p*| / |p| for p ≠ 0; measures error as a fraction of the true value; preferred when the scale of p varies.'),
  (4,  'significant digits',
       'p* approximates p to t significant digits if the relative error < 5 × 10^{-t}; the number of trustworthy digits in an approximation.'),
  (5,  'machine epsilon (ε_mach)',
       'The smallest positive floating-point number ε such that fl(1 + ε) > 1; characterises the unit round-off of a floating-point system (~2.2 × 10⁻¹⁶ for IEEE double).'),
  (6,  'loss of significance (catastrophic cancellation)',
       'Occurs when two nearly equal floating-point numbers are subtracted; significant digits cancel, greatly amplifying relative error.'),
  (7,  'Taylor''s theorem with remainder',
       'f(x) = ∑_{k=0}^n f^{(k)}(x_0)/k! (x−x_0)^k + f^{(n+1)}(ξ)/(n+1)! (x−x_0)^{n+1} for some ξ between x_0 and x; the basis of truncation error analysis.'),
  (8,  'Big-O notation O(h^n)',
       'f(h) = O(h^n) as h→0 means |f(h)| ≤ C h^n for some constant C and small enough h; used to describe the order of accuracy of an approximation.'),
  (9,  'stable algorithm',
       'An algorithm in which small perturbations (rounding, input errors) cause only small changes in the output; the numerical gold standard.'),
  (10, 'backward error analysis',
       'Views the computed result as the exact solution to a nearby problem; an algorithm is backward-stable if that nearby problem is close to the original.'),
  (11, 'intermediate value theorem (IVT)',
       'If f is continuous on [a,b] and N is strictly between f(a) and f(b), then ∃ c ∈ (a,b) with f(c) = N; guarantees existence of roots in root-finding methods.'),
  (12, 'mean value theorem (MVT)',
       'If f ∈ C[a,b] and f is differentiable on (a,b), then ∃ c ∈ (a,b) with f''(c) = [f(b)−f(a)]/(b−a); used to bound errors in quadrature and ODE methods.'),
  (13, 'rate of convergence',
       'A sequence x_n → L converges with rate O(h^p) if |x_n − L| ≤ C h^p for step size h = 1/n; higher p means faster convergence.'),
  (14, 'IEEE 754 double precision',
       '64-bit standard: 1 sign bit, 11 exponent bits, 52 mantissa bits; provides ~15–17 significant decimal digits and ε_mach ≈ 2.2 × 10⁻¹⁶.')
) AS c(pos, front, back)
WHERE d.slug = 'math128a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 2 — Root Finding  (§2.1–2.4)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'root-finding'
CROSS JOIN (VALUES
  (0,  'bisection method',
       'Repeatedly halves the bracket [a,b] by checking the sign of f at the midpoint; guaranteed to converge for continuous f with f(a)·f(b) < 0; error after n steps ≤ (b−a)/2^n.'),
  (1,  'bisection convergence rate',
       'Linear convergence: the error is halved each step, so |p_n − p| ≤ (b−a)/2^n; needs log₂((b−a)/ε) steps for tolerance ε.'),
  (2,  'fixed point',
       'A number p such that g(p) = p; root-finding is reformulated as finding a fixed point of g(x) = x − f(x)/φ(x) for some φ.'),
  (3,  'fixed-point iteration',
       'Iterate x_{n+1} = g(x_n) starting from an initial guess; converges if |g''(p)| < 1 near the fixed point p.'),
  (4,  'contraction mapping theorem',
       'If g ∈ C[a,b], g maps [a,b] into [a,b], and |g''(x)| ≤ k < 1 on (a,b), then g has a unique fixed point p, and FPI converges for any x_0 ∈ [a,b].'),
  (5,  'Newton''s method',
       'x_{n+1} = x_n − f(x_n)/f''(x_n); geometrically, the next iterate is the x-intercept of the tangent line at x_n; quadratically convergent near a simple root.'),
  (6,  'quadratic convergence',
       'Convergence order 2: |p_{n+1} − p| ≤ C|p_n − p|²; the number of correct decimal digits roughly doubles each iteration.'),
  (7,  'secant method',
       'x_{n+1} = x_n − f(x_n)(x_n − x_{n-1}) / [f(x_n)−f(x_{n-1})]; derivative-free; converges at superlinear order ≈ 1.618 (golden ratio).'),
  (8,  'false position (regula falsi)',
       'Like the secant method but keeps a bracket [a,b] with f(a)·f(b) < 0; guaranteed convergence but can be slower than secant near the root.'),
  (9,  'order of convergence',
       '|p_{n+1}−p| / |p_n−p|^α → λ > 0; α = 1 linear, α = 2 quadratic; Newton''s is 2nd order, bisection is 1st order (λ = 1/2).'),
  (10, 'multiple root (multiplicity m)',
       'p is a root of multiplicity m if f(p) = f''(p) = ⋯ = f^{(m-1)}(p) = 0, f^{(m)}(p) ≠ 0; Newton''s converges only linearly at such roots.'),
  (11, 'modified Newton for multiple roots',
       'x_{n+1} = x_n − m·f(x_n)/f''(x_n) restores quadratic convergence at a root of multiplicity m when m is known in advance.'),
  (12, 'Aitken''s Δ² acceleration',
       'p̂_n = p_n − (p_{n+1}−p_n)² / (p_{n+2}−2p_{n+1}+p_n); converts a linearly convergent sequence into a superlinearly convergent one.'),
  (13, 'Steffensen''s method',
       'Applies Aitken''s Δ² acceleration inside the fixed-point iteration loop; achieves quadratic convergence without computing any derivative.'),
  (14, 'Horner''s method',
       'Evaluates p(x) = a_n x^n + ⋯ + a_0 as (⋯((a_n·x + a_{n-1})·x + a_{n-2})·x + ⋯) + a_0; only n multiplications and n additions; also deflates the polynomial.')
) AS c(pos, front, back)
WHERE d.slug = 'math128a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 3 — Interpolation  (§3.1, 3.3–3.5)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'interpolation'
CROSS JOIN (VALUES
  (0,  'polynomial interpolation',
       'Given n+1 distinct data points (x_i, f(x_i)), find the unique polynomial P_n of degree ≤ n with P_n(x_i) = f(x_i) for all i.'),
  (1,  'uniqueness of interpolating polynomial',
       'There is exactly one polynomial of degree ≤ n passing through n+1 distinct data points; proved by Vandermonde determinant argument.'),
  (2,  'Lagrange interpolating polynomial',
       'P_n(x) = ∑_{k=0}^n f(x_k) L_{n,k}(x) where L_{n,k}(x) = ∏_{j≠k}(x−x_j)/(x_k−x_j); each basis polynomial is 1 at x_k and 0 at all other nodes.'),
  (3,  'interpolation error formula',
       'f(x) − P_n(x) = f^{(n+1)}(ξ)/(n+1)! · ∏_{j=0}^n (x−x_j) for some ξ between the smallest and largest of x, x_0,…,x_n.'),
  (4,  'divided difference f[x_0,…,x_k]',
       'Recursively defined: f[x_i] = f(x_i); f[x_i,…,x_{i+k}] = (f[x_{i+1},…,x_{i+k}]−f[x_i,…,x_{i+k-1}]) / (x_{i+k}−x_i); the leading coefficient of the interpolating polynomial.'),
  (5,  'Newton''s divided-difference formula',
       'P_n(x) = f[x_0] + ∑_{k=1}^n f[x_0,…,x_k] ∏_{j=0}^{k-1}(x−x_j); easy to extend to n+1 points without recomputing previous work.'),
  (6,  'forward difference operator Δ',
       'Δf(x) = f(x+h) − f(x); Δ^k f(x_0) = kth forward difference; Newton''s forward-difference formula uses these for equally spaced nodes.'),
  (7,  'Hermite interpolation',
       'Matches both function values and derivative values at each node; 2(n+1) conditions for n+1 nodes; constructed using divided differences with repeated nodes.'),
  (8,  'Runge''s phenomenon',
       'High-degree polynomial interpolation on equally spaced nodes can oscillate wildly near endpoints; a cautionary example is f(x)=1/(1+25x²) on [−1,1].'),
  (9,  'Chebyshev nodes',
       'x_k = cos((2k+1)π/(2n+2)), k=0,…,n on [−1,1]; minimise max|∏(x−x_j)|; near-optimal choice that greatly reduces Runge''s phenomenon.'),
  (10, 'cubic spline',
       'Piecewise-cubic polynomial that interpolates all data, is C² everywhere, and satisfies two additional endpoint conditions; n+1 data points require n cubic pieces.'),
  (11, 'natural cubic spline',
       'Cubic spline with S''(x_0) = S''(x_n) = 0; among all C² interpolants, it minimises ∫[S''(x)]² dx (the bending energy).'),
  (12, 'clamped cubic spline',
       'Cubic spline where S''(x_0) and S''(x_n) are set to the known first derivatives of f; generally more accurate than natural spline.'),
  (13, 'spline tridiagonal system',
       'The n−1 interior conditions of C² continuity yield a strictly diagonally dominant tridiagonal system for the second derivatives S''(x_i); solvable in O(n).'),
  (14, 'not-a-knot spline',
       'Enforces the third derivative of S to be continuous at x_1 and x_{n-1} (the second and second-to-last knots); commonly used when endpoint derivatives are unavailable; default in MATLAB''s spline().')
) AS c(pos, front, back)
WHERE d.slug = 'math128a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 4 — Numerical Differentiation & Integration  (§4.1–4.9)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'diff-integration'
CROSS JOIN (VALUES
  (0,  'forward difference formula',
       'f''(x) ≈ [f(x+h)−f(x)]/h with error O(h); first-order accurate.'),
  (1,  'centered difference formula',
       'f''(x) ≈ [f(x+h)−f(x−h)]/(2h) with error O(h²); second-order accurate; preferred over one-sided differences.'),
  (2,  'five-point midpoint formula',
       'f''(x_0) ≈ [f(x_0−2h)−8f(x_0−h)+8f(x_0+h)−f(x_0+2h)]/(12h); fourth-order accurate O(h⁴).'),
  (3,  'second derivative centered difference',
       'f''''(x) ≈ [f(x+h)−2f(x)+f(x−h)]/h² with error O(h²); derived from Taylor expansion.'),
  (4,  'Richardson extrapolation',
       'If N(h) = M + c h^n + O(h^{n+2}), then N(h/2) = M + c(h/2)^n + ⋯; the combination [2^n N(h/2) − N(h)]/(2^n − 1) cancels the leading error term, giving O(h^{n+2}).'),
  (5,  'trapezoidal rule',
       '∫_a^b f(x)dx ≈ (h/2)[f(a)+f(b)], h=b−a; local error −h³f''''(ξ)/12 = O(h³); uses linear interpolation.'),
  (6,  'Simpson''s rule',
       '∫_a^b f(x)dx ≈ (h/3)[f(a)+4f(m)+f(b)], m=(a+b)/2, h=(b−a)/2; local error −h⁵f^{(4)}(ξ)/90 = O(h⁵); exact for cubics despite using a quadratic.'),
  (7,  'degree of precision (quadrature)',
       'A rule has degree of precision m if it integrates all polynomials of degree ≤ m exactly but fails for at least one polynomial of degree m+1.'),
  (8,  'composite trapezoidal rule',
       'Divide [a,b] into n equal subintervals of width h=(b−a)/n; sum trapezoidal rules; global error O(h²) = O(1/n²).'),
  (9,  'composite Simpson''s rule',
       'Apply Simpson''s rule on n/2 pairs of subintervals (n even); global error O(h⁴); requires even n.'),
  (10, 'Romberg integration',
       'Builds a triangular table R(j,k) where R(j,1) is composite trapezoidal with 2^{j−1} panels; each R(j,k) = Richardson extrapolation; achieves O(h^{2k}) accuracy.'),
  (11, 'adaptive quadrature',
       'Subdivides [a,b] only where a local error estimate exceeds tolerance/n; avoids wasted evaluations where f is smooth; uses a recursive bisection strategy.'),
  (12, 'Gaussian quadrature',
       'Chooses both nodes x_i and weights w_i optimally; an n-point rule is exact for all polynomials of degree ≤ 2n−1; uses roots of orthogonal polynomials.'),
  (13, 'Gauss-Legendre nodes',
       'The n Gauss-Legendre quadrature nodes on [−1,1] are the roots of the nth Legendre polynomial P_n(x); weights are determined by the interpolation conditions.'),
  (14, 'Euler-Maclaurin formula',
       'Relates ∑f(x_i) to ∫f(x)dx plus correction terms in f'', f''''....; explains why Romberg is so powerful and why the trapezoidal rule is spectrally accurate for periodic functions.')
) AS c(pos, front, back)
WHERE d.slug = 'math128a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 5 — Initial-Value Problems for ODEs  (§5.1–5.11)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'odes'
CROSS JOIN (VALUES
  (0,  'initial-value problem (IVP)',
       'y'' = f(t,y) on [a,b] with y(a) = α; well-posedness requires f to satisfy a Lipschitz condition in y.'),
  (1,  'Lipschitz condition',
       '|f(t,y_1)−f(t,y_2)| ≤ L|y_1−y_2| for all (t,y) in the domain; guarantees uniqueness and is essential for convergence proofs.'),
  (2,  'Euler''s method',
       'w_{i+1} = w_i + h·f(t_i,w_i); local truncation error O(h²), global error O(h); simplest explicit one-step method.'),
  (3,  'local truncation error (LTE)',
       'Error per step assuming exact data: τ_{i+1} = (y_{i+1}−y_i)/h − Φ(t_i,y_i,h); Euler LTE = hf''(ξ)/2 for some ξ ∈ (t_i,t_{i+1}).'),
  (4,  'global truncation error',
       'Cumulative error after all steps: for Euler |y(t_n) − w_n| ≤ C·h·e^{L(t_n−a)} = O(h); one order less than local error.'),
  (5,  'Taylor method of order n',
       'Expands y(t+h) via Taylor; requires computing f''(t,y) through f^{(n)}(t,y); LTE O(h^{n+1}), global error O(h^n).'),
  (6,  'Runge-Kutta methods',
       'Achieve high-order accuracy using multiple function evaluations per step (stages) without differentiating f; avoid the derivative-computation burden of Taylor methods.'),
  (7,  'RK4 (classical 4th-order Runge-Kutta)',
       'k_1=hf(t,w), k_2=hf(t+h/2, w+k_1/2), k_3=hf(t+h/2, w+k_2/2), k_4=hf(t+h, w+k_3); w_{i+1}=w_i+(k_1+2k_2+2k_3+k_4)/6; global error O(h⁴).'),
  (8,  'Adams-Bashforth 4-step method',
       'w_{i+1} = w_i + h/24·(55f_i − 59f_{i-1} + 37f_{i-2} − 9f_{i-3}); explicit, 4th-order; requires 4 past values to start.'),
  (9,  'Adams-Moulton 4-step method',
       'w_{i+1} = w_i + h/24·(9f_{i+1} + 19f_i − 5f_{i-1} + f_{i-2}); implicit, 5th-order; used with Adams-Bashforth as predictor-corrector.'),
  (10, 'predictor-corrector pair',
       'Adams-Bashforth predicts w*_{i+1} (explicit); Adams-Moulton corrects using f(t_{i+1}, w*_{i+1}) (implicit); one iteration; avoids solving a nonlinear system.'),
  (11, 'absolute stability region',
       'For a method applied to y'' = λy, the set of hλ ∈ ℂ for which the numerical solution doesn''t grow; Euler''s region is |1+hλ| < 1 (a disk of radius 1 centred at −1).'),
  (12, 'stiff ODE',
       'An ODE whose solution has components with very different decay rates (eigenvalues of the Jacobian span many orders of magnitude); explicit methods require tiny h for stability even when the solution is smooth.'),
  (13, 'implicit method (stiff ODEs)',
       'Solves a nonlinear system at each step (e.g., Backward Euler: w_{i+1}=w_i+h·f(t_{i+1},w_{i+1})); much larger stability region; preferred for stiff problems.'),
  (14, 'Runge-Kutta-Fehlberg (RKF45)',
       'Pairs two RK formulas of orders 4 and 5; uses the difference as an error estimate to adaptively choose h; widely used in practice (MATLAB''s ode45 is based on Dormand-Prince, a similar idea).')
) AS c(pos, front, back)
WHERE d.slug = 'math128a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 6 — Direct Methods for Linear Systems  (§6.1–6.6)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linear-systems'
CROSS JOIN (VALUES
  (0,  'Gaussian elimination',
       'Row-reduces [A|b] to upper-triangular form via elimination, then solves by back substitution; O(n³/3) multiplications for an n×n system.'),
  (1,  'back substitution',
       'Solves upper-triangular Ux = c by computing x_n = c_n/u_{nn}, then x_{n-1},…,x_1 in reverse order; O(n²) operations.'),
  (2,  'partial pivoting',
       'At each elimination step, swap rows to place the largest |a_{kj}| in the pivot position; controls growth of round-off error; standard practice in all production codes.'),
  (3,  'complete pivoting',
       'Swaps both rows and columns to maximise the pivot; theoretically optimal bound on growth, but the column bookkeeping overhead makes it rare in practice.'),
  (4,  'LU decomposition (Doolittle)',
       'Factor A = LU where L is lower-triangular with 1s on the diagonal and U is upper-triangular; once computed, solving Ax=b for any b costs only O(n²) via forward + back substitution.'),
  (5,  'PA = LU factorisation',
       'Gaussian elimination with partial pivoting produces a permutation matrix P such that PA = LU; the standard form returned by MATLAB''s lu() and NumPy''s linalg.lu().'),
  (6,  'forward substitution',
       'Solves lower-triangular Ly = b by computing y_1 = b_1/l_{11}, then y_2, …, y_n in order; O(n²).'),
  (7,  'Cholesky decomposition',
       'For symmetric positive definite A: A = LL^T where L is lower-triangular with positive diagonal; only half the work of LU; numerically stable without pivoting.'),
  (8,  'symmetric positive definite (SPD)',
       'A symmetric matrix A is positive definite if x^T A x > 0 for all x ≠ 0; equivalently, all eigenvalues > 0; arises naturally in least squares and FEM.'),
  (9,  'condition number κ(A)',
       'κ(A) = ‖A‖ · ‖A⁻¹‖; if κ ≈ 10^k, about k digits of accuracy may be lost when solving Ax=b; κ = 1 is ideal (orthogonal matrix).'),
  (10, 'ill-conditioned system',
       'Ax=b with large κ(A); small changes in A or b can cause large relative changes in x; a symptom is near-singular behaviour without the matrix being exactly singular.'),
  (11, 'strictly diagonally dominant (SDD)',
       '|a_{ii}| > ∑_{j≠i} |a_{ij}| for every row i; SDD matrices are non-singular and Gaussian elimination without pivoting is stable; common in finite-difference discretisations.'),
  (12, 'tridiagonal system',
       'Only the main diagonal and the two adjacent diagonals are nonzero; solved in O(n) by the Thomas algorithm (LU factorisation exploiting the band structure).'),
  (13, 'Thomas algorithm',
       'Efficient O(n) LU factorisation and solve for tridiagonal systems; avoids all the work of full Gaussian elimination; key algorithm in spline and ODE boundary-value solvers.'),
  (14, 'band matrix',
       'All nonzero entries lie within p diagonals above and q diagonals below the main diagonal; LU factorisation costs O(n·p·q) instead of O(n³); critical for PDE discretisations.')
) AS c(pos, front, back)
WHERE d.slug = 'math128a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- ─────────────────────────────────────────────────────────────
-- Update card_count on the deck
-- ─────────────────────────────────────────────────────────────
UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'math128a';
