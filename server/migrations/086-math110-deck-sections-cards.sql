-- Migration 086: MATH 110 — Abstract Linear Algebra, new preset deck.
-- Catalog: matrices, vector spaces, linear transformations, inner products,
-- determinants, eigenvectors, QR, quadratic forms and Rayleigh, Jordan form,
-- linear functionals. Standard text: Linear Algebra Done Right. Cards are
-- term / definition. No textbook, instructor, or honors wording on cards.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'math110',
  'MATH 110',
  'Abstract Linear Algebra — vector spaces, operators, inner products, and Jordan form',
  'uc-berkeley:math110:fa26',
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
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math110');

DELETE FROM public.tidbits
WHERE category_id = 'math110';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math110');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math110');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('vector-spaces',  'Vector Spaces',
   'Fields, subspaces, span, sums and direct sums', 0),
  ('bases',          'Bases and Dimension',
   'Independence, bases, replacement, dimension formulas', 1),
  ('linear-maps',    'Linear Maps',
   'Null space, range, rank-nullity, matrices of maps', 2),
  ('dual-poly',      'Dual Spaces and Polynomials',
   'Functionals, dual basis, annihilators, polynomials on operators', 3),
  ('eigenvalues',    'Eigenvalues and Invariant Subspaces',
   'Eigenvectors, flags, upper-triangular form', 4),
  ('inner-products', 'Inner Product Spaces',
   'Norms, orthogonality, Gram-Schmidt, projections', 5),
  ('adjoints',       'Adjoints and Normal Operators',
   'Adjoint, self-adjoint, unitary, SVD', 6),
  ('spectral',       'Spectral Theorem, QR, and Rayleigh',
   'Spectral theorem, QR, quadratic forms, Rayleigh', 7),
  ('jordan',         'Jordan Form',
   'Generalized eigenspaces, nilpotents, Cayley-Hamilton', 8),
  ('det-trace',      'Determinants and Trace',
   'Det, trace, similarity, characteristic polynomial', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math110'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Vector Spaces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'vector-spaces'
CROSS JOIN (VALUES
  (0,  'vector space',
       'A set V with addition and scalar multiplication over a field F that is an abelian group under addition and satisfies the usual distributive and associative laws with 1v = v.'),
  (1,  'field',
       'A set F with addition and multiplication making it a commutative ring in which every nonzero element has a multiplicative inverse. The usual scalars are R or C.'),
  (2,  'subspace',
       'A subset U of V that is itself a vector space under the same operations. Equivalently, U contains 0 and is closed under addition and scalar multiplication.'),
  (3,  'sum of subspaces',
       'The set U + W = {u + w : u in U, w in W}. It is the smallest subspace containing both U and W.'),
  (4,  'direct sum',
       'The sum U + W is direct, written U oplus W, when every vector in the sum has a unique expression u + w. Equivalently, U intersect W = {0}.'),
  (5,  'span',
       'The set of all linear combinations of a list of vectors. It is the smallest subspace containing those vectors.'),
  (6,  'linear combination',
       'A vector a1 v1 + ... + am vm with scalars ai in F. The empty combination is defined to be 0.'),
  (7,  'zero vector',
       'The unique identity element 0 of addition in V. Every subspace contains it, and it is the only vector whose span is {0}.'),
  (8,  'additive inverse',
       'For each v the unique vector -v satisfying v + (-v) = 0. Scalar multiplication gives -v = (-1)v.'),
  (9,  'F^n',
       'The space of ordered n-tuples of scalars from F, with componentwise addition and scalar multiplication. Its standard basis is the list of standard unit vectors.'),
  (10, 'polynomial space',
       'The space P(F) of all polynomials with coefficients in F, or the finite-dimensional subspace P_m(F) of polynomials of degree at most m.'),
  (11, 'function space',
       'The space of all functions from a set S to F, with pointwise addition and scalar multiplication. Many concrete spaces (sequences, continuous functions) sit inside it.'),
  (12, 'intersection of subspaces',
       'If U and W are subspaces, so is U intersect W. It is the largest subspace contained in both.'),
  (13, 'trivial subspace',
       'The subspace {0}. Every vector space contains it, and it is the unique 0-dimensional subspace.'),
  (14, 'subspace test',
       'A nonempty subset U of V is a subspace if it is closed under addition and scalar multiplication. Checking 0 in U is then automatic.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 2. Bases and Dimension
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'bases'
CROSS JOIN (VALUES
  (0,  'linearly independent',
       'A list of vectors whose only linear combination equal to 0 has all coefficients 0. No vector in the list is a combination of the others.'),
  (1,  'linearly dependent',
       'A list that is not linearly independent: some vector is a linear combination of the preceding ones, or equivalently a nontrivial combination equals 0.'),
  (2,  'basis',
       'A linearly independent list that spans V. Every vector then has unique coordinates with respect to that list.'),
  (3,  'dimension',
       'The length of any basis of V, written dim V. All bases of a finite-dimensional space have the same length.'),
  (4,  'finite-dimensional',
       'A vector space that is spanned by a finite list. Equivalently, it has a finite basis.'),
  (5,  'infinite-dimensional',
       'A vector space that is not finite-dimensional: no finite list spans it. Example: the space of all polynomials.'),
  (6,  'spanning list',
       'A list of vectors whose span equals V. Any spanning list of a finite-dimensional space contains a basis as a sublist.'),
  (7,  'replacement theorem',
       'If a list of length n spans V and a list of length m is independent, then m is at most n, and the spanning list can be replaced so that the independent vectors sit inside a spanning list of length n.'),
  (8,  'independent list length',
       'In a space of dimension n, every linearly independent list has length at most n, and a list of n independent vectors is automatically a basis.'),
  (9,  'spanning list contains a basis',
       'From any finite spanning list one can discard vectors until the remaining list is a basis.'),
  (10, 'independent list extends to a basis',
       'In a finite-dimensional space, any linearly independent list can be extended to a basis by adding vectors from a given spanning list.'),
  (11, 'dimension of a sum',
       'dim(U + W) = dim U + dim W - dim(U intersect W). If the sum is direct this is dim U + dim W.'),
  (12, 'standard basis',
       'The list e1, ..., en of standard unit vectors in F^n. It is the basis whose coordinates of a tuple are the tuple itself.'),
  (13, 'coordinates',
       'If v1, ..., vn is a basis and v = a1 v1 + ... + an vn, the scalars a1, ..., an are the coordinates of v with respect to that basis.'),
  (14, 'basis of a subspace',
       'Any subspace of a finite-dimensional space is finite-dimensional, and dim U is at most dim V, with equality if and only if U = V.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 3. Linear Maps
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linear-maps'
CROSS JOIN (VALUES
  (0,  'linear map',
       'A function T : V to W satisfying T(au + bv) = a T(u) + b T(v). The set of all such maps is itself a vector space, written L(V, W).'),
  (1,  'null space',
       'The subspace null T = {v in V : T(v) = 0}. T is injective if and only if null T = {0}.'),
  (2,  'range',
       'The subspace range T = {T(v) : v in V} of W. T is surjective if and only if range T = W.'),
  (3,  'rank-nullity',
       'For T in L(V, W) with V finite-dimensional, dim V = dim null T + dim range T.'),
  (4,  'injective linear map',
       'A linear map with null T = {0}, equivalently one-to-one. On finite-dimensional spaces of equal dimension this is equivalent to surjectivity and invertibility.'),
  (5,  'surjective linear map',
       'A linear map with range T = W. If dim V = dim W is finite, surjectivity is equivalent to injectivity.'),
  (6,  'invertible linear map',
       'A linear map that has a linear inverse: there exists S with ST = I_V and TS = I_W. Finite-dimensional V and W must then have the same dimension.'),
  (7,  'isomorphism',
       'An invertible linear map. Two spaces are isomorphic when such a map exists; finite-dimensional spaces are isomorphic if and only if they have the same dimension.'),
  (8,  'operator',
       'A linear map from a space to itself, an element of L(V). The identity and zero maps are operators, and operators can be composed and added.'),
  (9,  'matrix of a linear map',
       'If bases of V and W are chosen, T is represented by the matrix whose columns are the coordinates of T applied to the domain basis vectors.'),
  (10, 'product of linear maps',
       'The composition ST, defined when the range of T sits in the domain of S. In matrices this is matrix multiplication, in the matching bases.'),
  (11, 'identity operator',
       'The operator I_V defined by I(v) = v. Its matrix in any basis is the identity matrix.'),
  (12, 'map determined by a basis',
       'A linear map is uniquely determined by its values on a basis, and those values may be assigned arbitrarily in the target space.'),
  (13, 'invertibility criterion',
       'If V is finite-dimensional and T is an operator on V, then T is invertible if and only if it is injective if and only if it is surjective.'),
  (14, 'rank',
       'The dimension of the range of a linear map (or of the column space of a matrix). Rank-nullity says rank T = dim V - dim null T.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 4. Dual Spaces and Polynomials
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'dual-poly'
CROSS JOIN (VALUES
  (0,  'linear functional',
       'A linear map from V to the scalar field F. The collection of all of them is the dual space.'),
  (1,  'dual space',
       'The space V-prime = L(V, F) of linear functionals on V. If dim V = n then dim V-prime = n.'),
  (2,  'dual basis',
       'If v1, ..., vn is a basis of V, the dual basis is the list of functionals phi_j with phi_j(v_k) = 1 if j = k and 0 otherwise.'),
  (3,  'annihilator',
       'For a subset U of V, the subspace of functionals that vanish on U. If U is a subspace then dim U + dim U^0 = dim V.'),
  (4,  'evaluation functional',
       'The functional that sends a function (or polynomial) to its value at a fixed point. Evaluation at distinct points gives independent functionals on P_m.'),
  (5,  'polynomial',
       'An expression a0 + a1 z + ... + am z^m with coefficients in F. Two polynomials are equal when corresponding coefficients match.'),
  (6,  'degree of a polynomial',
       'The largest k with a_k nonzero, for a nonzero polynomial. The zero polynomial is often assigned degree -infinity or left undefined.'),
  (7,  'root of a polynomial',
       'A scalar lambda with p(lambda) = 0. Then (z - lambda) divides p. A nonzero polynomial of degree m has at most m roots.'),
  (8,  'monic polynomial',
       'A nonzero polynomial whose leading coefficient is 1. Dividing by the leading coefficient makes any nonzero polynomial monic.'),
  (9,  'division algorithm for polynomials',
       'Given p and nonzero s there exist unique q and r with p = s q + r and either r = 0 or deg r less than deg s.'),
  (10, 'factorization over C',
       'Every nonconstant polynomial with complex coefficients factors as a constant times a product of monic linear factors (z - lambda).'),
  (11, 'factorization over R',
       'Every nonconstant real polynomial factors as a constant times monic linear factors and monic quadratic factors with negative discriminant.'),
  (12, 'polynomial applied to an operator',
       'If p(z) = a0 + a1 z + ... + am z^m and T is an operator, p(T) = a0 I + a1 T + ... + am T^m. This makes the algebra of polynomials act on L(V).'),
  (13, 'transpose of a linear map',
       'The map T-prime : W-prime to V-prime defined by (T-prime phi)(v) = phi(T v). In matrices it is the ordinary transpose.'),
  (14, 'dual pairing',
       'The bilinear map sending (phi, v) to phi(v) from V-prime times V to F. In finite dimension it identifies V with its double dual.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 5. Eigenvalues and Invariant Subspaces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'eigenvalues'
CROSS JOIN (VALUES
  (0,  'invariant subspace',
       'A subspace U with T(U) subset U. Then T restricts to an operator on U, and the quotient V/U inherits an operator as well.'),
  (1,  'eigenvalue',
       'A scalar lambda such that T v = lambda v for some nonzero v. Equivalently, T - lambda I is not injective.'),
  (2,  'eigenvector',
       'A nonzero vector v with T v = lambda v for some scalar lambda. Eigenvectors for a single lambda, together with 0, form a subspace.'),
  (3,  'eigenspace',
       'The subspace E(lambda, T) = null(T - lambda I). Its dimension is the geometric multiplicity of lambda.'),
  (4,  'existence of an eigenvalue',
       'Every operator on a nonzero finite-dimensional complex vector space has at least one eigenvalue. The proof uses that p(T) is not invertible for a suitable polynomial p.'),
  (5,  'upper-triangular matrix',
       'A matrix with zeros strictly below the diagonal. An operator has an upper-triangular matrix in some basis if and only if there is a flag of invariant subspaces of every dimension.'),
  (6,  'diagonalizable',
       'An operator that has a basis of eigenvectors, equivalently a diagonal matrix in some basis. Over C this happens when the minimal polynomial has distinct roots.'),
  (7,  'geometric multiplicity',
       'The dimension of the eigenspace for lambda. It is at most the algebraic multiplicity, with equality for every eigenvalue if and only if T is diagonalizable.'),
  (8,  'eigenvectors for distinct eigenvalues',
       'Eigenvectors corresponding to distinct eigenvalues are linearly independent. In particular an operator with n distinct eigenvalues on an n-dimensional space is diagonalizable.'),
  (9,  'restriction of an operator',
       'If U is invariant under T, the restriction T|_U is the operator on U given by the same formula. Its eigenvalues are among those of T.'),
  (10, 'invariant flag',
       'A chain {0} = V0 subset V1 subset ... subset Vn = V with dim V_j = j and each V_j invariant under T. Such a flag exists over C and yields an upper-triangular matrix.'),
  (11, 'upper-triangular representation',
       'Over C, every operator has an upper-triangular matrix in some basis. The diagonal entries are exactly the eigenvalues, each repeated by algebraic multiplicity.'),
  (12, 'T-cyclic subspace',
       'The subspace spanned by v, T v, T^2 v, .... It is the smallest invariant subspace containing v.'),
  (13, 'eigenvalue of a triangular matrix',
       'The eigenvalues of an upper-triangular matrix are its diagonal entries. The geometric multiplicity of a diagonal value can be strictly smaller than how often it appears.'),
  (14, 'complementary invariant subspaces',
       'If V = U oplus W with both U and W invariant, then T is represented by a block-diagonal matrix with the restrictions T|_U and T|_W on the diagonal.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 6. Inner Product Spaces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'inner-products'
CROSS JOIN (VALUES
  (0,  'inner product',
       'A function (u, v) on V times V to F that is linear in the first slot, conjugate-symmetric, and positive-definite: (v, v) is at least 0, and equals 0 only for v = 0.'),
  (1,  'norm from an inner product',
       'The number ||v|| = sqrt((v, v)). It satisfies ||av|| = abs(a) ||v|| and the triangle inequality, so it is a norm.'),
  (2,  'Cauchy-Schwarz inequality',
       'abs((u, v)) is at most ||u|| ||v||, with equality if and only if u and v are linearly dependent.'),
  (3,  'triangle inequality',
       '||u + v|| is at most ||u|| + ||v||. It follows from Cauchy-Schwarz by expanding ||u + v||^2.'),
  (4,  'orthogonality',
       'Vectors u and v are orthogonal when (u, v) = 0. A list is orthogonal when distinct vectors in it are pairwise orthogonal.'),
  (5,  'orthonormal list',
       'An orthogonal list of unit vectors: (v_j, v_k) = 1 if j = k and 0 otherwise. Any orthonormal list is linearly independent.'),
  (6,  'Gram-Schmidt',
       'A process that turns a linearly independent list into an orthonormal list with the same span, by subtracting successive orthogonal projections and normalizing.'),
  (7,  'orthonormal basis',
       'An orthonormal list that is a basis. Every finite-dimensional inner product space has one, and coordinates are then a_j = (v, e_j).'),
  (8,  'orthogonal complement',
       'The subspace U-perp = {v : (v, u) = 0 for all u in U}. If U is finite-dimensional then V = U oplus U-perp and dim U-perp = dim V - dim U.'),
  (9,  'orthogonal projection',
       'The operator P_U that sends v to its unique closest point in a subspace U. If e1, ..., em is an orthonormal basis of U then P_U v = sum (v, e_j) e_j.'),
  (10, 'Pythagorean theorem',
       'If u and v are orthogonal then ||u + v||^2 = ||u||^2 + ||v||^2. The same holds for finite orthogonal sums.'),
  (11, 'closest-point property',
       'For a subspace U and a vector v, the vector u in U minimizing ||v - u|| is the orthogonal projection of v onto U, characterized by v - u orthogonal to U.'),
  (12, 'Bessel inequality',
       'If e1, ..., em is orthonormal then sum abs((v, e_j))^2 is at most ||v||^2, with equality for every v if and only if the list is an orthonormal basis.'),
  (13, 'conjugate symmetry',
       'The identity (v, u) = conjugate of (u, v). Over R this is ordinary symmetry. It forces (v, v) to be real.'),
  (14, 'positive-definiteness',
       'The inner-product axiom (v, v) greater than or equal to 0, with equality only at 0. Together with the other axioms it makes ||v|| a genuine norm.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 7. Adjoints and Normal Operators
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'adjoints'
CROSS JOIN (VALUES
  (0,  'adjoint',
       'The unique operator T-star satisfying (T u, v) = (u, T-star v) for all u, v. In an orthonormal basis its matrix is the conjugate transpose of the matrix of T.'),
  (1,  'self-adjoint operator',
       'An operator equal to its adjoint, T = T-star. Over C its eigenvalues are real and eigenvectors for distinct eigenvalues are orthogonal.'),
  (2,  'normal operator',
       'An operator that commutes with its adjoint: T T-star = T-star T. Self-adjoint, unitary, and isometric operators on finite-dimensional spaces are normal.'),
  (3,  'conjugate transpose',
       'The matrix A-star obtained by transposing A and taking complex conjugates. It represents the adjoint in an orthonormal basis.'),
  (4,  'adjoint of a product',
       '(ST)-star = T-star S-star. Also (T-star)-star = T and (aT + bS)-star = conjugate(a) T-star + conjugate(b) S-star.'),
  (5,  'range-null space relation',
       'null T-star = (range T)-perp and range T-star = (null T)-perp. In particular T is injective if and only if T-star is surjective.'),
  (6,  'isometry',
       'An operator satisfying ||T v|| = ||v|| for every v, equivalently T-star T = I. On a finite-dimensional space an isometry is unitary.'),
  (7,  'unitary operator',
       'An operator with T-star T = T T-star = I, equivalently T-star = T inverse. It preserves inner products and sends orthonormal bases to orthonormal bases.'),
  (8,  'positive operator',
       'A self-adjoint operator with (T v, v) at least 0 for every v. Equivalently, all eigenvalues are at least 0, or T = S-star S for some S.'),
  (9,  'square root of a positive operator',
       'The unique positive operator R with R^2 = T. It is a polynomial in T, so it commutes with every operator that commutes with T.'),
  (10, 'polar decomposition',
       'Every operator factors as T = S sqrt(T-star T) with S a partial isometry (unitary if T is invertible). This is the operator analogue of z = e^{i theta} abs(z).'),
  (11, 'singular value',
       'An eigenvalue of the positive operator sqrt(T-star T), conventionally listed in decreasing order. The number of nonzero singular values equals the rank of T.'),
  (12, 'singular value decomposition',
       'There exist orthonormal bases of the domain and target in which T acts by sending e_j to s_j f_j, where s_j are the singular values. In matrices, A = U Sigma V-star.'),
  (13, 'self-adjoint eigenvalues are real',
       'If T = T-star and T v = lambda v with v nonzero, then lambda = (T v, v) / (v, v) is real because (T v, v) is real.'),
  (14, 'normal characterization',
       'T is normal if and only if ||T v|| = ||T-star v|| for every v, if and only if T and T-star are simultaneously triangularizable with conjugate diagonal entries.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 8. Spectral Theorem, QR, and Rayleigh
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'spectral'
CROSS JOIN (VALUES
  (0,  'complex spectral theorem',
       'An operator on a finite-dimensional complex inner product space is normal if and only if it has an orthonormal basis of eigenvectors.'),
  (1,  'real spectral theorem',
       'An operator on a finite-dimensional real inner product space is self-adjoint if and only if it has an orthonormal basis of eigenvectors.'),
  (2,  'orthonormal eigenbasis',
       'A basis that is both orthonormal and made of eigenvectors. The matrix of T is then diagonal, and the diagonal entries are the eigenvalues.'),
  (3,  'QR factorization',
       'Every invertible matrix A factors as A = QR with Q unitary (orthogonal over R) and R upper-triangular with positive diagonal. The Q factor comes from Gram-Schmidt on the columns.'),
  (4,  'Rayleigh quotient',
       'The number R_T(v) = (T v, v) / (v, v) for nonzero v. For self-adjoint T it is real, and its values on the unit sphere fill the interval from the smallest eigenvalue to the largest.'),
  (5,  'Rayleigh principle',
       'For a self-adjoint operator the largest eigenvalue is the maximum of (T v, v) over unit vectors, and the smallest eigenvalue is the minimum.'),
  (6,  'min-max theorem',
       'The k-th eigenvalue of a self-adjoint operator (in decreasing order) is the minimum, over k-dimensional subspaces, of the maximum of (T v, v) on the unit sphere of that subspace.'),
  (7,  'simultaneous diagonalization',
       'A commuting family of normal (or real self-adjoint) operators can be diagonalized by a single orthonormal basis: they share a common eigenbasis.'),
  (8,  'orthogonal diagonalization',
       'A real symmetric matrix A equals Q D Q^T for an orthogonal Q and a real diagonal D. This is the matrix form of the real spectral theorem.'),
  (9,  'quadratic form',
       'The function q(v) = (T v, v) associated to a self-adjoint operator T. In coordinates, q(x) = x^T A x for a real symmetric matrix A.'),
  (10, 'principal axis theorem',
       'A real quadratic form can be written as a sum of squares of orthonormal coordinates, with coefficients equal to the eigenvalues of the associated symmetric matrix.'),
  (11, 'spectral decomposition',
       'A normal operator T equals sum lambda_j P_j, where the P_j are the orthogonal projections onto the eigenspaces and the lambda_j are the distinct eigenvalues.'),
  (12, 'commuting normal operators',
       'If S and T are normal and ST = TS, then ST is normal and S and T are simultaneously unitarily diagonalizable.'),
  (13, 'Schur triangulation',
       'Every complex matrix is unitarily similar to an upper-triangular matrix. The diagonal of that triangular matrix lists the eigenvalues.'),
  (14, 'Rayleigh quotient extrema',
       'Critical points of the Rayleigh quotient on the unit sphere are exactly the eigenvectors, and the critical values are the eigenvalues.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 9. Jordan Form
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'jordan'
CROSS JOIN (VALUES
  (0,  'generalized eigenvector',
       'A nonzero vector v such that (T - lambda I)^k v = 0 for some k. Ordinary eigenvectors are the case k = 1.'),
  (1,  'generalized eigenspace',
       'The subspace G(lambda, T) = null(T - lambda I)^{dim V}. Over C, V is the direct sum of the generalized eigenspaces.'),
  (2,  'Jordan block',
       'A matrix with lambda on the diagonal, 1s on the superdiagonal, and 0s elsewhere. It is the matrix of (T - lambda I) + lambda I on a single Jordan chain.'),
  (3,  'Jordan canonical form',
       'A block-diagonal matrix of Jordan blocks. Over C every operator is similar to a unique (up to block order) Jordan form.'),
  (4,  'nilpotent operator',
       'An operator N with N^k = 0 for some k. On a generalized eigenspace, T - lambda I is nilpotent.'),
  (5,  'index of nilpotence',
       'The smallest k with N^k = 0. It equals the size of the largest Jordan block for eigenvalue 0 (or for lambda, after shifting by lambda I).'),
  (6,  'Cayley-Hamilton theorem',
       'If chi is the characteristic polynomial of T, then chi(T) = 0. In particular the minimal polynomial divides the characteristic polynomial.'),
  (7,  'minimal polynomial',
       'The monic polynomial m of least degree with m(T) = 0. Its roots are exactly the eigenvalues, and T is diagonalizable if and only if m has distinct linear factors.'),
  (8,  'characteristic polynomial',
       'The monic polynomial chi_T(z) = det(z I - T) of degree dim V. Its roots are the eigenvalues, counted with algebraic multiplicity.'),
  (9,  'Jordan chain',
       'A list v, (T - lambda I)v, ..., (T - lambda I)^{m-1}v where the last vector is an ordinary eigenvector and the first is a generalized eigenvector of rank m.'),
  (10, 'uniqueness of Jordan form',
       'The Jordan form is determined by the eigenvalues and, for each eigenvalue, the sizes of the blocks. Those sizes are read from the dimensions of the kernels of (T - lambda I)^k.'),
  (11, 'diagonalizable criterion',
       'T is diagonalizable if and only if its minimal polynomial is a product of distinct linear factors, if and only if every generalized eigenspace equals the ordinary eigenspace.'),
  (12, 'generalized eigenspace decomposition',
       'If the characteristic polynomial splits, V is the direct sum of the generalized eigenspaces, each of which is invariant, and T acts as lambda I plus nilpotent on each.'),
  (13, 'algebraic multiplicity',
       'The multiplicity of (z - lambda) as a factor of the characteristic polynomial. It equals dim G(lambda, T) and is at least the geometric multiplicity.'),
  (14, 'complexification',
       'The complex vector space obtained from a real space V by allowing complex scalars, formally V + iV. Real operators extend to it, and real Jordan (or rational canonical) form is recovered by taking real and imaginary parts.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

-- =====================================================================
-- 10. Determinants and Trace
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'det-trace'
CROSS JOIN (VALUES
  (0,  'determinant',
       'The unique alternating multilinear function det on n-tuples of vectors in F^n that sends the standard basis to 1. For an operator it is independent of basis.'),
  (1,  'trace',
       'The sum of the diagonal entries of a matrix of T. It is independent of basis and equals the sum of the eigenvalues counted with algebraic multiplicity.'),
  (2,  'det of a product',
       'det(ST) = det(S) det(T). In particular det is a homomorphism from the invertible operators to the multiplicative group of F.'),
  (3,  'det of inverse',
       'If T is invertible then det(T inverse) = 1 / det(T). T is invertible if and only if det T is nonzero.'),
  (4,  'change of basis',
       'If P has columns equal to the new basis expressed in the old coordinates, the matrix of T becomes P inverse A P. Similar matrices represent the same operator.'),
  (5,  'similar matrices',
       'Matrices A and B with B = P inverse A P for some invertible P. Similar matrices have the same trace, determinant, characteristic polynomial, and Jordan form.'),
  (6,  'characteristic polynomial as det',
       'chi_T(z) = det(z I - T). Expanding shows it is monic of degree n, and the coefficient of z^{n-1} is minus the trace.'),
  (7,  'trace independent of basis',
       'trace(P inverse A P) = trace(A), because trace(XY) = trace(YX). Thus trace is a well-defined function on operators.'),
  (8,  'det is product of eigenvalues',
       'If the characteristic polynomial splits, det T equals the product of the eigenvalues counted with algebraic multiplicity. This is the constant term of chi, up to sign.'),
  (9,  'trace is sum of eigenvalues',
       'If the characteristic polynomial splits, trace T equals the sum of the eigenvalues counted with algebraic multiplicity.'),
  (10, 'alternating multilinear form',
       'A function of n vector slots that is linear in each slot and changes sign when two slots are swapped. On F^n such forms are scalar multiples of det.'),
  (11, 'volume interpretation',
       'abs(det T) is the factor by which T scales n-dimensional volume. The sign of det T (over R) records orientation.'),
  (12, 'det of upper triangular',
       'The determinant of an upper-triangular matrix is the product of its diagonal entries. Combined with Schur form this again gives det as the product of eigenvalues.'),
  (13, 'Cramer rule',
       'If A is invertible, the solution of A x = b has j-th coordinate det(A_j) / det(A), where A_j is A with column j replaced by b.'),
  (14, 'invariance under similarity',
       'det(P inverse T P) = det T. Together with the product rule this is why determinant is an intrinsic invariant of an operator, not of a particular matrix.')
) AS c(pos, front, back)
WHERE d.slug = 'math110';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math110';
