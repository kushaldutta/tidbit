-- Migration 077: EECS 127 — Optimization Models in Engineering, new preset deck.
-- UC Berkeley Fall 2026: Somayeh Sojoudi, MoWe 12:30-13:59, Gateway 1210.
-- Co-listed EECS 227AT (same lecture; credit restriction vs 127 / EE 127/227AT).
-- Catalog: optimization models and applications (ML, stats, decision, control),
-- emphasis on tractable problems (linear / constrained least squares).
-- Texts: Calafiore & El Ghaoui, Optimization Models (CEG); Boyd & Vandenberghe
-- Convex Optimization (BV). Sequence follows recent 127 calendars (Sojoudi /
-- Ranade): lin alg review, SVD/PCA, LS/ridge, convexity, descent, duality,
-- KKT, LP/QP/SOCP, Lasso/SVM. Distinct from 16A (intro SVD/LS, no convex opt)
-- and from CS 189 (ML algorithms, not a models course). Prereq historically
-- 16A/16B or MATH 54 + CS 70 + MATH 53; current catalog also lists EE 66/64.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'eecs127',
  'EECS 127',
  'Optimization models — LS, convexity, duality, KKT, LP/QP (Sojoudi / El Ghaoui)',
  'uc-berkeley:eecs127:fa26',
  'system',
  true,
  '📐',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

UPDATE public.classes
SET title = 'Optimization Models in Engineering'
WHERE id = 'uc-berkeley:eecs127:fa26';

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'eecs127');

