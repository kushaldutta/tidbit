-- Migration 052: MATH 185 — Introduction to Complex Analysis
-- Instructor: Zeyu Liu, UC Berkeley Fall 2026
-- Textbook: Brown & Churchill, Complex Variables and Applications (9th ed.)
-- Covers 7 topic sections + 2 exam-review sections derived from the syllabus.
--
-- Exam dates:
--   Midterm 1: Thursday, Oct 1, 2026, 9:30–10:59 am
--   Midterm 2: Thursday, Nov 12, 2026, 9:30–10:59 am
--   Final:     Tuesday, Dec 15, 2026, 3–6 pm

-- ─────────────────────────────────────────────────────────────
-- 1. Preset deck
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'math185',
  'MATH 185',
  'Introduction to Complex Analysis — Brown & Churchill, UC Berkeley Fall 2026',
  'uc-berkeley:math185:fa26',
  'system',
  true,
  '𝑖',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

-- ─────────────────────────────────────────────────────────────
-- 2. Deck sections (syllabus-aligned)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('complex-numbers',       'Complex Numbers',               'Algebra, modulus, argument, polar form, roots (§1–12)',        0),
  ('analytic-functions',    'Analytic Functions',            'Limits, C–R equations, harmonic functions (§13–27)',           1),
  ('elementary-functions',  'Elementary Functions',          'Exponential, log, trig, powers, branches (§30–40)',            2),
  ('contour-integration',   'Contour Integration',           'Contour integrals, Cauchy–Goursat, Cauchy integral formula (§41–59)', 3),
  ('series-taylor-laurent', 'Power Series & Laurent Series', 'Taylor/Maclaurin/Laurent series, singularities (§60–73)',      4),
  ('residues-poles',        'Residues & Poles',              'Residue theorem, real-integral evaluation, Rouché (§74–94)',   5),
  ('conformal-maps',        'Conformal Mappings',            'Angle preservation, Möbius transforms, Riemann theorem (§96–106)', 6),
  ('midterm-1-review',      'Midterm 1 Review',              'Complex numbers through contour integrals (§1–50)',            7),
  ('midterm-2-review',      'Midterm 2 Review',              'Series and residues (§60–87)',                                 8)
) AS v(slug, title, description, pos)
WHERE  d.slug = 'math185'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  position    = EXCLUDED.position;

