-- Migration 030: MATH 54 preset deck sections + cards.
-- Topics: Berkeley Math 54 catalog (linear algebra + ODEs + Fourier) and Axler LADR themes.
-- Definitions omit the term on the back for quiz/recall modes.
-- Safe to re-run: sections use ON CONFLICT DO NOTHING; cards skip sections that already have cards.

-- =====================================================================
-- 1. MATH 54 topic sections
-- =====================================================================

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.position, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('systems-matrices', 'Systems & Matrices',
   'Row reduction, matrix arithmetic, and solving linear systems', 0),
  ('vector-spaces', 'Vector Spaces',
   'Subspaces, linear combinations, span, independence, bases, and dimension', 1),
  ('linear-maps', 'Linear Maps & Rank',
   'Linear transformations, null space, column space, and rank–nullity', 2),
  ('determinants', 'Determinants',
   'Determinant properties, invertibility, and geometric meaning', 3),
  ('eigenvalues', 'Eigenvalues & Diagonalization',
   'Characteristic polynomial, eigenvectors, symmetric matrices', 4),
  ('inner-products', 'Inner Products & Orthogonality',
   'Dot product, orthonormal bases, projections, and least squares', 5),
  ('second-order-odes', 'Second-Order ODEs',
   'Homogeneous and nonhomogeneous linear equations with constant coefficients', 6),
  ('systems-odes', 'Systems of ODEs',
   'First-order linear systems with constant coefficient matrices', 7),
  ('fourier-series', 'Fourier Series',
   'Orthogonal expansions and periodic functions on an interval', 8)
) AS v(slug, title, description, position)
WHERE  d.slug = 'math-54'
ON CONFLICT (deck_id, slug) DO NOTHING;

