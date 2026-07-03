-- Migration 029: CS 70 preset deck sections + cards (eecs70.org Summer 2026 outline).
-- Definitions omit the term on the back so quiz/recall modes stay meaningful.
-- Safe to re-run: sections use ON CONFLICT DO NOTHING; cards skip sections that already have cards.

-- =====================================================================
-- 1. CS 70 topic sections (mirrors eecs70.org lecture themes)
-- =====================================================================

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.position, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('logic-proofs', 'Logic & Proofs',
   'Propositional logic, truth tables, and proof techniques', 0),
  ('induction-matching', 'Induction & Stable Matching',
   'Mathematical induction and the Gale–Shapley algorithm', 1),
  ('graphs', 'Graphs',
   'Paths, trees, Euler tours, and graph properties', 2),
  ('number-theory', 'Modular Arithmetic & Number Theory',
   'GCD, congruences, CRT, and Fermat''s Little Theorem', 3),
  ('crypto-codes', 'Cryptography & Error Correction',
   'RSA, secret sharing, and Reed–Solomon codes', 4),
  ('counting', 'Counting',
   'Permutations, combinations, and combinatorial identities', 5),
  ('infinity-computation', 'Countability & Computability',
   'Infinite sets, diagonalization, and undecidability', 6),
  ('probability-fundamentals', 'Probability Fundamentals',
   'Sample spaces, conditional probability, independence, and Bayes', 7),
  ('random-variables', 'Random Variables & Concentration',
   'Expectation, variance, distributions, and concentration bounds', 8),
  ('continuous-markov', 'Continuous Probability & Markov Chains',
   'PDFs, continuous distributions, and Markov chain theory', 9)
) AS v(slug, title, description, position)
WHERE  d.slug = 'cs70'
ON CONFLICT (deck_id, slug) DO NOTHING;

