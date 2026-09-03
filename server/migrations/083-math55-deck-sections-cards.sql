-- Migration 083: MATH 55 — Discrete Mathematics, full deck rebuild.
-- Department outline (Rosen, Discrete Mathematics and Its Applications,
-- 8th ed.): logic and proofs (1.1-1.8), sets and functions (2.1-2.5),
-- number theory (4.1-4.4), induction (5.1-5.4), counting (6.1-6.5),
-- discrete probability (7.1-7.4), recurrences and inclusion-exclusion
-- (8.1-8.2, 8.5), relations (9.1, 9.4-9.6), graphs (10.1-10.4).
-- FA26 lecture: Andrew Marks. Cards are term (front) / definition (back).

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math55');

DELETE FROM public.tidbits
WHERE category_id = 'math55';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math55');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math55');

UPDATE public.decks
SET title = 'MATH 55',
    description = 'Discrete Mathematics — logic, number theory, counting, and graphs',
    cover_emoji = '🧮'
WHERE slug = 'math55';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('logic',          'Propositional Logic and Quantifiers',
   'Connectives, equivalence, predicates, quantifiers', 0),
  ('proofs',         'Proof Techniques',
   'Direct, contrapositive, contradiction, existence', 1),
  ('sets-functions', 'Sets, Functions, and Countability',
   'Set algebra, injections, bijections, countable sets', 2),
  ('number-theory',  'Number Theory and Congruences',
   'Division, gcd, modular inverse, CRT', 3),
  ('induction',      'Induction and Recursion',
   'Ordinary and strong induction, recursive definitions', 4),
  ('counting',       'Counting and Binomial Coefficients',
   'Product rule, pigeonhole, permutations, combinations', 5),
  ('probability',    'Discrete Probability',
   'Conditional probability, Bayes, expectation, variance', 6),
  ('recurrences',    'Recurrences and Inclusion-Exclusion',
   'Linear recurrences, inclusion-exclusion, derangements', 7),
  ('relations',      'Relations and Partial Orders',
   'Equivalence relations, partitions, posets', 8),
  ('graphs',         'Graphs',
   'Degrees, connectivity, isomorphism, Euler and Hamilton', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math55'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Propositional Logic and Quantifiers
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'logic'
CROSS JOIN (VALUES
  (0,  'proposition',
       'A declarative sentence that is either true or false, but not both.'),
  (1,  'conjunction',
       'The statement P and Q, true exactly when both P and Q are true.'),
  (2,  'disjunction',
       'The statement P or Q, true when at least one of P or Q is true (inclusive or).'),
  (3,  'negation',
       'The statement not P, true exactly when P is false.'),
  (4,  'implication',
       'The statement P implies Q, false only when P is true and Q is false. P is the hypothesis and Q is the conclusion.'),
  (5,  'converse',
       'The converse of P implies Q is Q implies P. It is not logically equivalent to the original implication.'),
  (6,  'contrapositive',
       'The contrapositive of P implies Q is (not Q) implies (not P). It is logically equivalent to the original implication.'),
  (7,  'biconditional',
       'The statement P if and only if Q, true exactly when P and Q have the same truth value.'),
  (8,  'tautology',
       'A compound proposition that is true for every assignment of truth values to its variables.'),
  (9,  'contradiction',
       'A compound proposition that is false for every assignment of truth values to its variables.'),
  (10, 'De Morgan''s laws',
       'not (P and Q) is equivalent to (not P) or (not Q), and not (P or Q) is equivalent to (not P) and (not Q). The same pattern holds for sets and quantifiers.'),
  (11, 'logical equivalence',
       'Two compound propositions are logically equivalent when they have the same truth value for every assignment, equivalently when their biconditional is a tautology.'),
  (12, 'universal quantifier',
       'The statement for all x, P(x), true when P(x) holds for every x in the domain.'),
  (13, 'existential quantifier',
       'The statement there exists x such that P(x), true when P(x) holds for at least one x in the domain.'),
  (14, 'modus ponens',
       'The rule of inference: from P and (P implies Q), conclude Q.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 2. Proof Techniques
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'proofs'
CROSS JOIN (VALUES
  (0,  'theorem',
       'A statement that has been proved from axioms and previously established results.'),
  (1,  'lemma',
       'A helper theorem, usually proved in order to make a later theorem easier.'),
  (2,  'corollary',
       'A statement that follows quickly from a theorem already proved.'),
  (3,  'axiom',
       'A statement accepted without proof, used as a starting point for further reasoning.'),
  (4,  'direct proof',
       'To prove P implies Q, assume P and deduce Q by a chain of valid steps.'),
  (5,  'proof by contrapositive',
       'To prove P implies Q, assume not Q and deduce not P. Valid because an implication is equivalent to its contrapositive.'),
  (6,  'proof by contradiction',
       'Assume the statement is false and derive a contradiction (a statement and its negation, or a known falsehood). Conclude the statement must be true.'),
  (7,  'proof by cases',
       'Split the hypothesis into exhaustive cases and prove the claim in each case separately.'),
  (8,  'vacuous proof',
       'A proof that P implies Q by showing P is always false, so the implication is automatically true.'),
  (9,  'existence proof',
       'A proof that there exists an object with a given property. It may exhibit one (constructive) or show that one must exist without naming it.'),
  (10, 'constructive proof',
       'An existence proof that produces an explicit example, or an algorithm that builds one.'),
  (11, 'uniqueness proof',
       'A proof that exactly one object has a property: show existence, then show that any two such objects must be equal.'),
  (12, 'counterexample',
       'A single example that shows a universal claim is false.'),
  (13, 'even integer',
       'An integer n that can be written n = 2k for some integer k. An odd integer has the form 2k + 1.'),
  (14, 'rational number',
       'A real number that can be written p/q where p and q are integers and q is not 0.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 3. Sets, Functions, and Countability
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sets-functions'
CROSS JOIN (VALUES
  (0,  'set',
       'An unordered collection of distinct objects, called elements. Membership is written x in A.'),
  (1,  'subset',
       'A is a subset of B when every element of A is also an element of B. A is a proper subset if it is a subset and A is not equal to B.'),
  (2,  'power set',
       'The set of all subsets of A, written P(A). If A has n elements, P(A) has 2^n elements.'),
  (3,  'union',
       'The set A union B of elements that lie in A or in B (or both).'),
  (4,  'intersection',
       'The set A intersect B of elements that lie in both A and B. Disjoint sets have empty intersection.'),
  (5,  'complement',
       'The set of elements in a fixed universe that are not in A.'),
  (6,  'Cartesian product',
       'The set A × B of all ordered pairs (a, b) with a in A and b in B. Its size is abs(A) times abs(B) when both are finite.'),
  (7,  'function',
       'A rule f from A to B that assigns to each element of A exactly one element of B. A is the domain and B is the codomain.'),
  (8,  'injective function',
       'A one-to-one function: f(a) = f(b) implies a = b. Distinct inputs get distinct outputs.'),
  (9,  'surjective function',
       'An onto function: every element of the codomain is f(a) for some a in the domain.'),
  (10, 'bijection',
       'A function that is both injective and surjective. It has an inverse, and it witnesses that two sets have the same cardinality.'),
  (11, 'inverse function',
       'For a bijection f, the function f^{-1} that sends each output back to its unique input.'),
  (12, 'composition',
       '(g o f)(x) = g(f(x)): apply f first, then g. Defined when the range of f lies in the domain of g.'),
  (13, 'countable set',
       'A set that is finite or has a bijection with the positive integers. The integers and the rationals are countable.'),
  (14, 'uncountable set',
       'A set that is not countable. The real numbers are uncountable; Cantor''s diagonal argument shows (0,1) has no listing.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 4. Number Theory and Congruences
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'number-theory'
CROSS JOIN (VALUES
  (0,  'division algorithm',
       'For integers a and d with d greater than 0, there exist unique integers q and r such that a = d q + r and 0 is less than or equal to r, which is less than d. Here q is the quotient and r is the remainder.'),
  (1,  'congruence',
       'a is congruent to b modulo m when m divides a - b, written a ≡ b (mod m). Equivalently, a and b leave the same remainder on division by m.'),
  (2,  'modular arithmetic',
       'Arithmetic of remainders: if a ≡ b (mod m) and c ≡ d (mod m), then a + c ≡ b + d and a c ≡ b d (mod m).'),
  (3,  'prime',
       'An integer greater than 1 whose only positive divisors are 1 and itself. An integer greater than 1 that is not prime is composite.'),
  (4,  'fundamental theorem of arithmetic',
       'Every integer greater than 1 factors uniquely as a product of primes, up to the order of the factors.'),
  (5,  'greatest common divisor',
       'The largest positive integer that divides both a and b, written gcd(a,b). It is 1 exactly when a and b are relatively prime.'),
  (6,  'relatively prime',
       'Two integers whose greatest common divisor is 1. Also called coprime.'),
  (7,  'Euclidean algorithm',
       'A method to compute gcd(a,b) by repeated division: gcd(a,b) = gcd(b, a mod b), stopping when the remainder is 0.'),
  (8,  'Bézout''s identity',
       'gcd(a,b) can be written as an integer linear combination s a + t b. The coefficients are found by back-substituting the Euclidean algorithm.'),
  (9,  'modular inverse',
       'An integer a inverse of a modulo m satisfying a a inverse ≡ 1 (mod m). It exists if and only if gcd(a,m) = 1.'),
  (10, 'linear congruence',
       'An equation a x ≡ b (mod m). It has solutions if and only if gcd(a,m) divides b; then there are exactly gcd(a,m) solutions modulo m.'),
  (11, 'Chinese Remainder Theorem',
       'If m1, ..., mk are pairwise relatively prime, then the system x ≡ a_i (mod m_i) has a unique solution modulo m1 ... mk.'),
  (12, 'Fermat''s Little Theorem',
       'If p is prime and p does not divide a, then a^{p-1} ≡ 1 (mod p). Equivalently a^p ≡ a (mod p) for every integer a.'),
  (13, 'modular exponentiation',
       'Computing a^n mod m efficiently by successive squaring, reducing modulo m at each step so the numbers stay small.'),
  (14, 'least common multiple',
       'The smallest positive integer that is a multiple of both a and b. For positive a and b, gcd(a,b) times lcm(a,b) equals a b.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 5. Induction and Recursion
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'induction'
CROSS JOIN (VALUES
  (0,  'mathematical induction',
       'To prove P(n) for every integer n greater than or equal to a base value: prove P at the base, then prove that P(k) implies P(k+1) for every k at or above the base.'),
  (1,  'base case',
       'The starting instance (or instances) of an induction, checked directly.'),
  (2,  'inductive step',
       'The argument that P(k) implies P(k+1), or, in strong induction, that the earlier cases imply the next one.'),
  (3,  'inductive hypothesis',
       'The assumption, in the inductive step, that the statement holds for the previous case (or all previous cases).'),
  (4,  'strong induction',
       'An induction whose inductive step assumes P at every integer from the base through k, then proves P(k+1). Useful when a step refers to more than just the previous case.'),
  (5,  'well-ordering principle',
       'Every nonempty set of positive integers has a least element. It is equivalent to induction and is often used for contradiction proofs about integers.'),
  (6,  'recursive definition',
       'A definition of a sequence, function, or set that specifies initial objects and a rule for building new objects from existing ones.'),
  (7,  'structural induction',
       'Induction on the way a recursively defined object is built: check the base objects, then check that the construction rules preserve the property.'),
  (8,  'Fibonacci sequence',
       'The sequence F_0 = 0, F_1 = 1, and F_n = F_{n-1} + F_{n-2} for n greater than 1. Many identities are proved by induction or strong induction.'),
  (9,  'closed form',
       'A formula for the nth term of a sequence that uses a fixed number of operations, with no dependence on earlier terms.'),
  (10, 'summation formula',
       'A closed form for a sum such as 1 + 2 + ... + n = n(n+1)/2, typically proved by induction.'),
  (11, 'geometric series sum',
       '1 + r + r^2 + ... + r^n = (r^{n+1} - 1)/(r - 1) when r is not 1. The infinite sum 1/(1-r) requires abs(r) less than 1.'),
  (12, 'recursive algorithm',
       'An algorithm that solves a problem by calling itself on smaller instances, with a base case that does not recurse.'),
  (13, 'factorial',
       'n! = n (n-1) ... 1 for n greater than 0, and 0! = 1. Defined recursively by n! = n (n-1)! with 0! = 1.'),
  (14, 'recurrence',
       'An equation that defines a sequence by expressing a_n in terms of earlier terms, together with enough initial values to start the sequence.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 6. Counting and Binomial Coefficients
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'counting'
CROSS JOIN (VALUES
  (0,  'product rule',
       'If a procedure has k independent stages with n_i choices at stage i, the number of outcomes is n_1 n_2 ... n_k.'),
  (1,  'sum rule',
       'If a task can be done in one of k disjoint ways, with n_i options in way i, the number of outcomes is n_1 + ... + n_k.'),
  (2,  'pigeonhole principle',
       'If n+1 objects are placed into n boxes, some box contains at least two objects.'),
  (3,  'generalized pigeonhole principle',
       'If N objects are placed into k boxes, some box contains at least ceil(N/k) objects.'),
  (4,  'permutation',
       'An ordered arrangement of distinct objects. The number of permutations of n distinct objects is n!.'),
  (5,  'r-permutation',
       'An ordered selection of r distinct objects from n. There are P(n,r) = n! / (n-r)! such arrangements.'),
  (6,  'combination',
       'An unordered selection of r distinct objects from n. There are C(n,r) = n! / (r! (n-r)!) such subsets.'),
  (7,  'binomial coefficient',
       'C(n,k), the number of k-element subsets of an n-element set, also the coefficient of x^k in (1+x)^n.'),
  (8,  'Pascal''s identity',
       'C(n,k) = C(n-1,k) + C(n-1,k-1). Choosing a distinguished element splits k-subsets into those that contain it and those that do not.'),
  (9,  'binomial theorem',
       '(x + y)^n = the sum from k = 0 to n of C(n,k) x^{n-k} y^k.'),
  (10, 'stars and bars',
       'The number of ways to place n indistinguishable items into k distinguishable bins is C(n+k-1, k-1), equivalently nonnegative integer solutions of x_1 + ... + x_k = n.'),
  (11, 'permutations with repetition',
       'The number of words of length r from an n-letter alphabet is n^r, because each position may reuse letters.'),
  (12, 'combinations with repetition',
       'The number of unordered selections of r elements from n types, with repeats allowed, is C(n+r-1, r). This is stars and bars again.'),
  (13, 'complementary counting',
       'Count the complement of the desired set, then subtract from the total, when the complement is easier to count.'),
  (14, 'double counting',
       'Counting the same set in two ways to obtain an identity, such as Pascal''s identity or the handshaking lemma.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 7. Discrete Probability
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'probability'
CROSS JOIN (VALUES
  (0,  'sample space',
       'The set of all possible outcomes of an experiment. An event is a subset of the sample space.'),
  (1,  'event',
       'A subset of the sample space. Its probability is the sum of the probabilities of the outcomes it contains.'),
  (2,  'uniform probability',
       'The model in which every outcome in a finite sample space is equally likely, so P(E) = abs(E) / abs(S).'),
  (3,  'complementary probability',
       'P(not E) = 1 - P(E). Used when the complement is easier to compute than E itself.'),
  (4,  'conditional probability',
       'P(E given F) = P(E intersect F) / P(F), the probability of E restricted to the outcomes in F (when P(F) is not 0).'),
  (5,  'independent events',
       'Events E and F satisfying P(E intersect F) = P(E) P(F). Equivalently, P(E given F) = P(E) when P(F) is not 0.'),
  (6,  'Bayes'' theorem',
       'P(F given E) = P(E given F) P(F) / P(E). It reverses a conditional probability, often after expanding P(E) by cases.'),
  (7,  'random variable',
       'A function from the sample space to the reals, assigning a number to each outcome.'),
  (8,  'expected value',
       'The probability-weighted average of a random variable: E[X] = the sum of x P(X = x) over all values x.'),
  (9,  'linearity of expectation',
       'E[X + Y] = E[X] + E[Y], even when X and Y are not independent. Extends to any finite sum.'),
  (10, 'variance',
       'Var(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2, a measure of spread around the mean.'),
  (11, 'Bernoulli trial',
       'A two-outcome experiment with success probability p. A Bernoulli random variable is 1 on success and 0 on failure, so its mean is p.'),
  (12, 'binomial distribution',
       'The number of successes in n independent Bernoulli trials with success probability p. P(X = k) = C(n,k) p^k (1-p)^{n-k}, and E[X] = n p.'),
  (13, 'Chebyshev''s inequality',
       'For any random variable with finite mean mu and variance sigma^2, the probability that abs(X - mu) is at least k sigma is at most 1/k^2.'),
  (14, 'pairwise independence',
       'A collection of events in which every pair is independent. It does not imply that the whole collection is mutually independent.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 8. Recurrences and Inclusion-Exclusion
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'recurrences'
CROSS JOIN (VALUES
  (0,  'recurrence relation',
       'An equation that defines a_n in terms of one or more earlier terms, together with initial conditions that start the sequence.'),
  (1,  'linear homogeneous recurrence',
       'A recurrence a_n = c_1 a_{n-1} + ... + c_k a_{n-k}, with constant coefficients and no extra forcing term.'),
  (2,  'characteristic equation',
       'For a_n = c_1 a_{n-1} + ... + c_k a_{n-k}, the polynomial r^k - c_1 r^{k-1} - ... - c_k = 0. Its roots determine the closed form.'),
  (3,  'distinct roots (recurrence)',
       'If the characteristic equation has distinct roots r_i, the general solution is a_n = A_1 r_1^n + ... + A_k r_k^n. The A_i are fixed by initial conditions.'),
  (4,  'repeated roots (recurrence)',
       'A characteristic root r of multiplicity m contributes (A_0 + A_1 n + ... + A_{m-1} n^{m-1}) r^n to the general solution.'),
  (5,  'linear nonhomogeneous recurrence',
       'A linear recurrence with an extra term F(n) on the right-hand side. The general solution is the homogeneous solution plus one particular solution.'),
  (6,  'particular solution of a recurrence',
       'Any one sequence that satisfies the nonhomogeneous equation. Guess a form matching F(n), multiplying by n^s if that form already solves the homogeneous equation.'),
  (7,  'initial conditions',
       'The first k values of a kth-order recurrence, used to solve for the arbitrary constants in the closed form.'),
  (8,  'inclusion-exclusion',
       'abs(A union B) = abs(A) + abs(B) - abs(A intersect B). For more sets, add the singles, subtract the doubles, add the triples, and so on.'),
  (9,  'inclusion-exclusion for three sets',
       'abs(A union B union C) = abs(A)+abs(B)+abs(C) - abs(A intersect B)-abs(A intersect C)-abs(B intersect C) + abs(A intersect B intersect C).'),
  (10, 'derangement',
       'A permutation with no fixed points. The number of derangements of n objects is n! times the partial sum of (-1)^k / k!, equivalently the nearest integer to n!/e.'),
  (11, 'counting onto functions',
       'The number of surjections from an n-set to a k-set is k! S(n,k), or by inclusion-exclusion: the sum over i of (-1)^i C(k,i) (k-i)^n.'),
  (12, 'generating function',
       'A formal power series whose coefficients encode a sequence: G(x) = a_0 + a_1 x + a_2 x^2 + .... Algebra on G solves counting and recurrence problems.'),
  (13, 'solving a recurrence by iteration',
       'Unwind a_n = f(a_{n-1}) repeatedly until the pattern is visible, then prove the guessed closed form by induction.'),
  (14, 'tower of Hanoi recurrence',
       'The minimal-move recurrence a_n = 2 a_{n-1} + 1 with a_1 = 1, whose closed form is a_n = 2^n - 1.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 9. Relations and Partial Orders
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'relations'
CROSS JOIN (VALUES
  (0,  'relation',
       'A subset R of A × B. For a relation on A, R is a subset of A × A, and a R b means (a,b) is in R.'),
  (1,  'reflexive',
       'A relation R on A such that a R a for every a in A. The diagonal of A × A is contained in R.'),
  (2,  'symmetric',
       'A relation R such that a R b implies b R a.'),
  (3,  'antisymmetric',
       'A relation R such that a R b and b R a together imply a = b. Partial orders are antisymmetric; equivalence relations generally are not.'),
  (4,  'transitive',
       'A relation R such that a R b and b R c together imply a R c.'),
  (5,  'equivalence relation',
       'A relation that is reflexive, symmetric, and transitive. Equality, congruence modulo m, and "has the same birthday" are examples.'),
  (6,  'equivalence class',
       'The set [a] of all elements related to a. Two classes are equal or disjoint, and a is always in its own class.'),
  (7,  'partition',
       'A collection of nonempty, pairwise disjoint subsets whose union is the whole set. The equivalence classes of any equivalence relation form a partition.'),
  (8,  'partial order',
       'A relation that is reflexive, antisymmetric, and transitive. Written (A, ≼). Examples include subset and "divides" on the positive integers.'),
  (9,  'comparable elements',
       'Elements a and b of a poset for which a ≼ b or b ≼ a. In a partial order some pairs may be incomparable.'),
  (10, 'total order',
       'A partial order in which every pair of elements is comparable. The usual order on the reals is a total order; subset on a power set is not.'),
  (11, 'Hasse diagram',
       'A drawing of a finite poset that shows covering relations: a is below b and connected by an edge when a ≼ b with nothing strictly between them. Reflexive and transitive edges are omitted.'),
  (12, 'maximal element',
       'An element m of a poset such that nothing is strictly above m. A maximum is an element greater than or equal to every other element; a finite nonempty poset always has a maximal element, but not always a maximum.'),
  (13, 'least element',
       'An element 0 of a poset such that 0 ≼ a for every a. A minimal element has nothing strictly below it, and need not be least.'),
  (14, 'transitive closure',
       'The smallest transitive relation containing R, obtained by adding all pairs linked by a finite chain a R a1 R ... R b. Computed by repeated composition, or by Warshall''s algorithm.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

-- =====================================================================
-- 10. Graphs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'graphs'
CROSS JOIN (VALUES
  (0,  'graph',
       'A pair G = (V, E) of a vertex set V and an edge set E of 2-element subsets of V (in the undirected simple case).'),
  (1,  'simple graph',
       'An undirected graph with no loops and no multiple edges between the same pair of vertices.'),
  (2,  'degree of a vertex',
       'The number of edges incident to the vertex (a loop, if allowed, contributes two). The degree sequence lists the degrees of all vertices.'),
  (3,  'handshaking lemma',
       'The sum of all degrees equals twice the number of edges. In particular, the number of odd-degree vertices is even.'),
  (4,  'complete graph',
       'The simple graph K_n on n vertices in which every pair of distinct vertices is joined by an edge. It has C(n,2) edges.'),
  (5,  'bipartite graph',
       'A graph whose vertices can be split into two sets so that every edge runs between the sets. Equivalent: every cycle has even length.'),
  (6,  'path',
       'A walk with no repeated vertices. Its length is the number of edges. A u-v path joins u to v.'),
  (7,  'cycle',
       'A closed path of length at least 3 (in a simple graph) that returns to its start and otherwise does not repeat vertices.'),
  (8,  'connected graph',
       'An undirected graph in which every pair of vertices is joined by a path.'),
  (9,  'connected component',
       'A maximal connected subgraph. The components partition the vertex set.'),
  (10, 'graph isomorphism',
       'A bijection between vertex sets that preserves adjacency: uv is an edge if and only if the images of u and v form an edge. Isomorphic graphs are the same up to relabeling.'),
  (11, 'adjacency matrix',
       'The n by n matrix with a 1 (or the number of edges) in position i,j when vertices i and j are adjacent, and 0 otherwise. For an undirected simple graph it is symmetric with zeros on the diagonal.'),
  (12, 'Eulerian circuit',
       'A closed trail that uses every edge exactly once. A connected graph has one if and only if every vertex has even degree.'),
  (13, 'Hamiltonian path',
       'A path that visits every vertex exactly once. A Hamiltonian cycle returns to the start. There is no simple degree test analogous to Euler''s theorem.'),
  (14, 'tree',
       'A connected acyclic graph. Equivalently, a graph with n vertices and n-1 edges and no cycles, or a connected graph with a unique path between every pair of vertices.')
) AS c(pos, front, back)
WHERE d.slug = 'math55';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math55';