-- =====================================================================
-- Systems & Matrices
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'systems-matrices'
CROSS JOIN (VALUES
  (0,  'linear system',            'A collection of equations that are linear in the unknowns; often written as Ax = b.'),
  (1,  'coefficient matrix',       'The matrix whose entries are the coefficients of the variables, one equation per row.'),
  (2,  'augmented matrix',         'The coefficient matrix with an extra column holding the right-hand-side constants.'),
  (3,  'row echelon form',         'Each leading entry is to the right of the one above; rows of zeros lie at the bottom.'),
  (4,  'reduced row echelon form', 'Leading entries are 1 and are the only nonzero entries in their columns.'),
  (5,  'pivot',                    'The first nonzero entry in a row of a matrix in echelon form.'),
  (6,  'free variable',            'A variable that is not a pivot column; infinitely many solutions may involve it.'),
  (7,  'consistent system',        'Has at least one solution; an inconsistent system has none.'),
  (8,  'matrix addition',          'Add corresponding entries; requires both operands to have the same dimensions.'),
  (9,  'scalar multiplication',    'Multiply every entry of a matrix by the same number.'),
  (10, 'matrix multiplication',    'The (i, j) entry of AB is the dot product of row i of A with column j of B.'),
  (11, 'identity matrix',          'Square matrix with ones on the diagonal and zeros elsewhere; acts as multiplicative one.'),
  (12, 'inverse matrix',           'For square A, a matrix A⁻¹ with A A⁻¹ = I when it exists.'),
  (13, 'transpose',                'Flip rows and columns: (Aᵀ)ᵢⱼ = Aⱼᵢ.'),
  (14, 'elementary row operation', 'Swap two rows, multiply a row by a nonzero scalar, or add a multiple of one row to another.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Vector Spaces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'vector-spaces'
CROSS JOIN (VALUES
  (0,  'vector space',             'A set closed under addition and scalar multiplication satisfying the vector space axioms.'),
  (1,  'subspace',                 'A subset of a vector space that is itself a vector space under the same operations.'),
  (2,  'linear combination',       'A sum of scalar multiples of vectors from a given set.'),
  (3,  'span',                     'The set of all linear combinations of a given list of vectors.'),
  (4,  'linearly independent',     'No vector in the list is a linear combination of the others; only the trivial combination gives zero.'),
  (5,  'linearly dependent',       'At least one vector is redundant; a nontrivial combination of the list equals zero.'),
  (6,  'basis',                      'A linearly independent list that spans the space; every vector is a unique combination of basis vectors.'),
  (7,  'dimension',                'The number of vectors in any basis of a finite-dimensional space.'),
  (8,  'standard basis of ℝⁿ',     'The vectors e₁, …, eₙ with a 1 in one coordinate and 0 elsewhere.'),
  (9,  'column space',             'The span of the columns of a matrix; all outputs Av as v ranges over the domain.'),
  (10, 'homogeneous system',       'Ax = 0; always has at least the zero solution.'),
  (11, 'trivial solution',         'The solution x = 0 to a homogeneous system.'),
  (12, 'parametric vector form',   'Expresses the solution set using free variables as parameters times fixed direction vectors.'),
  (13, 'ℝⁿ',                       'The set of n-tuples of real numbers with componentwise addition and scalar multiplication.'),
  (14, 'direct sum (informal)',    'V = U ⊕ W when every vector splits uniquely as u + w with u ∈ U and w ∈ W and U ∩ W = {0}.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Linear Maps & Rank
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linear-maps'
CROSS JOIN (VALUES
  (0,  'linear transformation',  'Preserves addition and scalar multiplication: T(u + v) = T(u) + T(v) and T(cv) = c T(v).'),
  (1,  'null space',               'The set of all vectors mapped to zero; also called the kernel.'),
  (2,  'kernel',                   'Synonym for null space: {v : T(v) = 0}.'),
  (3,  'range',                    'The set of all outputs T(v); for a matrix, the column space.'),
  (4,  'rank',                     'The dimension of the column space; number of pivot columns in echelon form.'),
  (5,  'nullity',                  'The dimension of the null space; number of free variables in Ax = 0.'),
  (6,  'rank–nullity theorem',     'For an m×n matrix, rank + nullity = n (number of columns).'),
  (7,  'injective linear map',     'Maps distinct inputs to distinct outputs; null space is {0}.'),
  (8,  'surjective linear map',    'Every vector in the codomain is an output; range equals the codomain.'),
  (9,  'standard matrix of T',     'Columns are T(e₁), …, T(eₙ) in the standard basis; matrix multiplication implements T.'),
  (10, 'composition of maps',      'Applying one linear map after another; corresponds to multiplying their standard matrices.'),
  (11, 'change of basis',          'Rewriting the same vector or linear map using different coordinate systems via transition matrices.'),
  (12, 'isomorphism',              'A bijective linear map between vector spaces of the same finite dimension.'),
  (13, 'overdetermined system',    'More equations than unknowns; often inconsistent, but least squares may approximate a solution.'),
  (14, 'underdetermined system',   'Fewer independent equations than unknowns; typically infinitely many solutions if consistent.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Determinants
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'determinants'
CROSS JOIN (VALUES
  (0,  'determinant (2×2)',        'For [[a,b],[c,d]], the value ad − bc.'),
  (1,  'determinant (3×3)',        'Can be computed by cofactor expansion along any row or column.'),
  (2,  'det(A) = 0',               'Holds iff the matrix is not invertible; rows/columns are linearly dependent.'),
  (3,  'det(AB)',                  'Equals det(A) det(B) for square matrices A and B of the same size.'),
  (4,  'det(Aᵀ)',                  'Equals det(A) for any square matrix A.'),
  (5,  'effect on volume',         'The absolute value scales n-dimensional volume; sign records orientation reversal.'),
  (6,  'invertible matrix test',   'Square A is invertible iff det(A) ≠ 0 iff rank(A) equals the number of rows.'),
  (7,  'cofactor',                 'A signed minor used in expansion formulas; sign alternates in a checkerboard pattern.'),
  (8,  'adjugate (classical)',     'Transpose of the cofactor matrix; related to A⁻¹ by A⁻¹ = (1/det A) adj(A) when det A ≠ 0.'),
  (9,  'row operation effect',     'Swapping two rows flips the sign; scaling a row scales det; adding a multiple of a row does not change det.'),
  (10, 'triangular matrix',        'If A is upper or lower triangular, det(A) is the product of diagonal entries.'),
  (11, 'singular matrix',          'A square matrix with zero determinant; not invertible.'),
  (12, 'Cramer''s rule',           'Expresses each variable in a nonsingular linear system as a ratio of determinants.'),
  (13, 'det and eigenvalues',      'The product of eigenvalues (with multiplicity) equals det(A) for an n×n matrix.'),
  (14, 'det and trace',            'The sum of eigenvalues equals the trace (sum of diagonal entries) for any square matrix.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Eigenvalues & Diagonalization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'eigenvalues'
CROSS JOIN (VALUES
  (0,  'eigenvector',              'A nonzero vector v with Av = λv for some scalar λ; direction unchanged by A.'),
  (1,  'eigenvalue',               'The scalar λ in Av = λv; found from det(A − λI) = 0.'),
  (2,  'characteristic polynomial', 'det(A − λI) is a degree-n polynomial whose roots are the eigenvalues.'),
  (3,  'eigenspace',               'For eigenvalue λ, the null space of (A − λI); all eigenvectors plus zero.'),
  (4,  'algebraic multiplicity',   'How many times λ appears as a root of the characteristic polynomial.'),
  (5,  'geometric multiplicity',   'Dimension of the eigenspace for λ; never exceeds algebraic multiplicity.'),
  (6,  'diagonalizable matrix',    'A = PDP⁻¹ with D diagonal; equivalent to having a basis of eigenvectors.'),
  (7,  'similar matrices',           'B = P⁻¹AP for invertible P; share eigenvalues and characteristic polynomial.'),
  (8,  'symmetric matrix',         'Equals its transpose; always diagonalizable with real eigenvalues and orthogonal eigenvectors.'),
  (9,  'spectral theorem (real)',  'Every real symmetric matrix has an orthonormal basis of eigenvectors with real eigenvalues.'),
  (10, 'orthogonal diagonalization', 'A = QΛQᵀ with Q orthogonal and Λ diagonal; applies to symmetric A.'),
  (11, 'defective matrix',         'Not diagonalizable: some eigenvalue''s geometric multiplicity is less than algebraic.'),
  (12, 'powers of a matrix',       'If A = PDP⁻¹, then A^k = P D^k P⁻¹; easy when D is diagonal.'),
  (13, 'zero eigenvalue',          'Occurs iff A is singular; the eigenspace for 0 is the null space.'),
  (14, 'trace and eigenvalues',    'The sum of eigenvalues (with multiplicity) equals the sum of diagonal entries of A.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Inner Products & Orthogonality
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'inner-products'
CROSS JOIN (VALUES
  (0,  'dot product',              'For u, v in ℝⁿ, u · v = u₁v₁ + … + uₙvₙ; measures alignment and enables length.'),
  (1,  'inner product (ℝⁿ)',       'The standard dot product; satisfies symmetry, linearity, and positive definiteness.'),
  (2,  'norm',                     '||v|| = √(v · v); length of a vector in an inner product space.'),
  (3,  'orthogonal vectors',       'Two vectors whose inner product is zero; in ℝⁿ, perpendicular directions.'),
  (4,  'orthogonal set',           'Every pair of distinct vectors in the set has inner product zero.'),
  (5,  'orthonormal set',            'Orthogonal set of unit vectors; each has norm 1.'),
  (6,  'orthogonal complement',    'All vectors orthogonal to every vector in a given subspace W.'),
  (7,  'Gram–Schmidt process',     'Turns an independent list into an orthonormal basis by subtracting projections stepwise.'),
  (8,  'orthogonal projection',    'The closest point in subspace W to a given vector; difference is orthogonal to W.'),
  (9,  'orthogonal matrix',        'Columns form an orthonormal set; QᵀQ = I and Q⁻¹ = Qᵀ.'),
  (10, 'least squares solution',   'Minimizes ||Ax − b|| when Ax = b has no exact solution; normal equations AᵀAx = Aᵀb.'),
  (11, 'normal equations',         'AᵀAx = Aᵀb characterizes least squares solutions when A has full column rank.'),
  (12, 'Cauchy–Schwarz inequality', '|u · v| ≤ ||u|| ||v||; equality iff u and v are parallel.'),
  (13, 'triangle inequality',      '||u + v|| ≤ ||u|| + ||v|| for any vectors u and v.'),
  (14, 'QR factorization (idea)',  'A = QR with Q orthonormal columns and R upper triangular; used in stable least squares.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Second-Order ODEs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'second-order-odes'
CROSS JOIN (VALUES
  (0,  'second-order linear ODE',  'An equation involving y, y′, and y″ with coefficients depending only on t (or constant).'),
  (1,  'homogeneous ODE',          'Right-hand side is zero; solutions form a vector space.'),
  (2,  'nonhomogeneous ODE',       'Has a forcing term g(t); general solution = homogeneous + one particular solution.'),
  (3,  'characteristic equation',  'For ay″ + by′ + cy = 0, replace y with e^(rt) to get ar² + br + c = 0.'),
  (4,  'distinct real roots',      'If r₁ ≠ r₂, general solution c₁e^(r₁t) + c₂e^(r₂t).'),
  (5,  'repeated real root',       'If r is a double root, use c₁e^(rt) + c₂ t e^(rt).'),
  (6,  'complex conjugate roots',  'If r = α ± βi, use e^(αt)(c₁ cos βt + c₂ sin βt).'),
  (7,  'particular solution',      'Any single solution to the full nonhomogeneous equation.'),
  (8,  'method of undetermined coefficients', 'Guess a particular solution form based on g(t) and adjust if it duplicates homogeneous solutions.'),
  (9,  'variation of parameters',  'Build a particular solution using integrals when undetermined coefficients does not apply.'),
  (10, 'superposition principle',  'If y₁ and y₂ solve the homogeneous equation, so does c₁y₁ + c₂y₂.'),
  (11, 'initial value problem',    'Specify y(t₀) and y′(t₀) to pin down the constants in the general solution.'),
  (12, 'damped oscillation',       'Complex roots with negative real part give decaying sine–cosine motion.'),
  (13, 'critical damping',         'Repeated root at the boundary between oscillatory and overdamped behavior.'),
  (14, 'Wronskian (2nd order)',    'W = y₁y₂′ − y₁′y₂; if W ≠ 0 on an interval, y₁ and y₂ are linearly independent solutions.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Systems of ODEs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'systems-odes'
CROSS JOIN (VALUES
  (0,  'first-order linear system', 'Written x′(t) = A x(t) + g(t) with x a vector of unknown functions.'),
  (1,  'homogeneous system',        'g(t) = 0; solutions form a vector space of dimension n for n×n A.'),
  (2,  'phase plane',               'Plot trajectories (x₁, x₂) for 2×2 systems to visualize stability and direction fields.'),
  (3,  'eigenvalue method',         'For x′ = Ax, try x = e^(λt)v; λ and v come from Av = λv.'),
  (4,  'general solution from eigenpairs', 'With n independent eigenvectors, combine cᵢ e^(λᵢt) vᵢ.'),
  (5,  'deficient eigenvalue in systems', 'If geometric multiplicity < algebraic, may need te^(λt)v type terms (Jordan blocks).'),
  (6,  'stable node',               'Real eigenvalues both negative; trajectories approach the origin along eigendirections.'),
  (7,  'unstable node',             'Real eigenvalues both positive; trajectories leave the origin exponentially.'),
  (8,  'saddle point',              'One positive and one negative eigenvalue; stable and unstable manifolds through origin.'),
  (9,  'spiral (focus)',            'Complex eigenvalues with nonzero real part; trajectories spiral in or out.'),
  (10, 'center',                    'Pure imaginary eigenvalues; closed orbits (neutrally stable) in the linear case.'),
  (11, 'matrix exponential (idea)', 'Solution to x′ = Ax with x(0) = x₀ can be written x(t) = e^(At) x₀ when defined.'),
  (12, 'coupled springs model',     'Often yields a 2×2 system whose eigenvalues encode oscillation frequencies and damping.'),
  (13, 'diagonalizable A shortcut', 'If A = PDP⁻¹, then e^(At) = P e^(Dt) P⁻¹ with e^(Dt) diagonal exponentials.'),
  (14, 'equilibrium point',         'A constant solution where x′ = 0; for x′ = Ax, usually x = 0 unless A is singular.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Fourier Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'fourier-series'
CROSS JOIN (VALUES
  (0,  'Fourier series',           'An expansion of a periodic function as a sum of sines and cosines (or complex exponentials).'),
  (1,  'fundamental period',       'The smallest T > 0 such that f(t + T) = f(t) for all t in the domain.'),
  (2,  'fundamental frequency',    'ω₀ = 2π/T; the frequency of the lowest harmonic in the expansion.'),
  (3,  'Fourier coefficients',     'Integrals over one period that measure how much of each sine/cosine mode appears in f.'),
  (4,  'a₀ term',                  'The average (DC) value of f over one period; half the constant term in the cosine series.'),
  (5,  'aₙ cos(nω₀t) terms',       'Capture even-symmetric oscillatory content at harmonics n = 1, 2, 3, …'),
  (6,  'bₙ sin(nω₀t) terms',       'Capture odd-symmetric oscillatory content at harmonics n = 1, 2, 3, …'),
  (7,  'orthogonality of trig modes', 'Sine and cosine modes on [−T/2, T/2] are mutually orthogonal with appropriate inner product.'),
  (8,  'Parseval''s theorem (idea)', 'Total energy of f equals a sum involving squared magnitudes of Fourier coefficients.'),
  (9,  'even extension',           'Reflect f about the y-axis to force only cosine (and constant) terms in the series.'),
  (10, 'odd extension',            'Reflect f through the origin to force only sine terms in the series.'),
  (11, 'Gibbs phenomenon',         'Near a jump discontinuity, partial sums overshoot; overshoot does not vanish as n → ∞.'),
  (12, 'convergence (piecewise smooth)', 'Under standard conditions, the series converges to the average of left and right limits at jumps.'),
  (13, 'complex Fourier series',   'Uses e^(inω₀t) modes; coefficients are integrals with complex exponentials.'),
  (14, 'applications in Math 54',  'Decompose periodic forcing in ODEs; pick out resonant frequencies matching system eigenvalues.')
) AS c(pos, front, back)
WHERE  d.slug = 'math-54'
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
WHERE d.id = sub.deck_id AND d.slug = 'math-54';
