-- Migration 054: STAT 134 — Concepts of Probability, full deck.
-- Prof. Ganguly (Ch 1–4) + Prof. Lucas (Ch 5–6), UC Berkeley Fall 2026.
-- Textbook: Jim Pitman, Probability (Springer).
-- ~15 cards × 6 topic sections = ~90 cards.
--
-- Exam dates:
--   Midterm: Monday, Oct 19, 2026, 7pm (covers Ch 1–4)
--   Final:   Wednesday, Dec 16, 2026, 7–10pm (cumulative)

-- ─────────────────────────────────────────────────────────────
-- 0. Wipe any existing hand-entered content
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'stat134');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'stat134');

-- ─────────────────────────────────────────────────────────────
-- 1. Sections (follows Pitman chapters 1–6)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('probability-foundations', 'Probability Foundations',
   'Sample spaces, events, axioms, counting, equally likely outcomes (Ch 1)', 0),
  ('conditional-probability',  'Conditional Probability & Independence',
   'Conditional probability, Bayes, independence, total probability (Ch 2)', 1),
  ('discrete-distributions',   'Discrete Distributions & Expectation',
   'Random variables, PMF, Binomial, Geometric, Poisson, E[X], Var(X) (Ch 3)', 2),
  ('continuous-distributions', 'Continuous Distributions & MGFs',
   'PDF, CDF, Uniform, Exponential, Normal, MGF, change of variables (Ch 4)', 3),
  ('joint-distributions',      'Joint Distributions & Correlation',
   'Joint/marginal/conditional distributions, covariance, correlation (Ch 5)', 4),
  ('limit-theorems',           'Limit Theorems & Inequalities',
   'Markov, Chebyshev, WLLN, CLT, normal approximation (Ch 6)', 5),
  ('midterm-review',           'Midterm Review',
   'Ch 1–4 (Oct 19 exam)', 6),
  ('final-review',             'Final Review',
   'Cumulative Ch 1–6 (Dec 16 exam)', 7)
) AS v(slug, title, description, pos)
WHERE d.slug = 'stat134'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- Ch 1 — Probability Foundations  (§1.1–1.5)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'probability-foundations'
CROSS JOIN (VALUES
  (0,  'sample space Ω',
       'The set of all possible outcomes of a random experiment; every outcome is a point ω ∈ Ω.'),
  (1,  'event',
       'Any subset A ⊆ Ω; we say the event A occurred if the outcome ω ∈ A.'),
  (2,  'Kolmogorov''s axioms',
       '(1) P(A) ≥ 0 for all A; (2) P(Ω) = 1; (3) countable additivity: P(⋃ Aᵢ) = ∑ P(Aᵢ) for pairwise disjoint events.'),
  (3,  'complement rule',
       'P(Aᶜ) = 1 − P(A); follows from P(Ω) = 1 and additivity.'),
  (4,  'addition rule (inclusion-exclusion, two events)',
       'P(A ∪ B) = P(A) + P(B) − P(A ∩ B); generalises to n events via full inclusion-exclusion.'),
  (5,  'equally likely outcomes (classical probability)',
       'If Ω has n finite, equally likely outcomes then P(A) = |A| / |Ω|; counting becomes the tool.'),
  (6,  'multiplication principle',
       'If an experiment has k stages with n₁, n₂, …, nₖ choices at each stage, the total number of outcomes is n₁ · n₂ · ⋯ · nₖ.'),
  (7,  'permutation P(n, k)',
       'Ordered selection of k items from n distinct items without replacement: P(n,k) = n! / (n−k)!.'),
  (8,  'combination C(n, k) — "n choose k"',
       'Unordered selection of k items from n: C(n,k) = n! / [k!(n−k)!]; counts subsets, not arrangements.'),
  (9,  'binomial theorem',
       '(a + b)^n = ∑_{k=0}^n C(n,k) a^k b^{n-k}; the coefficients C(n,k) are called binomial coefficients.'),
  (10, 'Pascal''s identity',
       'C(n,k) = C(n−1,k−1) + C(n−1,k); combinatorial proof: either the nth item is chosen (k−1 from n−1) or not (k from n−1).'),
  (11, 'sampling with vs. without replacement',
       'With replacement: n^k ordered samples; without replacement: P(n,k) ordered, C(n,k) unordered; the distinction changes the probability model.'),
  (12, 'probability of an infinite intersection',
       'If A₁ ⊇ A₂ ⊇ ⋯ (decreasing events), then P(⋂ Aₙ) = lim P(Aₙ); continuity from above.'),
  (13, 'probability of an infinite union',
       'If A₁ ⊆ A₂ ⊆ ⋯ (increasing events), then P(⋃ Aₙ) = lim P(Aₙ); continuity from below.'),
  (14, 'birthday problem intuition',
       'In a group of 23 people P(shared birthday) > 0.5; counterintuitive because we compare all C(23,2)=253 pairs, not just one.')
) AS c(pos, front, back)
WHERE d.slug = 'stat134'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 2 — Conditional Probability & Independence  (§2.1–2.2, 2.4–2.5)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'conditional-probability'
CROSS JOIN (VALUES
  (0,  'conditional probability P(A | B)',
       'P(A | B) = P(A ∩ B) / P(B) for P(B) > 0; the updated probability of A after learning B occurred.'),
  (1,  'multiplication rule',
       'P(A ∩ B) = P(A | B) · P(B) = P(B | A) · P(A); rearrangement of the definition of conditional probability.'),
  (2,  'chain rule of probability',
       'P(A₁ ∩ ⋯ ∩ Aₙ) = P(A₁) · P(A₂|A₁) · P(A₃|A₁,A₂) · ⋯ · P(Aₙ|A₁,…,Aₙ₋₁).'),
  (3,  'independence of events',
       'A and B are independent if P(A ∩ B) = P(A)P(B); equivalently P(A|B) = P(A) when P(B) > 0.'),
  (4,  'mutual independence vs. pairwise independence',
       'Events A₁,…,Aₙ are mutually independent if P(⋂ᵢ∈S Aᵢ) = ∏ᵢ∈S P(Aᵢ) for every subset S. Pairwise independence does not imply mutual independence.'),
  (5,  'partition of Ω',
       'Events B₁, B₂, …, Bₙ form a partition if they are pairwise disjoint and ⋃ Bᵢ = Ω.'),
  (6,  'law of total probability',
       'If B₁,…,Bₙ is a partition of Ω with P(Bᵢ) > 0, then P(A) = ∑ᵢ P(A|Bᵢ)P(Bᵢ).'),
  (7,  'Bayes'' theorem',
       'P(Bᵢ|A) = P(A|Bᵢ)P(Bᵢ) / ∑ⱼ P(A|Bⱼ)P(Bⱼ); inverts conditional probabilities using a prior and a likelihood.'),
  (8,  'prior probability',
       'P(B) before observing any data; reflects initial belief about B.'),
  (9,  'posterior probability',
       'P(B|A) after observing evidence A; updates the prior via Bayes'' theorem.'),
  (10, 'sensitivity and specificity (Bayes context)',
       'Sensitivity = P(Test+|Disease); specificity = P(Test−|Healthy); even a highly sensitive test yields many false positives when disease is rare.'),
  (11, 'conditional independence',
       'A and B are conditionally independent given C if P(A ∩ B | C) = P(A|C)·P(B|C); does not imply or require unconditional independence.'),
  (12, 'Monty Hall problem',
       'After the host opens a losing door, switching wins with probability 2/3; the key is that the host''s action is not independent of the car''s location.'),
  (13, 'odds form of Bayes',
       'P(B|A)/P(Bᶜ|A) = [P(A|B)/P(A|Bᶜ)] · [P(B)/P(Bᶜ)]; posterior odds = likelihood ratio × prior odds.'),
  (14, 'inclusion-exclusion (general)',
       'P(⋃ᵢ Aᵢ) = ∑P(Aᵢ) − ∑P(Aᵢ∩Aⱼ) + ∑P(Aᵢ∩Aⱼ∩Aₖ) − ⋯; alternating sum of probabilities of all intersections.')
) AS c(pos, front, back)
WHERE d.slug = 'stat134'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 3 — Discrete Distributions & Expectation  (§3.1–3.6)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'discrete-distributions'
CROSS JOIN (VALUES
  (0,  'random variable (RV)',
       'A function X: Ω → ℝ that assigns a real number to each outcome; randomness comes from the underlying sample space.'),
  (1,  'probability mass function (PMF)',
       'P(X = x) for each possible value x; must satisfy P(X=x) ≥ 0 and ∑ₓ P(X=x) = 1.'),
  (2,  'Bernoulli(p) distribution',
       'P(X=1) = p, P(X=0) = 1−p; models a single success/failure trial with success probability p. E[X] = p, Var(X) = p(1−p).'),
  (3,  'Binomial(n, p) distribution',
       'X = number of successes in n independent Bernoulli(p) trials; P(X=k) = C(n,k)p^k(1-p)^{n-k}; E[X] = np, Var(X) = np(1−p).'),
  (4,  'Geometric(p) distribution',
       'X = number of trials until the first success; P(X=k) = (1−p)^{k-1}p for k=1,2,…; E[X] = 1/p, Var(X) = (1−p)/p².'),
  (5,  'memoryless property (geometric)',
       'P(X > m+n | X > m) = P(X > n); the geometric distribution is the only discrete distribution with this property.'),
  (6,  'Poisson(λ) distribution',
       'P(X=k) = e^{-λ}λ^k/k! for k=0,1,2,…; E[X] = Var(X) = λ; models rare, independent events in a fixed interval.'),
  (7,  'Poisson as limit of Binomial',
       'If n→∞ and p→0 with np→λ, then Binomial(n,p) → Poisson(λ); valid approximation when n large, p small.'),
  (8,  'hypergeometric distribution',
       'Drawing n items without replacement from N total (K successes): P(X=k) = C(K,k)C(N-K,n-k)/C(N,n); E[X] = nK/N.'),
  (9,  'expectation E[X]',
       '∑ₓ x · P(X=x) for discrete X; the probability-weighted average; exists when ∑|x|P(X=x) < ∞.'),
  (10, 'linearity of expectation',
       'E[aX + bY] = a·E[X] + b·E[Y] for any constants a,b and any random variables X, Y — no independence required.'),
  (11, 'LOTUS (Law of the Unconscious Statistician)',
       'E[g(X)] = ∑ₓ g(x)P(X=x); compute the expectation of g(X) directly without finding the distribution of g(X).'),
  (12, 'variance Var(X)',
       'E[(X−μ)²] = E[X²] − (E[X])²; measures the average squared deviation from the mean. Var(aX+b) = a²Var(X).'),
  (13, 'negative binomial distribution',
       'X = number of trials until the rth success; P(X=k) = C(k-1,r-1)p^r(1-p)^{k-r}; E[X] = r/p. Generalises geometric (r=1).'),
  (14, 'indicator random variable 1_A',
       '1_A(ω) = 1 if ω ∈ A, else 0; E[1_A] = P(A); extremely useful because E[∑ 1_{Aᵢ}] = ∑ P(Aᵢ) by linearity.')
) AS c(pos, front, back)
WHERE d.slug = 'stat134'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 4 — Continuous Distributions & MGFs  (§4.1–4.5 + MGF)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'continuous-distributions'
CROSS JOIN (VALUES
  (0,  'continuous random variable',
       'An RV X with a probability density function (PDF); P(X = x) = 0 for every single point x; P(a ≤ X ≤ b) = ∫_a^b f(x)dx.'),
  (1,  'probability density function (PDF)',
       'A function f with f(x) ≥ 0 and ∫_{-∞}^∞ f(x)dx = 1; P(X ∈ A) = ∫_A f(x)dx.'),
  (2,  'CDF of a continuous RV',
       'F(x) = P(X ≤ x) = ∫_{-∞}^x f(t)dt; non-decreasing, right-continuous, with F(−∞)=0 and F(∞)=1; f(x) = F''(x).'),
  (3,  'Uniform distribution U[a, b]',
       'f(x) = 1/(b−a) on [a,b], 0 elsewhere; E[X] = (a+b)/2; Var(X) = (b−a)²/12.'),
  (4,  'Exponential distribution Exp(λ)',
       'f(x) = λe^{-λx} for x ≥ 0; E[X] = 1/λ, Var(X) = 1/λ²; models waiting times for a Poisson process.'),
  (5,  'memoryless property (exponential)',
       'P(X > s + t | X > s) = P(X > t) for all s,t ≥ 0; the exponential is the unique continuous memoryless distribution.'),
  (6,  'Normal distribution N(μ, σ²)',
       'f(x) = (1/σ√2π) exp(−(x−μ)²/(2σ²)); symmetric, bell-shaped; E[X] = μ, Var(X) = σ².'),
  (7,  'standard normal Z ~ N(0,1)',
       'μ = 0, σ = 1; CDF denoted Φ(z); standardise any normal by Z = (X−μ)/σ; P(a ≤ X ≤ b) = Φ((b−μ)/σ) − Φ((a−μ)/σ).'),
  (8,  '68–95–99.7 rule',
       'For X ~ N(μ,σ²): P(|X−μ| ≤ σ) ≈ 68%, P(|X−μ| ≤ 2σ) ≈ 95%, P(|X−μ| ≤ 3σ) ≈ 99.7%.'),
  (9,  'change of variables (PDF)',
       'If Y = g(X) and g is strictly monotone: f_Y(y) = f_X(g⁻¹(y)) · |d/dy g⁻¹(y)|; derived by differentiating the CDF of Y.'),
  (10, 'Gamma distribution Gamma(α, λ)',
       'f(x) = λ^α x^{α-1} e^{-λx} / Γ(α) for x > 0; E[X] = α/λ, Var(X) = α/λ²; reduces to Exp(λ) when α=1.'),
  (11, 'Gamma function Γ(α)',
       'Γ(α) = ∫_0^∞ t^{α-1}e^{-t}dt; Γ(n) = (n−1)! for positive integers n; Γ(1/2) = √π.'),
  (12, 'moment generating function (MGF) M_X(t)',
       'M_X(t) = E[e^{tX}]; when it exists in a neighbourhood of 0, M_X^{(k)}(0) = E[X^k]; uniquely determines the distribution.'),
  (13, 'MGF of a sum of independent RVs',
       'If X and Y are independent, M_{X+Y}(t) = M_X(t) · M_Y(t); multiplication of MGFs corresponds to convolution of distributions.'),
  (14, 'lognormal distribution',
       'If X ~ N(μ,σ²), then Y = e^X is lognormal; E[Y] = e^{μ + σ²/2}; used to model prices, incomes, and other positive quantities.')
) AS c(pos, front, back)
WHERE d.slug = 'stat134'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 5 — Joint Distributions & Correlation  (§5.1–5.4)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'joint-distributions'
CROSS JOIN (VALUES
  (0,  'joint PMF / joint PDF',
       'P(X=x, Y=y) for discrete; f_{X,Y}(x,y) for continuous with ∫∫ f_{X,Y} = 1; completely describes the pair (X,Y).'),
  (1,  'marginal distribution',
       'f_X(x) = ∫_{-∞}^∞ f_{X,Y}(x,y) dy (or sum over y for discrete); obtained by integrating out the other variable.'),
  (2,  'conditional distribution f_{X|Y}(x|y)',
       'f_{X|Y}(x|y) = f_{X,Y}(x,y) / f_Y(y) for f_Y(y) > 0; a valid PDF/PMF in x for each fixed y.'),
  (3,  'independence of random variables',
       'X and Y are independent iff f_{X,Y}(x,y) = f_X(x)·f_Y(y) for all (x,y); equivalently, E[g(X)h(Y)] = E[g(X)]·E[h(Y)].'),
  (4,  'covariance Cov(X, Y)',
       'E[(X−μ_X)(Y−μ_Y)] = E[XY] − E[X]E[Y]; positive means they tend to move together; Cov(X,X) = Var(X).'),
  (5,  'correlation ρ(X, Y)',
       'Cov(X,Y) / (σ_X · σ_Y); dimensionless; ρ ∈ [−1,1]; ρ = ±1 iff Y = aX + b (a.s.); ρ = 0 (uncorrelated) does not imply independence.'),
  (6,  'variance of a sum',
       'Var(X + Y) = Var(X) + Var(Y) + 2Cov(X,Y); for independent X,Y: Var(X+Y) = Var(X) + Var(Y).'),
  (7,  'Cauchy–Schwarz inequality (probability)',
       '|Cov(X,Y)|² ≤ Var(X)·Var(Y); equivalently |ρ| ≤ 1; equality iff Y = aX + b a.s.'),
  (8,  'conditional expectation E[X | Y = y]',
       '∑ₓ x P(X=x|Y=y) or ∫ x f_{X|Y}(x|y) dx; a function of y; captures the best linear (in fact best overall) predictor of X given Y.'),
  (9,  'law of total expectation (tower property)',
       'E[X] = E[E[X|Y]]; the inner expectation is over X given Y, the outer is over Y; extremely powerful for computing expectations.'),
  (10, 'law of total variance',
       'Var(X) = E[Var(X|Y)] + Var(E[X|Y]); decomposes total variance into average within-group variance + variance of group means.'),
  (11, 'bivariate normal distribution',
       'Characterised by (μ_X, μ_Y, σ_X, σ_Y, ρ); marginals are normal; if X,Y bivariate normal and ρ=0 then X,Y are independent.'),
  (12, 'convolution of independent RVs',
       'f_{X+Y}(z) = ∫ f_X(x)f_Y(z−x)dx; sum of independent normals is normal; sum of independent Poissons is Poisson.'),
  (13, 'order statistics X_{(k)}',
       'X_{(1)} ≤ ⋯ ≤ X_{(n)} are the sorted values of n i.i.d. RVs; f_{X_{(k)}}(x) = n!/[(k-1)!(n-k)!] F(x)^{k-1}(1-F(x))^{n-k}f(x).'),
  (14, 'uncorrelated does not imply independent',
       'If X ~ U[−1,1] and Y = X², then Cov(X,Y) = 0 but Y is a deterministic function of X; they are highly dependent.')
) AS c(pos, front, back)
WHERE d.slug = 'stat134'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- Ch 6 — Limit Theorems & Inequalities  (§6.1–6.5)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'limit-theorems'
CROSS JOIN (VALUES
  (0,  'Markov''s inequality',
       'For X ≥ 0 and a > 0: P(X ≥ a) ≤ E[X] / a; requires only non-negativity and finite mean; remarkably simple but often loose.'),
  (1,  'Chebyshev''s inequality',
       'P(|X − μ| ≥ k·σ) ≤ 1/k² for any k > 0; requires only finite variance; at least 75% of values within 2σ, 89% within 3σ.'),
  (2,  'one-sided Chebyshev (Cantelli)',
       'P(X − μ ≥ kσ) ≤ 1/(1+k²); sharper one-sided bound using variance only.'),
  (3,  'convergence in probability',
       'X_n → X in probability if P(|X_n − X| > ε) → 0 for every ε > 0; weaker than almost sure convergence.'),
  (4,  'almost sure convergence',
       'X_n → X a.s. if P(X_n → X as n→∞) = 1; the sequence converges on a set of probability 1; stronger than convergence in probability.'),
  (5,  'weak law of large numbers (WLLN)',
       'For i.i.d. X_i with mean μ, the sample mean X̄_n → μ in probability; proved using Chebyshev: Var(X̄_n) = σ²/n → 0.'),
  (6,  'strong law of large numbers (SLLN)',
       'For i.i.d. X_i with E|X| < ∞ and mean μ, X̄_n → μ almost surely; much harder to prove than WLLN.'),
  (7,  'central limit theorem (CLT)',
       'For i.i.d. X_i with mean μ and variance σ² < ∞, (X̄_n − μ)/(σ/√n) →_d N(0,1); the sum S_n = ∑Xᵢ is approximately N(nμ, nσ²).'),
  (8,  'convergence in distribution',
       'X_n →_d X if P(X_n ≤ x) → P(X ≤ x) at every continuity point of F_X; the weakest form of convergence.'),
  (9,  'normal approximation to Binomial',
       'Binomial(n,p) ≈ N(np, np(1−p)) for large n; accurate when np ≥ 5 and n(1−p) ≥ 5.'),
  (10, 'continuity correction',
       'When approximating a discrete distribution with a normal, P(X ≤ k) ≈ Φ((k + 0.5 − μ)/σ); improves accuracy significantly.'),
  (11, 'Poisson approximation (law of small numbers)',
       'Sum of many rare independent events is approximately Poisson; Binomial(n,p) ≈ Poisson(np) when n large and p small.'),
  (12, 'MGF proof of CLT',
       'The MGF of the standardised sum converges to e^{t²/2} (the N(0,1) MGF) as n→∞; convergence of MGFs implies convergence in distribution.'),
  (13, 'delta method',
       'If √n(X̄_n − μ) →_d N(0,σ²), then √n(g(X̄_n) − g(μ)) →_d N(0, σ²[g''(μ)]²); propagates CLT through smooth functions.'),
  (14, 'Borel–Cantelli lemma',
       'If ∑ P(Aₙ) < ∞, then P(Aₙ occurs infinitely often) = 0; used to prove SLLN and other almost-sure results.')
) AS c(pos, front, back)
WHERE d.slug = 'stat134'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- ─────────────────────────────────────────────────────────────
-- Update card count
-- ─────────────────────────────────────────────────────────────
UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'stat134';