DELETE FROM public.tidbits
WHERE category_id = 'eecs127';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs127');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs127');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('linalg', 'Vectors, Norms, QR & Projections',
   'Norms, Gram-Schmidt, four subspaces (CEG 2-4)', 0),
  ('sym',    'Symmetric Matrices & Eigenvalues',
   'Spectral theorem, PSD cones, Rayleigh (CEG 5)', 1),
  ('svd',    'SVD, PCA & Low-Rank Approximation',
   'Eckart-Young, PCA as an optimization (CEG 5)', 2),
  ('lstsq',  'Least Squares, Min-Norm & Ridge',
   'Normal equations, Tikhonov, three views of ridge', 3),
  ('convex', 'Convex Sets, Functions & Problems',
   'Convexity tests, epigraphs, standard form (CEG 8, BV 2-4)', 4),
  ('gd',     'Gradient Descent & SGD',
   'Step sizes, Lipschitz, stochastic variants (CEG 12)', 5),
  ('dual',   'Lagrange Duality',
   'Lagrangian, dual function, weak and strong duality (BV 5)', 6),
  ('kkt',    'KKT, Slater & Conjugates',
   'Stationarity, complementary slackness, Fenchel (light)', 7),
  ('models', 'LP, QP & SOCP',
   'Canonical models, CVX, when to pick which', 8),
  ('apps',   'Lasso, SVM & Control Apps',
   'L1, max-margin, LQR/least-squares control', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'eecs127'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Vectors, Norms, QR & Projections
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linalg'
CROSS JOIN (VALUES
  (0,  '127 in one sentence',
       'Write engineering problems as optimization models you can actually solve: least squares, LP, QP, and convex programs, with enough linear algebra (QR, SVD, PSD) to see why the algorithms work. FA26: Sojoudi, co-listed 227AT. Texts: Calafiore & El Ghaoui (CEG) plus Boyd & Vandenberghe (BV). 16A showed you SVD/LS; 127 makes them models with duals, KKT, and CVX. Credit restriction vs 227AT / old EE 127.'),
  (1,  'optimization problem (standard form)',
       'minimize f0(x) subject to fi(x) less than or equal to 0 (inequalities) and hj(x) = 0 (equalities). x in R^n is the decision variable. 127: a model is this triple (objective, constraints, variable), not a Python loop. Feasible set is the x that satisfy the constraints. Optimal value p-star may be -infinity (unbounded) or the problem may be infeasible (p-star = +infinity by convention).'),
  (2,  'vector norms 127 uses',
       'p-norm ||x||_p = (sum |x_i|^p)^{1/p} for p at least 1. l2 is Euclidean (energy). l1 is sum of abs (sparsity, Lasso). l-infinity is max |x_i| (uniform error). All norms are convex. 127: changing the norm changes the model — LS is l2, LP residuals are often l1 or l-infinity. CEG Ch. 2-3.'),
  (3,  'inner product and Cauchy-Schwarz',
       'inner(x,y) = x^T y (real). |x^T y| is at most ||x||_2 ||y||_2. Duality of norms: |x^T y| is at most ||x||_p ||y||_q when 1/p + 1/q = 1. 127: the dual of l1 is l-infinity, which is why the dual of a Lasso-ish problem has box constraints. Do not skip this when dualizing.'),
  (4,  'linear maps and rank',
       'A in R^{m by n} maps x to Ax. rank(A) = dim Col(A) = dim Row(A). Full column rank: ker(A) = {0}, LS unique. Full row rank: Ax = b always has a solution if it is consistent in the right space... actually Ax=b has a solution for every b iff rank = m. 127: rank defects are why you add ridge or switch to min-norm.'),
  (5,  'four fundamental subspaces',
       'Col(A), ker(A), Col(A^T), ker(A^T). Orthogonal pairs: ker(A) perp Row(A), ker(A^T) perp Col(A). dim ker + rank = n. 127: least squares lives in Col(A); min-norm lives in Row(A). Residual of LS is in ker(A^T). Same picture as 16A, now the start of every modeling lecture.'),
  (6,  'orthogonal projection onto Col(A)',
       'If A has full column rank, P = A (A^T A)^{-1} A^T, P^2 = P = P^T. Px is the closest point in Col(A) to x in l2. 127: this P is the LS fitted values. If columns are orthonormal, P = A A^T. Never project with A A^{-1} when A is tall.'),
  (7,  'Gram-Schmidt and QR',
       'QR: A = QR with Q thin orthonormal, R upper triangular (full column rank A). Gram-Schmidt builds Q one column at a time. Solving R x = Q^T b is LS without forming A^T A. 127: QR is the grown-up normal-equation. Ill-conditioned A still hurts R, but less than squaring the condition number.'),
  (8,  'min-norm solution of underdetermined Ax = b',
       'If A is fat and full row rank, solutions are an affine space. The min-||x||_2 solution is x = A^T (A A^T)^{-1} b, i.e. in the row space. 127: this is the right inverse. Among all interpolators, pick the smallest energy. Dual view later: Lagrange multiplier for Ax=b is that (A A^T)^{-1} b.'),
  (9,  'pseudoinverse preview',
       'A^+ inverts the nonzero singular values and transposes. Full column rank: A^+ = (A^T A)^{-1} A^T (left). Full row rank: A^+ = A^T (A A^T)^{-1} (right). 127: LS is x-hat = A^+ b in both skinny and fat cases (min-norm LS if rank-deficient). SVD section makes this precise.'),
  (10, 'condition number (l2)',
       'κ(A) = σ_max / σ_min for invertible A. Large κ: relative error in b is amplified in x. Forming A^T A squares κ. 127: ridge exists because real A is often ill-conditioned (nearly dependent features). Quote κ before you invert anything in a Jupyter notebook.'),
  (11, 'affine sets and subspaces',
       'Subspace: closed under 0, addition, scaling. Affine: translate of a subspace (line not through origin). Convex combination is later; affine combination allows coefficients summing to 1 with negatives allowed. 127: {x : Ax = b} is affine. Optimization over an affine set is equality-constrained.'),
  (12, 'why 127 starts with lin alg not Boyd Ch. 1',
       'CEG spends the first weeks making projections, QR, and symmetric matrices automatic so LS, PCA, and PSD constraints are not magic. BV assumes you already speak this. 127 exams: a "convex problem" question still begins with a rank or a projection. 16A was signals; here the vector is a decision variable.'),
  (13, 'CVX / disciplined convex programming (lab slogan)',
       'You describe a model (min, subject to) in a language that only allows convex atoms. The solver gets a cone program. 127 outcome 4: prototype in CVXPY/CVX. If DCP rejects your model, it may still be convex — you wrote it in a non-DCP way — or it is actually nonconvex (bilinear, x^T Q x with Q indefinite).'),
  (14, 'lin-alg exam move',
       'Name the four subspaces. Say whether the problem is LS (tall) or min-norm (fat). Write the projector or the QR solve, not A^{-1}. Check rank. If they ask "closest point," it is a projection. If they ask "smallest x on Ax=b," it is the right inverse. Units: x is the decision, not a time signal.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 2. Symmetric Matrices & Eigenvalues
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sym'
CROSS JOIN (VALUES
  (0,  'spectral theorem (real symmetric)',
       'A = A^T real implies A = Q Λ Q^T with Q orthogonal and Λ real diagonal. Orthonormal eigenbasis for free. 127: quadratic forms x^T A x = sum λ_i y_i^2 in eigen-coordinates y = Q^T x. Sign of λ decides convexity of the quadratic. Nonsymmetric matrices can have complex λ — do not spectral-theorem those.'),
  (1,  'quadratic form',
       'q(x) = x^T P x (P symmetric w.l.o.g., replace P by (P+P^T)/2). Completing the square / eigen-expansion reads geometry: ellipsoids if P is PD. 127: QP objectives are quadratic forms plus linear terms. Hessian of a C^2 function is the local P.'),
  (2,  'positive semidefinite (PSD)',
       'P ⪰ 0 means x^T P x at least 0 for all x, iff all eigenvalues at least 0, iff P = B^T B for some B. PD (≻ 0): x^T P x greater than 0 for x not 0, iff λ_min greater than 0. 127 writes ⪰; we say "P is PSD." The PSD cone is convex. A QP is convex iff the Hessian is PSD.'),
  (3,  'Rayleigh quotient',
       'R(x) = (x^T A x) / (x^T x) for x not 0. Range is [λ_min, λ_max] for symmetric A. Maximizing x^T A x on ||x||_2 = 1 is λ_max, achieved at the top eigenvector. 127: this is a constrained optimization problem with an equality; Lagrange recovers A x = λ x. PCA is Rayleigh on the covariance.'),
  (4,  'eigenvalue optimization slogans',
       'λ_max is convex in the symmetric matrix (as a function of A). λ_min is concave. Trace is linear. log det is concave on PD matrices. 127: these are the atoms behind SDP (usually 227A/later). Even without SDP, "minimize λ_max(A(x))" is a convex model when A is affine in x.'),
  (5,  'matrix square root and Cholesky',
       'PD P has a unique PD square root. Cholesky: P = L L^T, L lower triangular. 127: numerically factor PD Hessians; do not eigen-decompose a 2x2 by hand if Cholesky is easier. If Cholesky fails, P was not PD (indefinite QP, saddle).'),
  (6,  'trace and Frobenius',
       'tr(A^T B) is the Frobenius inner product. ||A||_F^2 = tr(A^T A) = sum σ_i^2. 127: low-rank approximation error is often measured in Frobenius (Eckart-Young). Cyclic property: tr(ABC) = tr(BCA). Gradients of tr(A^T X) w.r.t. X are easy — vector calculus week uses this.'),
  (7,  'diagonalization vs SVD',
       'Eigen: square, preferably symmetric. SVD: any shape. For PSD, singular values equal eigenvalues. For a general square matrix, eigen can be complex and does not give an orthogonal basis. 127: PCA uses eigen of the covariance (symmetric) or SVD of the data matrix — same numbers, better numerics via SVD.'),
  (8,  'PSD cone is not polyhedral',
       'The set S_+^n of n by n PSD matrices is a closed convex cone, not a polyhedron for n at least 2 (curved boundary). 127: LP uses polyhedra; SDP uses this cone. You will mostly use PSD as a constraint "covariance ⪰ 0" or "P ⪰ 0 in a Lyapunov inequality" in the control app week, not a full SDP solver.'),
  (9,  'congruence and inertia (light)',
       'Sylvester: the number of positive/negative/zero eigenvalues is invariant under P |-> B^T P B for invertible B. 127: completing the square or change of variables does not flip convexity of a quadratic. If you rotate coordinates, PD stays PD.'),
  (10, 'operator vs Frobenius vs spectral norm',
       'Spectral/operator 2-norm of A is σ_max (largest gain ||Ax||_2 / ||x||_2). Frobenius is sqrt(sum squares of entries). 127: induced-norm constraints are spectral; least-squares residuals are often Frobenius on matrices. Do not mix "the norm of A" without saying which.'),
  (11, 'why symmetric Hessians',
       'Mixed partials commute (C^2): Hessian is symmetric. Newton step solves H d = -g. If H is PD, the local model is a convex QP and the step is a descent direction. 127 Newton week: this is why we spent time on PD. Indefinite H means a saddle — Newton can go uphill.'),
  (12, 'covariance is PSD',
       'Sample covariance (1/m) X_c^T X_c (centered) is always PSD, rank at most min(m-1, n). 127: PCA eigenvectors are covariance eigenpairs. If you "regularize" covariance as C + ε I, you make it PD (ridge in disguise).'),
  (13, '16A vs 127 on eigen',
       '16A: modes of A^n, PageRank, LTI. 127: quadratic forms, convexity of QP, Rayleigh as an optimization, PSD as a constraint. Same theorem, different verbs: 16A "iterate," 127 "minimize x^T P x." Do not bring DTFS into a 127 PSD question.'),
  (14, 'symmetric exam move',
       'If A is symmetric, write A = Q Λ Q^T and x^T A x = sum λ y^2. Classify PD / PSD / indefinite from signs of λ. Rayleigh: max on the sphere is λ_max. QP convex iff Hessian PSD. If they hand you a nonsymmetric P in x^T P x, symmetrize first.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 3. SVD, PCA & Low-Rank Approximation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'svd'
CROSS JOIN (VALUES
  (0,  'SVD as an optimization fact',
       'A = U Σ V^T. σ1 = max ||A x||_2 over ||x||_2 = 1, achieved at v1, with u1 = A v1 / σ1. Next singular vectors solve the same problem in the orthogonal complement. 127: SVD is a sequence of Rayleigh-like problems, not just a numpy call. CEG 5.3.'),
  (1,  'Eckart-Young (Frobenius and spectral)',
       'The best rank-at-most-k approximation to A in ||·||_F (and in spectral norm) is the truncated SVD A_k = sum_{i=1..k} σ_i u_i v_i^T. Error ||A - A_k||_2 = σ_{k+1}, ||A - A_k||_F^2 = sum_{i>k} σ_i^2. 127: this is a nonconvex-looking rank constraint with a known global solution. Quote the theorem; do not gradient-descend the factors unless they ask.'),
  (2,  'PCA as an optimization',
       'Center the data. Maximize variance of projections: max ||X v||_2^2 s.t. ||v||_2 = 1, i.e. top right singular vector / top covariance eigenvector. Top-k PCA is the best rank-k reconstruction in Frobenius (Eckart-Young on the data matrix). 127: PCA is SVD plus a mean. 16A said this; 127 asks you to write the constrained problem and the Lagrangian.'),
  (3,  'low-rank models',
       'A ≈ U V^T with few columns: compression, collaborative filtering, "the matrix is secretly simple." Nuclear-norm convex relaxation (sum of σ_i) is the BV-style surrogate for rank; 127 may only mention it. 127 exams: truncated SVD is the exact Frobenius answer under a hard rank cap.'),
  (4,  'thin vs full SVD',
       'Economy: only min(m,n) singular values. Full: complete U or V to square orthogonal. For A m by n skinny, A = U_r Σ_r V_r^T is enough for LS and PCA. 127 notebooks: np.linalg.svd(..., full_matrices=False). Rank = number of σ strictly greater than 0 (or a noise threshold).'),
  (5,  'pseudoinverse via SVD',
       'A^+ = V Σ^+ U^T, invert nonzero σ, leave zeros. Min-norm least-squares solution x = A^+ b. 127: one formula for tall, fat, and rank-deficient. Filter: ridge inverts σ / (σ^2 + λ) instead of 1/σ — Tikhonov damps small σ.'),
  (6,  'connection A^T A and A A^T',
       'Right singular vectors of A are eigenvectors of A^T A with eigenvalues σ^2. Left: A A^T. 127: never form those Gram matrices if A is ill-conditioned; SVD A directly. Numerically, squaring maps tiny σ to underflow and large σ to overflow.'),
  (7,  'PCA vs least squares',
       'LS: a distinguished target b, fit using columns of A. PCA: no privileged coordinate, compress the cloud. Total least squares / orthogonal regression is the SVD cousin of LS (errors in A and b). 127: pick LS when you have a response; PCA when you have unlabeled features. Ridge sits between (shrink toward 0).'),
  (8,  'explained variance',
       'Fraction σ_i^2 / sum σ_j^2 (after centering) is the share of Frobenius energy in component i. Scree plot: look for an elbow to pick k. 127: this is the same energy as Parseval on singular values. A flat scree means no low-rank lie — do not force k=2 on a spherical cloud.'),
  (9,  'orthogonal Procrustes (light)',
       'min_Q ||A - B Q||_F over orthogonal Q is solved by SVD of B^T A: Q = U V^T. 127: a cute constrained LS on the orthogonal group. Shows SVD is not only compression — it solves some manifolds exactly.'),
  (10, 'stability: small σ',
       'Directions v with tiny σ are near-null: A barely sees them, A^+ amplifies them. Noise in those coordinates explodes. 127: truncate (PCA) or damp (ridge). Condition number σ_max/σ_min of the reduced problem should be quoted in a lab writeup.'),
  (11, 'matrix completion slogan',
       'Observe some entries of a low-rank matrix, recover the rest. Nuclear-norm minimization is the convex model (Candès/Recht). 127 may only need: if the truth is low-rank, truncated SVD of the zero-filled matrix is a naive baseline, not the right algorithm. Mention, do not derive RIP.'),
  (12, 'vector calculus hook',
       'd/dX ||X||_F^2 = 2X. Gradient of ||A - U V^T||_F^2 w.r.t. factors is why alternating LS exists. 127: you will differentiate traces and Frobenius squares. If a problem says "show the gradient is...," expand the square and use tr(M^T X).'),
  (13, '16A SVD vs 127 SVD',
       '16A: compress an image, four subspaces, PCA lab. 127: Eckart-Young as a theorem about an optimization problem, ridge as filtered SVD, PCA as Rayleigh. Same factorization. If an exam asks for a dual or a KKT of a rank-constrained problem, you are in 127, and the rank constraint is usually replaced by truncated SVD rather than KKT on a manifold.'),
  (14, 'SVD exam move',
       'Write A = sum σ_i u_i v_i^T, σ decreasing. Rank-k optimum: truncate (Eckart-Young). PCA: center, then top v_i. LS: A^+ via 1/σ. Ridge: σ/(σ^2+λ). Error formulas: σ_{k+1} and the tail of σ^2. Do not call u_i "eigenvectors of A" unless A is PSD symmetric.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 4. Least Squares, Min-Norm & Ridge
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'lstsq'
CROSS JOIN (VALUES
  (0,  'least squares as a model',
       'min_x ||A x - b||_2^2. Overdetermined: more equations than unknowns. 127/CEG Ch. 6: this is model 1 of 3 (with LP and QP). Unique minimizer iff A has full column rank. Geometry: project b onto Col(A). Normal equations A^T A x = A^T b. 16A already had this; 127 adds ridge, constraints, and duals.'),
  (1,  'normal equations and QR',
       'A^T A x = A^T b. Square and PD iff full column rank. Prefer QR: R x = Q^T b. 127: writing np.linalg.inv(A.T @ A) is the formula, not the code. Residual r = b - A x-hat satisfies A^T r = 0 (orthogonality). If r is huge, the model class is wrong, not the linear algebra.'),
  (2,  'weighted least squares',
       'min ||W^{1/2} (A x - b)||_2^2, or min (Ax-b)^T Π (Ax-b) for Π PD. Normal equations A^T Π A x = A^T Π b. 127: heteroskedastic noise, or a Mahalanobis residual. Same geometry in a stretched inner product. Diagonal W is "trust these rows more."'),
  (3,  'constrained least squares',
       'min ||A x - b||_2^2 s.t. C x = d (and maybe inequalities). Equality-only: KKT / bordered normal equations, or reduce x = x_part + Z y with Z a basis for ker(C). 127: this is still a convex QP. Inequality LS is nonnegative LS or a QP; CVX handles it. Do not drop constraints and hope.'),
  (4,  'ridge / Tikhonov',
       'min ||A x - b||_2^2 + λ ||x||_2^2, λ greater than 0. Solution (A^T A + λ I)^{-1} A^T b. Always unique. Filters small singular values: coefficient σ/(σ^2+λ). 127 lecture: three interpretations — (1) fix ill-conditioned A^T A, (2) modified LS, (3) "ghost data" / extra rows sqrt(λ) I x ≈ 0. CEG Ch. 6.'),
  (5,  'ghost-data view of ridge',
       'Stack A with sqrt(λ) I and b with 0: ordinary LS on the stacked system is ridge. Prior: pull x toward 0 with strength λ. 127: this is why ridge is still least squares. Bayesian: Gaussian prior, MAP = ridge. You do not need the full Bayes story; the stacked matrix is the exam picture.'),
  (6,  'ridge vs truncated SVD',
       'Both tame small σ. Truncation: hard cutoff. Ridge: smooth shrink. 127: bias-variance — larger λ, more bias, less variance. Cross-validation picks λ in labs. Setting λ = 0 recovers LS (and the explosions). λ to infinity sends x to 0.'),
  (7,  'underdetermined interpolation',
       'If A is fat and b is in Col(A) (always, if full row rank), min ||x||_2 s.t. A x = b is min-norm interpolation. Ridge with tiny λ approximates it. 127: interpolating noisy data is overfitting; add constraints or a regularizer. Basis pursuit (l1 min s.t. A x = b) is the sparse twin — later Lasso section.'),
  (8,  'sensitivity / leverage (light)',
       'H = A (A^T A)^{-1} A^T hat matrix; leverage h_ii says how much y_i owns its fit. 127 may not dwell on stats diagnostics. The optimization view: one huge-residual row with huge leverage tilts the whole x-hat. Weighted LS or Huber (later) robustifies.'),
  (9,  'LS as a QP',
       '||A x - b||^2 = x^T (A^T A) x - 2 b^T A x + const. Convex QP with P = A^T A ⪰ 0. Constraints make it a constrained QP. 127: once you see this, "LS with box constraints" is just a QP you throw at CVX. Unconstrained: set gradient 2 A^T A x - 2 A^T b = 0, recover normal equations.'),
  (10, 'nonlinear least squares (light)',
       'min ||r(x)||_2^2 with r nonlinear: Gauss-Newton / Levenberg-Marquardt (ridge on the Jacobian). Nonconvex. 127: know it exists; the course emphasis is convex / LS. Do not claim a global min. LM is Gauss-Newton plus Tikhonov on the step — same λ idea.'),
  (11, 'multiobjective / Pareto (light)',
       'min ||A x - b|| and ||x|| together: the ridge path traces a Pareto curve of fit vs size. 127: λ is the tradeoff weight. Scalarizing f + λ g is the standard 127 way to "optimize two things." Changing λ sweeps the front if everything is convex.'),
  (12, 'kernel / feature maps (preview)',
       'Replace A with Φ(X): features. Ridge in feature space with the kernel trick is KRR (189/127 boundary). 127: you can still write the model as LS in Φ. If they stay primal, it is just a fatter A. Dual ridge: x lives in the span of the rows of A (representer) — same as min-norm geometry.'),
  (13, '16A LS vs 127 LS',
       '16A: project, normal equations, Shazam mixing. 127: ridge interpretations, constrained LS, LS as QP, dual of LS (the residual multipliers), CVX. Same normal equations. If the question has λ or inequalities or a dual function, it is 127.'),
  (14, 'LS exam move',
       'Write the objective, check full column rank, normal equations or QR. Residual perp Col(A). Ridge: add λ I, mention ghost rows and SVD filter. Constrained: KKT or nullspace reduction. Do not invert a tall A. If they want sparsity, you want l1, not ridge.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 5. Convex Sets, Functions & Problems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'convex'
CROSS JOIN (VALUES
  (0,  'convex set',
       'C is convex if the line segment between any two points of C lies in C: θx + (1-θ)y in C for θ in [0,1]. Intersections of convex sets are convex. Empty set and a single point are convex. 127: the feasible set of a convex problem must be convex. Polyhedra, ellipsoids, the PSD cone, and norm balls are the workhorses (BV 2).'),
  (1,  'convex combination and convex hull',
       'Finite sum θ_i x_i with θ_i at least 0, sum θ = 1. conv(S) is all convex combinations of points of S, the smallest convex set containing S. 127: Jensen is this fact applied to a convex f. A polytope is the convex hull of finitely many points.'),
  (2,  'convex function',
       'f convex if epigraph is a convex set, iff f(θx+(1-θ)y) is at most θ f(x)+(1-θ)f(y). Jensen: f(E z) is at most E f(z). Strictly convex: inequality strict for x not y, θ in (0,1) — unique minimizer if a min exists. 127: convex f plus convex constraints is the course''s "tractable" slogan (local min = global).'),
  (3,  'first- and second-order tests',
       'Differentiable: f convex iff f(y) at least f(x) + ∇f(x)^T (y-x) (first-order lower bound). Twice diff: Hessian ⪰ 0 everywhere. 127: this is why PD Hessian ⇒ convex QP. Concave is -f convex. Linear and affine functions are both convex and concave.'),
  (4,  'operations preserving convexity',
       'Nonnegative weighted sums, composition with affine (f(Ax+b)), pointwise max, partial minimization over some variables (under conditions), perspective. 127/BV 3.2: these are how you prove a new f is convex without a Hessian. Composition f(g(x)) needs more care (nondecreasing convex outer, etc.).'),
  (5,  'epigraph and sublevel sets',
       'epi f = {(x,t) : f(x) less than or equal to t}. f convex iff epi f convex. Sublevel {x : f(x) less than or equal to α} is convex if f is (converse false: any function with convex sublevels is quasiconvex). 127: quasiconvex problems are a side road; the course wants convex epigraphs.'),
  (6,  'convex optimization problem',
       'min f0(x) s.t. fi(x) less than or equal to 0, Ax = b, with f0, fi convex. Equalities must be affine (or the feasible set need not be convex). 127: this is BV standard form. Maximizing a concave function is the same idea. A nonconvex equality (||x||_2 = 1) takes you outside the safe zone even if the objective is convex.'),
  (7,  'why convexity is the 127 punchline',
       'Local min is global. First-order condition ∇f(x-star)^T (x - x-star) at least 0 for all feasible x (unconstrained: ∇f = 0 if diff). Duality and KKT become sufficient (with Slater). 127: "tractable" means convex + a solver, not "linear only." Nonconvex: PCA sphere, rank, bilinear control — either hidden convex or we give up globality.'),
  (8,  'examples: norms, max, log-sum-exp',
       'Every norm is convex. max_i x_i is convex. log-sum-exp (soft max) is convex. −log is convex on positives (so log-barrier works). x^T P x is convex iff P ⪰ 0. 127: l1 and l-infinity are convex but not strictly, and not differentiable at kinks — subgradients later / at KKT.'),
  (9,  'quasiconvex vs convex (trap)',
       'Quasiconvex: convex sublevels. Ratio of linear over linear on a positive denominator can be quasiconvex. 127: you cannot blindly sum quasiconvex functions. If they say "is this convex," a quasiconvex example is the usual counterexample. Stick to Hessian or composition rules.'),
  (10, 'domain of a convex function',
       'dom f must be convex (or the definition on a nonconvex domain is awkward). Extended-value: f = +infinity outside the domain, keeps convexity. 127: −log on R_+^n, indicators I_C of convex C. Writing I_C(x) = 0 on C and +infinity else turns a constraint into the objective.'),
  (11, 'convexity of least squares and ridge',
       '||A x - b||_2^2 is convex (composition of affine with convex square). Ridge adds λ ||x||_2^2, still convex (strictly if λ greater than 0). 127: this is why GD on LS cannot find a bad local min. Lasso is convex too (l1). Neural nets are not — that is 189''s problem.'),
  (12, 'geometry: separating hyperplane (light)',
       'Two nonempty disjoint convex sets can be separated by a hyperplane (proper/strict versions need extra assumptions). 127: this is the geometric origin of dual certificates and Farkas lemma for LP. "If a point is outside a closed convex set, a hyperplane says so."'),
  (13, 'BV vs CEG convexity chapters',
       'BV 2-4 is the encyclopedia of sets/functions/problems. CEG 8 is the 127-sized pass. 127 exams: prove convexity with a rule or Hessian, write standard form, identify if equalities are affine. Name the feasible set. If a constraint is x^T x = 1, say nonconvex unless they hide a trick.'),
  (14, 'convexity exam move',
       'Is the feasible set convex? Are equalities affine? Hessian of f0 PSD? Composition rules if no Hessian. Conclude: convex problem ⇒ any local min is global, KKT sufficient under Slater. If they sneak a product x y or a rank constraint, say nonconvex and stop claiming globality.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 6. Gradient Descent & SGD
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'gd'
CROSS JOIN (VALUES
  (0,  'gradient descent',
       'x_{k+1} = x_k - t_k ∇f(x_k). For unconstrained differentiable f, this is the basic 127 descent method (CEG 12.2). Direction −∇f is steepest descent in l2. If f is convex with Lipschitz gradient, a constant t small enough converges to a min. 127: GD is not a model; it is how you solve an unconstrained model when you do not call a QP solver.'),
  (1,  'Lipschitz gradient and step size',
       '||∇f(x)-∇f(y)|| is at most L ||x-y||. Then t in (0, 2/L) works; t = 1/L is the textbook pick. Too large t: diverge or bounce. Too small: crawl. 127: for LS, ∇f(x) = 2 A^T (A x - b), L is about 2 ||A||_2^2 = 2 σ_max(A)^2. Ridge adds 2λ to that Lipschitz constant.'),
  (2,  'strong convexity',
       'f(y) at least f(x) + ∇f(x)^T (y-x) + (m/2)||y-x||^2, m greater than 0. Equivalent: Hessian ⪰ m I. Linear convergence for GD: error contracts by a factor depending on κ = L/m. 127: ridge LS is strongly convex with m = 2λ. Plain LS is strongly convex iff A has full column rank (m = 2 σ_min^2).'),
  (3,  'line search vs constant step',
       'Exact line search: min_t f(x - t ∇f) (rarely closed form). Backtracking (Armijo): start large t, shrink until sufficient decrease. 127: exams like the constant-step Lipschitz theorem; labs use backtracking or Adam. Newton chooses a different direction, then a step length.'),
  (4,  'gradient vs subgradient',
       'At a kink (l1, max, ReLU), use a subgradient: g such that f(y) at least f(x) + g^T (y-x). Subgradient descent: smaller t_k, slower theory. 127: Lasso is convex but not differentiable on axes — either subgradient, or QP with extras, or proximal / ISTA. Differentiable 127 homework is usually GD on a smooth f.'),
  (5,  'projected gradient',
       'For min f on a convex C: x_{k+1} = Π_C (x_k - t ∇f). Projection must be cheap (box, simplex, PSD via eigen clip). 127: this solves simple constrained problems without a full interior-point solver. If Π_C is hard, use barriers or CVX instead.'),
  (6,  'stochastic gradient descent',
       'f(x) = (1/N) sum f_i(x) (empirical risk). SGD: step on ∇f_i for a random i (or a minibatch). Unbiased estimate of ∇f. 127: this is why ML scales. Variance: need decaying t_k or averaging. Plain GD on all N is "batch." SGD can escape some saddles; 127 still assumes convex when proving rates.'),
  (7,  'SGD variants (127 list)',
       'Minibatch, momentum / heavy ball, Adam (adaptive per-coordinate steps) — 127 mentions them as engineering. Theory 127 cares about: unbiased noise, diminishing steps for convex, or constant step to a neighborhood. Do not derive Adam on an exam unless they define it.'),
  (8,  'when GD is the wrong tool',
       'A small QP/LP: use a solver (interior point, simplex). Equality-constrained: Newton / KKT linear system, not vanilla GD. Nonsmooth: proximal methods. 127: GD homework is unconstrained smooth (and SGD on finite sums). Calling GD on an LP with a huge Lipschitz constant is a 127 smell.'),
  (9,  'Newton (preview, Lasso week)',
       'd = -H^{-1} ∇f, quadratic local model. Affine invariant, quadratic convergence near a strong min if H PD. Cost: factor H each step. 127: Newton on self-concordant barriers is interior-point. Damped Newton if far from the min. LS in one Newton step is the normal equations (quadratic f).'),
  (10, 'descent lemma',
       'If ∇f is L-Lipschitz, f(y) is at most f(x) + ∇f(x)^T (y-x) + (L/2)||y-x||^2. Plug in the GD step to get a decrease of order t ||∇f||^2. 127 proofs of GD rates start here. If they ask "show f decreases," write the descent lemma, not a Taylor poem without remainder control.'),
  (11, 'stopping',
       '||∇f|| small (unconstrained), or KKT residual (constrained), or objective plateau. 127 labs: also monitor training loss vs a held-out set (SGD overfitting). A small gradient of a poorly scaled f is meaningless — scale x or look at relative decrease.'),
  (12, 'convex vs nonconvex GD',
       'Convex: every stationary point is a global min. Nonconvex: GD finds a stationary point (under smoothness), maybe a saddle. 127 applications stay convex until SVM with a bad kernel or a bilinear model. If they say "run GD on x^T A x with indefinite A," you can go to -infinity along a negative eigenvector.'),
  (13, 'connection to 16A LTI (do not mix)',
       'x_{k+1} = (I - t A^T A) x_k + t A^T b for LS is a discrete linear system. Stability: eigenvalues of I - t A^T A inside the unit disk, i.e. t small vs 1/σ_max^2. 127: that is the Lipschitz step-size fact in disguise. Do not start drawing Bode plots; quote L and t less than 2/L.'),
  (14, 'GD exam move',
       'Write the update, name ∇f, give a legal t (1/L or backtracking). If strongly convex, mention linear rate and κ = L/m. SGD: finite-sum, unbiased, decaying t. Projected: Π_C. If f is l1, say subgradient or prox, not ∇. LS example: write ∇f = 2 A^T (Ax-b) and L from σ_max.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 7. Lagrange Duality
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'dual'
CROSS JOIN (VALUES
  (0,  'Lagrangian',
       'L(x, λ, ν) = f0(x) + sum λ_i fi(x) + sum ν_j h_j(x), with λ_i at least 0 for inequalities. 127/BV 5: multipliers price the constraints. Unconstrained in x, constrained in λ. If a constraint is missing, its multiplier is 0 in the story — actually we just omit it. Sign: 127 uses less-than-or-equal inequalities so λ ⪰ 0.'),
  (1,  'dual function',
       'g(λ, ν) = inf_x L(x, λ, ν). Always concave in (λ,ν), even if the primal is nonconvex. Domain: where the inf is greater than -infinity. 127: computing g is an unconstrained min in x (often closed form). If L is unbounded below in x, that (λ,ν) is not dual-feasible.'),
  (2,  'Lagrange dual problem',
       'maximize g(λ, ν) subject to λ ⪰ 0. Always convex (max of concave g over a convex set). 127: we solve a convex dual even when the primal is ugly — but then strong duality may fail. Dual optimal value d-star. Weak duality always: d-star is at most p-star.'),
  (3,  'weak duality',
       'For any primal feasible x and dual feasible (λ,ν), f0(x) is at least g(λ,ν). Proof: L(x,λ,ν) is at most f0(x) because λ_i fi(x) is at most 0 and equalities vanish, and g is inf L. 127: a dual feasible point is a certificate of a lower bound. If you find one x and one (λ,ν) with f0(x) = g(λ,ν), both are optimal (zero gap).'),
  (4,  'duality gap',
       'p-star minus d-star, always at least 0. Zero gap: strong duality. 127: numerically, a small gap plus tiny constraint violation is "solved." Nonconvex QCQP can have a gap; Shor/SDP relaxations bound it. Convex + Slater ⇒ gap 0.'),
  (5,  'strong duality and Slater',
       'For a convex problem, Slater: exists a strictly feasible x (fi(x) strictly less than 0, equalities hold). Then strong duality holds and a dual optimum is attained (under mild extra conditions). 127: this is the theorem you cite. LP strong duality needs feasibility of both, not Slater in the nonlinear sense — polyhedra are special (BV 5.2.3).'),
  (6,  'minimax and saddle',
       'p-star = inf_x sup_{λ⪰0,ν} L, and d-star = sup_{λ⪰0,ν} inf_x L. Strong duality: saddle point of L. 127: KKT says the saddle exists. Game view: x minimizes, adversary picks prices. You do not need von Neumann for the exam; you need inf-sup vs sup-inf.'),
  (7,  'dual of least squares / ridge (sketch)',
       'Unconstrained LS has a trivial dual (no constraints). Equality-constrained LS: dual variable is the multiplier for Ax=b, recovering the min-norm formula. Ridge can be seen as a dual-friendly Tikhonov. 127: derive g by completing the square or setting ∇_x L = 0. If they ask for the dual of a QP, complete the square in x, then maximize over λ.'),
  (8,  'dual of LP (standard)',
       'Primal min c^T x s.t. A x = b, x ⪰ 0. Dual max b^T y s.t. A^T y ⪯ c. 127: weak duality c^T x - b^T y = x^T (c - A^T y) at least 0. Complementary slackness: x_i (c - A^T y)_i = 0. This is the template for all later duals. Swap max/min and transpose A when they flip standard form.'),
  (9,  'economic interpretation',
       'λ_i is the shadow price of relaxing inequality i. At optimum (strong duality), dp-star / d b ≈ ν for an equality budget b. 127: you do not need a full envelope theorem; you need "if I could violate the constraint a little, the objective would improve at rate λ." Inactive constraint: λ = 0.'),
  (10, 'recovering x from dual',
       'If L is strictly convex in x, the inf is unique: x(λ,ν) = argmin L. Strong duality: that x at dual-optimal multipliers is primal optimal. 127: this is how SVM recovers w from α, and how some interior-point methods work. If L is linear in x, the inf is 0 or -infinity (indicator of dual constraints) — LP style.'),
  (11, 'Farkas lemma (LP infeasibility)',
       'Exactly one of: Ax = b, x ⪰ 0, or a y with A^T y ⪰ 0 and b^T y less than 0 (depending on form). 127: infeasibility certificates are dual-feasible unbounded rays. If CVX says infeasible, a Farkas vector is the proof. Do not confuse with weak duality (which assumes feasible points).'),
  (12, 'dual of a convex problem is convex',
       'Always, by construction. Solving the dual may be easier (fewer variables, nicer constraints). 127: SVM dual is a box-constrained QP in α; Lasso dual has an l-infinity ball. If the dual is simpler, solve it and recover x. If not, stay primal (CVX does either).'),
  (13, 'nonconvex primal, convex dual',
       'g is still concave, dual is still convex, weak duality still holds — the bound may be loose. 127: this is why we dualize some QCQPs (Shor). A positive gap means the dual optimum is a relaxation value, not p-star. Do not claim you solved the nonconvex primal.'),
  (14, 'duality exam move',
       'Form L, minimize in x to get g, write max g s.t. λ ⪰ 0. State weak duality always. Cite Slater for strong duality if convex. Exhibit a feasible pair with equal values to prove optimality. For LP, write the standard dual (c, A, b) without re-deriving from scratch unless asked. Check λ_i = 0 when fi(x) not tight.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 8. KKT, Slater & Conjugates
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'kkt'
CROSS JOIN (VALUES
  (0,  'KKT conditions (smooth)',
       'Primal feas: fi(x) less than or equal to 0, h=0. Dual feas: λ ⪰ 0. Complementary slackness: λ_i fi(x) = 0. Stationarity: ∇f0(x) + sum λ_i ∇fi(x) + sum ν_j ∇h_j(x) = 0. 127/BV 5.5: these are ∇_x L = 0 plus the sign and slack rules. For convex problems with Slater, KKT ⇔ optimal. Otherwise KKT is necessary under constraint qualifications, not always sufficient.'),
  (1,  'complementary slackness in words',
       'A multiplier can be positive only if its inequality is tight. A slack inequality must have λ_i = 0. 127: this is how you case-split on exams ("assume the bound is active"). Both λ and f can be 0 (degenerate). For LP, it is x_i s_i = 0 with s the dual slack.'),
  (2,  'stationarity is a balance of gradients',
       '−∇f0 lies in the cone generated by active inequality gradients plus the span of equality gradients. 127 picture: you cannot decrease f0 without violating a constraint (first-order). Unconstrained: ∇f0 = 0, the only KKT left. If gradients of active constraints fail to span, CQ fails and KKT may miss the true min (rare 127 examples).'),
  (3,  'Slater again (why we repeat it)',
       'Strict feasibility ⇒ strong duality + existence of multipliers for convex programs. 127: if all inequalities are actually equalities at every feasible point (no interior), Slater fails and you may need a different CQ. LP: use "primal and dual feasible ⇒ optimal if c^T x = b^T y" instead of Slater.'),
  (4,  'KKT for inequalities only (no h)',
       '∇f0(x) + sum λ_i ∇fi(x) = 0, λ ⪰ 0, λ_i fi=0, fi(x) less than or equal to 0. 127 box constraints 0 ⪯ x ⪯ 1: stationarity says (∇f0)_i is 0 in the interior, at least 0 at 0, at most 0 at 1 (sign depending on how you wrote fi). Getting the sign of λ vs the bound is the usual bug.'),
  (5,  'equality-constrained Newton / KKT matrix',
       'min f(x) s.t. A x = b. Stationarity ∇f(x) + A^T ν = 0, plus A x = b. Newton on this saddle: KKT linear system with Hessian and A. 127: this is the "Newton-KKT" step. For LS with A_eq x = d, it is a linear KKT system (exact in one step if f quadratic).'),
  (6,  'second-order sufficiency (light)',
       'For a local min of a nonconvex problem, KKT plus a curvature condition on the critical cone. 127 barely needs this; convex + Slater already makes first-order KKT enough. If they give a nonconvex example, KKT is necessary-ish, not a globality proof.'),
  (7,  'Fenchel conjugate',
       'f*(y) = sup_x (y^T x - f(x)). Always convex (sup of affines). f** = f if f is closed convex (Fenchel-Moreau). 127: this is the other dual, via infimal convolution / conjugate calculus. Young-Fenchel: y^T x is at most f(x)+f*(y). Equality iff y is a subgradient of f at x.'),
  (8,  'conjugates 127 actually computes',
       '(1/2)||x||_2^2 conjugates to itself. Indicator of a set conjugates to the support function. Norm conjugates to the dual-norm indicator of the unit ball. 127: Lasso dual uses the conjugate of λ ||x||_1, which is the indicator of ||y||_∞ less than or equal to λ. That is why the dual has an l-infinity ball.'),
  (9,  'subgradient and KKT',
       '0 in ∂f0(x) + sum λ_i ∂fi(x) + A^T ν, with the same slack/feasibility. 127: this extends KKT to l1. You do not need a full convex-analysis course; you need "the stationarity inclusion at a kink." For |x|, subgradient is sign(x) off 0 and [-1,1] at 0.'),
  (10, 'formulating problems (127 lecture)',
       'Before KKT, write a clean model: who is x, what is f0, which inequalities, which equalities. Change variables so constraints are convex. 127: a lot of exam points are "this engineering spec is this LP/QP," not a multiplier calculation. If you cannot write standard form, KKT has nothing to grab.'),
  (11, 'infeasible KKT vs infeasible primal',
       'If no (x,λ,ν) satisfy KKT, either there is no optimum (unbounded / inf not attained) or CQ failed or the problem is nonconvex with a nasty min. 127: first check primal feasibility and boundedness. Unbounded primal often matches infeasible dual (weak duality).'),
  (12, 'active-set intuition',
       'Guess which inequalities are tight, solve the equality-constrained problem, check λ ⪰ 0 and inactive fi less than 0. 127: combinatorial but small-n exam friendly (2-3 inequalities). Interior-point methods avoid enumerating sets; they drive slack * λ to 0 smoothly.'),
  (13, 'KKT vs GD',
       'GD ignores constraints. KKT is the optimality test once constraints exist. Projected GD is a way to approach a KKT point on simple C. 127: do not run unconstrained GD and then "check constraints after." Either project, barrier, or use a solver that hits KKT.'),
  (14, 'KKT exam move',
       'List the four blocks: primal feas, dual feas, complementary slackness, stationarity. Convex + Slater: sufficient. Case on which inequalities are active. Solve the resulting linear/nonlinear system. Check unused inequalities and λ signs. If l1 appears, use a subgradient interval at 0. Quote Slater if you claim strong duality.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 9. LP, QP & SOCP
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'models'
CROSS JOIN (VALUES
  (0,  'linear program (LP)',
       'min c^T x s.t. G x ⪯ h, A x = b (polyhedron). Convex. Solved by simplex or interior-point. 127: l1 and l-infinity regression are LPs after slack variables. Chebyshev center, diet, flow, and some control constraints are LPs. If the objective or a constraint is quadratic, it is not an LP.'),
  (1,  'LP modeling tricks',
       'min ||A x - b||_1 iff min 1^T t s.t. -t ⪯ A x - b ⪯ t. min ||x||_∞ iff min t s.t. -t 1 ⪯ x ⪯ t 1. max c^T x is min of -c. 127: epigraph form turns a convex piecewise-linear objective into an LP. Absolute values and max of affines are LP-representable. Products x y are not.'),
  (2,  'quadratic program (QP)',
       'min (1/2) x^T P x + q^T x s.t. Gx ⪯ h, Ax = b, with P ⪰ 0 for convexity. LS and ridge (unconstrained) are QPs. SVM (hard-margin) is a QP. 127: if P has a negative eigenvalue, the QP is nonconvex and can be NP-hard. CVX wants P PSD. Bound-constrained LS is a convex QP.'),
  (3,  'QP vs LP vs least squares',
       'LP: linear f0, linear constraints. Unconstrained LS: QP with P = A^T A, no G. Constrained LS: QP. 127: pick the smallest class that fits — a solver for LP is not enough for ||x||_2^2. A QP solver eats LPs (P=0). Do not call every convex problem a QP (SOCPs and SDPs sit above).'),
  (4,  'second-order cone program (SOCP)',
       'min f^T x s.t. ||A_i x + b_i||_2 ⪯ c_i^T x + d_i, plus equalities. The second-order (ice-cream) cone is convex. 127: robust LP with ellipsoidal uncertainty, QCQP with a single quadratic inequality of the right sign, and some norm constraints are SOCPs. CVX recognizes norms and sqrt of quadratics.'),
  (5,  'QCQP (light)',
       'Quadratic objective and quadratic inequalities. Convex iff all those quadratics are convex (P_i ⪰ 0) — a convex QCQP is often an SOCP. Nonconvex QCQP: trust-region with indefinite P, two-way partitioning. 127: do not throw a nonconvex QCQP at CVX and trust the answer as global.'),
  (6,  'GP geometric programming (mention)',
       'posynomials, change of variables x = e^y turns a GP into a convex program. 127/El Ghaoui historically listed GP next to LP/QP/SOCP. FA26 calendars sometimes skip a dedicated GP lecture. If it appears: log-sum-exp after the substitution, not "exponentiate the KKT."'),
  (7,  'SDP (mention only)',
       'Linear objective over affine slices of the PSD cone. Super-set of SOCP. 127: Lyapunov inequalities, covariance constraints, and some relaxations. You are not expected to be an SDP modeler; you are expected to recognize X ⪰ 0 as a convex constraint. 227A/EE 227B go deeper.'),
  (8,  'which model? (decision tree)',
       'Linear everything: LP. Convex quadratic objective, linear constraints: QP. Euclidean-norm inequalities: SOCP. l1/l-inf: LP. Ridge/LS: QP. Robust linear with ||·||_2 uncertainty: SOCP. 127 exam: they describe an application; you name the class and write standard form. Wrong class is a modeling error, not an algebra error.'),
  (9,  'CVX / DCP atoms for these models',
       'norm(x,1), norm(x,inf) → LP. sum_squares(A*x-b) → QP. norm(A*x-b,2) ⪯ affine → SOCP. quad_form(x,P) needs P PSD. 127 labs: if DCP errors, you used *, / , or a non-atom in a bad place. Rewrite with extra variables (epigraph) rather than fighting the parser.'),
  (10, 'polyhedra and vertices',
       'An LP attains its min at an extreme point if the min is attained (simplex walks vertices). Unbounded rays: no min (unless the objective is flat along the ray). 127: this is why "check vertices" works in 2D homework and fails as a 10^6-variable algorithm — interior-point ignores vertices.'),
  (11, 'equality elimination',
       'A x = b, x = x0 + F z, reduce to inequalities in z. 127: fewer variables, denser constraints. Dualizing equalities (multipliers ν) often keeps sparsity. Either is legal; pick based on n vs number of equalities. KKT does this implicitly.'),
  (12, 'integer variables (out of scope, trap)',
       '0-1 constraints are not convex. MILP is not 127. Relax x in [0,1] is an LP bound (weak or tight depending on the polytope). 127: if a problem needs "pick 3 sensors," say combinatorial / greedy / L1 heuristic, not "CVX with == 0 or 1."'),
  (13, '227AT vs 127 on models',
       'Same lectures. 227AT may expect cleaner proofs and extra modeling. Credit restriction: you cannot take both. 127: undergrad modeling + the lin-alg front matter. If a grad student asks for SDP duality, that is beyond a typical 127 final but on-brand for 227A.'),
  (14, 'models exam move',
       'Name LP/QP/SOCP. Write min, variables, constraints, and why convex (P PSD, SOC, linear). Convert l1/l-inf to slacks. Mention a solver class (simplex / IP / CVX). If they sneak x^T Q x with Q indefinite or a product of variables, refuse the convex label. Dual: LP dual as a 30-second add-on if asked.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

-- =====================================================================
-- 10. Lasso, SVM & Control Apps
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'apps'
CROSS JOIN (VALUES
  (0,  'Lasso',
       'min ||A x - b||_2^2 + λ ||x||_1. Convex (QP with extras / SOCP / specialized solvers). l1 promotes sparsity: many x_i exactly 0. 127: this is the sparse twin of ridge (l2). Dual involves an l-infinity ball of radius related to λ. Cross-validate λ. Soft-thresholding is the proximal map of λ ||·||_1 (ISTA).'),
  (1,  'why l1 is sparse and l2 is not',
       'The l1 ball has corners on the axes; the LS contour hits a corner. The l2 ball is round; the hit is a shrink, not a zero. 127 picture: diamond vs disk. l0 (count of nonzeros) is the "true" sparsity penalty but nonconvex; l1 is the convex envelope on the unit cube. Do not claim l1 always recovers the exact support — need design conditions (RIP, etc., optional).'),
  (2,  'basis pursuit',
       'min ||x||_1 s.t. A x = b (noiseless). LP after slacks. 127: interpolating with as few nonzeros as possible. With noise: BPDN min ||x||_1 s.t. ||A x - b||_2 ⪯ ε, an SOCP. Same family as Lasso (Lagrange form vs constrained form — λ ↔ ε).'),
  (3,  'hard-margin SVM',
       'Separable data: min (1/2)||w||_2^2 s.t. y_i (w^T x_i + b) at least 1. Convex QP. Max-margin linear classifier. 127: KKT / dual gives w = sum α_i y_i x_i with α ⪰ 0, support vectors where the inequality is tight (α_i greater than 0). This is the application lecture, not a 189 neural net.'),
  (4,  'soft-margin SVM',
       'Slack ξ_i at least 0, constraints y_i (w^T x_i + b) at least 1 - ξ_i, objective (1/2)||w||^2 + C 1^T ξ. Still a QP. C trades margin vs mistakes. 127: hinge loss view min_w sum max(0, 1 - y_i (w^T x_i+b)) + (1/(2C))||w||^2. Dual box 0 ⪯ α ⪯ C. Kernels: replace x_i^T x_j by k(x_i,x_j) in the dual — 127 mentions, 189 owns the zoo of kernels.'),
  (5,  'hinge vs logistic vs LS classification',
       'Hinge: SVM, sparse dual (SVs). Logistic: smooth, probabilistic, GD-friendly. LS on ±1 labels: a QP, not calibrated probabilities. 127: all three are convex in w for linear models. Nonconvexity starts when you compose with a deep net. Pick hinge if they say "margin."'),
  (6,  'control: least-squares / LQR slogan',
       'Discrete LTI x_{t+1} = A x_t + B u_t. Track a trajectory or drive to 0: min sum ||x_t||_Q^2 + ||u_t||_R^2 (finite horizon is a big LS / QP with dynamics as equalities). 127: this is "applications: control" — an optimization model, not 16A eigenmode homework. Infinite-horizon LQR is a Riccati equation (Lyapunov/SDP flavor).'),
  (7,  'MPC as a QP',
       'At each time, solve a finite-horizon QP with the current x as a parameter, apply the first u, repeat. Constraints on u and x are the point (saturation, safety). 127: convex QP if dynamics are linear and costs convex. Nonlinear dynamics: nonconvex (hard). This is why 127''s "tractable" slogan matters in control.'),
  (8,  'portfolio / finance (CEG classic)',
       'Markowitz: min x^T Σ x s.t. μ^T x at least r, 1^T x = 1, maybe x ⪰ 0. Convex QP if Σ ⪰ 0 (covariance). 127: this is a named QP, not a stock tip. Robust versions replace μ by an uncertainty set (SOCP). l1 on trades: transaction costs as an LP term.'),
  (9,  'engineering design (nominal)',
       'Allocate resources, size components, fit a model under specs: usually LP/QP/SOCP. 127: the work is writing constraints that are actually convex. "Volume at least V" for a box is a product — take logs or change variables, or it is a GP. If you cannot convexify, say so.'),
  (10, 'robust optimization (light)',
       'Require a constraint for all perturbations in an uncertainty set. Polyhedral uncertainty often stays LP; ellipsoidal often becomes SOCP. 127/El Ghaoui: this is why SOCP showed up. Duality of the inner max is the derivation. Do not replace every number by a worst-case without naming the set — that is just panic, not robust opt.'),
  (11, 'SVM vs Lasso vs ridge on one slide',
       'Ridge: dense shrink, l2. Lasso: sparse, l1. SVM: classification margin, hinge / QP. All convex (linear models). 127: regularizer chooses the geometry (ball). The loss chooses the statistical story (fit vs margin vs 0-1). 189 will add trees and nets; 127 wants you to write the QP.'),
  (12, 'Newton on Lasso / ISTA (calendar leftover)',
       'ISTA: gradient step on the smooth LS part, then soft-threshold (prox of l1). FISTA accelerates. Coordinate descent is the glmnet workhorse. 127: you can solve Lasso without a generic QP if you know the prox. Newton on the smooth pieces with an active set is the "L1 + Newton" lecture.'),
  (13, '127 vs 16A vs 189 vs 227AT',
       '16A: SVD/LS as linear algebra on signals. 127: those plus convex models, duals, KKT, LP/QP/SOCP, CVX, SVM/Lasso/control as applications. 189: statistical learning, generalization, nonconvex nets. 227AT: same 127 lectures, grad code. If a question is "derive KKT of Lasso," it is 127. If it is "bias-variance of a random forest," it is 189.'),
  (14, 'apps exam move',
       'Name the model (Lasso QP, SVM QP, LQR LS/QP, Markowitz QP). Write variables and constraints. Mention convexity and the regularizer geometry (l1 corners vs l2 ball). Dual/KKT only if asked (SVs, complementary slackness). If they want robustness, name an uncertainty set and the resulting SOCP/LP. Do not train a neural net on a 127 final.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs127';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'eecs127';
