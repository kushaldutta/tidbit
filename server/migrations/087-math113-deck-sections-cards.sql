-- Migration 087: MATH 113 — Abstract Algebra, new preset deck.
-- Catalog: sets and relations; integers, congruences, FTA; groups and
-- factor groups; commutative rings, ideals, quotient fields; polynomials
-- (Euclidean algorithm, unique factorization); FTA; fields and extensions.
-- Cards are term / definition. No textbook, instructor, or honors wording.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'math113',
  'MATH 113',
  'Abstract Algebra — groups, rings, polynomials, and field extensions',
  'uc-berkeley:math113:fa26',
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
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math113');

DELETE FROM public.tidbits
WHERE category_id = 'math113';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math113');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math113');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('integers',       'Integers and Congruences',
   'Relations, gcd, primes, modular arithmetic', 0),
  ('groups',         'Groups',
   'Axioms, examples, order, direct products', 1),
  ('subgroups',      'Subgroups and Cyclic Groups',
   'Subgroup test, generators, classification of cyclic groups', 2),
  ('cosets',         'Cosets and Lagrange',
   'Left and right cosets, index, Lagrange theorem', 3),
  ('homs',           'Homomorphisms',
   'Kernel, image, first isomorphism theorem, Cayley', 4),
  ('quotients',      'Normal Subgroups and Quotients',
   'Conjugates, simple groups, correspondence', 5),
  ('perm-actions',   'Permutations and Group Actions',
   'Cycles, sign, orbits, orbit-stabilizer, Cauchy', 6),
  ('rings',          'Rings and Ideals',
   'Domains, fields, ideals, quotient rings', 7),
  ('polynomials',    'Polynomials',
   'Division, irreducibles, unique factorization, FTA', 8),
  ('fields',         'Fields and Extensions',
   'Fractions, characteristic, algebraic elements, finite fields', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math113'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Integers and Congruences
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'integers'
CROSS JOIN (VALUES
  (0,  'equivalence relation',
       'A relation that is reflexive, symmetric, and transitive. Equality, congruence modulo n, and "has the same cardinality" are examples.'),
  (1,  'equivalence class',
       'The set of all elements related to a given x. Distinct classes are disjoint, and the classes form a partition of the underlying set.'),
  (2,  'partition',
       'A collection of nonempty disjoint subsets whose union is the whole set. Partitions are in bijection with equivalence relations.'),
  (3,  'well-ordering principle',
       'Every nonempty subset of the nonnegative integers has a least element. It is equivalent to induction and is the engine behind the division algorithm.'),
  (4,  'divisibility',
       'An integer a divides b when b = a q for some integer q. The relation is reflexive and transitive, and a divides b if and only if -a does.'),
  (5,  'gcd',
       'The largest positive integer dividing both a and b. It can be written as a x + b y for some integers x, y (Bezout identity).'),
  (6,  'Euclidean algorithm',
       'Compute gcd(a, b) by replacing (a, b) with (b, a mod b) until the remainder is 0. The last nonzero remainder is the gcd, and back-substitution gives a Bezout combination.'),
  (7,  'prime',
       'An integer p greater than 1 whose only positive divisors are 1 and p. Equivalently, if p divides a product then p divides one of the factors (Euclid lemma).'),
  (8,  'Euclid lemma',
       'If a prime p divides a b, then p divides a or p divides b. This is the step that upgrades existence of a prime factorization to uniqueness.'),
  (9,  'fundamental theorem of arithmetic',
       'Every integer greater than 1 factors uniquely as a product of primes, up to order. Existence uses well-ordering; uniqueness uses Euclid lemma.'),
  (10, 'congruence',
       'a is congruent to b modulo n when n divides a - b. Congruence modulo n is an equivalence relation, and the classes are 0, 1, ..., n-1.'),
  (11, 'Z/nZ',
       'The ring of residue classes modulo n, with addition and multiplication of representatives. It is a field if and only if n is prime.'),
  (12, 'units modulo n',
       'The classes [a] with gcd(a, n) = 1. They form a multiplicative group of order phi(n), written (Z/nZ)^x or U(n).'),
  (13, 'Chinese remainder theorem',
       'If m and n are coprime, the map Z/mnZ to Z/mZ times Z/nZ sending [x] to ([x] mod m, [x] mod n) is a ring isomorphism. Systems x = a mod m, x = b mod n then have a unique solution modulo mn.'),
  (14, 'Euler totient',
       'The number phi(n) of integers in {1, ..., n} coprime to n. If n = p1^{k1} ... pr^{kr} then phi(n) = n (1 - 1/p1) ... (1 - 1/pr).')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 2. Groups
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'groups'
CROSS JOIN (VALUES
  (0,  'binary operation',
       'A function G times G to G. It is associative when (ab)c = a(bc) for all a, b, c, and commutative when ab = ba for all a, b.'),
  (1,  'group',
       'A set G with an associative binary operation, an identity e satisfying e g = g e = g, and inverses g^{-1} satisfying g g^{-1} = g^{-1} g = e.'),
  (2,  'abelian group',
       'A group whose operation is commutative: ab = ba for all a, b. Additive notation is common for abelian groups; multiplicative notation is used in general.'),
  (3,  'identity',
       'The unique element e with e g = g e = g for every g. Uniqueness: if e and e-prime both work then e = e e-prime = e-prime.'),
  (4,  'inverse',
       'The unique element g^{-1} with g g^{-1} = g^{-1} g = e. Uniqueness follows from cancellation, and (ab)^{-1} = b^{-1} a^{-1}.'),
  (5,  'cancellation',
       'In a group, ab = ac implies b = c, and ba = ca implies b = c. Left (or right) multiply by a^{-1}.'),
  (6,  'order of a group',
       'The number of elements of G, written |G|. It may be infinite. Finite groups are those with finite order.'),
  (7,  'order of an element',
       'The smallest positive integer k with g^k = e, or infinity if no such k exists. Equivalently, the order of the cyclic subgroup generated by g.'),
  (8,  'dihedral group',
       'The symmetry group D_n of a regular n-gon, of order 2n. It is generated by a rotation r of order n and a reflection s of order 2 with s r s^{-1} = r^{-1}.'),
  (9,  'symmetric group',
       'The group S_n of all permutations of {1, ..., n}, under composition. It has order n! and is nonabelian for n at least 3.'),
  (10, 'Klein four-group',
       'The group Z/2Z times Z/2Z, the unique (up to isomorphism) noncyclic group of order 4. Every non-identity element has order 2.'),
  (11, 'general linear group',
       'The group GL_n(F) of invertible n by n matrices over a field F, under multiplication. Its identity is I, and inverses are matrix inverses.'),
  (12, 'trivial group',
       'The one-element group {e}. It is cyclic, abelian, and a subgroup of every group.'),
  (13, 'direct product of groups',
       'The set G times H with componentwise operation (g, h)(g-prime, h-prime) = (g g-prime, h h-prime). Its order is |G| |H|, and it is abelian if and only if both factors are.'),
  (14, 'powers of an element',
       'Define g^0 = e, g^{k+1} = g^k g, and g^{-k} = (g^{-1})^k. Then g^a g^b = g^{a+b} and (g^a)^b = g^{ab}. If g has finite order n then g^k = e if and only if n divides k.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 3. Subgroups and Cyclic Groups
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'subgroups'
CROSS JOIN (VALUES
  (0,  'subgroup',
       'A nonempty subset H of G that is a group under the same operation. Equivalently, H is closed under the operation and inverses (or a, b in H implies a b^{-1} in H).'),
  (1,  'subgroup test',
       'A nonempty finite subset closed under the operation is a subgroup. In general one checks e in H, closure, and inverses, or the one-step test a, b in H implies a b^{-1} in H.'),
  (2,  'cyclic group',
       'A group generated by a single element: G = {g^k : k in Z} for some g. Every cyclic group is abelian, and is isomorphic to Z or to Z/nZ.'),
  (3,  'cyclic subgroup',
       'The subgroup generated by g, namely all integer powers g^k. Its order is the order of g.'),
  (4,  'generator',
       'An element g whose powers are all of G. A finite cyclic group of order n has phi(n) generators: the powers g^k with gcd(k, n) = 1.'),
  (5,  'subgroups of a cyclic group',
       'Every subgroup of a cyclic group is cyclic. A cyclic group of order n has exactly one subgroup for each divisor of n, namely the subgroup generated by g^{n/d}, of order d.'),
  (6,  'classification of cyclic groups',
       'Two cyclic groups are isomorphic if and only if they have the same order. Infinite cyclic groups are isomorphic to Z; finite ones of order n are isomorphic to Z/nZ.'),
  (7,  'center',
       'The subgroup Z(G) = {z in G : z g = g z for all g}. It is always normal, and G is abelian if and only if Z(G) = G.'),
  (8,  'centralizer',
       'The subgroup C_G(a) = {g in G : g a = a g}. It contains the cyclic subgroup generated by a and the center, and the number of conjugates of a is the index of C_G(a).'),
  (9,  'intersection of subgroups',
       'The intersection of any family of subgroups is a subgroup. It is the largest subgroup contained in all of them.'),
  (10, 'generated subgroup',
       'The subgroup generated by a set S is the intersection of all subgroups containing S, equivalently all finite products of elements of S and their inverses.'),
  (11, 'finite cyclic group',
       'A cyclic group of finite order n. It has exactly one element of each order d dividing n, up to the count phi(d) of generators of the unique subgroup of order d.'),
  (12, 'infinite cyclic group',
       'A cyclic group isomorphic to Z. It has exactly two generators (1 and -1 in additive notation) and a unique subgroup of each finite index.'),
  (13, 'Euler theorem',
       'If gcd(a, n) = 1 then a^{phi(n)} is congruent to 1 modulo n. This is Lagrange applied to the unit group (Z/nZ)^x.'),
  (14, 'Fermat little theorem',
       'If p is prime and p does not divide a, then a^{p-1} is congruent to 1 modulo p. Equivalently a^p is congruent to a modulo p for every a.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 4. Cosets and Lagrange
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cosets'
CROSS JOIN (VALUES
  (0,  'left coset',
       'The set aH = {a h : h in H} for a subgroup H. Two left cosets are equal or disjoint, and they all have the same cardinality as H.'),
  (1,  'right coset',
       'The set H a = {h a : h in H}. Left and right cosets of H coincide for every a if and only if H is normal.'),
  (2,  'index',
       'The number [G : H] of distinct left (equivalently right) cosets of H in G. If G is finite then [G : H] = |G| / |H|.'),
  (3,  'Lagrange theorem',
       'If H is a subgroup of a finite group G then |H| divides |G|. The proof is that the left cosets partition G and each has size |H|.'),
  (4,  'order divides group order',
       'The order of any element divides |G|. This is Lagrange applied to the cyclic subgroup generated by the element.'),
  (5,  'converse of Lagrange fails',
       'A group of order n need not have a subgroup of every order dividing n. The standard example is A_4, of order 12, which has no subgroup of order 6.'),
  (6,  'cosets partition',
       'The relation a ~ b when a^{-1} b is in H is an equivalence relation whose classes are the left cosets of H. Distinct left cosets are disjoint.'),
  (7,  'equal size of cosets',
       'The map H to aH sending h to a h is a bijection, so every left coset has the same number of elements as H, even if G is infinite.'),
  (8,  'coset equality criterion',
       'aH = bH if and only if a^{-1} b is in H if and only if a is in bH. Likewise Ha = Hb if and only if a b^{-1} is in H.'),
  (9,  'groups of prime order',
       'A group of prime order p is cyclic, generated by any non-identity element. Up to isomorphism there is only one group of order p, namely Z/pZ.'),
  (10, 'groups of order p squared',
       'A group of order p^2 is abelian, hence isomorphic to Z/p^2 Z or to Z/pZ times Z/pZ. The proof uses that the center is nontrivial for p-groups.'),
  (11, 'p-group',
       'A finite group whose order is a power of a prime p. Its center is nontrivial, and every maximal subgroup is normal of index p.'),
  (12, 'product of subgroups',
       'The set HK = {h k : h in H, k in K} is a subgroup if and only if HK = KH. If H and K are finite then |HK| = |H| |K| / |H intersect K|.'),
  (13, 'internal direct product',
       'G is the internal direct product of subgroups H and K when G = HK, H intersect K = {e}, and every element of H commutes with every element of K (or both are normal). Then G is isomorphic to H times K.'),
  (14, 'transversal',
       'A set of representatives for the left cosets of H, one from each coset. Choosing a transversal is equivalent to choosing a section of G to G/H as sets.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 5. Homomorphisms
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'homs'
CROSS JOIN (VALUES
  (0,  'group homomorphism',
       'A map phi : G to H with phi(ab) = phi(a) phi(b) for all a, b. Then phi(e) = e and phi(g^{-1}) = phi(g)^{-1}.'),
  (1,  'kernel',
       'The subgroup ker phi = {g in G : phi(g) = e}. It is always normal, and phi is injective if and only if ker phi = {e}.'),
  (2,  'image',
       'The subgroup im phi = {phi(g) : g in G} of the target. phi is surjective if and only if im phi equals the target.'),
  (3,  'isomorphism',
       'A bijective homomorphism. Its inverse is automatically a homomorphism. Isomorphic groups have the same order, the same number of elements of each order, and the same abelian-or-not.'),
  (4,  'embedding',
       'An injective homomorphism. It identifies the domain with its image, so the domain is isomorphic to a subgroup of the target.'),
  (5,  'first isomorphism theorem',
       'If phi : G to H is a homomorphism then G / ker phi is isomorphic to im phi, via the map sending the coset g ker phi to phi(g).'),
  (6,  'trivial homomorphism',
       'The map sending every element of G to the identity of H. Its kernel is all of G and its image is {e}.'),
  (7,  'automorphism',
       'An isomorphism from a group to itself. The set Aut(G) of automorphisms is a group under composition.'),
  (8,  'inner automorphism',
       'The conjugation map c_g(x) = g x g^{-1}. Sending g to c_g is a homomorphism G to Aut(G) with kernel Z(G), so Inn(G) is isomorphic to G / Z(G).'),
  (9,  'homomorphism from a cyclic group',
       'A homomorphism from a cyclic group generated by g is determined by the image of g, which may be any element of the target whose order divides the order of g.'),
  (10, 'isomorphic groups',
       'Groups for which there exists an isomorphism. Being isomorphic is an equivalence relation, and classification theorems list groups up to this relation.'),
  (11, 'Cayley theorem',
       'Every group G is isomorphic to a subgroup of the symmetric group on the set G, via left multiplication: g acts by sending x to g x.'),
  (12, 'second isomorphism theorem',
       'If H is a subgroup and N is normal, then H N / N is isomorphic to H / (H intersect N). This compares a subgroup with its image in the quotient.'),
  (13, 'correspondence theorem',
       'Subgroups of G containing N are in bijection with subgroups of G/N, sending H to H/N. The correspondence preserves inclusion, index, and normality.'),
  (14, 'isomorphism invariant',
       'A property preserved by isomorphisms: order, being abelian, being cyclic, the lattice of subgroups, the number of elements of each order. Non-isomorphism can be proved by finding an invariant that differs.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 6. Normal Subgroups and Quotients
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'quotients'
CROSS JOIN (VALUES
  (0,  'normal subgroup',
       'A subgroup N with g N g^{-1} = N for every g, equivalently g N = N g for every g. Kernels of homomorphisms are exactly the normal subgroups.'),
  (1,  'conjugate',
       'The element g a g^{-1}, or the subgroup g H g^{-1}. Conjugation is an automorphism, so conjugates have the same order and isomorphic subgroup structure.'),
  (2,  'conjugacy class',
       'The set of all conjugates of an element a. Its size is [G : C_G(a)]. The conjugacy classes partition G, and class equation counts |G| as a sum of those sizes.'),
  (3,  'quotient group',
       'The set G/N of left cosets of a normal subgroup N, with operation (a N)(b N) = (a b) N. The identity is N and the inverse of a N is a^{-1} N.'),
  (4,  'well-defined quotient operation',
       'The product of cosets (a N)(b N) = (a b) N is independent of representatives if and only if N is normal. Without normality the formula can depend on the choice of a and b.'),
  (5,  'canonical projection',
       'The homomorphism pi : G to G/N sending g to g N. It is surjective with kernel N, and every homomorphism with kernel containing N factors through pi.'),
  (6,  'simple group',
       'A group whose only normal subgroups are {e} and itself. Cyclic groups of prime order are simple and abelian; A_n for n at least 5 is simple and nonabelian.'),
  (7,  'A_n',
       'The alternating group of even permutations in S_n, a normal subgroup of index 2 and order n!/2. For n at least 5 it is simple.'),
  (8,  'third isomorphism theorem',
       'If N is contained in M and both are normal in G, then (G/N) / (M/N) is isomorphic to G/M. Quotienting stepwise is the same as quotienting by the larger subgroup.'),
  (9,  'quotient of a cyclic group',
       'Every quotient of a cyclic group is cyclic. In particular Z/nZ is cyclic, generated by 1 + nZ.'),
  (10, 'commutator subgroup',
       'The subgroup G-prime generated by all commutators a b a^{-1} b^{-1}. It is the smallest normal subgroup with G / G-prime abelian; that quotient is the abelianization.'),
  (11, 'normalizer',
       'The subgroup N_G(H) = {g in G : g H g^{-1} = H}. It is the largest subgroup of G in which H is normal, and [G : N_G(H)] is the number of conjugates of H.'),
  (12, 'characteristic subgroup',
       'A subgroup mapped to itself by every automorphism of G. Characteristic subgroups are normal, and the center and commutator subgroup are characteristic.'),
  (13, 'class equation',
       '|G| equals |Z(G)| plus the sizes of the conjugacy classes of non-central elements. Each of those sizes is greater than 1 and divides |G|.'),
  (14, 'quotient by the center',
       'If G / Z(G) is cyclic then G is abelian. This is the usual argument that a group of order p^2 is abelian.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 7. Permutations and Group Actions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'perm-actions'
CROSS JOIN (VALUES
  (0,  'permutation',
       'A bijection from a set to itself. The permutations of a finite set {1, ..., n} form the symmetric group S_n under composition.'),
  (1,  'cycle',
       'A permutation (a1 a2 ... ak) that sends a1 to a2, ..., ak to a1 and fixes everything else. Its order is k, and disjoint cycles commute.'),
  (2,  'transposition',
       'A 2-cycle (i j). Every permutation is a product of transpositions. The number of transpositions in any such factorization is even or odd together.'),
  (3,  'cycle decomposition',
       'Every permutation factors uniquely (up to order) as a product of disjoint cycles. The order of the permutation is the lcm of the cycle lengths.'),
  (4,  'sign of a permutation',
       'The homomorphism sgn : S_n to {+/-1} sending a permutation to +1 if it is even and -1 if it is odd. A k-cycle has sign (-1)^{k-1}.'),
  (5,  'alternating group',
       'The kernel of sgn, the subgroup A_n of even permutations. It has index 2 in S_n, hence is normal, and is generated by 3-cycles.'),
  (6,  'group action',
       'A homomorphism G to Sym(X), or equivalently a map G times X to X with e . x = x and (gh).x = g.(h.x). Actions let a group permute a set.'),
  (7,  'orbit',
       'The set Orb(x) = {g . x : g in G}. Distinct orbits are disjoint and the orbits partition X.'),
  (8,  'stabilizer',
       'The subgroup Stab(x) = {g in G : g . x = x}. It measures how much of G fixes the point x.'),
  (9,  'orbit-stabilizer theorem',
       '|Orb(x)| = [G : Stab(x)]. For finite G this is |G| / |Stab(x)|, so orbit sizes divide |G|.'),
  (10, 'Burnside lemma',
       'The number of orbits of a finite group acting on a finite set is (1/|G|) times the sum over g of the number of points fixed by g.'),
  (11, 'transitive action',
       'An action with a single orbit: for any x, y there is a g with g . x = y. Then X is in bijection with the left cosets of any stabilizer.'),
  (12, 'conjugation action',
       'The action of G on itself (or on its subgroups) by g . a = g a g^{-1}. Orbits are conjugacy classes, and stabilizers are centralizers (or normalizers).'),
  (13, 'left multiplication action',
       'The action of G on itself by g . x = g x. It is free and transitive, and is the action used in Cayley theorem.'),
  (14, 'Cauchy theorem',
       'If a prime p divides |G| then G has an element of order p. The usual proof counts solutions of x^p = e, or uses the action of Z/pZ on p-tuples with product e.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 8. Rings and Ideals
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rings'
CROSS JOIN (VALUES
  (0,  'ring',
       'A set R with addition making (R, +) an abelian group, a multiplication that is associative and distributive over addition. Many texts also require a multiplicative identity 1.'),
  (1,  'commutative ring',
       'A ring whose multiplication is commutative. Z, Z/nZ, and F[x] are commutative; matrix rings M_n(F) for n at least 2 are not.'),
  (2,  'unity',
       'A multiplicative identity 1 with 1 r = r 1 = r for every r. If it exists it is unique. A unital homomorphism is required to send 1 to 1.'),
  (3,  'zero divisor',
       'A nonzero element a for which there exists nonzero b with a b = 0. In Z/nZ the zero divisors are the classes not coprime to n.'),
  (4,  'unit',
       'An element with a multiplicative inverse. The units of R form a group R^x under multiplication. In Z the units are +/-1; in Z/nZ they are the classes coprime to n.'),
  (5,  'integral domain',
       'A commutative ring with 1, and 1 not equal to 0, that has no zero divisors. In a domain, ab = 0 implies a = 0 or b = 0, and cancellation holds for nonzero factors.'),
  (6,  'field',
       'A commutative ring with 1 in which every nonzero element is a unit. Equivalently, a domain in which every nonzero principal ideal is the whole ring. Q, R, C, and Z/pZ are fields.'),
  (7,  'ideal',
       'A subgroup I of (R, +) with r I subset I and I r subset I for every r (a two-sided ideal). In a commutative ring this is r I subset I. Ideals are exactly the kernels of ring homomorphisms.'),
  (8,  'principal ideal',
       'The ideal (a) generated by a single element a. In a commutative unital ring, (a) = {r a : r in R}. A PID is a domain in which every ideal is principal.'),
  (9,  'prime ideal',
       'A proper ideal P such that a b in P implies a in P or b in P. In a commutative unital ring, P is prime if and only if R/P is an integral domain.'),
  (10, 'maximal ideal',
       'A proper ideal M not contained in any larger proper ideal. In a commutative unital ring, M is maximal if and only if R/M is a field. Every maximal ideal is prime.'),
  (11, 'quotient ring',
       'The set R/I of cosets r + I with the operations (r + I) + (s + I) = (r + s) + I and (r + I)(s + I) = r s + I. This is well-defined precisely because I is an ideal.'),
  (12, 'ring homomorphism',
       'A map phi : R to S with phi(a + b) = phi(a) + phi(b) and phi(a b) = phi(a) phi(b), and usually phi(1) = 1. The kernel is an ideal and the image is a subring.'),
  (13, 'kernel of a ring homomorphism',
       'The ideal ker phi = {r : phi(r) = 0}. phi is injective if and only if the kernel is {0}.'),
  (14, 'first isomorphism theorem for rings',
       'If phi : R to S is a ring homomorphism then R / ker phi is isomorphic to im phi. Quotients by ideals classify images of homomorphisms.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 9. Polynomials
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'polynomials'
CROSS JOIN (VALUES
  (0,  'polynomial ring',
       'The ring R[x] of polynomials with coefficients in R, added and multiplied in the usual way. If R is a domain then so is R[x], and deg(f g) = deg f + deg g.'),
  (1,  'degree of a polynomial',
       'The largest k with the coefficient of x^k nonzero. The zero polynomial is often assigned degree -infinity. Degree adds under multiplication in a domain.'),
  (2,  'division algorithm for polynomials',
       'If F is a field and g is nonzero in F[x], then for every f there exist unique q, r with f = g q + r and either r = 0 or deg r less than deg g.'),
  (3,  'Euclidean algorithm in F[x]',
       'The same remainder process as for integers, using polynomial division. It produces a monic gcd of two polynomials, and a Bezout combination.'),
  (4,  'irreducible polynomial',
       'A nonunit f in F[x] that cannot be written as a product of two nonunits. Over a field, irreducibles are exactly the polynomials of degree at least 1 with no nonunit factors of smaller degree.'),
  (5,  'Eisenstein criterion',
       'If a prime p divides every coefficient of f except the leading one, and p^2 does not divide the constant term, then f is irreducible over Q.'),
  (6,  'Gauss lemma',
       'A primitive polynomial in Z[x] is irreducible over Z if and only if it is irreducible over Q. Content multiplies, so factorizations over Q can be scaled to factorizations over Z.'),
  (7,  'unique factorization in F[x]',
       'F[x] is a Euclidean domain, hence a UFD: every nonconstant polynomial factors uniquely as a constant times a product of monic irreducibles.'),
  (8,  'evaluation homomorphism',
       'The map F[x] to F (or to an extension) sending f to f(a) for a fixed a. Its kernel is the principal ideal of polynomials vanishing at a.'),
  (9,  'root of a polynomial',
       'A scalar a with f(a) = 0. Then (x - a) divides f. A nonzero polynomial of degree n over a field has at most n roots.'),
  (10, 'factor theorem',
       'x - a divides f if and only if f(a) = 0. Repeated application gives a factorization into linear factors once enough roots are known.'),
  (11, 'primitive polynomial',
       'A polynomial in Z[x] whose coefficients have gcd 1. Any polynomial in Q[x] is an associate of a primitive polynomial in Z[x], unique up to sign.'),
  (12, 'associates',
       'Elements a, b of a ring that differ by a unit: a = u b. In F[x] the monic representative of an associate class is unique for each nonzero polynomial.'),
  (13, 'fundamental theorem of algebra',
       'Every nonconstant polynomial with complex coefficients has a complex root, hence factors as a constant times a product of linear factors over C.'),
  (14, 'reducibility over R',
       'Every nonconstant real polynomial factors as a product of real linear factors and real quadratic factors with negative discriminant. Irreducibles over R have degree 1 or 2.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

-- =====================================================================
-- 10. Fields and Extensions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'fields'
CROSS JOIN (VALUES
  (0,  'field of fractions',
       'The smallest field containing an integral domain R, consisting of fractions a/b with b nonzero, modulo a/b = c/d when a d = b c. For R = Z this is Q.'),
  (1,  'characteristic',
       'The smallest positive integer n with n * 1 = 0, or 0 if no such n exists. In a domain the characteristic is 0 or prime, and char(R) is the generator of the kernel of Z to R.'),
  (2,  'prime field',
       'The smallest subfield of a field F. It is isomorphic to Q if char F = 0 and to Z/pZ if char F = p.'),
  (3,  'field extension',
       'A field K containing a subfield F, written K/F. Then K is a vector space over F, and the extension is finite when that space is finite-dimensional.'),
  (4,  'degree of an extension',
       'The dimension [K : F] of K as an F-vector space. It is 1 if and only if K = F. Multiplicativity: [L : F] = [L : K] [K : F] when F subset K subset L.'),
  (5,  'algebraic element',
       'An element a in K such that f(a) = 0 for some nonzero f in F[x]. Finite extensions consist entirely of algebraic elements.'),
  (6,  'transcendental element',
       'An element that satisfies no nonzero polynomial over F. If a is transcendental then F[a] is isomorphic to the polynomial ring F[x] and F(a) is isomorphic to the field of rational functions.'),
  (7,  'minimal polynomial',
       'The monic polynomial m of least degree over F with m(a) = 0. It is irreducible, divides every polynomial that vanishes at a, and [F(a) : F] equals deg m.'),
  (8,  'simple extension',
       'An extension K = F(a) generated by a single element a. If a is algebraic of degree n then {1, a, ..., a^{n-1}} is an F-basis of F(a).'),
  (9,  'finite extension',
       'An extension of finite degree. A finite extension is algebraic, and if K/F is finite and a is algebraic over K then a is algebraic over F.'),
  (10, 'adjoining a root',
       'If f is irreducible over F then F[x] / (f) is a field containing a root of f, namely the class of x. Every simple algebraic extension arises this way.'),
  (11, 'tower law',
       '[L : F] = [L : K] [K : F] for F subset K subset L. In particular if [L : F] is finite then both [L : K] and [K : F] are finite and divide [L : F].'),
  (12, 'finite field',
       'A field with finitely many elements. Its cardinality is p^n for a prime p (the characteristic) and some n, and for each such pair there is a unique field up to isomorphism, written F_{p^n}.'),
  (13, 'F_p',
       'The field Z/pZ of p elements, the prime field of characteristic p. Every finite field of characteristic p is a finite extension of F_p.'),
  (14, 'multiplicative group of a finite field',
       'The group F^x of nonzero elements of a finite field is cyclic of order q - 1. In particular there is a primitive element generating F^x, and x^q - x = 0 for every x in F.')
) AS c(pos, front, back)
WHERE d.slug = 'math113';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math113';