-- =====================================================================
-- Logic & Proofs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'logic-proofs'
CROSS JOIN (VALUES
  (0,  'proposition',              'A statement that is either true or false, but not both.'),
  (1,  'propositional logic',      'Formal reasoning with atomic statements connected by AND, OR, NOT, and IMPLIES.'),
  (2,  'conjunction (AND)',        'True only when both component statements are true.'),
  (3,  'disjunction (OR)',         'True when at least one component statement is true.'),
  (4,  'negation (NOT)',           'Flips the truth value of a statement.'),
  (5,  'implication',              'False only when the hypothesis is true and the conclusion is false.'),
  (6,  'biconditional',            'True exactly when both sides have the same truth value.'),
  (7,  'tautology',                'A compound statement that is always true for every assignment of truth values.'),
  (8,  'contradiction',            'A compound statement that is always false for every assignment of truth values.'),
  (9,  'contrapositive',           'Of "if P then Q": "if not Q then not P"; logically equivalent to the original implication.'),
  (10, 'converse',                 'Of "if P then Q": "if Q then P"; not generally equivalent to the original.'),
  (11, 'direct proof',             'Assume the hypothesis and derive the conclusion with a chain of logical steps.'),
  (12, 'proof by contrapositive',  'Prove the contrapositive instead of the original implication.'),
  (13, 'proof by contradiction',   'Assume the negation of the claim and derive an impossibility.'),
  (14, 'universal quantifier (∀)', 'Asserts that a property holds for every element in a domain.'),
  (15, 'existential quantifier (∃)', 'Asserts that at least one element in the domain satisfies a property.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Induction & Stable Matching
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'induction-matching'
CROSS JOIN (VALUES
  (0,  'mathematical induction',   'Verify a base case, then show P(k) implies P(k+1) for all relevant k.'),
  (1,  'base case (induction)',    'The starting value of n for which the claim is checked directly.'),
  (2,  'inductive step',           'Shows that if the claim holds for n = k, it also holds for n = k + 1.'),
  (3,  'inductive hypothesis',     'The assumption that the statement holds for a particular value (or all values up to k in strong induction).'),
  (4,  'strong induction',         'The inductive hypothesis assumes the claim for all values up to k, not just k alone.'),
  (5,  'stable matching',          'A perfect assignment with no pair who would both prefer each other over their current partners.'),
  (6,  'perfect matching',         'Each applicant is assigned to exactly one employer and vice versa.'),
  (7,  'blocking pair',            'An applicant–employer pair who each prefer the other to their current assignment.'),
  (8,  'Gale–Shapley algorithm',   'Proposers iteratively offer to their next choice; rejections update preferences until no blocking pairs remain.'),
  (9,  'proposer-optimal',         'The side that makes proposals ends up with their best possible partner among all stable matchings.'),
  (10, 'receiver-pessimal',        'The side that receives proposals ends up with their worst possible partner among all stable matchings.'),
  (11, 'termination of GS',        'Each applicant proposes to each employer at most once, so the algorithm finishes in O(n²) steps.'),
  (12, 'uniqueness of stable matching', 'Not guaranteed in general; multiple stable matchings can exist for the same preference lists.'),
  (13, 'well-ordering principle',    'Every non-empty set of non-negative integers has a least element; equivalent to ordinary induction.'),
  (14, 'structural induction',       'Prove a property for all objects built recursively by showing it holds for bases and is preserved by constructors.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Graphs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'graphs'
CROSS JOIN (VALUES
  (0,  'graph',                    'A set of vertices connected by edges; models pairwise relationships.'),
  (1,  'undirected edge',          'Connects two vertices with no direction; an unordered pair {u, v}.'),
  (2,  'directed edge',            'Goes from one vertex to another; an ordered pair (u, v).'),
  (3,  'degree of a vertex',       'In an undirected graph, the number of edges incident to that vertex.'),
  (4,  'walk',                     'A sequence of vertices where consecutive vertices share an edge (vertices may repeat).'),
  (5,  'path',                     'A walk with no repeated vertices.'),
  (6,  'cycle',                    'A path that starts and ends at the same vertex and uses at least one edge.'),
  (7,  'connected graph',          'There is a path between every pair of vertices.'),
  (8,  'tree',                     'A connected acyclic graph; with n vertices it has exactly n − 1 edges.'),
  (9,  'spanning tree',            'A subgraph that is a tree and includes every vertex of the original graph.'),
  (10, 'Euler tour',               'A closed walk that uses every edge exactly once.'),
  (11, 'Hamiltonian cycle',        'A cycle that visits every vertex exactly once.'),
  (12, 'bipartite graph',          'Vertices split into two sets so every edge goes between the two sets, never within one set.'),
  (13, 'handshaking lemma',        'The sum of all vertex degrees equals twice the number of edges.'),
  (14, 'planar graph',             'Can be drawn in the plane without any edges crossing.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Modular Arithmetic & Number Theory
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'number-theory'
CROSS JOIN (VALUES
  (0,  'modular arithmetic',       'Working with remainders after division by a fixed positive integer n.'),
  (1,  'congruence mod n',       'a ≡ b (mod n) means n divides (a − b).'),
  (2,  'greatest common divisor',  'The largest positive integer that divides both a and b.'),
  (3,  'Euclidean algorithm',      'Repeatedly replace (a, b) with (b, a mod b) until b = 0; the last nonzero a is the gcd.'),
  (4,  'Bézout''s identity',      'For integers a and b, there exist integers x, y with ax + by = gcd(a, b).'),
  (5,  'extended Euclidean algorithm', 'Finds Bézout coefficients x and y while computing the gcd.'),
  (6,  'coprime integers',         'Share no common divisor greater than 1; equivalently gcd(a, b) = 1.'),
  (7,  'Chinese Remainder Theorem', 'If moduli are pairwise coprime, a system of congruences has a unique solution modulo their product.'),
  (8,  'Fermat''s Little Theorem', 'If p is prime and gcd(a, p) = 1, then a^(p−1) ≡ 1 (mod p).'),
  (9,  'Euler''s theorem',        'If gcd(a, n) = 1, then a^φ(n) ≡ 1 (mod n), where φ counts integers ≤ n coprime to n.'),
  (10, 'Euler totient φ(n)',       'The count of integers from 1 to n that are coprime to n.'),
  (11, 'multiplicative inverse mod n', 'An integer a⁻¹ such that a · a⁻¹ ≡ 1 (mod n); exists iff gcd(a, n) = 1.'),
  (12, 'modular exponentiation',   'Compute a^k mod n efficiently by squaring and reducing modulo n at each step.'),
  (13, 'prime factorization',      'Writing n as a product of primes; unique up to ordering for n ≥ 2.'),
  (14, 'divisibility',             'a | b means there exists an integer k with b = ka.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Cryptography & Error Correction
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'crypto-codes'
CROSS JOIN (VALUES
  (0,  'RSA encryption',           'Public-key scheme: encrypt with (N, e), decrypt with private d where ed ≡ 1 (mod φ(N)).'),
  (1,  'public key',               'Published so anyone can encrypt messages to you; cannot feasibly derive the matching private key.'),
  (2,  'private key',              'Kept secret; used to decrypt (or sign) messages encrypted with the corresponding public key.'),
  (3,  'one-time pad',             'Perfectly secret when the key is random, as long as the message, and never reused.'),
  (4,  'Shamir secret sharing',    'Split a secret into n shares so any k reconstruct it, but k − 1 shares reveal nothing.'),
  (5,  'Reed–Solomon code',        'Encodes data as evaluations of a low-degree polynomial; enough correct points uniquely determine the message.'),
  (6,  'Hamming distance',         'The number of positions at which two equal-length strings differ.'),
  (7,  'error correction capability', 'With minimum distance d between codewords, up to ⌊(d−1)/2⌋ errors can be corrected.'),
  (8,  'erasure',                  'A symbol is missing entirely rather than replaced with a wrong value.'),
  (9,  'polynomial interpolation', 'Given k distinct points (x_i, y_i), there is a unique polynomial of degree < k passing through all of them.'),
  (10, 'Lagrange interpolation',   'Builds that unique low-degree polynomial directly from the point values.'),
  (11, 'RSA modulus N',            'The product of two large primes N = pq; security relies on the difficulty of factoring N.'),
  (12, 'digital signature (RSA)',  'Sign by raising a hash with the private key; anyone verifies using the public key.'),
  (13, 'key exchange problem',     'Two parties want a shared secret over a public channel without prior shared randomness.'),
  (14, 'perfect secrecy',          'The ciphertext reveals no information about the plaintext beyond its length (one-time pad achieves this).')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Counting
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'counting'
CROSS JOIN (VALUES
  (0,  'rule of sum',              'If tasks are mutually exclusive, total ways equals the sum of ways for each task.'),
  (1,  'rule of product',          'If choices are independent, total ways equals the product of options at each step.'),
  (2,  'permutation',              'An ordered arrangement of k objects chosen from n; count is n!/(n−k)!.'),
  (3,  'combination',              'An unordered selection of k objects from n; count is n!/(k!(n−k)!).'),
  (4,  'binomial coefficient',     'C(n, k) counts k-element subsets of an n-element set; also written as "n choose k".'),
  (5,  'binomial theorem',         '(x + y)^n equals the sum over k of C(n,k) x^k y^(n−k).'),
  (6,  'pigeonhole principle',     'If n + 1 objects go into n boxes, at least one box contains two or more objects.'),
  (7,  'complement counting',      'Count the complement event and subtract from the total number of outcomes.'),
  (8,  'inclusion–exclusion',      '|A ∪ B| = |A| + |B| − |A ∩ B|; extends to more sets by alternating sums of intersections.'),
  (9,  'stars and bars',           'The number of ways to distribute k identical items into n bins is C(k + n − 1, n − 1).'),
  (10, 'bijection',                'A one-to-one correspondence between two sets proves they have the same size.'),
  (11, 'multinomial coefficient',  'Counts ways to partition n distinct objects into labeled groups of given sizes.'),
  (12, 'circular permutation',     'Arrangements around a circle: (n − 1)! when rotations are considered identical.'),
  (13, 'overcounting correction',  'Divide by the size of each equivalence class when symmetric choices were counted multiple times.'),
  (14, 'double counting',          'Count the same set in two different ways to derive an identity.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Countability & Computability
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'infinity-computation'
CROSS JOIN (VALUES
  (0,  'countable set',            'Can be put in one-to-one correspondence with the natural numbers ℕ.'),
  (1,  'uncountable set',          'No bijection with ℕ exists; strictly larger than countable infinity.'),
  (2,  'Cantor diagonal argument', 'Shows the set of infinite binary sequences (equivalently [0,1]) is uncountable.'),
  (3,  'rationals are countable',  'Every rational p/q can be listed in a systematic zigzag over all reduced fractions.'),
  (4,  'halting problem',          'Deciding whether an arbitrary program halts on a given input is undecidable.'),
  (5,  'decidable language',       'There exists an algorithm that always terminates and correctly accepts or rejects every input.'),
  (6,  'Turing machine',           'Abstract model: infinite tape, read/write head, and finite control with states.'),
  (7,  'Church–Turing thesis',     'Every intuitively computable function can be computed by a Turing machine.'),
  (8,  'reduction',                'Transform instances of problem A into instances of B to show B is at least as hard as A.'),
  (9,  'countable union',          'A countable union of countable sets is countable.'),
  (10, 'diagonalization template', 'Assume a listing of all objects, construct a new object differing from the nth listed object at position n.'),
  (11, 'recognizable vs decidable', 'Recognizable: algorithm halts and accepts yes-instances (may loop on no); decidable: always halts.'),
  (12, 'self-reference in proofs', 'Programs that simulate themselves lead to contradictions when combined with halting questions.'),
  (13, 'encoding programs as numbers', 'Fix a programming language; map each program to a unique natural number (Gödel numbering idea).'),
  (14, 'diagonal language',        'The set of inputs on which program i does not accept input i is not decidable by any single program.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Probability Fundamentals
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'probability-fundamentals'
CROSS JOIN (VALUES
  (0,  'sample space Ω',           'The set of all possible outcomes of a random experiment.'),
  (1,  'event',                    'A subset of the sample space.'),
  (2,  'probability axioms',       'P(Ω) = 1; P(A) ≥ 0; for disjoint events A_i, P(∪ A_i) = Σ P(A_i).'),
  (3,  'equally likely outcomes',  'When all outcomes are equally likely, P(A) = |A| / |Ω|.'),
  (4,  'conditional probability',  'P(A | B) = P(A ∩ B) / P(B) when P(B) > 0.'),
  (5,  'law of total probability', 'If {B_i} partitions Ω, then P(A) = Σ P(A | B_i) P(B_i).'),
  (6,  'Bayes'' theorem',          'P(A | B) = P(B | A) P(A) / P(B) when P(B) > 0.'),
  (7,  'independent events',       'P(A ∩ B) = P(A) P(B); knowing one occurred does not change the probability of the other.'),
  (8,  'mutually exclusive events', 'A ∩ B = ∅; they cannot both occur. If both have positive probability, they are not independent.'),
  (9,  'union bound',              'P(A ∪ B) ≤ P(A) + P(B); extends to arbitrary finite unions.'),
  (10, 'birthday paradox',         'With 23 people, the probability that some pair shares a birthday exceeds 1/2.'),
  (11, 'conditional independence', 'Given C, events A and B satisfy P(A ∩ B | C) = P(A | C) P(B | C).'),
  (12, 'probability of union',     'P(A ∪ B) = P(A) + P(B) − P(A ∩ B).'),
  (13, 'complement rule',          'P(A^c) = 1 − P(A).'),
  (14, 'symmetry in counting',     'When outcomes are equally likely, probability equals favorable count divided by total count.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Random Variables & Concentration
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'random-variables'
CROSS JOIN (VALUES
  (0,  'random variable',          'A function from outcomes to real numbers assigning a numeric value to each outcome.'),
  (1,  'PMF',                      'For discrete X: p(x) = P(X = x); values are non-negative and sum to 1.'),
  (2,  'expectation E[X]',         'Weighted average Σ x · P(X = x) for discrete X.'),
  (3,  'linearity of expectation', 'E[aX + bY] = aE[X] + bE[Y] for any constants a, b, even if X and Y are dependent.'),
  (4,  'variance Var(X)',          'E[(X − E[X])²] = E[X²] − (E[X])²; measures spread around the mean.'),
  (5,  'standard deviation',       'Square root of variance; same units as X.'),
  (6,  'covariance',               'E[(X − E[X])(Y − E[Y])] = E[XY] − E[X]E[Y].'),
  (7,  'independent random variables', 'Joint PMF factors: P(X = x, Y = y) = P(X = x) P(Y = y) for all x, y.'),
  (8,  'indicator random variable', 'Equals 1 if an event occurs and 0 otherwise; its expectation equals the event''s probability.'),
  (9,  'geometric distribution',   'Trials until first success in repeated Bernoulli trials: P(X = k) = (1 − p)^(k−1) p.'),
  (10, 'Poisson distribution',     'Models rare events in a fixed interval: P(X = k) = e^(−λ) λ^k / k!.'),
  (11, 'Markov''s inequality',     'For non-negative X and a > 0: P(X ≥ a) ≤ E[X] / a.'),
  (12, 'Chebyshev''s inequality',  'P(|X − μ| ≥ kσ) ≤ 1/k²; bounds tail probability using variance.'),
  (13, 'weak law of large numbers', 'The sample average converges in probability to the true mean as n grows.'),
  (14, 'Bernoulli trial',          'A single experiment with two outcomes, success probability p and failure probability 1 − p.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
AND NOT EXISTS (
  SELECT 1 FROM public.cards existing WHERE existing.deck_id = d.id AND existing.section_id = s.id
);

-- =====================================================================
-- Continuous Probability & Markov Chains
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'continuous-markov'
CROSS JOIN (VALUES
  (0,  'PDF',                      'For continuous X: f(x) ≥ 0, ∫ f(x) dx = 1, and P(a ≤ X ≤ b) = ∫_a^b f(x) dx.'),
  (1,  'CDF',                      'F(x) = P(X ≤ x); for continuous X the derivative of F is the PDF where it exists.'),
  (2,  'uniform on [a, b]',        'Constant density 1/(b − a) on the interval; mean (a + b)/2, variance (b − a)²/12.'),
  (3,  'exponential distribution', 'Memoryless waiting time with rate λ: density λe^(−λx) for x ≥ 0; mean 1/λ.'),
  (4,  'memoryless property',      'P(X > s + t | X > s) = P(X > t) for s, t ≥ 0 (holds for exponential and geometric).'),
  (5,  'standard normal',          'Mean 0, variance 1; bell-shaped density; sums of many independent RVs often approximate it.'),
  (6,  'Markov chain',             'A sequence of random states where the next state depends only on the current state, not the full history.'),
  (7,  'transition matrix',        'Entry P(i → j) is the probability of moving from state i to j; each row sums to 1.'),
  (8,  'stationary distribution π', 'A row vector with π = πP; probabilities unchanged after one transition step.'),
  (9,  'irreducible chain',        'Every state can reach every other state in finitely many steps with positive probability.'),
  (10, 'aperiodic chain',          'No fixed cycle length forces returns; needed (with irreducibility) for convergence to a unique stationary distribution.'),
  (11, 'detailed balance',         'π(i) P(i → j) = π(j) P(j → i) for all i, j; sufficient for π to be stationary.'),
  (12, 'hitting time',             'The expected number of steps to reach a target state from a given starting state.'),
  (13, 'PageRank (Markov view)',   'A random surfer follows links with occasional teleport; stationary probabilities rank web pages.'),
  (14, 'law of total expectation', 'E[X] = E[E[X | Y]]; average the conditional expectation over the conditioning variable.')
) AS c(pos, front, back)
WHERE  d.slug = 'cs70'
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
WHERE d.id = sub.deck_id AND d.slug = 'cs70';