-- =====================================================================
-- 3. Complex Numbers  (§1–12)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'complex-numbers'
CROSS JOIN (VALUES
  (0,  'complex number',
       'A number z = x + iy where x, y ∈ ℝ and i satisfies i² = −1; the set of all such numbers is ℂ.'),
  (1,  'real part Re(z)',
       'The real component x of z = x + iy.'),
  (2,  'imaginary part Im(z)',
       'The coefficient y of i in z = x + iy; note Im(z) is real.'),
  (3,  'modulus |z|',
       'Distance from the origin in the complex plane: |z| = √(x² + y²) for z = x + iy.'),
  (4,  'complex conjugate z̄',
       'For z = x + iy, z̄ = x − iy; reflects z across the real axis. Key property: z·z̄ = |z|².'),
  (5,  'argument arg(z)',
       'The angle θ ∈ (−π, π] that z makes with the positive real axis; multi-valued up to multiples of 2π.'),
  (6,  'principal argument Arg(z)',
       'The unique value of arg(z) in (−π, π]; denoted Arg(z) with a capital A.'),
  (7,  'polar form of a complex number',
       'z = r(cos θ + i sin θ) = re^{iθ} where r = |z| and θ = arg(z).'),
  (8,  'Euler''s formula',
       'e^{iθ} = cos θ + i sin θ for any real θ; the bridge between complex exponentials and trigonometry.'),
  (9,  'de Moivre''s theorem',
       '(cos θ + i sin θ)^n = cos(nθ) + i sin(nθ); a direct consequence of Euler''s formula.'),
  (10, 'triangle inequality (complex)',
       '|z₁ + z₂| ≤ |z₁| + |z₂|; also |z₁ − z₂| ≥ ||z₁| − |z₂||.'),
  (11, 'nth roots of unity',
       'The n solutions of z^n = 1: e^{2πik/n} for k = 0, 1, …, n−1; they form the vertices of a regular n-gon on the unit circle.'),
  (12, 'nth root of a complex number',
       'For z = re^{iθ}, the n nth roots are r^{1/n} e^{i(θ+2πk)/n} for k = 0, 1, …, n−1.'),
  (13, 'complex plane (Argand diagram)',
       'The plane with Re(z) on the horizontal axis and Im(z) on the vertical; identifies ℂ with ℝ².'),
  (14, 'open disk D(z₀, ε)',
       'The set {z ∈ ℂ : |z − z₀| < ε}; the basic neighbourhood used in complex analysis.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Analytic Functions  (§13–27)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'analytic-functions'
CROSS JOIN (VALUES
  (0,  'limit of f(z) at z₀',
       'lim_{z→z₀} f(z) = w₀ means: for every ε > 0 there is δ > 0 such that |f(z) − w₀| < ε whenever 0 < |z − z₀| < δ; the approach direction is irrelevant.'),
  (1,  'continuity of f at z₀',
       'f is continuous at z₀ if lim_{z→z₀} f(z) = f(z₀); equivalently, both real and imaginary parts are continuous there.'),
  (2,  'complex derivative f''(z₀)',
       'lim_{Δz→0} [f(z₀+Δz) − f(z₀)] / Δz, provided this limit exists and is the same for all directions of approach.'),
  (3,  'differentiable vs. analytic',
       'Differentiable at a single point is weaker; analytic (holomorphic) at z₀ means differentiable in an entire open neighbourhood of z₀.'),
  (4,  'Cauchy–Riemann (C–R) equations',
       'If f = u + iv is differentiable at z₀ = x₀ + iy₀, then ∂u/∂x = ∂v/∂y and ∂u/∂y = −∂v/∂x at that point.'),
  (5,  'sufficient condition for differentiability',
       'If the first-order partial derivatives of u and v are continuous and satisfy the C–R equations at z₀, then f is differentiable at z₀.'),
  (6,  'analytic (holomorphic) function',
       'A function differentiable at every point in an open neighbourhood of each point in its domain.'),
  (7,  'entire function',
       'A function analytic on all of ℂ; examples include polynomials, e^z, sin z, cos z.'),
  (8,  'harmonic function',
       'A real-valued function u(x,y) satisfying Laplace''s equation ∇²u = u_{xx} + u_{yy} = 0 on a domain.'),
  (9,  'harmonic conjugate',
       'Given harmonic u on a simply connected domain, there exists harmonic v such that f = u + iv is analytic; v is called the harmonic conjugate of u.'),
  (10, 'singular point (singularity)',
       'A point z₀ where f fails to be analytic; isolated if f is analytic in some deleted neighbourhood 0 < |z−z₀| < ε.'),
  (11, 'branch point',
       'A point z₀ where a multi-valued function cannot be made single-valued and continuous in any neighbourhood of z₀ (e.g., z = 0 for log z).'),
  (12, 'branch cut',
       'A curve removed from the complex plane to create a domain on which a multi-valued function becomes single-valued and analytic.'),
  (13, 'reflection principle',
       'If f is analytic on a domain symmetric about the real axis and real-valued on the real axis, then f(z̄) = f̄(z).'),
  (14, 'C–R equations in polar form',
       'r ∂u/∂r = ∂v/∂θ and ∂u/∂θ = −r ∂v/∂r; useful when f is expressed in polar coordinates.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Elementary Functions  (§30–40)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'elementary-functions'
CROSS JOIN (VALUES
  (0,  'complex exponential e^z',
       'For z = x + iy: e^z = e^x(cos y + i sin y). It is entire and periodic with period 2πi.'),
  (1,  'periodicity of e^z',
       'e^{z+2πi} = e^z for all z; the period is 2πi (not a real period — e^z is never zero).'),
  (2,  'complex logarithm log z',
       'Multi-valued inverse of e^z: log z = ln|z| + i arg(z); infinitely many values differing by 2πi.'),
  (3,  'principal value Log z',
       'Log z = ln|z| + i Arg(z) where Arg(z) ∈ (−π, π]; analytic on ℂ minus the non-positive real axis (the branch cut).'),
  (4,  'complex power z^c',
       'Defined as e^{c log z}; multi-valued in general; using principal Log gives the principal value.'),
  (5,  'complex sine and cosine',
       'sin z = (e^{iz} − e^{−iz})/(2i),  cos z = (e^{iz} + e^{−iz})/2; both entire; they can be unbounded (|sin z| can exceed 1).'),
  (6,  'complex hyperbolic functions',
       'sinh z = (e^z − e^{−z})/2,  cosh z = (e^z + e^{−z})/2; entire; related to trig by sin(iz) = i sinh z.'),
  (7,  'zeros of sin z and cos z',
       'sin z = 0 iff z = nπ (n ∈ ℤ); cos z = 0 iff z = π/2 + nπ; same as the real case.'),
  (8,  'branch of a multi-valued function',
       'A single-valued, analytic restriction of a multi-valued function to a specified domain, obtained by fixing a branch cut.'),
  (9,  'inverse trigonometric functions (complex)',
       'e.g. arcsin z = −i log(iz + √(1−z²)); multi-valued, involving complex logarithms and square roots.'),
  (10, '|e^{iθ}| = 1',
       'For any real θ, e^{iθ} lies on the unit circle; its modulus is 1 and argument is θ.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Contour Integration  (§41–59)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'contour-integration'
CROSS JOIN (VALUES
  (0,  'contour',
       'A directed piecewise-smooth curve in the complex plane; the building block of complex integration.'),
  (1,  'contour integral ∫_C f(z) dz',
       'If z(t), t ∈ [a,b] parametrises C, then ∫_C f(z) dz = ∫_a^b f(z(t)) z''(t) dt.'),
  (2,  'ML inequality',
       '|∫_C f(z) dz| ≤ M · L, where M = max|f(z)| on C and L = arc length of C; the main upper-bound tool.'),
  (3,  'antiderivative theorem',
       'If F''(z) = f(z) on a domain D (simply connected), then ∫_C f(z) dz = F(z₂) − F(z₁) for any contour from z₁ to z₂ in D; in particular ∮ f = 0.'),
  (4,  'Cauchy–Goursat theorem',
       'If f is analytic on and inside a simple closed contour C, then ∮_C f(z) dz = 0.'),
  (5,  'simply connected domain',
       'A connected domain with no holes; every closed curve in it can be shrunk to a point. The Cauchy–Goursat theorem holds here.'),
  (6,  'Cauchy integral formula',
       'For f analytic inside and on a positively oriented simple closed C and z₀ inside C: f(z₀) = (1/2πi) ∮_C f(z)/(z−z₀) dz.'),
  (7,  'Cauchy integral formula for derivatives',
       'f^{(n)}(z₀) = (n! / 2πi) ∮_C f(z)/(z−z₀)^{n+1} dz; analytic functions are infinitely differentiable.'),
  (8,  'Liouville''s theorem',
       'A bounded entire function is constant. Proof: use the Cauchy estimate to show f'' ≡ 0.'),
  (9,  'Fundamental Theorem of Algebra',
       'Every non-constant polynomial p(z) ∈ ℂ[z] has a root in ℂ. Proved by assuming no root and applying Liouville.'),
  (10, 'maximum modulus principle',
       'If f is analytic and non-constant on a domain D, then |f| attains no maximum inside D (only on ∂D).'),
  (11, 'Morera''s theorem',
       'Converse of Cauchy–Goursat: if ∮_T f = 0 for every triangle T in D, then f is analytic on D.'),
  (12, 'Cauchy''s inequality (estimate)',
       'For f analytic inside |z−z₀| ≤ R with |f| ≤ M: |f^{(n)}(z₀)| ≤ M n! / R^n.'),
  (13, 'index (winding number) n(C, z₀)',
       'The integer (1/2πi) ∮_C dz/(z−z₀) counting how many times C winds around z₀.'),
  (14, 'deformation of contours',
       'In a simply connected domain, a contour can be continuously deformed without changing ∮_C f(z) dz, as long as no singularities are crossed.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Power Series & Laurent Series  (§60–73)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'series-taylor-laurent'
CROSS JOIN (VALUES
  (0,  'power series',
       'A series ∑_{n=0}^∞ a_n(z−z₀)^n converging in an open disk |z−z₀| < R (its radius of convergence).'),
  (1,  'radius of convergence R',
       'R = 1 / limsup_{n→∞} |a_n|^{1/n} (Hadamard); also lim |a_n / a_{n+1}| when this limit exists.'),
  (2,  'Taylor''s theorem (complex)',
       'Every function analytic on |z−z₀| < R can be represented there by its Taylor series ∑ f^{(n)}(z₀)/n! · (z−z₀)^n.'),
  (3,  'Maclaurin series',
       'Taylor series centred at z₀ = 0; standard examples: e^z = ∑ z^n/n!, sin z = ∑(−1)^n z^{2n+1}/(2n+1)!, 1/(1−z) = ∑ z^n for |z| < 1.'),
  (4,  'Laurent series',
       'Generalisation ∑_{n=−∞}^∞ a_n(z−z₀)^n, valid in an annulus r < |z−z₀| < R; represents functions with an isolated singularity at z₀.'),
  (5,  'principal part of a Laurent series',
       'The sum of terms with negative powers of (z−z₀); its structure determines the type of the singularity.'),
  (6,  'isolated singularity',
       'A point z₀ where f is not analytic but is analytic in some punctured disk 0 < |z−z₀| < ε.'),
  (7,  'removable singularity',
       'An isolated singularity whose principal part is identically zero; f extends to an analytic function at z₀ by defining f(z₀) = lim_{z→z₀} f(z).'),
  (8,  'pole of order m',
       'An isolated singularity where the principal part has exactly m terms (lowest power (z−z₀)^{−m}); equivalently f(z) = g(z)/(z−z₀)^m with g analytic and g(z₀) ≠ 0.'),
  (9,  'simple pole',
       'A pole of order m = 1; the principal part is a single term a_{−1}/(z−z₀).'),
  (10, 'essential singularity',
       'An isolated singularity with infinitely many non-zero principal part terms; e.g. e^{1/z} at z = 0. Picard''s theorem: f takes every value except at most one in any neighbourhood.'),
  (11, 'Riemann''s removable singularity theorem',
       'If f is bounded in a punctured neighbourhood of z₀ and analytic there, then z₀ is a removable singularity.'),
  (12, 'uniqueness of power series',
       'If f(z) = ∑ a_n(z−z₀)^n on a disk, the coefficients are uniquely determined: a_n = f^{(n)}(z₀)/n!.'),
  (13, 'zero of order m',
       'z₀ is a zero of order m if f(z₀) = f''(z₀) = … = f^{(m−1)}(z₀) = 0 but f^{(m)}(z₀) ≠ 0; equivalently f(z) = (z−z₀)^m g(z) with g analytic and g(z₀) ≠ 0.'),
  (14, 'uniform convergence of power series',
       'A power series converges uniformly (and absolutely) on every compact subset of its open disk of convergence, so it can be integrated term-by-term.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Residues & Poles  (§74–94)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'residues-poles'
CROSS JOIN (VALUES
  (0,  'residue Res(f, z₀)',
       'The coefficient a_{−1} of (z−z₀)^{−1} in the Laurent series of f at z₀; equals (1/2πi) ∮ f dz around a small loop enclosing z₀.'),
  (1,  'Cauchy''s residue theorem',
       '∮_C f(z) dz = 2πi ∑_k Res(f, z_k), summing over all isolated singularities z_k inside C.'),
  (2,  'residue at a simple pole',
       'Res(f, z₀) = lim_{z→z₀} (z−z₀) f(z). If f = p/q with q''(z₀) ≠ 0 and p(z₀) ≠ 0, then Res = p(z₀)/q''(z₀).'),
  (3,  'residue at a pole of order m',
       'Res(f, z₀) = [1/(m−1)!] lim_{z→z₀} d^{m−1}/dz^{m−1} [(z−z₀)^m f(z)].'),
  (4,  'evaluating ∫_{−∞}^∞ f(x) dx by residues',
       'Close the contour with a large semicircle in the upper (or lower) half-plane; as R→∞ the semicircle integral vanishes, leaving the real integral = 2πi × (sum of residues in UHP).'),
  (5,  'Jordan''s lemma',
       'If |f(z)| → 0 uniformly on the upper semicircle as R→∞ and a > 0, then ∫_{semicircle} f(z) e^{iaz} dz → 0; used to evaluate ∫ f(x) e^{iax} dx.'),
  (6,  'indented contours',
       'When f has a simple pole on the real axis, indent around it with a small semicircle of radius ε → 0; its contribution is πi Res(f, x₀).'),
  (7,  'argument principle',
       '(1/2πi) ∮_C (f''(z)/f(z)) dz = Z − P, where Z = number of zeros and P = number of poles of f inside C (with multiplicity).'),
  (8,  'Rouché''s theorem',
       'If f, g analytic inside and on C and |g(z)| < |f(z)| on C, then f+g and f have the same number of zeros inside C.'),
  (9,  'meromorphic function',
       'Analytic on a domain except for isolated poles; a ratio of two analytic functions is meromorphic.'),
  (10, 'Mittag-Leffler partial fractions',
       'A meromorphic function can be expressed as a sum of its principal parts at each pole plus an entire function.'),
  (11, 'real integrals via trigonometric substitution',
       'For ∫_0^{2π} R(cos θ, sin θ) dθ, substitute z = e^{iθ}, dz = iz dθ, and apply the residue theorem on |z| = 1.'),
  (12, 'branch-cut integrals',
       'For ∫_0^∞ x^{α−1} f(x) dx, use a keyhole contour wrapping around the branch cut of z^{α−1}; residues give the integral.'),
  (13, 'order of a pole from zero of denominator',
       'If f = p/q and q has a zero of order m at z₀ while p(z₀) ≠ 0, then f has a pole of order m at z₀.'),
  (14, 'residue at infinity',
       'Res(f, ∞) = −Res(f(1/z)/z², 0); sum of all finite residues plus Res at ∞ equals zero for a rational function.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Conformal Mappings  (§96–106)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'conformal-maps'
CROSS JOIN (VALUES
  (0,  'conformal mapping',
       'An analytic function f with f''(z) ≠ 0; it preserves angles and orientation between intersecting curves locally.'),
  (1,  'angle-preserving property',
       'If two smooth curves meet at angle α at z₀ and f''(z₀) ≠ 0, their images under f meet at the same angle α.'),
  (2,  'local scaling factor |f''(z₀)|',
       'A conformal map scales infinitesimal lengths near z₀ by the factor |f''(z₀)|; the scaling is the same in all directions.'),
  (3,  'Möbius (linear fractional) transformation',
       'T(z) = (az+b)/(cz+d) with ad−bc ≠ 0; maps the extended complex plane to itself, sending circles and lines to circles and lines.'),
  (4,  'cross-ratio',
       '(z−z₁)(z₂−z₃) / [(z−z₃)(z₂−z₁)]; preserved by Möbius transformations; used to construct a unique map sending three given points to three target points.'),
  (5,  'maps of standard regions',
       'Key examples: z² maps the upper half-disk to the upper half-plane; e^z maps a horizontal strip to a half-plane; 1/2(z + 1/z) maps the exterior of |z|=1 to ℂ\[−1,1].'),
  (6,  'Riemann mapping theorem',
       'Any simply connected proper open subset of ℂ can be mapped conformally (bijectively) onto the open unit disk D; the map is unique up to a Möbius transformation of D.'),
  (7,  'Schwarz–Christoffel transformation',
       'Explicit formula for a conformal map from the upper half-plane (or unit disk) to the interior of a given polygon; used in applied mathematics.'),
  (8,  'Schwarz lemma',
       'If f : D → D is analytic with f(0) = 0, then |f(z)| ≤ |z| and |f''(0)| ≤ 1; equality forces f(z) = e^{iθ}z.'),
  (9,  'harmonic function and conformal maps',
       'If u is harmonic on D and f : D'' → D is conformal, then u ∘ f is harmonic on D''; conformal maps preserve Laplace''s equation.'),
  (10, 'bilinear (Möbius) map uniqueness',
       'A Möbius transformation is uniquely determined by specifying the images of any three distinct points.')
) AS c(pos, front, back)
WHERE  d.slug = 'math185'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Update deck card count
-- =====================================================================
UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'math185';
