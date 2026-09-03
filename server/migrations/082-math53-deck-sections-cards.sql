-- Migration 082: MATH 53 — Multivariable Calculus, full deck rebuild.
-- Department outline (Stewart Multivariable Calculus, Berkeley paperback):
-- Ch 10 Parametric Equations and Polar Coordinates (skip 10.5, 10.6),
-- Ch 12 Vectors and the Geometry of Space, Ch 13 Vector Functions,
-- Ch 14 Partial Derivatives, Ch 15 Multiple Integrals, Ch 16 Vector
-- Calculus, plus a short PDE examples hour. FA26 lectures: Sethian
-- (LEC 001), Frenkel (LEC 002). Cards are term (front) / definition
-- (back) for recall.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'math53');

DELETE FROM public.tidbits
WHERE category_id = 'math53';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math53');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'math53');

UPDATE public.decks
SET title = 'MATH 53',
    description = 'Multivariable Calculus — partials, multiple integrals, and vector calculus',
    cover_emoji = '🧮'
WHERE slug = 'math53';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('parametric-polar',  'Parametric Equations and Polar Coordinates',
   'Parametric calculus, polar graphs, polar area and length', 0),
  ('vectors',           'Vectors and Geometry of Space',
   'Dot and cross products, lines, planes, quadrics', 1),
  ('vector-functions',  'Vector Functions',
   'Space curves, arc length, curvature, velocity', 2),
  ('partials',          'Partial Derivatives',
   'Limits, partials, tangent planes, chain rule', 3),
  ('gradient-extrema',  'Gradient, Extrema, and Lagrange',
   'Directional derivatives, second derivative test, constraints', 4),
  ('double-integrals',  'Double Integrals',
   'Fubini, Type I/II regions, polar, applications', 5),
  ('triple-change',     'Triple Integrals and Change of Variables',
   'Cylindrical, spherical, Jacobian', 6),
  ('vector-fields',     'Vector Fields and Line Integrals',
   'Conservative fields, work, path independence', 7),
  ('green-curl',        'Green, Curl, and Divergence',
   'Green''s theorem, curl, div, parametric surfaces', 8),
  ('stokes-div',        'Stokes, Divergence Theorem, and PDEs',
   'Stokes, Gauss, Laplace, heat, and wave equations', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'math53'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Parametric Equations and Polar Coordinates
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'parametric-polar'
CROSS JOIN (VALUES
  (0,  'parametric equations',
       'A pair of equations x = f(t), y = g(t) that describe a curve by giving both coordinates as functions of a parameter t.'),
  (1,  'parameter',
       'An auxiliary variable used to describe a curve or surface; it is not itself a coordinate on the graph.'),
  (2,  'orientation of a parametric curve',
       'The direction the point (x(t), y(t)) travels as t increases.'),
  (3,  'dy/dx for a parametric curve',
       '(dy/dt) / (dx/dt), provided dx/dt is not 0. Differentiates y with respect to x without eliminating t.'),
  (4,  'second derivative of a parametric curve',
       'd/dt(dy/dx) divided by dx/dt. It is not (d^2 y/dt^2) / (d^2 x/dt^2).'),
  (5,  'arc length of a parametric curve',
       'The integral from a to b of sqrt((dx/dt)^2 + (dy/dt)^2) dt, when the curve is traversed once as t runs from a to b.'),
  (6,  'polar coordinates',
       'A point in the plane given by (r, theta), where r is the directed distance from the origin and theta is the angle from the positive x-axis.'),
  (7,  'polar-to-Cartesian',
       'x = r cos(theta), y = r sin(theta). Conversely r^2 = x^2 + y^2 and tan(theta) = y/x, with quadrant care.'),
  (8,  'polar curve',
       'A graph r = f(theta) in the plane. The same point can have many polar names, such as (r, theta) and (-r, theta + pi).'),
  (9,  'cardioid',
       'A polar curve r = a(1 ± cos(theta)) or r = a(1 ± sin(theta)); a heart-shaped limaçon that passes through the origin.'),
  (10, 'limaçon',
       'A polar curve r = a ± b cos(theta) or r = a ± b sin(theta). The relative size of a and b decides whether it has an inner loop, a dimple, or is convex.'),
  (11, 'rose curve',
       'A polar curve r = a cos(n theta) or r = a sin(n theta). It has n petals if n is odd and 2n petals if n is even.'),
  (12, 'area in polar coordinates',
       '(1/2) times the integral of [f(theta)]^2 d(theta) between two rays, the area swept by r = f(theta).'),
  (13, 'arc length in polar coordinates',
       'The integral of sqrt(r^2 + (dr/d(theta))^2) d(theta) along a polar curve r = f(theta).'),
  (14, 'tangent at the pole',
       'Occurs when r = 0 and dr/d(theta) is not 0; the tangent is the ray along that value of theta.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 2. Vectors and Geometry of Space
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'vectors'
CROSS JOIN (VALUES
  (0,  'three-dimensional coordinates',
       'A point given by an ordered triple (x, y, z) relative to three mutually perpendicular axes.'),
  (1,  'distance in 3D',
       'The distance between (x1, y1, z1) and (x2, y2, z2) is sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2).'),
  (2,  'sphere',
       'The set of points at a fixed distance r from a center (h, k, l): (x-h)^2 + (y-k)^2 + (z-l)^2 = r^2.'),
  (3,  'vector',
       'A quantity with magnitude and direction, represented by an arrow or by components. Two vectors are equal when they have the same components.'),
  (4,  'magnitude',
       'The length of a vector a = (a1, a2, a3), written abs(a) = sqrt(a1^2 + a2^2 + a3^2).'),
  (5,  'unit vector',
       'A vector of length 1. The unit vector in the direction of a nonzero a is a / abs(a).'),
  (6,  'standard basis',
       'The unit vectors i = (1,0,0), j = (0,1,0), k = (0,0,1). Every vector in 3-space is a1 i + a2 j + a3 k.'),
  (7,  'dot product',
       'a · b = a1 b1 + a2 b2 + a3 b3, also equal to abs(a) abs(b) cos(theta). It is 0 exactly when the vectors are orthogonal (or one is 0).'),
  (8,  'orthogonal vectors',
       'Two vectors whose dot product is 0; they meet at a right angle.'),
  (9,  'vector projection',
       'The vector ((a · b) / abs(a)^2) a, the piece of b parallel to a. Its signed length is the scalar projection (a · b) / abs(a).'),
  (10, 'cross product',
       'a × b is the vector of magnitude abs(a) abs(b) sin(theta), perpendicular to both and oriented by the right-hand rule. In components it is the formal determinant with i, j, k in the first row.'),
  (11, 'scalar triple product',
       'a · (b × c), the signed volume of the parallelepiped spanned by a, b, and c. It is 0 exactly when the three vectors are coplanar.'),
  (12, 'parametric equations of a line',
       'A line through a point r0 in the direction of v is r(t) = r0 + t v, or x = x0 + a t, y = y0 + b t, z = z0 + c t.'),
  (13, 'equation of a plane',
       'A plane through a point with position r0 and normal n satisfies n · (r - r0) = 0, or ax + by + cz = d.'),
  (14, 'quadric surface',
       'A surface given by a second-degree equation in x, y, z: ellipsoids, paraboloids, hyperboloids, cones, and cylinders.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 3. Vector Functions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'vector-functions'
CROSS JOIN (VALUES
  (0,  'vector function',
       'A function r(t) = (x(t), y(t), z(t)) whose values are vectors. Its graph is a space curve.'),
  (1,  'space curve',
       'The set of points with position vector r(t) as t varies; a path in 3-space.'),
  (2,  'limit of a vector function',
       'Computed componentwise: the limit of r(t) is (lim x(t), lim y(t), lim z(t)) when each component limit exists.'),
  (3,  'derivative of a vector function',
       'r''(t) = (x''(t), y''(t), z''(t)), the tangent vector to the curve, provided the components are differentiable.'),
  (4,  'unit tangent vector',
       'T(t) = r''(t) / abs(r''(t)), the unit vector in the direction of motion.'),
  (5,  'integral of a vector function',
       'Integrated componentwise: integral r(t) dt = (integral x, integral y, integral z) plus a constant vector.'),
  (6,  'arc length of a space curve',
       'The integral from a to b of abs(r''(t)) dt, equal to the integral of sqrt((x'')^2 + (y'')^2 + (z'')^2) dt.'),
  (7,  'arc-length parameter',
       'A parameter s that measures distance along the curve from a base point, so abs(r''(s)) = 1.'),
  (8,  'curvature',
       'kappa = abs(T''(s)) = abs(r'' × r'''') / abs(r'')^3, measuring how sharply the curve bends.'),
  (9,  'unit normal vector',
       'N = T'' / abs(T''), the unit vector pointing toward the concave side of the curve (the principal unit normal).'),
  (10, 'binormal vector',
       'B = T × N, a unit vector perpendicular to the osculating plane.'),
  (11, 'osculating plane',
       'The plane through a point of a curve spanned by T and N; the plane that best fits the curve there.'),
  (12, 'torsion',
       'A measure of how the curve twists out of the osculating plane, computed from the scalar triple product of the first three derivatives of r.'),
  (13, 'velocity',
       'v(t) = r''(t), the derivative of position. Speed is abs(v).'),
  (14, 'acceleration',
       'a(t) = v''(t) = r''''(t). It decomposes as a_T T + a_N N, a tangential piece and a normal piece.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 4. Partial Derivatives
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'partials'
CROSS JOIN (VALUES
  (0,  'function of several variables',
       'A rule f(x,y) or f(x,y,z) that assigns a number to each point of a domain in the plane or in space.'),
  (1,  'domain of f(x,y)',
       'The set of (x,y) for which f is defined, typically a region in the plane.'),
  (2,  'level curve',
       'The set of points (x,y) where f(x,y) = c, a horizontal slice of the graph z = f(x,y).'),
  (3,  'level surface',
       'The set of points (x,y,z) where f(x,y,z) = c, used to visualize a function of three variables.'),
  (4,  'limit of f(x,y)',
       'L is the limit as (x,y) approaches (a,b) if f(x,y) approaches L along every path. If two paths give different values, the limit does not exist.'),
  (5,  'continuity of f(x,y)',
       'f is continuous at (a,b) if the limit exists and equals f(a,b). Rational functions are continuous on their domains.'),
  (6,  'partial derivative',
       'f_x is the derivative of f treating y as constant; f_y treats x as constant. Geometrically they are slopes of traces of the graph.'),
  (7,  'Clairaut''s theorem',
       'If the second partials f_xy and f_yx are continuous, then f_xy = f_yx. Mixed partials agree.'),
  (8,  'tangent plane',
       'The plane z - z0 = f_x(x0,y0)(x-x0) + f_y(x0,y0)(y-y0) that best approximates the surface z = f(x,y) near (x0,y0).'),
  (9,  'linear approximation',
       'The function L(x,y) = f(a,b) + f_x(a,b)(x-a) + f_y(a,b)(y-b), the first-order Taylor approximation to f.'),
  (10, 'total differential',
       'df = f_x dx + f_y dy, the linear estimate of the change in f.'),
  (11, 'chain rule (one parameter)',
       'If z = f(x,y) and x, y are functions of t, then dz/dt = f_x dx/dt + f_y dy/dt.'),
  (12, 'chain rule (two parameters)',
       'If z = f(x,y) and x, y depend on s and t, then z_s = f_x x_s + f_y y_s, and likewise for z_t.'),
  (13, 'implicit differentiation (two variables)',
       'If F(x,y) = 0 defines y as a function of x, then dy/dx = -F_x / F_y, provided F_y is not 0.'),
  (14, 'implicit differentiation (three variables)',
       'If F(x,y,z) = 0 defines z as a function of x and y, then z_x = -F_x / F_z and z_y = -F_y / F_z.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 5. Gradient, Extrema, and Lagrange
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'gradient-extrema'
CROSS JOIN (VALUES
  (0,  'directional derivative',
       'The rate of change of f at a point in the direction of a unit vector u: D_u f = grad f · u.'),
  (1,  'gradient',
       'The vector grad f = (f_x, f_y) or (f_x, f_y, f_z). It points in the direction of steepest increase, and its magnitude is that maximal rate.'),
  (2,  'steepest ascent',
       'The direction of the gradient. The directional derivative is largest when u is the unit vector along grad f.'),
  (3,  'gradient and level curves',
       'grad f is orthogonal to the level curve (or level surface) of f through that point.'),
  (4,  'tangent plane to a level surface',
       'For F(x,y,z) = c, the plane grad F · (x-x0, y-y0, z-z0) = 0, using the gradient as a normal.'),
  (5,  'critical point',
       'A point where both f_x and f_y are 0, or a partial fails to exist. Candidates for local extrema of a differentiable f.'),
  (6,  'second derivative test',
       'Let D = f_xx f_yy - (f_xy)^2. At a critical point: D greater than 0 and f_xx greater than 0 is a local min; D greater than 0 and f_xx less than 0 is a local max; D less than 0 is a saddle; D = 0 is inconclusive.'),
  (7,  'Hessian discriminant',
       'D = f_xx f_yy - (f_xy)^2, the determinant of the Hessian matrix of second partials, used in the second derivative test.'),
  (8,  'saddle point',
       'A critical point that is a min along one line and a max along another. The second derivative test reports this when D is less than 0.'),
  (9,  'absolute extrema on a closed region',
       'They occur at critical points in the interior or on the boundary. Check both, then compare values.'),
  (10, 'Lagrange multiplier',
       'A method to extremize f subject to g = c: solve grad f = lambda grad g together with the constraint.'),
  (11, 'Lagrange condition',
       'At a constrained extremum (with grad g not 0), the gradients of f and g are parallel, so the level sets are tangent.'),
  (12, 'two constraints',
       'Extremize f subject to g = c and h = d by solving grad f = lambda grad g + mu grad h together with the two constraints.'),
  (13, 'local maximum',
       'A point where f(x,y) is at least as large as f at all nearby points.'),
  (14, 'closed bounded set',
       'A set that contains its boundary and fits inside a large disk. A continuous function on such a set attains its absolute max and min.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 6. Double Integrals
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'double-integrals'
CROSS JOIN (VALUES
  (0,  'double integral over a rectangle',
       'The integral of f over a rectangle R is the signed volume under z = f(x,y), defined as a limit of Riemann sums.'),
  (1,  'Fubini''s theorem',
       'For a continuous f on a rectangle, the double integral equals either iterated integral: integrate dy then dx, or dx then dy.'),
  (2,  'iterated integral',
       'A nested single integral, inner then outer, used to evaluate a multiple integral one variable at a time.'),
  (3,  'Type I region',
       'A region described by x from a to b and, for each x, y from g1(x) to g2(x). Integrate dy first, then dx.'),
  (4,  'Type II region',
       'A region described by y from c to d and, for each y, x from h1(y) to h2(y). Integrate dx first, then dy.'),
  (5,  'changing order of integration',
       'Rewriting a Type I description as Type II (or the reverse) so the inner antiderivative is easier.'),
  (6,  'double integral in polar',
       'The integral of f(r cos(theta), r sin(theta)) times r dr d(theta). The extra r is the Jacobian of polar coordinates.'),
  (7,  'polar Jacobian',
       'The factor r in dA = r dr d(theta), coming from the area of a polar rectangle.'),
  (8,  'average value over a region',
       '(1 / area(D)) times the double integral of f over D.'),
  (9,  'mass from a density',
       'The double integral of a density rho(x,y) over a lamina D.'),
  (10, 'center of mass of a lamina',
       'x-bar = M_y / m and y-bar = M_x / m, where the moments are the integrals of x rho and y rho.'),
  (11, 'moment of inertia',
       'I_x = integral y^2 rho dA and I_y = integral x^2 rho dA, measuring resistance to rotation about an axis.'),
  (12, 'surface area of a graph',
       'The integral over D of sqrt(1 + (f_x)^2 + (f_y)^2) dA, the area of z = f(x,y) over D.'),
  (13, 'additivity of double integrals',
       'If D is split into nonoverlapping subregions, the integral over D is the sum of the integrals over the pieces. The integral is also linear in f.'),
  (14, 'volume as a double integral',
       'The volume under z = f(x,y) (with f nonnegative) over D is the double integral of f. Between two surfaces it is the integral of the difference.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 7. Triple Integrals and Change of Variables
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'triple-change'
CROSS JOIN (VALUES
  (0,  'triple integral',
       'The integral of f(x,y,z) over a solid E, a limit of Riemann sums in 3-space. If f = 1 it equals the volume of E.'),
  (1,  'iterated triple integral',
       'Evaluate by integrating one variable at a time, using the projection of E and the top and bottom surfaces.'),
  (2,  'mass of a solid',
       'The triple integral of a density rho(x,y,z) over E.'),
  (3,  'center of mass of a solid',
       'The weighted averages of x, y, and z with weight rho, each moment divided by the total mass.'),
  (4,  'cylindrical coordinates',
       '(r, theta, z) with x = r cos(theta), y = r sin(theta), z = z. The volume element is dV = r dr d(theta) dz.'),
  (5,  'spherical coordinates',
       '(rho, theta, phi) with x = rho sin(phi) cos(theta), y = rho sin(phi) sin(theta), z = rho cos(phi).'),
  (6,  'spherical volume element',
       'dV = rho^2 sin(phi) d(rho) d(phi) d(theta).'),
  (7,  'rho in spherical coordinates',
       'The distance from the origin to the point. A sphere centered at the origin is rho equal to a constant.'),
  (8,  'phi in spherical coordinates',
       'The angle down from the positive z-axis, running from 0 to pi.'),
  (9,  'theta in spherical coordinates',
       'The polar angle in the xy-plane, running from 0 to 2 pi. The same angle appears in cylindrical coordinates.'),
  (10, 'when to use cylindrical',
       'Integrals over cylinders, cones, or solids with circular symmetry about the z-axis.'),
  (11, 'when to use spherical',
       'Integrals over balls, spherical shells, or cones from the origin, especially when the integrand involves x^2 + y^2 + z^2.'),
  (12, 'change of variables',
       'In two variables, the integral of f(x,y) dA equals the integral of f(T(u,v)) times abs(J) du dv, where T maps the uv-region onto D.'),
  (13, 'Jacobian',
       'The determinant of the matrix of partials of x, y (or x, y, z) with respect to the new variables. Its absolute value scales area or volume.'),
  (14, 'Jacobian in 3D',
       'The determinant of the 3 by 3 matrix of partial derivatives of x, y, z with respect to u, v, w. Then dV = abs(J) du dv dw.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 8. Vector Fields and Line Integrals
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'vector-fields'
CROSS JOIN (VALUES
  (0,  'vector field',
       'A function F that assigns a vector to each point of a region. In the plane F = P i + Q j; in space F = P i + Q j + R k.'),
  (1,  'conservative field',
       'A vector field that is the gradient of some scalar potential f, so F = grad f.'),
  (2,  'potential function',
       'A scalar f with grad f = F. Level sets of f are orthogonal to the field.'),
  (3,  'closed curve',
       'A curve whose starting point and ending point coincide.'),
  (4,  'simple curve',
       'A curve that does not intersect itself, except possibly at the endpoints if it is closed.'),
  (5,  'line integral of a scalar',
       'The integral of f ds along C, an integral with respect to arc length. Used for the mass of a wire.'),
  (6,  'line integral of a vector field',
       'The integral of F · dr = integral P dx + Q dy + R dz along C, the work done by F moving along the path.'),
  (7,  'work',
       'The line integral of a force field along a path: W = integral_C F · T ds = integral_C F · dr.'),
  (8,  'fundamental theorem for line integrals',
       'If F = grad f, then the integral of F · dr from A to B equals f(B) - f(A), independent of path.'),
  (9,  'path independence',
       'The line integral of F from A to B depends only on the endpoints. On an open connected set this is equivalent to F being conservative.'),
  (10, 'test for a conservative field (plane)',
       'On a simply connected open set, F = (P, Q) is conservative if and only if P_y = Q_x.'),
  (11, 'test for a conservative field (space)',
       'On a simply connected open set, F is conservative if and only if curl F = 0.'),
  (12, 'simply connected',
       'An open set in which every closed curve can be shrunk to a point without leaving the set. The plane minus the origin is not simply connected.'),
  (13, 'finding a potential',
       'Integrate P with respect to x, add an unknown function of the remaining variables, then match Q and R by taking partials.'),
  (14, 'closed-path property',
       'F is conservative if and only if the line integral of F around every closed curve is 0.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 9. Green, Curl, and Divergence
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'green-curl'
CROSS JOIN (VALUES
  (0,  'Green''s theorem',
       'For a positively oriented, piecewise smooth, simple closed curve C enclosing D, the integral of P dx + Q dy around C equals the double integral over D of (Q_x - P_y) dA.'),
  (1,  'positive orientation',
       'The counterclockwise direction on a simple closed plane curve: the region D stays on the left as you traverse C.'),
  (2,  'curl',
       'curl F = grad × F, a vector measuring local rotation. In the plane its k-component is Q_x - P_y, the integrand of Green''s theorem.'),
  (3,  'divergence',
       'div F = grad · F = P_x + Q_y + R_z, a scalar measuring local expansion or flux density.'),
  (4,  'irrotational field',
       'A field with curl F = 0. On a simply connected region it is conservative.'),
  (5,  'incompressible field',
       'A field with div F = 0, also called source-free. A fluid with this velocity field has no local creation of mass.'),
  (6,  'vector form of Green''s theorem',
       'The integral of F · dr around C equals the double integral over D of (curl F) · k dA.'),
  (7,  'flux form of Green''s theorem',
       'The integral of F · n ds around C equals the double integral over D of div F dA: the two-dimensional divergence theorem.'),
  (8,  'Green''s theorem on a region with holes',
       'Integrate over the outer boundary counterclockwise and over each hole clockwise, so D stays on the left along every piece.'),
  (9,  'parametric surface',
       'A surface given by r(u,v) = (x(u,v), y(u,v), z(u,v)) as (u,v) ranges over a region in the parameter plane.'),
  (10, 'normal vector to a parametric surface',
       'r_u × r_v, perpendicular to the surface. The unit normal is that cross product divided by its length.'),
  (11, 'surface area of a parametric surface',
       'The double integral of abs(r_u × r_v) over the parameter domain.'),
  (12, 'graph as a parametric surface',
       'z = g(x,y) can be written r(x,y) = (x, y, g(x,y)), so r_x × r_y = (-g_x, -g_y, 1).'),
  (13, 'orientation of a surface',
       'A continuous choice of unit normal. A closed surface is positively oriented with the outward normal.'),
  (14, 'Möbius strip',
       'A one-sided surface that cannot be oriented: a consistent unit normal cannot be chosen.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

-- =====================================================================
-- 10. Stokes, Divergence Theorem, and PDEs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'stokes-div'
CROSS JOIN (VALUES
  (0,  'surface integral of a scalar',
       'The integral of f dS, using dS = abs(r_u × r_v) dA: the integral of f with respect to surface area.'),
  (1,  'flux',
       'The surface integral of F · dS = the integral of F · (r_u × r_v) dA, the flow of F through the surface.'),
  (2,  'Stokes'' theorem',
       'The integral of F · dr around C equals the surface integral of curl F · dS, where C is the oriented boundary of the surface S.'),
  (3,  'consistent orientation (Stokes)',
       'The right-hand rule: if the fingers curl along C, the thumb points in the direction of the surface normal.'),
  (4,  'Stokes reduces to Green',
       'When S is a flat region in the xy-plane with normal k, Stokes'' theorem becomes Green''s theorem.'),
  (5,  'divergence theorem',
       'The flux of F through a closed surface equals the triple integral of div F over the solid inside.'),
  (6,  'Gauss''s theorem',
       'Another name for the divergence theorem.'),
  (7,  'using the divergence theorem',
       'Convert a closed-surface flux into a volume integral of divergence, or close an open surface by adding a lid and subtracting.'),
  (8,  'using Stokes'' theorem',
       'Convert a line integral around a boundary into a flux of curl, or replace the surface by a simpler one with the same boundary.'),
  (9,  'partial differential equation',
       'An equation involving an unknown function of several variables and its partial derivatives.'),
  (10, 'Laplace''s equation',
       'u_xx + u_yy + u_zz = 0. Satisfied by the potential of an incompressible irrotational field, and by steady-state temperature.'),
  (11, 'harmonic function',
       'A solution of Laplace''s equation. The potential of a field that is both curl-free and divergence-free is harmonic.'),
  (12, 'heat equation',
       'u_t = k (u_xx + u_yy + u_zz), the PDE modeling temperature flow by conduction.'),
  (13, 'wave equation',
       'u_tt = c^2 (u_xx + u_yy + u_zz), the PDE modeling vibrating strings, membranes, or sound.'),
  (14, 'separation of variables',
       'A method for PDEs: assume a product solution X(x)T(t), convert the PDE into ODEs, and superpose solutions to match boundary data.')
) AS c(pos, front, back)
WHERE d.slug = 'math53';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'math53';
