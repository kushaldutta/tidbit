-- Migration 070: DATA 140 — Probability for Data Science, new deck.
-- UC Berkeley Fall 2026: Ani Adhikari, TuTh 14:00-15:29, Dwinelle 155
-- (DATA C140 / STAT C140). Catalog: discrete and continuous families,
-- bounds, transforms, Markov chains and MCMC, conditioning, Bayes, MLE,
-- least squares, multivariate normal, multiple regression.
-- Textbook: Probability for Data Science (Adhikari and Pitman).
-- Sequence follows data140.org FA26 lectures (Ch 1 through Ch 25).
-- Distinct from STAT 134: computation, Markov before continuous, MCMC,
-- Poissonization, conjugate Bayes. Site: data140.org.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'data140',
  'DATA 140',
  'Probability for Data Science — Adhikari / Pitman: distributions, Markov, MCMC, regression',
  'uc-berkeley:data140:fa26',
  'system',
  true,
  '🎲',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'data140');

DELETE FROM public.tidbits
WHERE category_id = 'data140';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'data140');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'data140');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('axioms',      'Axioms, Rules & Approximation',
   'Outcome space, Kolmogorov, inclusion-exclusion, exponential approx (Ch 1-2)', 0),
  ('rvs',         'Random Variables & Symmetry',
   'Distributions, equality, conditioning, permutations (Ch 3-5)', 1),
  ('counts',      'Random Counts & Poissonization',
   'Bernoulli, binomial, Poisson limit, independence (Ch 6-7)', 2),
  ('expectation', 'Expectation',
   'Linearity, indicators, additivity, conditioning (Ch 8-9)', 3),
  ('markov',      'Markov Chains & MCMC',
   'Transitions, balance, Metropolis, Gibbs (Ch 10-11)', 4),
  ('spread',      'SD, Tails, Covariance & CLT',
   'Variance, Markov/Chebyshev, covariance, CLT (Ch 12-14)', 5),
  ('continuous',  'Densities & Transformations',
   'PDFs, change of variables, joint densities (Ch 15-17)', 6),
  ('mgf',         'Normal, Gamma & MGFs',
   'Independent normals, gamma, MGF, Chernoff (Ch 18-19)', 7),
  ('inference',   'MLE, MAP, Beta-Binomial & Prediction',
   'Likelihood, conjugates, best predictor, MSE (Ch 20-22)', 8),
  ('regression',  'MVN, Correlation & Regression',
   'Random vectors, simple and multiple regression (Ch 23-25)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'data140'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Axioms, Rules & Approximation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'axioms'
CROSS JOIN (VALUES
  (0,  'DATA 140 (Adhikari) in one sentence',
       'Probability as a math-and-code course: exact distributions when you can, bounds and limits when you cannot, then Markov chains, MCMC, Bayes, and regression. Textbook: Probability for Data Science (Adhikari and Pitman). Not Stat 134 — 140 puts chains and computation before a full continuous assault. Site: data140.org.'),
  (1,  'outcome space and event',
       'Omega is the set of possible outcomes. An event is a subset. 140: name Omega before you write a probability, especially on permutations or sampling. If two stories share a number but not a space, they are different problems.'),
  (2,  'Kolmogorov axioms',
       'Non-negative: P(A) at least 0. Sure event: P(Omega) = 1. Additivity for disjoint unions (countable, once Omega is infinite). 140: every other rule is a corollary. If a "probability" can be negative or the parts sum over 1, the model is broken.'),
  (3,  'complement and difference',
       'P(A^c) = 1 - P(A). P(A and not B) = P(A) - P(A and B). 140: "at least one" is 1 minus "none." Do not expand a huge union by listing if the complement is a product.'),
  (4,  'addition / inclusion-exclusion',
       'P(A or B) = P(A) + P(B) - P(A and B). Three events: add singles, subtract pairs, add the triple. 140: for a bound, the first term (union bound / Boole) is enough: P(union) at most the sum. Exact vs bound is an exam fork.'),
  (5,  'multiplication rule',
       'P(A and B) = P(A) P(B given A). Chain for more events. 140: this is how you build a tree, not "multiply because independent" unless you checked independence. Order the conditioning to match how the experiment actually unfolds.'),
  (6,  'equally likely outcomes',
       'If every omega has the same chance, P(A) = |A| / |Omega|. 140: the work is counting. Random permutation, random subset, random sample — say with or without replacement and ordered or not before you write a binomial coefficient.'),
  (7,  'exponential approximation',
       '(1 - 1/n)^n goes to 1/e. More generally (1 - a/n)^n to e^{-a}. 140 matching / hashing / birthday energy: write the exact product, take log, recognize the exp limit. The Poisson limit is the same idea with counts.'),
  (8,  'union bound (Boole)',
       'P(A1 or ... or An) at most sum P(Ai), always, even with dependence. 140: a cheap upper bound when inclusion-exclusion is ugly. If the events are rare and weakly dependent, the bound is close; if they heavily overlap, it is loose.'),
  (9,  'conditional probability',
       'P(B given A) = P(A and B) / P(A) when P(A) is positive. 140: a new probability on the reduced space A. Bayes later is this plus the partition. Restricting the sample space is not the same as "A causes B."'),
  (10, 'total probability',
       'If B1..Bk partition Omega, P(A) = sum P(A given Bi) P(Bi). 140: draw the partition first (which world am I in?), then the likelihood in each world. Missing a piece of the partition is the classic miss.'),
  (11, 'Bayes (discrete)',
       'P(Bi given A) proportional to P(A given Bi) P(Bi), then divide by the total-probability denominator. 140: prior times likelihood, normalize. Base rate belongs in the prior. A high likelihood with a tiny prior can still lose.'),
  (12, 'independence of events',
       'A and B are independent if P(A and B) = P(A)P(B), equivalently P(B given A) = P(B) when defined. 140: pairwise independence does not give mutual independence of three events. Disjoint events with positive chance are dependent, not independent.'),
  (13, 'axioms exam move',
       'Name Omega, decide equally likely or not, then pick a rule: complement, inclusion-exclusion, product, or bound. If they say "approximate," reach for (1 - a/n)^n or a Poisson limit, not a fake exact fraction. Circle whether they want exact or approx.'),
  (14, 'axioms trap',
       'Treating "at least one" as a sum that can exceed 1. Multiplying dependent events. Counting ordered tuples with C(n,k) or unordered with n!. 140: write one sentence about the sampling scheme before the formula.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 2. Random Variables & Symmetry
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rvs'
CROSS JOIN (VALUES
  (0,  'random variable',
       'A numerical function of the outcome: X(omega). 140: the distribution is the list of possible values and chances, not the name of the story. Two different experiments can share a distribution.'),
  (1,  'distribution / PMF',
       'For a discrete X, f(x) = P(X = x), nonnegative and summing to 1. 140: specify the possible set (0 through n, the positive integers, ...). A formula without the support is incomplete. Use the course code (prob140 / scipy.stats) to plot, then check the sum.'),
  (2,  'equal versus equal-in-distribution',
       'X = Y means the same number on every omega (as functions). X =_d Y means the same distribution. 140: two i.i.d. copies are equal in distribution, not equal. A function of X has a distribution determined by X, but g(X) is not "the same RV as X."'),
  (3,  'joint, marginal, conditional',
       'Joint: P(X = x, Y = y). Marginal: sum the joint over the other variable. Conditional: joint divided by the marginal of the given variable. 140: always write which is given. A conditional distribution is a distribution (rows or columns sum to 1).'),
  (4,  'independence of RVs',
       'X and Y independent iff the joint is the product of the marginals for all x, y (discrete). Functions of independent RVs stay independent. 140: uncorrelated is weaker (later). Pairwise independent coordinates need not be mutually independent.'),
  (5,  'conditioning a RV on an event',
       'The distribution of X given A is P(X = x and A) / P(A). 140: this is how "update after you saw something" starts. If A is {Y = y}, you recover the conditional distribution of X given Y.'),
  (6,  'functions of a random variable',
       'To get the distribution of g(X), partition the possible x by the value of g. 140: if g is not one-to-one, add the probabilities that land on the same g. Do not plug g into the PMF formula blindly (that is a density Jacobian later).'),
  (7,  'symmetry / exchangeability',
       'If a finite collection is exchangeable, any permutation of the labels has the same joint distribution. 140: a random permutation of n distinct items; a simple random sample. Then P(position i is a specific item) = 1/n by symmetry, without listing n!.'),
  (8,  'random permutations and matches',
       'Uniform random permutation of n items. A match (fixed point) at i has chance 1/n. Number of matches has expectation 1 (linearity), and is approximately Poisson(1) for large n. 140: the classic (1 - 1/n)^n to 1/e for no matches.'),
  (9,  'simple random sample',
       'A subset of size k drawn uniformly from n, without replacement. Hypergeometric counts of a type. 140: dependence between draws, but symmetry still gives each draw the same marginal. Binomial is the with-replacement / infinite-population cousin.'),
  (10, 'indicators as RVs',
       'I_A is 1 if A occurs, else 0. P(I_A = 1) = P(A). 140: counts are sums of indicators even when the indicators are dependent (matches, coupons). That is why linearity is the first hammer, not independence.'),
  (11, 'collections of events (Ch 5)',
       'Inclusion-exclusion for n events; matching as a union of "i is a match." 140: write the intersection probabilities by counting or symmetry, then IE. Truncating IE after two terms is a bound, not the exact chance, unless they ask for approx.'),
  (12, 'RV exam move',
       'Name the possible values, write the PMF or a construction (permutation, sample, function of simpler RVs). If they ask P(g(X) in B), map back to X. If they say "by symmetry," name the group of equally likely labels you are swapping.'),
  (13, 'equality trap',
       'Writing X = Y when you only have the same law. Using a marginal as if it were conditional. 140: P(X = Y) is a number about the couple (X, Y), not "they have the same distribution." Independent identical copies: P(X = Y) can be small.'),
  (14, 'symmetry trap',
       'Claiming two positions in a without-replacement sample are independent. They are identically distributed, not independent. 140: P(both are aces) is not (4/52)^2. Compute the sequential product or hypergeometric.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 3. Random Counts & Poissonization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'counts'
CROSS JOIN (VALUES
  (0,  'Bernoulli(p)',
       'Takes 1 with chance p, 0 with chance 1-p. Mean p, variance p(1-p). 140: the atom of every count. An indicator is Bernoulli. Binomial(1, p) is the same law.'),
  (1,  'binomial(n, p)',
       'Number of successes in n i.i.d. Bernoulli(p) trials. P(X = k) = C(n,k) p^k (1-p)^{n-k} for k = 0 to n. Mean np, variance np(1-p). 140: trials independent with a common p. Sampling without replacement is hypergeometric, not binomial — unless n is tiny vs population.'),
  (2,  'Poisson(mu)',
       'P(X = k) = e^{-mu} mu^k / k! for k = 0, 1, 2, .... Mean mu, variance mu (equal). 140: rare events, counts in time/space, and the limit of binomial. Support is all nonnegative integers, not 0 to n.'),
  (3,  'Poisson limit of binomial',
       'n large, p small, np = mu fixed: binomial(n, p) looks like Poisson(mu). 140: write the exact binomial, pass to the Poisson PMF, say the regime. If p is not small, use CLT later, not Poisson. Matching used Poisson(1).'),
  (4,  'geometric and waiting',
       'Trials until first success (or number of failures before first, depending on convention — 140 will specify). Memoryless for the discrete geometric: given no success yet, the wait restarts. 140: E[wait] = 1/p for the "until first success" version.'),
  (5,  'negative binomial (light)',
       'Wait for r successes: sum of r i.i.d. geometrics. 140: use convolution / independence of waits, or a binomial-style PMF if they give it. Do not treat it as binomial(n, p) with n random unless that is the story.'),
  (6,  'independence of counts',
       'Independent binomials with the same p, different n, sum to binomial(n1+n2, p). Independent Poissons sum to Poisson(sum of means). 140: this is a theorem, not a vibe. Dependent Bernoulli sum is still a count; its law need not be binomial.'),
  (7,  'Poissonization slogan',
       'Randomize the number of trials: let N be Poisson(mu), independent of i.i.d. categorical labels. Then the type counts are independent Poissons with means mu times the type probabilities. 140: this is the computational trick of Ch 7, not "Poisson because rare."'),
  (8,  'why Poissonization helps',
       'Fixed n multinomial counts are dependent (they sum to n). After Poissonizing N, the counts are independent, so products of Poisson PMFs. Conditioning on the total restores the multinomial. 140: compute with independence, then un-condition if they fix n.'),
  (9,  'multinomial (light)',
       'n independent trials, k categories, probabilities p1..pk. Joint is n! / (n1! ... nk!) times product pi^{ni}, counts sum to n. 140: each margin is binomial(n, pi). Pair of counts: not independent. Poissonization makes them independent Poissons.'),
  (10, 'thinning a Poisson',
       'If N is Poisson(mu) and each point is kept independently with chance p, the kept count is Poisson(mu p), independent of the discarded Poisson(mu(1-p)). 140: same math as Poissonization with two labels. A random subset of a Poisson process is Poisson.'),
  (11, 'hypergeometric vs binomial',
       'Hypergeometric: without-replacement count of a type in a finite population. Variance smaller than the binomial analog (negative dependence). 140: if they say "deck of cards" or "SRS," hypergeometric. If "with replacement" or "iid trials," binomial.'),
  (12, 'counts exam move',
       'Name the trial, success, n, p. Check independence. If rare, Poisson(mu) with mu = np. If N is Poisson and labels random, write independent Poissons. If they condition on the total, you are back in multinomial land.'),
  (13, 'Poissonization trap',
       'Treating fixed-n category counts as independent Poissons. They are dependent. 140: independence holds after Poissonizing the total, not before. Also: Poisson(mu) variance is mu — if a count is binomial with n=10, p=0.5, Poisson is the wrong picture.'),
  (14, 'binomial trap',
       'Using C(n,k) p^k q^{n-k} when trials are dependent (without replacement, Markov, a permutation). Linearity of expectation can still give the mean; the distribution is not binomial. 140: mean np-style via indicators even when Var is not np(1-p).')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 4. Expectation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'expectation'
CROSS JOIN (VALUES
  (0,  'definition of E[X]',
       'Discrete: sum of x P(X = x) over the possible set (absolutely convergent if two-sided infinite). 140: it is a long-run average and a center of mass. Existence is not free for heavy tails (later: Cauchy has no mean).'),
  (1,  'tail-sum formula',
       'If X is nonnegative integer valued, E[X] = sum_{k=1}^infty P(X at least k). 140: geometric waits and counts of rare events. Do not start from sum k p(k) if the tail is easier. For a bounded 0-to-n RV you can stop at n.'),
  (2,  'linearity, always',
       'E[aX + bY] = a E[X] + b E[Y] with no independence. 140: this is the most used theorem in the course. Matches, coupons, occupancy: write indicators, take E, done. Linearity of variance is false without extra assumptions.'),
  (3,  'indicators and counting',
       'E[I_A] = P(A). E[number of events that occur] = sum P(Ai). 140: dependence among the Ai does not matter for the expectation. It does matter for the variance and for P(at least one).'),
  (4,  'expectation of a function',
       'E[g(X)] = sum g(x) P(X = x), not g(E[X]) in general. Jensen later for convex g. 140: computing E[X^2] from the law of X is how you get variance. Plugging the mean into g is the #1 algebra fail.'),
  (5,  'additivity of expectation vs the story',
       'A sum is a sum even if the terms come from a chain or a without-replacement sample. 140: you may not know the joint and still know each marginal mean. That is the point of linearity.'),
  (6,  'E[X given Y = y]',
       'The mean of the conditional distribution of X given Y = y: a number that depends on y. As a random variable, E[X | Y] is that function of Y. 140: it is the least-squares predictor of X given Y (later Ch 22). Not a number unless Y is fixed.'),
  (7,  'iterated expectation (tower)',
       'E[X] = E[ E[X | Y] ]. 140: condition on the part of the story that makes X simple (N first, then the binomial; the first step of a chain). If you can write E[X | Y] as a formula in Y, take E of that formula.'),
  (8,  'conditioning on a partition',
       'E[X] = sum E[X | Bi] P(Bi) when the Bi partition. 140: same as the tower with Y labeling the block. Compute the inner means in each world, then average with the prior on worlds.'),
  (9,  'Wald / random sums (light)',
       'If N is a stopping-like count independent of i.i.d. X_i with finite mean, E[sum_{i=1}^N X_i] = E[N] E[X]. 140: Poisson number of trials times mean per trial. Independence of N and the X_i is the usual 140 hypothesis — do not skip it.'),
  (10, 'geometric mean wait',
       'Independent trials, success p: expected trials until first success is 1/p. 140: condition on the first trial (1 + (1-p) times the same wait) or use tail sums. Memoryless: leftover wait given survival has the same law.'),
  (11, 'coupon and occupancy means',
       'Expected new coupons, expected empty bins: indicators plus linearity. 140: the classic harmonic-number wait for all n types. You can get the mean without the full waiting-time law.'),
  (12, 'expectation exam move',
       'Prefer indicators or the tower over expanding a giant joint. State linearity. If they want E[g(X)], use the law of X, not g of the mean. If a random index N appears, condition on N.'),
  (13, 'expectation trap',
       'E[XY] = E[X]E[Y] without independence (or uncorrelated, for the product mean). E[1/X] = 1/E[X]. E[max] = max of expectations. 140: if the function is nonlinear, compute from the distribution or condition.'),
  (14, 'conditioning trap',
       'Treating E[X | Y] as a constant, or dropping the outer E. Using P(X | Y) language for a mean. 140: E[X | Y = y] is a number; E[X | Y] is a RV. Mixing them loses points even if the algebra in one world was right.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 5. Markov Chains & MCMC
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'markov'
CROSS JOIN (VALUES
  (0,  'Markov property',
       'Given the present, the future is independent of the past. P(X_{n+1} = j | X_n = i, history) = P(X_{n+1} = j | X_n = i) = P_{ij}. 140: the state must be rich enough that this is true. A process that needs two lags is Markov on pairs, not on the original state.'),
  (1,  'transition matrix',
       'Rows (or the course''s convention — 140 uses P_{ij} = chance i to j) are distributions: nonnegative, each row sums to 1. n-step: P^n. 140: draw the graph, then the matrix. A zero in P^n for all n means j is unreachable from i.'),
  (2,  'irreducible and aperiodic',
       'Irreducible: every state can reach every other (one communicating class). Aperiodic: gcd of return times is 1 (no forced odd/even oscillation). 140: both are the usual hypotheses for P^n going to a unique stationary. A two-cycle is periodic: P^n does not settle to one vector.'),
  (3,  'stationary / invariant distribution',
       'A row vector pi with pi P = pi and pi summing to 1. Start in pi, stay in pi for all n. 140: solve the balance equations plus the sum. Finite irreducible chains have a unique stationary. It is a long-run proportion of time, not "the start."'),
  (4,  'detailed balance',
       'pi_i P_{ij} = pi_j P_{ji} for all i, j (reversibility). If you find a pi that satisfies detailed balance and sums to 1, it is stationary. 140: easier than pi P = pi when the graph is undirected with weights. Birth-death chains: detailed balance is the usual route.'),
  (5,  'long-run and convergence',
       'For finite irreducible aperiodic chains, P(X_n = j | X_0 = i) goes to pi_j, independent of i. 140: the stationary is the limit and the long-run fraction of visits. Periodic: the Cesaro average still goes to pi, the one-step law may oscillate.'),
  (6,  'hitting and expected time',
       'First hitting time of A; expected time from i, often by first-step analysis: e_i = 1 + sum_j P_{ij} e_j, with e = 0 on A. 140: this is a linear system. Do not quote 1/pi_i unless they asked mean return time to i (that one is 1/pi_i).'),
  (7,  'balance lecture (Ch 11)',
       'Probability flux in equals flux out at stationarity. Detailed balance is pairwise flux equality. 140: if a chain is reversible, running it backward looks like the same chain. MCMC algorithms are designed so a target pi is stationary, often via detailed balance.'),
  (8,  'Metropolis-Hastings idea',
       'Propose y from a kernel Q(x, y). Accept with chance min(1, [pi(y) Q(y,x)] / [pi(x) Q(x,y)]), else stay. Then pi is stationary (detailed balance). 140: you only need pi up to a constant — the Z cancels. A bad Q still has the right limit, just slow mixing.'),
  (9,  'Metropolis special cases',
       'If Q is symmetric, accept min(1, pi(y)/pi(x)). If you propose from pi itself, accept always. 140: random-walk Metropolis on a graph: propose a neighbor, accept by the pi ratio. Never "accept the higher pi only" — you must sometimes go downhill.'),
  (10, 'Gibbs sampling',
       'Update one coordinate at a time from its full conditional given the others. Each step leaves the target joint invariant. 140: useful when full conditionals are easy (beta-binomial, normals). Gibbs is a special MH with acceptance 1.'),
  (11, 'MCMC for data science',
       'When you cannot sample pi directly (posterior, Ising, a huge discrete space), run a chain whose stationary is pi and throw away burn-in. 140: the algorithm does not prove mixing. Diagnostics and long runs are the engineering; detailed balance is the math.'),
  (12, 'Markov exam move',
       'Write P, check irreducible/aperiodic, solve pi P = pi or detailed balance. For expected hitting, first-step equations. For MCMC: name the target pi, the proposal Q, the acceptance ratio, and that Z cancels. Limit law is pi, not the proposal.'),
  (13, 'Markov trap',
       'Calling a chain stationary because you started at a mode. Using 1/pi_i as a hitting time from somewhere else. Forgetting row-stochastic (rows must sum to 1). 140: P^2 is two steps, not "squared probabilities of one step."'),
  (14, 'MCMC trap',
       'Thinking the proposal Q is the target. Dropping the Hastings ratio Q(y,x)/Q(x,y) when Q is not symmetric. Claiming a short run "equals" pi. 140: stationary is a theorem about the kernel; your 100 iterates are an approximation.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 6. SD, Tails, Covariance & CLT
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'spread'
CROSS JOIN (VALUES
  (0,  'variance and SD',
       'Var(X) = E[(X - mu)^2] = E[X^2] - mu^2. SD is the square root, same units as X. 140: shift does not change Var; scale: Var(aX+b) = a^2 Var(X). A mean without an SD is half a description.'),
  (1,  'computational formula',
       'Get E[X^2] from the law (or from a tail / generating story), subtract (E[X])^2. 140: for indicators Var(I_A) = p(1-p). For a count of dependent indicators, expand E[(sum I)^2] = sum p + 2 sum P(both).'),
  (2,  'Markov''s inequality',
       'If X is nonnegative and a is positive, P(X at least a) at most E[X]/a. 140: only uses the mean. Crude, always available. Do not apply Markov to a signed X (use |X| or X^2). Equality cases are extreme two-point laws.'),
  (3,  'Chebyshev',
       'P(|X - mu| at least k SD) at most 1/k^2, or P(|X-mu| at least a) at most Var(X)/a^2. 140: uses mean and variance, no shape. Weaker than a normal tail. If they say "no other assumptions," Chebyshev, not 68-95-99.7.'),
  (4,  'tail bounds vs exact',
       '140 culture: compute exact when the PMF is nice; bound when it is not. Markov/Chebyshev are distribution-free. Later Chernoff uses the MGF and is much sharper for sums of independents. A bound that is bigger than 1 is true and useless — say so.'),
  (5,  'covariance',
       'Cov(X,Y) = E[(X-mu_X)(Y-mu_Y)] = E[XY] - mu_X mu_Y. Bilinear, and Cov(X,X) = Var(X). 140: Cov = 0 is uncorrelated, not independent. Independent implies uncorrelated (when the means exist).'),
  (6,  'variance of a sum',
       'Var(sum X_i) = sum Var(X_i) + 2 sum_{i less than j} Cov(X_i, X_j). Independent or just uncorrelated: covariances drop. 140: without-replacement samples have negative cov, so the variance of the sum is smaller than the iid analog.'),
  (7,  'correlation',
       'r = Cov(X,Y) / (SD_X SD_Y), between -1 and 1. Invariant to positive scaling of each variable separately (signs follow). 140: r = ±1 iff a perfect linear relation a.s. (when SDs exist). r = 0 is not "no relationship."'),
  (8,  'uses of covariance (Ch 13)',
       'Error of a sum, variance of a sample mean, bilinear expansion. 140: E[XY] = Cov + product of means — a way to get a product mean without independence. For indicators, Cov(I_A, I_B) = P(A and B) - P(A)P(B).'),
  (9,  'CLT slogan',
       'For iid with finite mean and variance, the standardized sample mean goes to standard normal. 140: this is about the sum/mean, not one draw. Continuity correction for integer counts is a bonus if they ask. Poisson and binomial both have CLT regimes.'),
  (10, 'normal approximation to counts',
       'Binomial(n,p): mean np, SD sqrt(np(1-p)), then Phi. 140: better when np and n(1-p) are not tiny; if they are, Poisson was the earlier tool. Do not use a normal tail on a highly skewed tiny-n law and call it 140.'),
  (11, 'standard units',
       'Z = (X - mu) / SD. Mean 0, variance 1. CLT: Z_n for the sample mean is approximately normal(0,1). 140: using the SD of one observation in place of the SE of the mean (SD/sqrt(n)) is the classic width error.'),
  (12, 'spread exam move',
       'Mean from linearity; variance from E[X^2] or the sum/cov expansion. Tail: Markov if only mean, Chebyshev if mean and var, normal/CLT if a sum of many. State the hypotheses. If they want exact, do not Chebyshev.'),
  (13, 'Chebyshev trap',
       'Using 1/k^2 as if it were a normal 5% rule. Applying Markov to X - mu (can be negative). 140: Chebyshev is an upper bound on a tail, not an approximation of it. A tiny Chebyshev bound is strong; a bound of 0.8 is weak.'),
  (14, 'covariance trap',
       'Dropping the 2 and the pairs in Var(sum). Setting Cov = 0 because the story "feels random." 140: without replacement, matching, hypergeometric — compute P(both) minus product. Independent is a hypothesis you justify.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 7. Densities & Transformations
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'continuous'
CROSS JOIN (VALUES
  (0,  'density vs mass',
       'A PDF f satisfies P(X in A) = integral_A f, f at least 0, total integral 1. Point chances are 0. 140: f(x) is not P(X = x). Units are probability per unit of x. A CDF F(x) = P(X at most x) has derivative f at continuity points.'),
  (1,  'uniform and exponential',
       'Uniform(a,b): constant density 1/(b-a) on the interval. Exponential(lambda): lambda e^{-lambda x} on the positive reals, memoryless, mean 1/lambda. 140: min of independent exponentials is exponential with summed rates. Uniform is the Jacobian baby example.'),
  (2,  'CDF method',
       'For Y = g(X) monotone, write F_Y(y) = P(g(X) at most y), invert the event, use F_X, differentiate. 140: draw the inequality direction (increasing vs decreasing). This beats blindly plugging into a formula when g is piecewise.'),
  (3,  'change of variables (1D)',
       'If Y = g(X) with g smooth and one-to-one on the support, f_Y(y) = f_X(x(y)) times |dx/dy|. 140: the absolute derivative is the Jacobian factor. Forget it and the density will not integrate to 1. Support of Y is g of support of X.'),
  (4,  'normal density (univariate)',
       'Bell, mean mu, SD sigma, total area 1. Standard phi and Phi. 140: linear functions of normals are normal. This week it is a density; next week it is a family closed under independent sums. Not every unimodal hist is normal.'),
  (5,  'joint density',
       'P((X,Y) in A) = double integral_A f. Marginals: integrate out the other variable. Conditional density of X given Y=y is f(x,y) / f_Y(y). 140: independence iff the joint factors as a product of a function of x and a function of y (then normalize).'),
  (6,  'independent continuous RVs',
       'Joint density is the product of the marginal densities. 140: then P(X in A, Y in B) = product of probabilities. A rectangle probability is not the whole story — dependence lives in non-product joints (copulas later, not 140).'),
  (7,  'two-dimensional Jacobian',
       'For a smooth invertible map (X,Y) to (U,V), the joint of (U,V) is the old joint times |det D(x,y)/D(u,v)|. 140: compute the inverse map, then the determinant of partials. Polar coordinates for two independent standard normals is the classic (Rayleigh / chi-square).'),
  (8,  'geometric probability',
       'Uniform on a region: chance = area(event) / area(space). 140: Buffon, broken stick, two arrival times. The density is constant; the work is geometry. Do not use a 1D uniform on a 2D set.'),
  (9,  'convolution (continuous)',
       'Density of X+Y for independent X, Y: integral f_X(x) f_Y(z-x) dx. 140: gamma and normal families are closed under convolution (with parameter rules). Direct convolution is messy — MGFs next week are the algebra.'),
  (10, 'order statistics (light)',
       'Min and max of i.i.d. continuous: CDFs (1-F)^n and F^n. 140: uniforms on (0,1) make beta laws (later Ch 21). Spacing of uniforms relates to exponentials / Poisson processes if they go there.'),
  (11, 'hazard / memoryless continuous',
       'Exponential is the continuous memoryless law: leftover lifetime given survival is a fresh exponential. 140: discrete geometric is the analog. Gaussian is not memoryless. A constant hazard is exponential.'),
  (12, 'density exam move',
       'Write the support first, then the formula. For a transform: CDF method or Jacobian, including the absolute derivative. For a joint event: draw the region, set limits, integrate. Independence: factor the joint.'),
  (13, 'density trap',
       'Reading f(x) as a probability. Integrating a joint without drawing the dependent limits (the region is a triangle, not a rectangle). Dropping |dx/dy|. 140: after a transform, check that the new density integrates to 1 on the new support.'),
  (14, 'continuous-discrete mix',
       'P(X at most a) for a continuous X uses the CDF, not a sum. Mixing a Poisson number of exponential waits is a different object (gamma / Poisson process). 140: say discrete or continuous before you write sum vs integral.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 8. Normal, Gamma & MGFs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'mgf'
CROSS JOIN (VALUES
  (0,  'independent normals',
       'Linear combinations of independent normals are normal. Sum of independent N(mu_i, sigma_i^2) is N(sum mu, sum sigma^2). 140: you need independence (or joint normality) — uncorrelated normals that are jointly normal are independent, a MVN fact next chapter.'),
  (1,  'gamma family',
       'Gamma(r, lambda): waiting time for r exponential(lambda) clocks (integer r), density involving x^{r-1} e^{-lambda x}. Mean r/lambda. 140: exponential is gamma(1, lambda). Sums of i.i.d. exponentials are gamma. Chi-square is a gamma in other parameters.'),
  (2,  'normal and chi-square',
       'Square of a standard normal is chi-square(1), a gamma. Sum of independent chi-squares adds degrees of freedom. 140: sample variance stories later; this week it is a map from Z to Z^2. Support is the positive reals, not the whole line.'),
  (3,  'MGF definition',
       'M(t) = E[e^{tX}], for t in an open interval around 0 (when it exists). 140: a generating function for moments: M-prime(0) = E[X], second derivative at 0 is E[X^2], and so on. Not every law has an MGF (heavy tails). If they give M, you can name the law when it matches a catalog.'),
  (4,  'MGF of independent sums',
       'If X, Y independent, M_{X+Y}(t) = M_X(t) M_Y(t). 140: this is why MGFs beat convolution. A sum of i.i.d. has M(t)^n. Identify the product with a named MGF to get the law of the sum.'),
  (5,  'named MGFs (catalog)',
       'Bernoulli/binomial: (q + p e^t)^n. Poisson: exp(mu(e^t - 1)). Normal: exp(mu t + sigma^2 t^2 / 2). Exponential/gamma: (lambda / (lambda - t))^r for t less than lambda. 140: matching the algebra to the catalog is the exam skill.'),
  (6,  'uniqueness',
       'If two laws have MGFs that agree on an open interval around 0, the laws agree. 140: that justifies "the MGF is exp(mu(e^t-1)), hence Poisson(mu)." Without uniqueness you only have moments, not the distribution.'),
  (7,  'Chernoff bound',
       'For t positive, P(X at least a) at most e^{-t a} M(t). Optimize in t. 140: exponential tilt; much sharper than Markov on the same e^{tX}. For a sum of independents, M is a product. State t greater than 0 and that you pick the best t.'),
  (8,  'Chernoff vs Chebyshev',
       'Chebyshev: polynomial tails from variance. Chernoff: exponential tails from the MGF. 140: use Chernoff when they give or you know M and want a small-probability bound on a sum. Use Chebyshev when you only have a variance.'),
  (9,  'standardizing via MGF',
       'The MGF of (X-mu)/sigma can be written from M_X. CLT sketch: MGFs of standardized sums go to exp(t^2/2), the standard normal MGF. 140: this is the moment-generating CLT story, not a full proof they want written, but it explains the normal limit.'),
  (10, 'gamma and Poisson relation',
       'Integer-shape gamma waiting times vs Poisson counts: P(wait for r events greater than t) = P(fewer than r Poisson events by t). 140: one integral equals a Poisson tail. Use whichever side is easier.'),
  (11, 'MGF exam move',
       'Write M(t) = E[e^{tX}], expand or recognize. For a sum of independents, multiply. Match the catalog. For a tail, write Chernoff, plug M, minimize in t if they want the best bound. Mention the domain of t (normal: all t; exponential: t less than lambda).'),
  (12, 'MGF trap',
       'Multiplying MGFs without independence. Evaluating M at 1 and calling it a probability. Differentiating at t=1 instead of 0 for moments. 140: E[X] is the derivative of M at 0, not M(1). Chernoff with a negative t bounds the other tail — pick the sign to match the event.'),
  (13, 'normal-gamma trap',
       'Adding variances when variables are not independent. Treating a gamma as a normal because both are unimodal. 140: gamma is skewed for small shape; it looks more bell-like as r grows (CLT). Chi-square(1) is very skewed.'),
  (14, 'independent-family exam pair',
       'Two independent gamma(r, lambda) and gamma(s, lambda) (same rate): sum is gamma(r+s, lambda), and the sum and the proportion are independent (beta). 140: this is the bridge into the beta-binomial week. Different rates: sum is not gamma.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 9. MLE, MAP, Beta-Binomial & Prediction
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'inference'
CROSS JOIN (VALUES
  (0,  'likelihood',
       'For iid data, L(theta) = product f(x_i | theta) (or PMF). 140: a function of the parameter, after the data are fixed. Maximize L or log L. The data are not random in the likelihood function — theta is the variable.'),
  (1,  'MLE',
       'A parameter value that maximizes L. Often solve the score (derivative of log L) = 0, check it is a max. 140: binomial/Bernoulli MLE is the sample proportion; Poisson MLE is the sample mean; normal mean MLE is the sample mean. Invariance: MLE of g(theta) is g of the MLE.'),
  (2,  'MAP',
       'Maximize posterior pi(theta | data) proportional to L(theta) times prior pi(theta). 140: MAP is a mode of the posterior, not the posterior mean. A flat prior makes MAP look like MLE. A strong prior pulls the mode.'),
  (3,  'prior to posterior',
       'Bayes: posterior proportional to likelihood times prior, then normalize. 140: discrete parameter spaces are tables; continuous are densities. The evidence P(data) is the integral or sum of likelihood times prior.'),
  (4,  'beta family',
       'Beta(r, s) on (0,1), density proportional to theta^{r-1} (1-theta)^{s-1}. Mean r/(r+s). 140: the conjugate prior for a Bernoulli/binomial success probability. r and s act like prior successes and failures (plus 1, depending on counting).'),
  (5,  'beta-binomial conjugate',
       'Prior Beta(r,s), data binomial/Bernoulli with k successes in n trials: posterior Beta(r+k, s+n-k). 140: this is the headline of Ch 21. Predictive chance of next success is the posterior mean (r+k)/(r+s+n). You do not need the beta normalizing constant to update.'),
  (6,  'posterior mean vs MAP vs MLE',
       'For Beta(r+k, s+n-k): mean is (r+k)/(r+s+n); MAP is (r+k-1)/(r+s+n-2) for r,s greater than 1. MLE ignores r,s and is k/n. 140: they asked which one — do not mix. For large n the three meet. For small n the prior matters.'),
  (7,  'binomial likelihood as a beta kernel',
       'L(p) proportional to p^k (1-p)^{n-k}, which is a Beta(k+1, n-k+1) shape. 140: a uniform prior (Beta(1,1)) plus binomial data gives that posterior. "Likelihood looks like a beta" is why conjugacy is algebra, not magic.'),
  (8,  'best predictor (least squares)',
       'Among all functions g(X), the g that minimizes E[(Y - g(X))^2] is g(X) = E[Y | X]. 140: Ch 22 slogan. If you must use a linear function, that is a different (weaker) class — next section. The conditional mean can be nonlinear.'),
  (9,  'mean squared error',
       'MSE = E[(Y - hat Y)^2]. If hat Y = E[Y | X], MSE = E[Var(Y | X)]. 140: the leftover is the average conditional variance. A constant predictor E[Y] has MSE = Var(Y), which is larger (or equal) by the variance decomposition.'),
  (10, 'variance by conditioning',
       'Var(Y) = E[Var(Y | X)] + Var(E[Y | X]). 140: law of total variance. The first term is leftover noise; the second is how much the conditional mean moves. Same shape as ANOVA / regression R^2 energy.'),
  (11, 'prediction exam move',
       'If they allow any function of X, write E[Y | X]. Compute it from the conditional law. If they want numerical MSE, use E[Var(Y|X)] or Var(Y) minus Var(E[Y|X]). State the loss is squared error — other losses have other best predictors (median for absolute loss).'),
  (12, 'inference exam move',
       'Write the likelihood, log it, differentiate. For Bayes, write prior times likelihood and recognize a beta (or whatever catalog). Then answer with mean or mode as asked. Predictive: mix the chance with the posterior, often the posterior mean for Bernoulli.'),
  (13, 'MLE trap',
       'Maximizing the likelihood as if theta were the data. Forgetting the support depends on theta (uniform(0, theta) MLE is the max, not a derivative critical point). 140: always check boundary vs interior. Log of a product is a sum of logs — missing terms lose the MLE.'),
  (14, 'Bayes trap',
       'Using the MLE as if it were a posterior mean. Dropping the prior. Treating MAP as "the probability that theta is true." 140: a posterior is a distribution on theta. One number (MAP or mean) is a summary, not the whole answer unless they asked for a point.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

-- =====================================================================
-- 10. MVN, Correlation & Regression
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'regression'
CROSS JOIN (VALUES
  (0,  'random vectors',
       'A vector X of RVs. Mean vector mu, covariance matrix Sigma with Sigma_{ij} = Cov(X_i, X_j). Sigma is symmetric and positive semidefinite. 140: Var(a · X) = a^T Sigma a. Linear image: Y = A X + b has mean A mu + b and covariance A Sigma A^T.'),
  (1,  'multivariate normal',
       'Closed under linear maps. Specified by mu and Sigma. Independent coordinates iff Sigma is diagonal (for jointly normal). 140: uncorrelated + jointly normal = independent. That fails without joint normality (the usual counterexample is a mixture).'),
  (2,  'bivariate normal picture',
       'Elliptical contours; correlation sets the tilt. Conditionals are normal: E[Y | X=x] is linear in x, Var(Y | X=x) is constant (does not depend on x). 140: that constant is (1-r^2) Var(Y). Homoscedastic residual — a 140 regression fact, not a data-8 residual plot sermon.'),
  (3,  'conditional mean is linear (jointly normal)',
       'E[Y | X=x] = E[Y] + (Cov(X,Y)/Var(X)) (x - E[X]). 140: this is both the best predictor and a straight line. Slope is Cov/Var, not correlation (r is slope in standard units). If r = 0, the conditional mean is the constant E[Y].'),
  (4,  'best linear predictor (any joint)',
       'Among a + b X, the least-squares choice is the same slope Cov(X,Y)/Var(X) and intercept that passes through the means. 140: this does not need normality. What normality adds is that the best predictor among all functions is already linear.'),
  (5,  'correlation and simple regression',
       'Predicted Y in standard units = r times X in standard units. Residual SD is SD_Y sqrt(1-r^2) in the bivariate normal / best-linear world. 140: r^2 is the fraction of Var(Y) explained by the linear predictor. r = 0.3 is not "30% explained."'),
  (6,  'residuals and orthogonality',
       'Y - hat Y is uncorrelated with X (and with hat Y) for the least-squares linear fit. 140: geometry — residual perpendicular to the column space. E[residual] = 0. A leftover correlation with X means you did not fit the LS line.'),
  (7,  'multiple regression (population)',
       'Best linear predictor of Y based on a vector X: hat Y = c + b · X, with b solving the normal equations (covariances). 140: in matrix form, coefficients from Sigma_X^{-1} Cov(X,Y). Adding a predictor can only help the population R^2 of a linear fit (or stay the same).'),
  (8,  'multiple regression 2 (geometry)',
       'Hat Y is the projection of Y onto the span of {1, X_1, ..., X_p}. Coefficients change when you add a correlated X (omitted-variable / collinearity energy). 140: interpret b_j as the coefficient holding the other included variables linear-fixed, not "causal" unless the model says so.'),
  (9,  'MVN conditionals',
       'If (X,Y) is jointly normal, Y given X is normal with linear mean and a covariance that does not depend on the observed x (Schur complement). 140: this is why Gaussian regression has nice residuals. Write the slope matrix from the blocks of Sigma.'),
  (10, 'regression and Data 8',
       'Data 8: r, residual plots, bootstrap a slope. 140: the same line is E[Y]+slope*(x-mean) with slope Cov/Var, plus MVN theory and the best-predictor theorem. 140 exams want the formula and the (1-r^2) residual variance, not a Python scatter.'),
  (11, 'prediction vs parameter',
       'A regression line predicts Y for a new X. Coefficients are parameters of a joint law (or of a linear projection). 140: MLE week estimated a parameter; this week you predict a RV. Mixing "estimate theta" with "predict Y" is a language fail.'),
  (12, 'regression exam move',
       'Write means, variances, covariance (or r). Slope = Cov/Var_X. Line through the mean point. Residual var = (1-r^2) Var_Y for the bivariate normal / BLP residual. If they give a vector X, write A mu and A Sigma A^T or the normal equations.'),
  (13, 'regression trap',
       'Using r as the slope in original units. Claiming r=0 implies independent without joint normality. Interpreting a coefficient as causal because it came from least squares. 140: also, Var(Y|X=x) is not Var(Y) — it is smaller when |r| is not zero.'),
  (14, 'MVN trap',
       'Assuming coordinatewise normal implies joint normal (false). Inverting Sigma that is singular (a linear dependence among coordinates). 140: if Y = X1 + X2 exactly, the vector lives on a plane and has a degenerate MVN. Check whether Sigma is invertible before writing a density.')
) AS c(pos, front, back)
WHERE d.slug = 'data140';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'data140';
