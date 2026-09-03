-- Migration 075: EECS 16A — Foundations of Signals, Dynamical Systems,
-- and Information Processing, full deck rebuild.
-- UC Berkeley Fall 2026: Babak Ayazifar, MoWe 18:30-19:59, Pimentel 1
-- (same slot as recent offerings; eecs16a.org is the course site).
-- Catalog: signals, systems, optimization, controls, and ML, grounded in
-- linear algebra. Prereq MATH 54. This is the redesigned 16A — not the old
-- DIDS circuits curriculum. 16B is the circuits/devices follow-on.
-- Refs: VMLS (Boyd & Vandenberghe) for least squares; Strang; Lee & Varaiya
-- for complex numbers. Sequence follows the eecs16a.org lecture calendar.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'eecs16a');

DELETE FROM public.tidbits
WHERE category_id = 'eecs16a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs16a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs16a');

UPDATE public.decks
SET title = 'EECS 16A',
    description = 'Signals, systems, and information processing — vectors, DTFS, LS, SVD, LTI (Ayazifar)',
    cover_emoji = '⚡'
WHERE slug = 'eecs16a';

UPDATE public.classes
SET title = 'Foundations of Signals, Dynamical Systems, and Information Processing'
WHERE id = 'uc-berkeley:eecs16a:fa26';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('vec',     'Vectors, Signals & Inner Products',
   'Signals as vectors, spaces, inner products, energy (Note 1)', 0),
  ('complex', 'Cauchy-Schwarz, Periodicity & Complex Exponentials',
   'Norms, Euler, periodic DT sinusoids (Note 2)', 1),
  ('dtfs',    'Discrete-Time Fourier Series',
   'DTFS analysis/synthesis, orthogonality, DFT (Note 3)', 2),
  ('lstsq',   'Least Squares',
   'Normal equations, projections, fitting (VMLS 12-14)', 3),
  ('graphs',  'Graphs, Adjacency & PageRank',
   'Walks, stochastic matrices, PageRank eigenvector (Note 4)', 4),
  ('eigen',   'Eigenanalysis & Change of Basis',
   'Eigenpairs, diagonalization, coordinates (Note 4)', 5),
  ('svd',     'SVD & PCA',
   'Singular values, low-rank, principal components (Notes 5-6)', 6),
  ('dtlti',   'DT-LTI Input-Output Models',
   'Impulse response, convolution, frequency response (Note 7)', 7),
  ('state',   'State-Space DT-LTI',
   'x[n+1]=Ax+Bu, modes, unit-circle stability', 8),
  ('ctlti',   'Continuous-Time LTI Systems',
   'CT convolution, e^{st}, transfer functions (Note 8)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'eecs16a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Vectors, Signals & Inner Products
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'vec'
CROSS JOIN (VALUES
  (0,  '16A in one sentence',
       'Linear algebra applied to signals, systems, and information: treat discrete-time signals as vectors, decompose them (DTFS, SVD, least squares), then run them through LTI systems. Catalog name is Foundations of Signals, Dynamical Systems, and Information Processing — not the old DIDS circuits 16A. Circuits wait for 16B. Prereq is MATH 54.'),
  (1,  'signal as a vector',
       'A discrete-time signal is an ordered list of samples. A length-N clip is a vector in R^N (or C^N). Addition and scaling are samplewise, so the geometry of inner products, norms, and projections is the geometry of audio, images, and time series. 16A: the vector is the signal.'),
  (2,  'discrete-time vs continuous-time',
       'DT: x[n] with integer n (samples). CT: x(t) with real t. 16A spends most of the term in DT because finite lists are vectors you can actually compute (Python labs, Shazam, SVD). CT-LTI arrives at the end (Note 8) as differential equations and convolution integrals. Sampling is the bridge, not a 16A deep dive.'),
  (3,  'vector space (16A working definition)',
       'A set closed under addition and scalar multiplication, with a zero vector and the usual axioms (associative, distributive, ...). R^n and the set of N-periodic DT signals are the two spaces you live in. Subspaces: lines through the origin, column spaces, sets of signals with X_0 = 0. A plane not through the origin is affine, not a subspace.'),
  (4,  'span and linear combination',
       'span{v1,...,vk} is every a1 v1 + ... + ak vk. In 16A language: every signal you can synthesize from those building blocks. If the blocks are complex exponentials of period N, the span is all N-periodic signals (that is DTFS). If they are columns of A, the span is Col(A) — exactly the signals least squares can hit perfectly.'),
  (5,  'basis',
       'A linearly independent spanning set. Every vector has unique coordinates in a basis. Standard basis: samples. Fourier basis: N complex exponentials of period N. Eigenbasis: coordinates that turn applying A into multiplying by lambdas. 16A exams love switching among these three.'),
  (6,  'dimension',
       'Number of vectors in any basis. dim(R^N) = N. The space of N-periodic DT signals is N-dimensional (only N independent samples, then it repeats). That is why DTFS has exactly N coefficients, not infinitely many like CT Fourier series.'),
  (7,  'inner product (real)',
       'For real vectors, inner(x,y) = sum_i x_i y_i = y^T x. It is symmetric, linear in each slot, and inner(x,x) is at least 0, equal to 0 only at 0. Geometry: inner(x,y) = ||x|| ||y|| cos theta. 16A uses it as correlation: how much of one signal sits in another.'),
  (8,  'Hermitian inner product (complex)',
       'For complex vectors, conjugate one argument so energy is real: inner(x,x) = sum |x_i|^2. Convention in 16A/VMLS-adjacent notes: inner(x,y) = y-Hermitian x, i.e. sum conjugate(x_i) y_i, which is linear in y and conjugate-linear in x. Always conjugate when the signals are complex exponentials.'),
  (9,  'induced norm / signal energy',
       '||x|| = sqrt(inner(x,x)). For a real or complex clip, ||x||^2 is energy (sum of squared samples). Unit-energy signals have ||x|| = 1. Normalizing a vector is x / ||x||. 16A: Cauchy-Schwarz and least squares are both statements about this norm.'),
  (10, 'orthogonal vs orthonormal',
       'Orthogonal: inner(u,v) = 0 (uncorrelated signals). Orthonormal: orthogonal and each has norm 1. An orthonormal basis makes coordinates into inner products: the k-th coordinate of x is inner(q_k, x). DTFS is this fact for the harmonic exponentials (up to the 1/N convention).'),
  (11, 'projection onto one vector',
       'The closest multiple of v to x is ((inner(v,x)) / ||v||^2) v. Residual x minus that projection is orthogonal to v. 16A: this is a one-column least-squares problem, and it is how you read a Fourier coefficient off a signal.'),
  (12, 'N-periodic signals as a vector space',
       'Identify an N-periodic DT signal with its N samples. Addition and scaling preserve periodicity, so it is R^N or C^N in disguise. Inner product is usually the sum over one period (sometimes averaged by 1/N). This identification is why Note 1 and Note 3 are the same linear algebra.'),
  (13, 'MATH 54 vs 16A',
       '54 proves the theorems (row reduction, existence/uniqueness, abstract vector spaces, ODEs). 16A spends those theorems on signals: inner products as correlation, projections as denoising/fitting, eigenstuff as modes and PageRank, SVD as PCA. You still need 54 fluency; 16A will not re-teach Gaussian elimination from scratch.'),
  (14, 'VMLS (Boyd & Vandenberghe)',
       'Introduction to Applied Linear Algebra — Vectors, Matrices, and Least Squares. The 16A least-squares block is VMLS Ch. 12-14: the objective ||Ax - b||^2, normal equations, and interpretation as projection onto Col(A). Boyd''s videos match the book. Strang is the backup geometry text; Lee & Varaiya for complex numbers.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 2. Cauchy-Schwarz, Periodicity & Complex Exponentials
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'complex'
CROSS JOIN (VALUES
  (0,  'Cauchy-Schwarz inequality',
       '|inner(x,y)| is at most ||x|| ||y||, with equality iff x and y are linearly dependent (one is a scalar multiple of the other, including the zero cases). Proof sketch: the quadratic ||x - t y||^2 is at least 0 for all real t, or use the projection residual. 16A: it bounds correlation and proves the triangle inequality.'),
  (1,  'when Cauchy-Schwarz is equality',
       'Equality iff the vectors are parallel. In signals: a signal is a phase-scaled copy of another. If they point different directions, the inner product is strictly smaller than the product of norms. Exam move: check dependence before claiming |inner| = ||x|| ||y||.'),
  (2,  'triangle inequality',
       '||x + y|| is at most ||x|| + ||y||. Follows from Cauchy-Schwarz on inner(x+y, x+y). Equality when x and y point the same way (nonnegative multiple). 16A: energy of a sum is at most the sum of energies in the triangle sense — constructive interference is the equality case.'),
  (3,  'reverse triangle (lower bound)',
       '||x + y|| is at least | ||x|| - ||y|| |. You cannot cancel more energy than the smaller vector has. Useful sanity check: if ||x|| is 5 and ||y|| is 1, ||x+y|| cannot be 0. 16A exams use this to reject impossible energy claims.'),
  (4,  'periodic discrete-time signal',
       'x[n+N] = x[n] for all n, some integer N greater than 0. The smallest such N is the fundamental period. Constant signals have every N as a period; we still call them period-1. A length-N vector, repeated forever, is the 16A model of an N-periodic signal.'),
  (5,  'complex exponential e^{j ω n}',
       'The DT signal n |-> e^{j ω n} = cos(ω n) + j sin(ω n) (Euler). It is an eternal complex sinusoid of digital frequency ω radians/sample. 16A: these are the atoms of DTFS and the eigenfunctions of every DT-LTI system. Always expand with Euler when a problem wants a real cosine or sine.'),
  (6,  'when is e^{j ω n} periodic?',
       'Need e^{j ω (n+N)} = e^{j ω n} for all n, i.e. ω N = 2 π k for some integer k. So ω / (2π) must be rational. If ω = 2π k / N in lowest terms, the fundamental period is N / gcd(k,N). Irrational ω/(2π) gives a nonperiodic DT sinusoid (it never exactly repeats).'),
  (7,  'only N distinct period-N harmonics',
       'e^{j (k+N) (2π/N) n} = e^{j k (2π/N) n} because e^{j 2π n} = 1. So k and k+N are the same DT exponential. There are exactly N distinct complex exponentials of period N (k = 0,...,N-1). That is the whole reason DTFS is a finite sum, unlike CT Fourier series.'),
  (8,  'Euler''s formula',
       'e^{j θ} = cos θ + j sin θ. Corollaries: cos θ = (e^{jθ} + e^{-jθ}) / 2, sin θ = (e^{jθ} - e^{-jθ}) / (2j). 16A: every real sinusoid A cos(ω n + φ) is two conjugate complex exponentials. Polar form of a complex number: r e^{j φ} with r = |z| at least 0.'),
  (9,  'complex arithmetic 16A needs',
       'z = a + j b = r e^{j φ}. Magnitude |z| = sqrt(a^2 + b^2). Conjugate z* = a - j b flips the sign of every exponent in a product of exponentials. Inverse: 1/z = z* / |z|^2. Product of polar forms: multiply r, add angles. Lee & Varaiya Structure and Interpretation of Signals and Systems is the assigned complex review.'),
  (10, 'real sinusoid as two exponentials',
       'A cos(ω n + φ) = (A/2) e^{j φ} e^{j ω n} + (A/2) e^{-j φ} e^{-j ω n}. For a real signal, DTFS coefficients come in conjugate pairs: X_{-k} = conjugate(X_k). If you forget the conjugate, your reconstructed x[n] will not be real.'),
  (11, 'digital frequency is 2π-periodic',
       'e^{j (ω + 2π) n} = e^{j ω n} for integer n. Frequencies ω and ω+2π are the same DT signal. Unique DT frequencies live in any 2π-length interval, usually (-π, π] or [0, 2π). ω = π is the fastest real oscillation (alternating 1,-1,...): Nyquist.'),
  (12, 'aliasing in one sentence',
       'Two different analog frequencies can produce the same DT samples. In pure DT: ω and ω + 2π k are identical. 16A: when you plot a DT sinusoid, always reduce ω into (-π, π] before interpreting "how fast." Shazam still works because you choose a sampling rate that keeps audio in that unique range.'),
  (13, 'orthogonality of period-N exponentials',
       'Sum_{n=0}^{N-1} e^{j 2π (k-m) n / N} equals N if k ≡ m (mod N), and 0 otherwise. Proof: geometric series, or "Nth roots of unity sum to 0." This is the inner-product fact that turns DTFS analysis into a formula. 16A Note 2-3 hinge on it.'),
  (14, 'Exam 1 flavor (vectors through Euler)',
       'Compute an inner product and a projection. Check Cauchy-Schwarz numerically. Decide if a DT sinusoid is periodic and find N. Rewrite a cosine via Euler. State why there are only N harmonics of period N. No DTFS formula dump yet unless the exam calendar includes Note 3 — on eecs16a.org Exam 1 sits right as DTFS starts.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 3. Discrete-Time Fourier Series
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'dtfs'
CROSS JOIN (VALUES
  (0,  'DTFS synthesis (16A convention)',
       'If x is N-periodic, x[n] = sum_{k=0}^{N-1} X_k e^{j k ω0 n} with ω0 = 2π/N. The X_k are coordinates of x in the harmonic-exponential basis. Any set of N consecutive k works because the basis is N-periodic in k. 16A writes the sum over one period of k, often k = 0 to N-1.'),
  (1,  'DTFS analysis (1/N on analysis)',
       'X_k = (1/N) sum_{n=0}^{N-1} x[n] e^{-j k ω0 n}. The 1/N matches the inner product of two harmonics equaling N. Equivalent: X_k is the coefficient of the projection of x onto that harmonic. Flip the 1/N to synthesis and you have an equally valid unitary-style convention — 16A keeps 1/N on analysis. State which you use.'),
  (2,  'fundamental frequency ω0',
       'ω0 = 2π/N radians/sample for an N-periodic signal. Harmonic k lives at k ω0. Harmonic k+N is the same as k. DC is k = 0. The Nyquist harmonic (if N even) is k = N/2, frequency π. 16A: label the k-axis before you interpret a spectrum plot.'),
  (3,  'DTFS as orthonormal expansion',
       'The harmonics are orthogonal over one period. Analysis is "inner product against the k-th harmonic, divide by energy N." Synthesis is "linear combination of harmonics." This is the same projection theorem as Note 1, now with a named basis. If the staff uses unit-norm harmonics, the 1/N moves into the basis definition.'),
  (4,  'DC coefficient X_0',
       'X_0 = (1/N) sum_n x[n], the average value over a period. A zero-mean signal has X_0 = 0. Adding a constant c to x adds c to X_0 and leaves other X_k unchanged. 16A labs: subtract the mean before you stare at higher harmonics.'),
  (5,  'conjugate symmetry for real x',
       'If x[n] is real, X_{N-k} = conjugate(X_k) (equivalently X_{-k} = conjugate(X_k) with periodic extension of X). Magnitude spectrum is even; phase is odd. A real cosine of harmonic k produces energy only in ±k. If your computed X_k violate this, you have an arithmetic or conjugation bug.'),
  (6,  'Parseval (DTFS)',
       'Average energy per period: (1/N) sum_n |x[n]|^2 = sum_k |X_k|^2, under the 1/N-on-analysis convention (the exact placement of N matches how X_k were defined). Meaning: energy is preserved between time and frequency. 16A: a sparse spectrum is a simple time signal, and conversely for a time impulse.'),
  (7,  'DTFS vs DFT',
       'Same numbers. DTFS talks about an eternal N-periodic signal. DFT talks about a length-N vector (one period, or a window). numpy.fft.fft implements the unnormalized analysis sum; you still divide by N if you want 16A''s X_k. Shazam-style labs: FFT of windows is a running DFT, not a claim that the song is periodic.'),
  (8,  'shift property',
       'x[n - n0] (circular, modulo N) multiplies X_k by e^{-j k ω0 n0}. A time delay is a linear phase ramp in k. Magnitude |X_k| is unchanged. 16A: aligning two clips before comparing spectra, or seeing why a delayed sinusoid has the same |X_k|.'),
  (9,  'modulation / shift in k',
       'Multiplying x[n] by e^{j m ω0 n} circularly shifts the spectrum: Y_k = X_{k-m}. This is the dual of the delay property. 16A: mixing a signal up in frequency, or seeing a cosine as a pair of ± shifts of the DC of a constant.'),
  (10, 'Shazam lab idea',
       'Fingerprint audio by peaks in a time-frequency picture (STFT / spectrogram), not by storing the waveform. 16A: DTFS/DFT says a short window is a vector; its spectrum is a coordinate vector in the Fourier basis. Matching songs is nearest-neighbor in that (sparse) coordinate space. Least squares and PCA show up as denoise/compress cousins.'),
  (11,  'square-ish waves have slowly decaying |X_k|',
       'Discontinuities and sharp corners put energy in high harmonics (coefficients decay like 1/k, not exponentially). A pure sinusoid has exactly two nonzero DTFS coefficients. 16A exam: given a spectrum sketch, identify "smooth vs spiky" time signals. Gibbs ringing is the CT cousin; in DT you just see the leftover high-k energy.'),
  (12, 'uniqueness',
       'The DTFS coefficients of an N-periodic signal are unique (for a fixed convention). Two N-periodic signals are equal iff all X_k match. Consequence: to show x = 0, show every X_k = 0. To show two syntheses are the same signal, compare coefficients, not plots.'),
  (13, 'linear combination of periodic signals',
       'If x and y share period N, then ax+by has period N and coefficients a X_k + b Y_k. If periods are N and M, a common period is lcm(N,M) (when it exists). 16A: always reduce to one period before writing DTFS. Do not add spectra that were computed with different N without resampling the k-axis.'),
  (14, 'DTFS exam move',
       'Write ω0 = 2π/N. Pick analysis vs synthesis and the 1/N. Use orthogonality or the formula; do not expand e^{j k ω0 n} into 12 sines unless asked. Check conjugate symmetry if x is real. Inverse-check: plug X_k back into synthesis for n = 0 or a convenient sample. State that k is modulo N.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 4. Least Squares
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'lstsq'
CROSS JOIN (VALUES
  (0,  'least squares problem',
       'Given A (m by n, typically m greater than n) and b, find x minimizing ||A x - b||^2. Overdetermined: more equations than unknowns, usually no exact solution. 16A/VMLS: this is the workhorse for fitting, denoising, and "solve Ax = b as well as you can." The minimizer is written x-hat.'),
  (1,  'normal equations',
       'A^T A x-hat = A^T b  (real case; use A-Hermitian if complex). Derive by expanding the quadratic, or by setting the gradient to 0, or by forcing the residual orthogonal to Col(A). 16A: if you remember one formula from VMLS 12-14, this is it.'),
  (2,  'when A^T A is invertible',
       'Iff A has full column rank (columns linearly independent), iff ker(A) = {0}. Then x-hat = (A^T A)^{-1} A^T b, and the left inverse (A^T A)^{-1} A^T appears. If columns are dependent, infinitely many least-squares x (a particular solution plus ker(A)); use SVD/pseudoinverse to pick the min-norm one later.'),
  (3,  'geometry: projection onto Col(A)',
       'A x-hat is the point in Col(A) closest to b. Residual r = b - A x-hat is orthogonal to every column of A: A^T r = 0. That orthogonality is exactly the normal equations. 16A picture: drop a perpendicular from b onto the column space.'),
  (4,  'one-column case recovers Note 1',
       'A = v (a single column) gives x-hat = (v^T b) / (v^T v), the scalar in the projection formula. Least squares is projection onto a subspace spanned by several v''s at once. Gram-Schmidt / QR is how you compute it stably; 16A may only require the normal equations.'),
  (5,  'Gram matrix A^T A',
       'The n by n matrix of inner products of columns of A. Symmetric (Hermitian) and positive semidefinite; positive definite iff columns independent. Ill-conditioned when columns are nearly dependent: small perturbations in b swing x-hat. 16A: orthogonal columns make A^T A diagonal and the solve trivial.'),
  (6,  'least squares vs exact solve',
       'If A is square and invertible, LS recovers x = A^{-1} b and the residual is 0. If A is fat (underdetermined) with full row rank, LS as stated is not the usual story — infinitely many exact solutions; min-norm uses A^T (A A^T)^{-1} b. 16A least-squares block is the tall-thin full-column-rank case unless they say otherwise.'),
  (7,  'fitting a line or affine function',
       'Model b_i ≈ α + β t_i. Vandermonde-ish A with columns [1, ..., 1]^T and [t1,...,tm]^T. x = (α, β). Same idea for a linear combination of known signals (harmonics, polynomials). 16A: this is DTFS with a truncated harmonic dictionary, or "explain b in this basis."'),
  (8,  'residual and RMSE',
       'r = b - A x-hat. ||r|| is the leftover; RMSE is ||r|| / sqrt(m) in data-fitting language. If ||r|| = 0, b was in Col(A). A large residual means a bad model class, not a failed normal-equation solve. 16A labs plot residual to see what the model cannot explain.'),
  (9,  'Moore-Penrose in the full-column-rank case',
       'A^+ = (A^T A)^{-1} A^T, the left pseudoinverse. x-hat = A^+ b. SVD later gives the general pseudoinverse that also covers rank-deficient A. 16A: you do not need the full four Penrose axioms; you need "left inverse when columns independent."'),
  (10, 'why not just invert A^T A in Python blindly',
       'Forming A^T A squares the condition number. Prefer QR, numpy.linalg.lstsq, or SVD. 16A still wants you to write the normal equations on paper. On DataHub, lstsq is the grown-up button; using np.linalg.inv(A.T @ A) @ A.T @ b is the formula, not the numerically best code.'),
  (11, 'weighted least squares (light)',
       'Minimize ||W^{1/2} (A x - b)||^2 to trust some rows more (diagonal W). Normal equations become A^T W A x = A^T W b. 16A: same geometry in a stretched inner product. Shows up if samples have different noise variances.'),
  (12, 'least squares as a 16A lab skill',
       'Shazam/APS-style notebooks: stack features as columns of A, observations as b, solve for mixing coefficients. If A''s columns are nearly parallel, the fit is unstable (multicollinearity). PCA/SVD later: replace A by a better-conditioned low-rank factor.'),
  (13, 'objective is a convex quadratic',
       'f(x) = ||A x - b||^2 = x^T (A^T A) x - 2 b^T A x + ||b||^2. Hessian 2 A^T A is PSD, so any critical point is a global min. 16A is not an optimization class, but this is why "set the gradient to 0" is the whole algorithm. Unique min iff A^T A is PD.'),
  (14, 'LS exam move',
       'Write the objective, then A^T A x = A^T b. Check full column rank. Interpret A x-hat as the projection of b onto Col(A) and r perpendicular to columns. If n=1, reduce to the scalar projection formula. Do not divide by A, and do not write x = A^{-1} b when A is tall.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 5. Graphs, Adjacency & PageRank
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'graphs'
CROSS JOIN (VALUES
  (0,  'graph in 16A',
       'Nodes (pages, states, pixels) plus directed or undirected edges (links, transitions). The point is not graph theory for its own sake: a graph gives a matrix, and that matrix is a linear dynamical system. Walks, rankings, and consensus are all "apply A, or A^k, or find an eigenvector."'),
  (1,  'adjacency matrix',
       'A_{ij} = 1 if there is an edge from j to i (column-from, row-to — match the staff convention; the other transpose is common in CS). For undirected graphs A is symmetric. Weighted graphs store weights instead of 1s. 16A: always write a tiny example (3-4 nodes) before reasoning in n dimensions.'),
  (2,  'A^k counts walks',
       '(A^k)_{ij} is the number of length-k walks from j to i (unweighted, 0-1 adjacency). Proof: matrix multiplication sums over intermediate nodes. 16A: this is discrete-time dynamics with no decay. If you normalize columns, A^k becomes k-step transition probabilities.'),
  (3,  'degree and out-degree',
       'Undirected: deg(i) = number of incident edges, and A 1 = d (degree vector) with 1 the all-ones vector. Directed: out-degree of j is the sum of column j (if columns are outgoing). Dangling node: out-degree 0, a column of zeros — PageRank has to patch this.'),
  (4,  'random-walk / column-stochastic matrix',
       'P = A D^{-1} (or the row-stochastic transpose, matching convention): each column sums to 1 and entries are nonnegative. P v is the distribution after one click if v is a distribution (nonnegative entries summing to 1). 16A: stochastic matrices keep the probability simplex; eigenvalues of modulus 1 matter for the long run.'),
  (5,  'PageRank as an eigenvector',
       'A ranking vector r satisfying r = G r, i.e. eigenvalue 1 of the Google matrix G. Interpretation: stationary distribution of a random surfer. 16A: you already know Ax = λx; PageRank is the λ = 1 case with extra structure (nonnegative, normalized). Unique (up to scale) when G is the damped Google matrix.'),
  (6,  'damping / teleport (Google matrix)',
       'With damping d in (0,1), the surfer follows a link with probability d and jumps to a random page with probability 1-d. G = d P + (1-d) (1/n) 1 1^T, after dangling columns of P are filled. Teleport kills absorbing junk and makes G irreducible and primitive so a unique positive stationary r exists.'),
  (7,  'dangling nodes',
       'A page with no out-links. Raw P has a zero column, so probability mass leaks. Fix: replace that column by 1/n (jump everywhere) before damping. 16A homework loves a 3-page graph with one dangling node — write P, then G, then the eigen-equation by hand.'),
  (8,  'why eigenvalue 1 exists',
       'A column-stochastic matrix maps the all-ones row to itself: 1^T P = 1^T, so 1 is a left eigenvalue, hence also a right eigenvalue (same characteristic polynomial). Perron-Frobenius (light): a positive / irreducible nonnegative matrix has a positive real dominant eigenvalue. 16A: you may only need "stochastic implies 1 is an eigenvalue."'),
  (9,  'power method (preview)',
       'Iterate r_{k+1} = G r_k, starting from a distribution. Converges to the stationary ranking when |λ2| is strictly less than 1 (spectral gap). 16A: this is discrete-time dynamics x[n+1] = A x[n] before the state-space unit. Normalization (keep sum 1) avoids overflow.'),
  (10, 'undirected vs directed',
       'Undirected: A = A^T, real orthogonal diagonalization later (spectral theorem). Directed: A not symmetric, eigenvalues can be complex, ranking is not a "symmetric importance." Web graphs are directed. 16A Note 4 uses directed PageRank as the motivation to care about eigenanalysis of nonsymmetric matrices.'),
  (11, 'connectedness / irreducibility',
       'You can reach every node from every node (strongly connected for directed). Matrix: irreducible. Without it, PageRank can trap in a sink component. Damping restores a complete graph of weak jumps. 16A: draw the graph; if a sink exists, say what happens to the undamped walk.'),
  (12, 'why graphs in a signals class',
       'A vector on the nodes is a signal on a graph. Applying A is a linear system. PageRank, consensus, and later state-space are one subject. APS/VR labs: spatial signals (images, arrays) are the grid-graph version of the same idea. 16A is quietly introducing linear dynamical systems on networks.'),
  (13, 'adjacency vs Laplacian (light)',
       'L = D - A for undirected graphs. L 1 = 0, so 0 is an eigenvalue with the constant vector — "DC on the graph." 16A may not dwell on L, but if it appears, it is the same eigen-story as PageRank with a different matrix. Do not mix L''s 0-eigenvalue with PageRank''s 1-eigenvalue.'),
  (14, 'PageRank exam move',
       'Draw the graph. Write A with the staff''s from/to convention. Form P by normalizing columns; fix dangling columns. Add teleport to get G. Solve G r = r plus 1^T r = 1. Sanity: r nonnegative. Mention that this is the dominant eigenvector, found in practice by power iteration.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 6. Eigenanalysis & Change of Basis
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'eigen'
CROSS JOIN (VALUES
  (0,  'eigenvalue / eigenvector',
       'A v = λ v with v not 0. Applying A only scales v. 16A names: mode, stationary ranking (λ=1), harmonic if A is a circulant (DFT). Complex λ allowed even when A is real (they come in conjugate pairs). Never call 0 an eigenvector; λ = 0 with v not 0 is fine (v in the kernel).'),
  (1,  'characteristic polynomial',
       'p(λ) = det(A - λ I) (or det(λI - A); pick one and stick to it). Roots are eigenvalues. A 2x2: λ^2 - tr(A) λ + det(A) = 0. 16A: compute by hand for 2x2 and simple 3x3; bigger matrices are conceptual (PageRank, companion form). Algebraic multiplicity = root multiplicity.'),
  (2,  'diagonalization',
       'A = V Λ V^{-1} with Λ diagonal of eigenvalues and columns of V eigenvectors, iff there is a basis of eigenvectors. Then A^n = V Λ^n V^{-1}: iterate by scaling coordinates. 16A: this is how you solve x[n+1] = A x[n] in closed form, and how you see which modes die (|λ| less than 1) or explode.'),
  (3,  'defective matrix',
       'Not enough independent eigenvectors (geometric multiplicity strictly less than algebraic). Jordan blocks, polynomial-in-n factors times λ^n. 16A rarely asks you to compute Jordan form; it does ask you to notice when two equal λ do not give two independent v''s. Then you cannot diagonalize.'),
  (4,  'change of basis',
       'If columns of V are a basis, x = V x-tilde means x-tilde is the coordinate vector of x in that basis. The same linear map in new coordinates is V^{-1} A V. 16A: Fourier, eigen, and SVD bases are three changes of coordinates. "Change of basis" week is this sentence plus practice converting x to x-tilde and back.'),
  (5,  'coordinates [x]_B',
       'The unique coefficients so x = b1 α1 + ... + bn αn. For an orthonormal basis, α_i = inner(b_i, x). For a general basis, solve B α = x (a square system). 16A trap: treating a non-orthogonal basis like an orthogonal one and using inner products without the Gram matrix.'),
  (6,  'similar matrices',
       'B = V^{-1} A V. Same eigenvalues, same trace, same det, same characteristic polynomial. Different eigenvectors (transformed by V). 16A: A and its representation in another basis are similar. Diagonalizable iff similar to a diagonal matrix.'),
  (7,  'powers and modes',
       'Write x[0] = V c, then x[n] = sum_i c_i λ_i^n v_i. Each eigen-component is a geometric sequence. Dominant eigenvalue (largest |λ|) wins for large n. PageRank power method: dominant λ = 1, others damped. Unstable DT system: some |λ| at least 1 except the unit-circle details in the state-space section.'),
  (8,  'complex eigenvalues of a real matrix',
       'Come in conjugate pairs. Real invariant plane: rotation-scaling in that plane. In polar form λ = r e^{j θ}, the mode is r^n times a discrete rotation by nθ. 16A: a 2x2 rotation-scaling matrix is the picture; do not panic when the quadratic has negative discriminant.'),
  (9,  'spectral theorem (real symmetric)',
       'Real symmetric A = Q Λ Q^T with Q orthogonal (orthonormal eigenvectors) and Λ real. 16A: undirected-graph adjacency, Gram matrices A^T A, and covariance matrices in PCA all sit here. You get a real orthonormal eigenbasis "for free." Nonsymmetric PageRank matrices do not.'),
  (10, 'left vs right eigenvectors',
       'Right: A v = λ v (columns). Left: w^T A = λ w^T (rows). For symmetric A they coincide. For stochastic P, the left eigenvector at λ=1 is 1^T (column sums). PageRank ranking is a right eigenvector of G. 16A: matching left/right to "row vs column stochastic" avoids a very common sign/transpose bug.'),
  (11, 'geometric vs algebraic multiplicity',
       'Algebraic: multiplicity as a root of det(A-λI). Geometric: dim ker(A-λI) = number of independent eigenvectors for that λ. Always geo is at most alg. Diagonalizable iff geo = alg for every λ. 16A 2x2: if you only find one v for a repeated λ, say defective (unless the whole A is λI).'),
  (12, 'why eigen in 16A',
       'PageRank (stationary mode), iterating linear systems (A^n), diagonalizing so LTI state-space becomes decoupled scalar recurrences, and "this input is an eigenvector so the output is a scale copy." Complex exponentials are eigenvectors of every circulant / LTI convolution matrix. That last sentence is the course thesis.'),
  (13, 'invariant subspace',
       'W is invariant if applying A to any vector in W stays in W. One-dimensional invariant subspaces are spans of eigenvectors. A 2D invariant plane holds a conjugate pair. 16A: you can restrict A to that subspace and ignore the rest of the state — modal decomposition in geometric language.'),
  (14, 'Exam 2 flavor (graphs through change of basis)',
       'Write A for a tiny graph, find eigenpairs by hand, decide diagonalizable, convert a vector to eigen-coordinates, apply A^n, and interpret a PageRank vector. Change-of-basis question: given V, compute x-tilde = V^{-1} x and A-tilde = V^{-1} A V. SVD is usually Exam 3 / later.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 7. SVD & PCA
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'svd'
CROSS JOIN (VALUES
  (0,  'SVD (real matrices)',
       'A = U Σ V^T with U and V orthogonal (U^T U = I, V^T V = I) and Σ rectangular diagonal with nonnegative singular values σ1 ≥ σ2 ≥ ... ≥ 0 on the diagonal. Columns of V are right singular vectors; columns of U are left. 16A Notes 5-6: this is the general "diagonalization" that works even when A is not square or not diagonalizable.'),
  (1,  'singular values vs eigenvalues',
       'σ_i(A) = sqrt(eigenvalues of A^T A) (and also of A A^T, same nonzero ones). Eigenvalues of A itself can be negative or complex; singular values are always real and at least 0. For symmetric PSD matrices, singular values equal eigenvalues. 16A: do not write "eigenvalues of a data matrix" when you mean singular values.'),
  (2,  'rank and nonzero singular values',
       'rank(A) = number of strictly positive σ_i. The SVD splits A into rank-1 pieces σ_i u_i v_i^T. The tail σ_{r+1} = ... = 0 is the exact null space. Numerically, tiny σ_i are "numerical rank" questions — treat them as 0 if they are at noise level.'),
  (3,  'four fundamental subspaces (SVD picture)',
       'First r right singular vectors: row space. Remaining v''s: ker(A). First r left singular vectors: Col(A). Remaining u''s: left nullspace ker(A^T). 16A: this is Strang''s four subspaces with orthonormal bases handed to you by the SVD.'),
  (4,  'thin / compact SVD',
       'Drop the columns of U and V that multiply zero σ''s: A = U_r Σ_r V_r^T with Σ_r r by r. Economy SVD in numpy is the version that does not store a huge unused orthogonal complement. 16A: write the sum of r rank-1 terms; you rarely need a full n by n U when A is 1000 by 20.'),
  (5,  'Eckart-Young / low-rank approximation',
       'The best rank-k approximation to A in the 2-norm (and Frobenius) is the truncated SVD: keep the top k terms. Error in 2-norm is σ_{k+1}. 16A: compression, denoising, and "this matrix is secretly rank 2" all cite this theorem. It is why you plot a scree of σ_i and look for a drop.'),
  (6,  'pseudoinverse via SVD',
       'A^+ = V Σ^+ U^T where Σ^+ transposes and inverts each nonzero σ_i (0 stays 0). For full column rank, this matches (A^T A)^{-1} A^T. For rank-deficient A, it gives the min-norm least-squares solution. 16A: one object that unifies LS and "solve singular systems as well as possible."'),
  (7,  'condition number',
       'κ(A) = σ_max / σ_min (for invertible square A, σ_min greater than 0). Large κ: solving A x = b amplifies relative errors. Least squares inherits κ(A)^2 if you form A^T A. 16A: orthogonal A has κ = 1; nearly dependent columns make κ huge. SVD is how you see it.'),
  (8,  'PCA in one paragraph',
       'Center the data (subtract the mean row/column as staff defines). SVD the data matrix (or eigen-decompose the covariance). Leading right/left singular vectors are principal components — directions of largest variance. Project onto the top k for a low-dimensional picture. 16A Note 6: PCA is SVD plus a mean-centering sermon.'),
  (9,  'PCA vs least squares',
       'LS: explain b using columns of A (a specific y-direction is privileged). PCA: no distinguished coordinate; find a subspace that captures variation of all columns/rows. Orthogonal regression / total least squares is the SVD cousin of LS. 16A: use LS when you have a target b; use PCA when you have a cloud of points.'),
  (10, 'covariance and A^T A',
       'After centering, (1/(m-1)) A^T A (or A A^T, orientation depending) is the sample covariance. Its eigenvectors are PCs; its eigenvalues are variances along those PCs, equal to σ_i^2 / (m-1). 16A: you can compute PCA from SVD of A without ever forming the covariance (more stable).'),
  (11, 'image / VR lab intuition',
       'A picture is a matrix (or a vectorized one). Keep top singular values: blurry but recognizable face. Drop them: noise. VR/APS labs: high-dimensional measurements live near a low-dimensional subspace — PCA finds that subspace. 16A cares that you can say "truncate Σ" and know what happens to the reconstruction.'),
  (12, 'left vs right singular vectors in data',
       'If rows are samples and columns are features, V holds feature-space PCs and U holds sample-space scores (up to scaling by σ). Flip if the matrix is transposed — 16A exams will specify "rows are ..." Write U Σ V^T once with dimensions before interpreting u_i vs v_i.'),
  (13, 'SVD of a 2x2 by hand (what they want)',
       'Eigenvectors of A^T A give V and σ_i^2. Then u_i = A v_i / σ_i for σ_i greater than 0. Complete U,V to orthogonal matrices if a full SVD is asked. Check A v1 = σ1 u1. 16A: a 2x2 with an obvious rank-1 structure should be done without a computer.'),
  (14, 'SVD exam move',
       'Write A = sum σ_i u_i v_i^T with σ decreasing. Rank = number of σ greater than 0. Best rank-k: truncate. LS: x-hat = A^+ b via inverted σ''s. PCA: center, then truncate. Mention U,V orthogonal, not "eigenvectors of A" unless A is PSD symmetric. Units: σ have the units of A, not A^T A.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 8. DT-LTI Input-Output Models
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'dtlti'
CROSS JOIN (VALUES
  (0,  'linearity and time-invariance',
       'Linear: H(a x + b y) = a H(x) + b H(y) (including superposition of infinitely many terms when they make sense). Time-invariant: delay the input, delay the output by the same amount. DT-LTI is both. 16A Note 7: once you have both, the system is completely determined by one signal — its impulse response.'),
  (1,  'unit impulse δ[n]',
       'δ[0] = 1 and δ[n] = 0 otherwise. Any DT signal is x[n] = sum_k x[k] δ[n-k] (sifting). 16A: this identity is why convolution exists. A Kronecker delta, not a Dirac delta (Dirac is the CT cousin in Note 8).'),
  (2,  'impulse response h[n]',
       'h = H(δ), the output when the input is an impulse. For a DT-LTI system, h is the complete I/O model. FIR: h is finitely supported. IIR: infinitely long (typically from feedback / recurrence). Causal: h[n] = 0 for n less than 0 (output cannot depend on future inputs).'),
  (3,  'convolution sum',
       'y[n] = (h * x)[n] = sum_k h[k] x[n-k] = sum_k x[k] h[n-k]. Write both orders; convolution is commutative. 16A: compute small examples by sliding one signal across the other and taking inner products. Matrix view: y = H x with H Toeplitz (or circulant if you treat signals as periodic).'),
  (4,  'convolution as a matrix',
       'Linear convolution is a Toeplitz matrix whose columns are shifted copies of h. Periodic convolution (one period of N-periodic signals) is a circulant matrix, diagonalized by the DFT — that is why complex exponentials are eigenfunctions of DT-LTI. 16A: write a 4x4 circulant once and watch the DFT appear.'),
  (5,  'eigenfunction property',
       'If x[n] = e^{j ω n} (eternal), then y[n] = H(e^{j ω}) e^{j ω n}, a scale copy of the same exponential. The scale H(e^{j ω}) = sum_k h[k] e^{-j ω k} is the frequency response (DTFT of h). 16A thesis: Fourier methods exist because LTI systems do not mix these atoms, they only scale them.'),
  (6,  'frequency response H(e^{j ω})',
       'A 2π-periodic complex function of ω. Magnitude |H| is the gain at that digital frequency; angle is the phase shift. Real cosine in, same-frequency cosine out, amplitude |H|, phase arg(H) — using Euler. 16A: plug ω = k ω0 to see what a DTFS coefficient does when it goes through the system (multiply by H at that harmonic).'),
  (7,  'FIR vs IIR',
       'FIR: y[n] depends on finitely many input samples (finite h). Always BIBO stable if h is finite, easy to implement, linear phase possible. IIR: infinite h, often from y[n] + a1 y[n-1] + ... = b0 x[n] + .... Can be unstable. 16A: identify FIR by a finite convolution sum in the difference equation with no recursive y terms.'),
  (8,  'causality',
       'h[n] = 0 for n less than 0, equivalently y[n] depends only on x[m] for m at most n. Realtime filters are causal. 16A labs may use noncausal smoothing (a symmetric window around n) because you have the whole clip stored. On an exam, "implementable online" means causal.'),
  (9,  'BIBO stability (DT)',
       'Bounded input implies bounded output iff sum_k |h[k]| is finite. FIR: automatic. IIR: need the impulse response to be absolutely summable (for rational systems, poles strictly inside the unit circle — that language is completed in state-space). 16A: a growing h[n] = a^n u[n] with |a| at least 1 is unstable.'),
  (10, 'cascade and parallel',
       'Cascade (series): h = h1 * h2, frequency responses multiply. Parallel: h = h1 + h2, frequency responses add. Order of LTI cascades does not matter (commutativity). 16A block diagrams: you may rearrange LTI boxes; you may not slide a nonlinearity through them.'),
  (11, 'zero-state I/O vs internal state',
       'Convolution y = h * x assumes the system is initially at rest (zero state). If energy is already stored, add the zero-input response. 16A Note 7 is the I/O story; the next section adds a state vector so you can start from x[0] not 0. Mixing the two without saying "rest ICs" is an exam penalty.'),
  (12, 'difference equations as DT-LTI',
       'A linear constant-coefficient difference equation with rest initial conditions is DT-LTI. Example: y[n] = 0.9 y[n-1] + x[n] has h[n] = (0.9)^n u[n]. 16A: extract h by setting x=δ and ICs = 0, or take the frequency response by substituting e^{j ω n}.'),
  (13, 'Note 7 in one sentence',
       'DT-LTI systems are convolution against h, equivalently multiplication by H(e^{j ω}) on each complex exponential, equivalently a Toeplitz/circulant matrix on the signal vector. That is the same linear algebra as Notes 1-6, now with time as the index.'),
  (14, 'I/O exam move',
       'Prove LTI or find a counterexample (delay a nonlinear system; scale a time-varying gain). If LTI, find h = H(δ), write y = h * x, and for eternal exponentials multiply by H(e^{j ω}). Check causality (h[n] for n less than 0) and BIBO (sum |h|). Do not grab state-space A,B,C,D unless the problem gives a state.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 9. State-Space DT-LTI
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'state'
CROSS JOIN (VALUES
  (0,  'state vector',
       'A list of numbers x[n] that, together with the current input, determines the future. Memory of the system. Dimension of x is the order. 16A: delay registers in a filter, voltages that would have been capacitors in 16B, PageRank scores in motion, positions in a discrete mechanics example.'),
  (1,  'DT state-space equations',
       'x[n+1] = A x[n] + B u[n],   y[n] = C x[n] + D u[n]. A is n by n, B n by m, C p by n, D p by m. SISO: m=p=1, B a column, C a row, D a scalar. 16A: this is Note 7 plus memory. Same A as in eigenanalysis — now it is the dynamics matrix.'),
  (2,  'unforced motion',
       'u = 0 implies x[n] = A^n x[0]. Diagonalize: x[n] = V Λ^n V^{-1} x[0] = sum c_i λ_i^n v_i. Modes grow or decay with |λ_i|. 16A: this is why you spent a week on A^n. Zero-input response of the output is C A^n x[0].'),
  (3,  'impulse response from A,B,C,D',
       'h[0] = D, and h[n] = C A^{n-1} B for n at least 1 (SISO, causal realization). The I/O convolution model is determined by those Markov parameters C A^{k} B. Many different (A,B,C,D) can share the same h (similarity transforms / non-minimal realizations).'),
  (4,  'feedthrough D',
       'Direct jump from u[n] to y[n] with no delay. If D = 0, the output cannot instantaneously see the input. FIR taps that include the current sample put energy in D and/or C B. 16A: when converting a difference equation, the y[n] coefficient of x[n] is D in a typical controllable-canonical pick.'),
  (5,  'internal stability (DT)',
       'All eigenvalues of A satisfy |λ| strictly less than 1 (inside the open unit disk) iff A^n goes to 0, iff the origin is globally asymptotically stable for u=0. |λ| = 1: undamped oscillation or a constant mode (need Jordan details if repeated). |λ| greater than 1: explosion. BIBO of the I/O map is related but needs minimality to be equivalent.'),
  (6,  'unit circle vs 16A language',
       'The unit circle in the complex plane is the DT stability boundary. Map: λ = r e^{j θ} is a damped (r less than 1) discrete oscillation at digital frequency θ. 16A: sketch poles as points; do not mix this up with the CT imaginary-axis boundary of Note 8.'),
  (7,  'change of state coordinates',
       'x = T z with T invertible: z[n+1] = (T^{-1} A T) z[n] + (T^{-1} B) u[n], y = (C T) z + D u. Similar A, same I/O map. Diagonal T^{-1} A T is modal coordinates: n independent scalar recurrences. 16A change-of-basis week was rehearsal for this.'),
  (8,  'from a difference equation to state-space',
       'A length-d recurrence needs d delays as state. Controllable canonical form (one common pick): companion-matrix A, B = e1, C = coefficients. 16A: they will accept any correct realization of the same order. Check by computing h[n] or the first few y samples.'),
  (9,  'reachability / controllability (intro)',
       'Can you steer x from 0 to any target in finite time with u? The matrix R = [B, A B, ..., A^{n-1} B] must have full rank (n). 16A: one bad eigenvalue hidden from the input means a mode you cannot affect. Full control theory is later EE courses; 16A wants the rank test and the picture.'),
  (10, 'observability (intro)',
       'Can you recover x[0] from a finite output record (and known u)? Observability matrix O with rows C, C A, ..., C A^{n-1} must have full rank. Dual to controllability. Unobservable mode: it moves, but y never sees it. 16A: if a PageRank-like state is orthogonal to C, it is invisible.'),
  (11, 'minimal realization',
       'Order equals the McMillan degree of h: no extra unreachable or unobservable state. Non-minimal A can look unstable internally while the I/O map is fine (unstable hidden mode). 16A: if they give a 3rd-order state-space whose h is first-order, say pole-zero cancellation / extra state.'),
  (12, 'MIMO',
       'u and y are vectors. B has several columns (each input channel), C several rows. h becomes a matrix sequence. Frequency response is a matrix H(e^{j ω}). 16A: almost all homework is SISO; MIMO is to remind you that PageRank (vector state, maybe scalar observation) still fits the same boxes.'),
  (13, 'why state-space vs convolution',
       'Convolution needs the whole past of u (or an infinite h). State is a finite memory that is enough for the future. Simulation: x := A x + B u is O(n^2) per step, not a growing sum. Control: you can put feedback u = K x. 16A: I/O is elegant; state is how you actually iterate and stabilize.'),
  (14, 'state-space exam move',
       'Identify A,B,C,D and the meaning of x. Zero-input: A^n x0. Zero-state: convolution with h[0]=D, h[n]=C A^{n-1} B. Stability: eigenvalues of A vs the unit circle. Diagonalize if asked for a closed form. A rank test for controllability/observability if the words "can you reach / can you see" appear.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

-- =====================================================================
-- 10. Continuous-Time LTI Systems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ctlti'
CROSS JOIN (VALUES
  (0,  'CT signals x(t)',
       't is real. Energy signals vs power signals; 16A only needs "a function of time" plus the impulse as a distribution. Sampling x[n] = x_c(n T) is how DT labs still model analog audio. Note 8 is the last week: do not rebuild all of EE 120 here — get convolution, e^{st}, and the stability picture.'),
  (1,  'Dirac impulse δ(t) (16A level)',
       'Unit area at t=0, 0 elsewhere, sifting: integral x(τ) δ(t-τ) dτ = x(t) (at continuity points). Not a function; a distribution. Scaling: δ(a t) = δ(t)/|a|. 16A: the CT analog of δ[n], used to define h(t). Do not give δ(0) a finite value on an exam.'),
  (2,  'CT impulse response and convolution',
       'h = H(δ). For CT-LTI at rest, y(t) = (h * x)(t) = integral h(τ) x(t-τ) dτ. Same story as DT with sums replaced by integrals. Causal: h(t) = 0 for t less than 0. 16A: compute an integral of two rectangular pulses at least once (the triangle you already know from DT convolution pictures).'),
  (3,  'e^{s t} as eigenfunction',
       'For eternal exponentials, H(e^{s t}) = H(s) e^{s t} with H(s) = integral h(τ) e^{-s τ} dτ (Laplace transform of h, ROC implied). On the imaginary axis s = jω, H(jω) is the frequency response (Fourier). 16A: this is the CT twin of H(e^{j ω}) from Note 7.'),
  (4,  'linear constant-coefficient ODEs',
       'a_n y^{(n)} + ... + a0 y = b_m u^{(m)} + ... + b0 u, with rest ICs, defines a CT-LTI system. Characteristic polynomial of the ODE is the denominator of H(s). 16A: first-order y'' + a y = b u is the workhorse (exponential decay, time constant 1/a if a greater than 0).'),
  (5,  'transfer function H(s) (light)',
       'Ratio of Laplace polynomials, H(s) = Y(s)/U(s) at rest. Poles: roots of the denominator (natural modes). Zeros: roots of the numerator. Partial fractions give h(t) as a sum of exponentials. 16A: you should be able to go from a first-order ODE to H(s) = b / (s+a) and h(t) = b e^{-a t} u(t).'),
  (6,  'CT stability vs DT',
       'Asymptotic stability of an ODE: poles in the open left half-plane (Re(s) strictly less than 0). BIBO: integral |h(t)| dt finite, same half-plane for simple poles. Do not use the unit disk here. Mapping: a stable DT pole |λ| less than 1 is the sampled version of a stable CT pole, not the same geometric picture.'),
  (7,  'frequency response H(jω)',
       'Gain and phase vs analog frequency ω (rad/s). A cosine A cos(ω t + φ) in steady state (stable system) becomes A |H(jω)| cos(ω t + φ + arg H(jω)). 16A: identical slogan to DT, different ω units. Bode plots are EE 16B/120; here, evaluate H(jω) at a couple of frequencies.'),
  (8,  'RC circuit as a CT-LTI example',
       'Series R, capacitor voltage as output: first-order lag H(s) = 1/(1+s RC), time constant RC. 16A is not a circuits class anymore, but this is the canonical "physical LTI system" demo in week 14. The same ODE is a leaky integrator. 16B will own devices; 16A owns the systems vocabulary.'),
  (9,  'CT vs DT convolution checklist',
       'DT: sum, δ[n], unit circle, H(e^{j ω}), A^n. CT: integral, δ(t), left half-plane, H(jω), e^{A t} (matrix exponential, usually out of scope). Sampling a CT convolution does not equal convolving the samples unless you are careful (discrete approx of the integral). 16A labs discretize; exams want you to name which world you are in.'),
  (10, 'superposition of exponentials',
       'If x(t) is a sum of e^{s_k t} (or a Fourier integral of e^{jωt}), an LTI system scales each by H(s_k). That is DTFS logic in continuous time: decompose, scale, reassemble. 16A demos week: filters, musical harmonics, mechanical modes — same linear algebra as Note 3, different basis functions.'),
  (11, '16A vs 16B vs EE 120',
       '16A (redesigned): vectors, DTFS, LS, graphs/PageRank, eigen, SVD/PCA, DT-LTI, a taste of CT-LTI. 16B: circuits and devices (the old DIDS hardware). EE 120: serious signals and systems (CT/DT Fourier transforms, sampling theorem in anger). 16A is the linear-algebra on-ramp, not a 120 replacement.'),
  (12, 'demos and applications week',
       'eecs16a.org last lecture: applications of the whole stack — matching audio (Shazam/DTFS), ranking graphs, compressing with SVD, simulating LTI filters. 16A final: mix a projection/LS question, an eigen/PageRank question, an SVD/PCA question, and an LTI convolution/eigenfunction question. Labs (Python, Shazam, APS, VR) are the computational versions of those four.'),
  (13, 'sampling slogan (only what 16A needs)',
       'If you sample faster than twice the highest frequency (Nyquist), a bandlimited CT sinusoid becomes a unique DT sinusoid in (-π, π]. Undersample and aliases collide. 16A already used the DT fact that ω and ω+2π are the same; sampling is that fact plus a clock T with ω_digital = ω_analog T.'),
  (14, 'CT-LTI exam move',
       'Name h(t), write the convolution integral, and for e^{jωt} or e^{st} multiply by H. Stability: Re(pole) less than 0, not the unit circle. Causal: h(t)=0 for t less than 0. Convert a first-order ODE to H(s) and h(t). If the problem is discrete (x[n], A matrix), you are in Notes 7-8 DT, not here.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16a';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'eecs16a';
