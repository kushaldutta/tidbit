-- Migration 015: Seed AP categories + starter tidbits (10 per course, term + definition).
-- Run after 014-ap-catalog-wiring.sql.
-- Requires generate_tidbit_id(tidbit_text, cat_id) already installed in Supabase.
-- Safe to re-run: ON CONFLICT (id) DO NOTHING on tidbits.
-- After running, flip contentLive: true per course in src/config/courseCatalog.js.

-- ── AP categories ────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, description, sort_order) VALUES
  ('ap-calc-ab', 'AP Calculus AB', 'Limits, derivatives, integrals, and the Fundamental Theorem of Calculus', 100),
  ('ap-calc-bc', 'AP Calculus BC', 'Series, parametric equations, polar coordinates, and advanced integration', 101),
  ('ap-stats', 'AP Statistics', 'Data analysis, probability, inference, and experimental design', 102),
  ('ap-csa', 'AP Computer Science A', 'Java programming, algorithms, and object-oriented design', 103),
  ('ap-csp', 'AP Computer Science Principles', 'Computing concepts, data, algorithms, and the internet', 104),
  ('ap-chem', 'AP Chemistry', 'Atomic structure, bonding, thermodynamics, and chemical reactions', 105),
  ('ap-bio', 'AP Biology', 'Cells, genetics, evolution, ecology, and biological systems', 106),
  ('ap-phys1', 'AP Physics 1', 'Algebra-based mechanics, waves, and introductory physics', 107),
  ('ap-phys2', 'AP Physics 2', 'Fluid mechanics, thermodynamics, optics, and modern physics', 108),
  ('ap-phys-c-m', 'AP Physics C: Mechanics', 'Calculus-based kinematics, forces, energy, and rotation', 109),
  ('ap-phys-c-e', 'AP Physics C: E&M', 'Calculus-based electrostatics, circuits, and magnetism', 110),
  ('ap-ush', 'AP US History', 'American history from pre-Columbian societies to the present', 111),
  ('ap-world', 'AP World History', 'Global history from 1200 CE to the present', 112),
  ('ap-euro', 'AP European History', 'European history from 1450 to the present', 113),
  ('ap-gov', 'AP US Government', 'Constitutional foundations, institutions, and political participation', 114),
  ('ap-macro', 'AP Macroeconomics', 'National income, inflation, unemployment, and fiscal policy', 115),
  ('ap-micro', 'AP Microeconomics', 'Supply and demand, market structures, and factor markets', 116),
  ('ap-psych', 'AP Psychology', 'Biological bases, cognition, development, and social psychology', 117),
  ('ap-lang', 'AP English Language', 'Rhetorical analysis, argument, and synthesis writing', 118),
  ('ap-lit', 'AP English Literature', 'Literary analysis, poetry, and prose interpretation', 119),
  ('ap-spanish', 'AP Spanish Language', 'Interpersonal, interpretive, and presentational communication in Spanish', 120),
  ('ap-hug', 'AP Human Geography', 'Population, culture, political organization, and land use', 121),
  ('ap-enviro', 'AP Environmental Science', 'Ecosystems, biodiversity, pollution, and sustainability', 122),
  ('ap-art-hist', 'AP Art History', 'Global art traditions, visual analysis, and historical context', 123)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- =====================
-- AP Calculus AB
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('The value that f(x) approaches as x approaches a point (or infinity), which may differ from f(a).', 'ap-calc-ab'), 'ap-calc-ab', 'Limit', 'The value that f(x) approaches as x approaches a point (or infinity), which may differ from f(a).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The instantaneous rate of change of a function, defined as the limit of the difference quotient.', 'ap-calc-ab'), 'ap-calc-ab', 'Derivative', 'The instantaneous rate of change of a function, defined as the limit of the difference quotient.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('If f(x) = x^n, then f''(x) = n·x^(n−1) for any real exponent n.', 'ap-calc-ab'), 'ap-calc-ab', 'Power Rule', 'If f(x) = x^n, then f''(x) = n·x^(n−1) for any real exponent n.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The derivative of a composite function f(g(x)) equals f''(g(x))·g''(x).', 'ap-calc-ab'), 'ap-calc-ab', 'Chain Rule', 'The derivative of a composite function f(g(x)) equals f''(g(x))·g''(x).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The derivative of u·v equals u''v + uv''.', 'ap-calc-ab'), 'ap-calc-ab', 'Product Rule', 'The derivative of u·v equals u''v + uv''.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A point where f''(x) = 0 or f'' is undefined; candidates for local maxima or minima.', 'ap-calc-ab'), 'ap-calc-ab', 'Critical Point', 'A point where f''(x) = 0 or f'' is undefined; candidates for local maxima or minima.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('An approximation of a definite integral by summing areas of rectangles under a curve.', 'ap-calc-ab'), 'ap-calc-ab', 'Riemann Sum', 'An approximation of a definite integral by summing areas of rectangles under a curve.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Links differentiation and integration: if F'' = f, then ∫ₐᵇ f(x) dx = F(b) − F(a).', 'ap-calc-ab'), 'ap-calc-ab', 'Fundamental Theorem of Calculus', 'Links differentiation and integration: if F'' = f, then ∫ₐᵇ f(x) dx = F(b) − F(a).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('If f is continuous on [a,b] and differentiable on (a,b), some c satisfies f''(c) = (f(b)−f(a))/(b−a).', 'ap-calc-ab'), 'ap-calc-ab', 'Mean Value Theorem', 'If f is continuous on [a,b] and differentiable on (a,b), some c satisfies f''(c) = (f(b)−f(a))/(b−a).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('When a limit has indeterminate form 0/0 or ∞/∞, it may equal the limit of the ratio of derivatives.', 'ap-calc-ab'), 'ap-calc-ab', 'L''Hôpital''s Rule', 'When a limit has indeterminate form 0/0 or ∞/∞, it may equal the limit of the ratio of derivatives.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Calculus BC
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Σ ar^n converges to a/(1−r) when |r| < 1; diverges otherwise.', 'ap-calc-bc'), 'ap-calc-bc', 'Geometric Series', 'Σ ar^n converges to a/(1−r) when |r| < 1; diverges otherwise.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A power series centered at a that approximates f(x) using derivatives at a.', 'ap-calc-bc'), 'ap-calc-bc', 'Taylor Series', 'A power series centered at a that approximates f(x) using derivatives at a.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('For Σ aₙ, if lim |aₙ₊₁/aₙ| < 1 the series converges absolutely; if > 1 it diverges.', 'ap-calc-bc'), 'ap-calc-bc', 'Ratio Test', 'For Σ aₙ, if lim |aₙ₊₁/aₙ| < 1 the series converges absolutely; if > 1 it diverges.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A curve defined by x = f(t) and y = g(t) with parameter t.', 'ap-calc-bc'), 'ap-calc-bc', 'Parametric Curve', 'A curve defined by x = f(t) and y = g(t) with parameter t.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A point is given by (r, θ) where r is distance from the origin and θ is the angle from the positive x-axis.', 'ap-calc-bc'), 'ap-calc-bc', 'Polar Coordinates', 'A point is given by (r, θ) where r is distance from the origin and θ is the angle from the positive x-axis.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Length = ∫ √((dx/dt)² + (dy/dt)²) dt over the interval.', 'ap-calc-bc'), 'ap-calc-bc', 'Arc Length (Parametric)', 'Length = ∫ √((dx/dt)² + (dy/dt)²) dt over the interval.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('∫ u dv = uv − ∫ v du; choose u using LIATE (Log, Inverse trig, Algebraic, Trig, Exponential).', 'ap-calc-bc'), 'ap-calc-bc', 'Integration by Parts', '∫ u dv = uv − ∫ v du; choose u using LIATE (Log, Inverse trig, Algebraic, Trig, Exponential).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Decomposes a rational integrand into simpler fractions for easier integration.', 'ap-calc-bc'), 'ap-calc-bc', 'Partial Fractions', 'Decomposes a rational integrand into simpler fractions for easier integration.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Numerically approximates solutions to dy/dx = f(x,y) using small steps Δx.', 'ap-calc-bc'), 'ap-calc-bc', 'Euler''s Method', 'Numerically approximates solutions to dy/dx = f(x,y) using small steps Δx.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('An integral with an infinite limit or an integrand that is unbounded at an endpoint.', 'ap-calc-bc'), 'ap-calc-bc', 'Improper Integral', 'An integral with an infinite limit or an integrand that is unbounded at an endpoint.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Statistics
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('A population is the entire group of interest; a sample is a subset used to estimate population parameters.', 'ap-stats'), 'ap-stats', 'Population vs. Sample', 'A population is the entire group of interest; a sample is a subset used to estimate population parameters.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Every member of the population has an equal chance of being selected, reducing bias.', 'ap-stats'), 'ap-stats', 'Random Sample', 'Every member of the population has an equal chance of being selected, reducing bias.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Measures typical distance of data values from the mean; larger σ means more spread.', 'ap-stats'), 'ap-stats', 'Standard Deviation', 'Measures typical distance of data values from the mean; larger σ means more spread.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A symmetric bell-shaped curve defined by mean μ and standard deviation σ.', 'ap-stats'), 'ap-stats', 'Normal Distribution', 'A symmetric bell-shaped curve defined by mean μ and standard deviation σ.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('z = (x − μ)/σ tells how many standard deviations a value is from the mean.', 'ap-stats'), 'ap-stats', 'Z-Score', 'z = (x − μ)/σ tells how many standard deviations a value is from the mean.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A range of plausible values for a parameter, computed from sample data with a stated confidence level.', 'ap-stats'), 'ap-stats', 'Confidence Interval', 'A range of plausible values for a parameter, computed from sample data with a stated confidence level.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The probability of observing data at least as extreme as the sample, assuming the null hypothesis is true.', 'ap-stats'), 'ap-stats', 'P-Value', 'The probability of observing data at least as extreme as the sample, assuming the null hypothesis is true.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Rejecting a true null hypothesis (false positive).', 'ap-stats'), 'ap-stats', 'Type I Error', 'Rejecting a true null hypothesis (false positive).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Failing to reject a false null hypothesis (false negative).', 'ap-stats'), 'ap-stats', 'Type II Error', 'Failing to reject a false null hypothesis (false negative).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Strong correlation does not prove that changes in one variable cause changes in another.', 'ap-stats'), 'ap-stats', 'Correlation vs. Causation', 'Strong correlation does not prove that changes in one variable cause changes in another.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Computer Science A
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('A blueprint for objects that defines fields (state) and methods (behavior).', 'ap-csa'), 'ap-csa', 'Class', 'A blueprint for objects that defines fields (state) and methods (behavior).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('An instance of a class with its own values for the class''s fields.', 'ap-csa'), 'ap-csa', 'Object', 'An instance of a class with its own values for the class''s fields.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Bundling data and methods while hiding internal details behind a public interface.', 'ap-csa'), 'ap-csa', 'Encapsulation', 'Bundling data and methods while hiding internal details behind a public interface.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A subclass extends a superclass to reuse code and specialize behavior.', 'ap-csa'), 'ap-csa', 'Inheritance', 'A subclass extends a superclass to reuse code and specialize behavior.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A reference can point to objects of different classes and call the appropriate overridden method.', 'ap-csa'), 'ap-csa', 'Polymorphism', 'A reference can point to objects of different classes and call the appropriate overridden method.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A resizable array implementation of the List interface in Java.', 'ap-csa'), 'ap-csa', 'ArrayList', 'A resizable array implementation of the List interface in Java.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A method that calls itself with a smaller or simpler input until a base case is reached.', 'ap-csa'), 'ap-csa', 'Recursion', 'A method that calls itself with a smaller or simpler input until a base case is reached.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Describes how runtime or space grows with input size n (e.g., O(n), O(n log n)).', 'ap-csa'), 'ap-csa', 'Big-O Notation', 'Describes how runtime or space grows with input size n (e.g., O(n), O(n log n)).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A contract listing method signatures that implementing classes must provide.', 'ap-csa'), 'ap-csa', 'Interface', 'A contract listing method signatures that implementing classes must provide.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Belongs to the class itself rather than any instance; called as ClassName.method().', 'ap-csa'), 'ap-csa', 'Static Method', 'Belongs to the class itself rather than any instance; called as ClassName.method().', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Computer Science Principles
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('A step-by-step procedure for solving a problem or completing a task.', 'ap-csp'), 'ap-csp', 'Algorithm', 'A step-by-step procedure for solving a problem or completing a task.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Hiding complexity by focusing on essential features while ignoring lower-level details.', 'ap-csp'), 'ap-csp', 'Abstraction', 'Hiding complexity by focusing on essential features while ignoring lower-level details.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Base-2 number system using only 0 and 1; the foundation of digital data representation.', 'ap-csp'), 'ap-csp', 'Binary', 'Base-2 number system using only 0 and 1; the foundation of digital data representation.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Reduces file size without losing any original information (e.g., PNG, ZIP).', 'ap-csp'), 'ap-csp', 'Lossless Compression', 'Reduces file size without losing any original information (e.g., PNG, ZIP).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Removes some data to shrink files, often acceptable for images and audio (e.g., JPEG, MP3).', 'ap-csp'), 'ap-csp', 'Lossy Compression', 'Removes some data to shrink files, often acceptable for images and audio (e.g., JPEG, MP3).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A numeric label assigned to each device on a network for routing packets.', 'ap-csp'), 'ap-csp', 'IP Address', 'A numeric label assigned to each device on a network for routing packets.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The Domain Name System translates human-readable domain names into IP addresses.', 'ap-csp'), 'ap-csp', 'DNS', 'The Domain Name System translates human-readable domain names into IP addresses.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Hypertext Transfer Protocol defines how clients request and servers deliver web resources.', 'ap-csp'), 'ap-csp', 'HTTP', 'Hypertext Transfer Protocol defines how clients request and servers deliver web resources.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Multiple processors work on parts of a problem simultaneously to reduce total time.', 'ap-csp'), 'ap-csp', 'Parallel Computing', 'Multiple processors work on parts of a problem simultaneously to reduce total time.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Unequal access to computing devices, connectivity, and digital literacy across groups.', 'ap-csp'), 'ap-csp', 'Digital Divide', 'Unequal access to computing devices, connectivity, and digital literacy across groups.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Chemistry
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('6.022 × 10²³ particles (Avogadro''s number); the SI unit for amount of substance.', 'ap-chem'), 'ap-chem', 'Mole', '6.022 × 10²³ particles (Avogadro''s number); the SI unit for amount of substance.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Attraction between oppositely charged ions formed by electron transfer between atoms.', 'ap-chem'), 'ap-chem', 'Ionic Bond', 'Attraction between oppositely charged ions formed by electron transfer between atoms.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Electrons are shared between atoms to achieve more stable electron configurations.', 'ap-chem'), 'ap-chem', 'Covalent Bond', 'Electrons are shared between atoms to achieve more stable electron configurations.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('An atom''s ability to attract shared electrons in a bond; increases across a period.', 'ap-chem'), 'ap-chem', 'Electronegativity', 'An atom''s ability to attract shared electrons in a bond; increases across a period.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Predicts molecular geometry from repulsion between valence electron pairs around a central atom.', 'ap-chem'), 'ap-chem', 'VSEPR Theory', 'Predicts molecular geometry from repulsion between valence electron pairs around a central atom.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Releases heat to the surroundings; ΔH is negative.', 'ap-chem'), 'ap-chem', 'Exothermic Reaction', 'Releases heat to the surroundings; ΔH is negative.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Absorbs heat from the surroundings; ΔH is positive.', 'ap-chem'), 'ap-chem', 'Endothermic Reaction', 'Absorbs heat from the surroundings; ΔH is positive.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A system at equilibrium shifts to partially counteract an applied stress (concentration, pressure, temperature).', 'ap-chem'), 'ap-chem', 'Le Châtelier''s Principle', 'A system at equilibrium shifts to partially counteract an applied stress (concentration, pressure, temperature).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Loss of electrons; oxidation number increases.', 'ap-chem'), 'ap-chem', 'Oxidation', 'Loss of electrons; oxidation number increases.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Gain of electrons; oxidation number decreases (OIL RIG: Oxidation Is Loss, Reduction Is Gain).', 'ap-chem'), 'ap-chem', 'Reduction', 'Gain of electrons; oxidation number decreases (OIL RIG: Oxidation Is Loss, Reduction Is Gain).', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Biology
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('All living things are made of cells; cells are the basic unit of life; cells come from pre-existing cells.', 'ap-bio'), 'ap-bio', 'Cell Theory', 'All living things are made of cells; cells are the basic unit of life; cells come from pre-existing cells.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Organelles that produce ATP through cellular respiration; often called the powerhouse of the cell.', 'ap-bio'), 'ap-bio', 'Mitochondria', 'Organelles that produce ATP through cellular respiration; often called the powerhouse of the cell.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Plants convert light energy, CO₂, and water into glucose and O₂ in chloroplasts.', 'ap-bio'), 'ap-bio', 'Photosynthesis', 'Plants convert light energy, CO₂, and water into glucose and O₂ in chloroplasts.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Double-stranded nucleic acid storing genetic information as a sequence of A, T, C, and G bases.', 'ap-bio'), 'ap-bio', 'DNA', 'Double-stranded nucleic acid storing genetic information as a sequence of A, T, C, and G bases.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Information flows DNA → RNA → protein (transcription then translation).', 'ap-bio'), 'ap-bio', 'Central Dogma', 'Information flows DNA → RNA → protein (transcription then translation).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Individuals with advantageous heritable traits survive and reproduce more, changing allele frequencies over time.', 'ap-bio'), 'ap-bio', 'Natural Selection', 'Individuals with advantageous heritable traits survive and reproduce more, changing allele frequencies over time.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Allele frequencies stay constant in a population with no mutation, migration, selection, or drift.', 'ap-bio'), 'ap-bio', 'Hardy-Weinberg Equilibrium', 'Allele frequencies stay constant in a population with no mutation, migration, selection, or drift.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A biological catalyst that lowers activation energy and speeds up specific chemical reactions.', 'ap-bio'), 'ap-bio', 'Enzyme', 'A biological catalyst that lowers activation energy and speeds up specific chemical reactions.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Maintenance of stable internal conditions despite external changes.', 'ap-bio'), 'ap-bio', 'Homeostasis', 'Maintenance of stable internal conditions despite external changes.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A network of feeding relationships showing energy and matter flow through an ecosystem.', 'ap-bio'), 'ap-bio', 'Food Web', 'A network of feeding relationships showing energy and matter flow through an ecosystem.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Physics 1
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('The change in position of an object; a vector with magnitude and direction.', 'ap-phys1'), 'ap-phys1', 'Displacement', 'The change in position of an object; a vector with magnitude and direction.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The rate of change of displacement with respect to time; a vector quantity.', 'ap-phys1'), 'ap-phys1', 'Velocity', 'The rate of change of displacement with respect to time; a vector quantity.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The rate of change of velocity; can result from changing speed or direction.', 'ap-phys1'), 'ap-phys1', 'Acceleration', 'The rate of change of velocity; can result from changing speed or direction.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('An object remains at rest or in uniform motion unless acted on by a net external force.', 'ap-phys1'), 'ap-phys1', 'Newton''s First Law', 'An object remains at rest or in uniform motion unless acted on by a net external force.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Net force equals mass times acceleration: ΣF = ma.', 'ap-phys1'), 'ap-phys1', 'Newton''s Second Law', 'Net force equals mass times acceleration: ΣF = ma.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('For every action force there is an equal and opposite reaction force on a different object.', 'ap-phys1'), 'ap-phys1', 'Newton''s Third Law', 'For every action force there is an equal and opposite reaction force on a different object.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Work = F·d·cos θ; energy transferred when a force moves an object through a displacement.', 'ap-phys1'), 'ap-phys1', 'Work', 'Work = F·d·cos θ; energy transferred when a force moves an object through a displacement.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('KE = ½mv²; energy of motion.', 'ap-phys1'), 'ap-phys1', 'Kinetic Energy', 'KE = ½mv²; energy of motion.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('In an isolated system, total energy (including heat and work) remains constant.', 'ap-phys1'), 'ap-phys1', 'Conservation of Energy', 'In an isolated system, total energy (including heat and work) remains constant.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Periodic motion where restoring force is proportional to displacement (e.g., mass on a spring).', 'ap-phys1'), 'ap-phys1', 'Simple Harmonic Motion', 'Periodic motion where restoring force is proportional to displacement (e.g., mass on a spring).', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Physics 2
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Force per unit area (P = F/A); fluids exert pressure in all directions.', 'ap-phys2'), 'ap-phys2', 'Pressure', 'Force per unit area (P = F/A); fluids exert pressure in all directions.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The upward force on an object submerged in fluid, equal to the weight of displaced fluid.', 'ap-phys2'), 'ap-phys2', 'Buoyant Force', 'The upward force on an object submerged in fluid, equal to the weight of displaced fluid.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('PV = nRT relates pressure, volume, moles, and temperature for an ideal gas.', 'ap-phys2'), 'ap-phys2', 'Ideal Gas Law', 'PV = nRT relates pressure, volume, moles, and temperature for an ideal gas.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('ΔU = Q − W: change in internal energy equals heat added minus work done by the system.', 'ap-phys2'), 'ap-phys2', 'First Law of Thermodynamics', 'ΔU = Q − W: change in internal energy equals heat added minus work done by the system.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A measure of energy dispersal or disorder; total entropy of an isolated system tends to increase.', 'ap-phys2'), 'ap-phys2', 'Entropy', 'A measure of energy dispersal or disorder; total entropy of an isolated system tends to increase.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('n₁ sin θ₁ = n₂ sin θ₂ describes refraction of light at a boundary between media.', 'ap-phys2'), 'ap-phys2', 'Snell''s Law', 'n₁ sin θ₁ = n₂ sin θ₂ describes refraction of light at a boundary between media.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Constructive interference increases amplitude; destructive interference decreases it.', 'ap-phys2'), 'ap-phys2', 'Wave Interference', 'Constructive interference increases amplitude; destructive interference decreases it.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Light ejects electrons from a metal only above a threshold frequency, supporting photon model.', 'ap-phys2'), 'ap-phys2', 'Photoelectric Effect', 'Light ejects electrons from a metal only above a threshold frequency, supporting photon model.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The time for half of a radioactive sample to decay; constant for each isotope.', 'ap-phys2'), 'ap-phys2', 'Half-Life', 'The time for half of a radioactive sample to decay; constant for each isotope.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A closed path for current; resistors in series add; resistors in parallel reduce equivalent resistance.', 'ap-phys2'), 'ap-phys2', 'Electric Circuit', 'A closed path for current; resistors in series add; resistors in parallel reduce equivalent resistance.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Physics C: Mechanics
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Velocity is the derivative of position; acceleration is the derivative of velocity.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Calculus in Kinematics', 'Velocity is the derivative of position; acceleration is the derivative of velocity.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Impulse = ∫F dt = Δp; equal to the change in momentum of an object.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Impulse', 'Impulse = ∫F dt = Δp; equal to the change in momentum of an object.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('p = mv; conserved in an isolated system with no external net force.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Momentum', 'p = mv; conserved in an isolated system with no external net force.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('ω = dθ/dt; rate of change of angular position in radians per second.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Angular Velocity', 'ω = dθ/dt; rate of change of angular position in radians per second.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('τ = r × F; rotational analog of force that causes angular acceleration.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Torque', 'τ = r × F; rotational analog of force that causes angular acceleration.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Rotational analog of mass; depends on mass distribution relative to the axis of rotation.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Moment of Inertia', 'Rotational analog of mass; depends on mass distribution relative to the axis of rotation.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('KE_rot = ½Iω² for a rigid body rotating about a fixed axis.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Rotational Kinetic Energy', 'KE_rot = ½Iω² for a rigid body rotating about a fixed axis.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The point where the entire mass of a system can be considered concentrated for translational motion.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Center of Mass', 'The point where the entire mass of a system can be considered concentrated for translational motion.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Work done is path-independent; potential energy can be defined (gravity, spring force).', 'ap-phys-c-m'), 'ap-phys-c-m', 'Conservative Force', 'Work done is path-independent; potential energy can be defined (gravity, spring force).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The contact point has zero velocity; v_cm = ωR links linear and angular motion.', 'ap-phys-c-m'), 'ap-phys-c-m', 'Rolling Without Slipping', 'The contact point has zero velocity; v_cm = ωR links linear and angular motion.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Physics C: E&M
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('F = k|q₁q₂|/r² gives the electrostatic force between two point charges.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Coulomb''s Law', 'F = k|q₁q₂|/r² gives the electrostatic force between two point charges.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('E = F/q; the force per unit positive test charge at a point in space.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Electric Field', 'E = F/q; the force per unit positive test charge at a point in space.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The net electric flux through a closed surface equals enclosed charge divided by ε₀.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Gauss''s Law', 'The net electric flux through a closed surface equals enclosed charge divided by ε₀.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Potential energy per unit charge; voltage is the difference in potential between two points.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Electric Potential', 'Potential energy per unit charge; voltage is the difference in potential between two points.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('C = Q/V stores charge per volt; energy stored U = ½CV².', 'ap-phys-c-e'), 'ap-phys-c-e', 'Capacitance', 'C = Q/V stores charge per volt; energy stored U = ½CV².', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('I = dQ/dt; rate of charge flow through a conductor, measured in amperes.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Current', 'I = dQ/dt; rate of charge flow through a conductor, measured in amperes.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('V = IR relates voltage, current, and resistance in many conductors.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Ohm''s Law', 'V = IR relates voltage, current, and resistance in many conductors.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The sum of voltage changes around any closed loop in a circuit equals zero.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Kirchhoff''s Loop Rule', 'The sum of voltage changes around any closed loop in a circuit equals zero.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('F = qv × B; a moving charge experiences force perpendicular to v and B.', 'ap-phys-c-e'), 'ap-phys-c-e', 'Magnetic Force on Charge', 'F = qv × B; a moving charge experiences force perpendicular to v and B.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A changing magnetic flux through a loop induces an emf that opposes the change (Lenz''s law).', 'ap-phys-c-e'), 'ap-phys-c-e', 'Faraday''s Law', 'A changing magnetic flux through a loop induces an emf that opposes the change (Lenz''s law).', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP US History
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Transfer of plants, animals, diseases, and culture between the Americas and Afro-Eurasia after 1492.', 'ap-ush'), 'ap-ush', 'Columbian Exchange', 'Transfer of plants, animals, diseases, and culture between the Americas and Afro-Eurasia after 1492.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('18th-century religious revivals that emphasized personal faith and challenged established authority.', 'ap-ush'), 'ap-ush', 'Great Awakening', '18th-century religious revivals that emphasized personal faith and challenged established authority.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1776 document asserting natural rights and listing grievances against King George III.', 'ap-ush'), 'ap-ush', 'Declaration of Independence', '1776 document asserting natural rights and listing grievances against King George III.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1787 framework establishing federal government with separation of powers and checks and balances.', 'ap-ush'), 'ap-ush', 'Constitution', '1787 framework establishing federal government with separation of powers and checks and balances.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('19th-century belief that US expansion across North America was justified and inevitable.', 'ap-ush'), 'ap-ush', 'Manifest Destiny', '19th-century belief that US expansion across North America was justified and inevitable.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1863 executive order freeing enslaved people in Confederate-held territory during the Civil War.', 'ap-ush'), 'ap-ush', 'Emancipation Proclamation', '1863 executive order freeing enslaved people in Confederate-held territory during the Civil War.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1865–1877 period of rebuilding the South and defining rights for formerly enslaved people.', 'ap-ush'), 'ap-ush', 'Reconstruction', '1865–1877 period of rebuilding the South and defining rights for formerly enslaved people.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Late 19th–early 20th century reform movement targeting corruption, monopolies, and social conditions.', 'ap-ush'), 'ap-ush', 'Progressive Era', 'Late 19th–early 20th century reform movement targeting corruption, monopolies, and social conditions.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('FDR''s programs (1930s) to combat the Great Depression through relief, recovery, and reform.', 'ap-ush'), 'ap-ush', 'New Deal', 'FDR''s programs (1930s) to combat the Great Depression through relief, recovery, and reform.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1950s–1960s struggle to end legal segregation and secure voting and equal protection for Black Americans.', 'ap-ush'), 'ap-ush', 'Civil Rights Movement', '1950s–1960s struggle to end legal segregation and secure voting and equal protection for Black Americans.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP World History
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Network of trade routes connecting East Asia, Central Asia, the Middle East, and Europe c. 1200–1450.', 'ap-world'), 'ap-world', 'Silk Roads', 'Network of trade routes connecting East Asia, Central Asia, the Middle East, and Europe c. 1200–1450.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Largest contiguous land empire in history; facilitated trade and cultural exchange across Eurasia.', 'ap-world'), 'ap-world', 'Mongol Empire', 'Largest contiguous land empire in history; facilitated trade and cultural exchange across Eurasia.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Global transfer of crops, livestock, and diseases after European contact with the Americas.', 'ap-world'), 'ap-world', 'Columbian Exchange', 'Global transfer of crops, livestock, and diseases after European contact with the Americas.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Forced migration of millions of Africans to the Americas, shaping economies and societies.', 'ap-world'), 'ap-world', 'Transatlantic Slave Trade', 'Forced migration of millions of Africans to the Americas, shaping economies and societies.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Shift from hand production to machine manufacturing, beginning in Britain in the late 18th century.', 'ap-world'), 'ap-world', 'Industrial Revolution', 'Shift from hand production to machine manufacturing, beginning in Britain in the late 18th century.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Extension of a nation''s power over other territories, often through colonization and economic control.', 'ap-world'), 'ap-world', 'Imperialism', 'Extension of a nation''s power over other territories, often through colonization and economic control.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1914–1918 global conflict fueled by nationalism, alliances, and militarism; reshaped the world order.', 'ap-world'), 'ap-world', 'World War I', '1914–1918 global conflict fueled by nationalism, alliances, and militarism; reshaped the world order.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Mid-20th-century wave of independence movements ending European colonial rule in Asia and Africa.', 'ap-world'), 'ap-world', 'Decolonization', 'Mid-20th-century wave of independence movements ending European colonial rule in Asia and Africa.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1947–1991 geopolitical rivalry between the US and USSR without direct large-scale warfare between them.', 'ap-world'), 'ap-world', 'Cold War', '1947–1991 geopolitical rivalry between the US and USSR without direct large-scale warfare between them.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Increasing interconnectedness of economies, cultures, and communication across national borders.', 'ap-world'), 'ap-world', 'Globalization', 'Increasing interconnectedness of economies, cultures, and communication across national borders.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP European History
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Cultural rebirth in Italy c. 1400–1600 emphasizing humanism, classical learning, and individual achievement.', 'ap-euro'), 'ap-euro', 'Renaissance', 'Cultural rebirth in Italy c. 1400–1600 emphasizing humanism, classical learning, and individual achievement.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('16th-century religious movement challenging Catholic Church authority, led by Luther and others.', 'ap-euro'), 'ap-euro', 'Protestant Reformation', '16th-century religious movement challenging Catholic Church authority, led by Luther and others.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('16th–17th century shift to empirical observation and mathematical reasoning in understanding nature.', 'ap-euro'), 'ap-euro', 'Scientific Revolution', '16th–17th century shift to empirical observation and mathematical reasoning in understanding nature.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('18th-century intellectual movement stressing reason, individual rights, and skepticism of tradition.', 'ap-euro'), 'ap-euro', 'Enlightenment', '18th-century intellectual movement stressing reason, individual rights, and skepticism of tradition.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1789–1799 upheaval that ended the monarchy and spread ideas of liberty, equality, and nationalism.', 'ap-euro'), 'ap-euro', 'French Revolution', '1789–1799 upheaval that ended the monarchy and spread ideas of liberty, equality, and nationalism.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1814–1815 settlement that restored conservative order in Europe after Napoleon''s defeat.', 'ap-euro'), 'ap-euro', 'Congress of Vienna', '1814–1815 settlement that restored conservative order in Europe after Napoleon''s defeat.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Mechanization of production in Britain spread across Europe, transforming work and urban life.', 'ap-euro'), 'ap-euro', 'Industrialization', 'Mechanization of production in Britain spread across Europe, transforming work and urban life.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Total war that destroyed empires, killed millions, and set conditions for fascism and WWII.', 'ap-euro'), 'ap-euro', 'World War I', 'Total war that destroyed empires, killed millions, and set conditions for fascism and WWII.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Nazi genocide of six million Jews and millions of others during World War II.', 'ap-euro'), 'ap-euro', 'Holocaust', 'Nazi genocide of six million Jews and millions of others during World War II.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Post-WWII integration project promoting economic cooperation and political unity among member states.', 'ap-euro'), 'ap-euro', 'European Union', 'Post-WWII integration project promoting economic cooperation and political unity among member states.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP US Government
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Legislative, executive, and judicial branches share authority to prevent any one from dominating.', 'ap-gov'), 'ap-gov', 'Separation of Powers', 'Legislative, executive, and judicial branches share authority to prevent any one from dominating.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Each branch can limit the others (e.g., veto, judicial review, confirmation).', 'ap-gov'), 'ap-gov', 'Checks and Balances', 'Each branch can limit the others (e.g., veto, judicial review, confirmation).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Power is divided between the national government and state governments.', 'ap-gov'), 'ap-gov', 'Federalism', 'Power is divided between the national government and state governments.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('First ten amendments protecting individual liberties such as speech, religion, and due process.', 'ap-gov'), 'ap-gov', 'Bill of Rights', 'First ten amendments protecting individual liberties such as speech, religion, and due process.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('1803 case establishing judicial review—the power of courts to strike down unconstitutional laws.', 'ap-gov'), 'ap-gov', 'Marbury v. Madison', '1803 case establishing judicial review—the power of courts to strike down unconstitutional laws.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Indirect system for electing the president using state-by-state electoral votes.', 'ap-gov'), 'ap-gov', 'Electoral College', 'Indirect system for electing the president using state-by-state electoral votes.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Informal alliance among a congressional committee, a bureaucratic agency, and an interest group.', 'ap-gov'), 'ap-gov', 'Iron Triangle', 'Informal alliance among a congressional committee, a bureaucratic agency, and an interest group.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Theory that competition among interest groups produces broadly representative policy outcomes.', 'ap-gov'), 'ap-gov', 'Pluralism', 'Theory that competition among interest groups produces broadly representative policy outcomes.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Officeholders often win reelection due to name recognition, resources, and casework.', 'ap-gov'), 'ap-gov', 'Incumbent Advantage', 'Officeholders often win reelection due to name recognition, resources, and casework.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Liberties protect freedom from government; rights protect equal treatment and participation.', 'ap-gov'), 'ap-gov', 'Civil Liberties vs. Civil Rights', 'Liberties protect freedom from government; rights protect equal treatment and participation.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Macroeconomics
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Gross Domestic Product measures the total market value of final goods and services produced in a country in a year.', 'ap-macro'), 'ap-macro', 'GDP', 'Gross Domestic Product measures the total market value of final goods and services produced in a country in a year.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A significant decline in economic activity spread across the economy, lasting more than a few months.', 'ap-macro'), 'ap-macro', 'Recession', 'A significant decline in economic activity spread across the economy, lasting more than a few months.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Percentage of the labor force that is jobless and actively seeking work.', 'ap-macro'), 'ap-macro', 'Unemployment Rate', 'Percentage of the labor force that is jobless and actively seeking work.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A sustained rise in the overall price level, reducing purchasing power of money.', 'ap-macro'), 'ap-macro', 'Inflation', 'A sustained rise in the overall price level, reducing purchasing power of money.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Total spending on domestic goods and services: C + I + G + (X − M).', 'ap-macro'), 'ap-macro', 'Aggregate Demand', 'Total spending on domestic goods and services: C + I + G + (X − M).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Government use of spending and taxation to influence the economy.', 'ap-macro'), 'ap-macro', 'Fiscal Policy', 'Government use of spending and taxation to influence the economy.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Central bank actions (interest rates, money supply) to promote stable prices and employment.', 'ap-macro'), 'ap-macro', 'Monetary Policy', 'Central bank actions (interest rates, money supply) to promote stable prices and employment.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('An initial change in spending leads to a larger change in national income.', 'ap-macro'), 'ap-macro', 'Multiplier Effect', 'An initial change in spending leads to a larger change in national income.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Short-run inverse relationship between unemployment and inflation (trade-off).', 'ap-macro'), 'ap-macro', 'Phillips Curve', 'Short-run inverse relationship between unemployment and inflation (trade-off).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Countries gain from trade by specializing in goods they produce at lower opportunity cost.', 'ap-macro'), 'ap-macro', 'Comparative Advantage', 'Countries gain from trade by specializing in goods they produce at lower opportunity cost.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Microeconomics
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Limited resources relative to unlimited wants force choices about allocation.', 'ap-micro'), 'ap-micro', 'Scarcity', 'Limited resources relative to unlimited wants force choices about allocation.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The value of the next-best alternative forgone when making a decision.', 'ap-micro'), 'ap-micro', 'Opportunity Cost', 'The value of the next-best alternative forgone when making a decision.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('As price rises, quantity demanded falls, ceteris paribus.', 'ap-micro'), 'ap-micro', 'Law of Demand', 'As price rises, quantity demanded falls, ceteris paribus.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('As price rises, quantity supplied increases, ceteris paribus.', 'ap-micro'), 'ap-micro', 'Law of Supply', 'As price rises, quantity supplied increases, ceteris paribus.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The price and quantity where quantity demanded equals quantity supplied.', 'ap-micro'), 'ap-micro', 'Equilibrium', 'The price and quantity where quantity demanded equals quantity supplied.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Measures responsiveness of quantity demanded to a change in price.', 'ap-micro'), 'ap-micro', 'Price Elasticity of Demand', 'Measures responsiveness of quantity demanded to a change in price.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Additional satisfaction from consuming one more unit of a good.', 'ap-micro'), 'ap-micro', 'Marginal Utility', 'Additional satisfaction from consuming one more unit of a good.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Adding more of one input while holding others fixed eventually yields smaller increases in output.', 'ap-micro'), 'ap-micro', 'Diminishing Marginal Returns', 'Adding more of one input while holding others fixed eventually yields smaller increases in output.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Many firms sell identical products; no single seller can influence market price.', 'ap-micro'), 'ap-micro', 'Perfect Competition', 'Many firms sell identical products; no single seller can influence market price.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A single seller dominates the market with significant barriers to entry.', 'ap-micro'), 'ap-micro', 'Monopoly', 'A single seller dominates the market with significant barriers to entry.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Psychology
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('A nerve cell that transmits information via electrical impulses and chemical neurotransmitters.', 'ap-psych'), 'ap-psych', 'Neuron', 'A nerve cell that transmits information via electrical impulses and chemical neurotransmitters.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The junction between neurons where neurotransmitters carry signals across a small gap.', 'ap-psych'), 'ap-psych', 'Synapse', 'The junction between neurons where neurotransmitters carry signals across a small gap.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Learning through association (Pavlov): neutral stimulus paired with unconditioned stimulus.', 'ap-psych'), 'ap-psych', 'Classical Conditioning', 'Learning through association (Pavlov): neutral stimulus paired with unconditioned stimulus.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Learning through consequences (Skinner): behavior shaped by reinforcement and punishment.', 'ap-psych'), 'ap-psych', 'Operant Conditioning', 'Learning through consequences (Skinner): behavior shaped by reinforcement and punishment.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Short-term system for temporarily holding and manipulating information (Baddeley''s model).', 'ap-psych'), 'ap-psych', 'Working Memory', 'Short-term system for temporarily holding and manipulating information (Baddeley''s model).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Strengthening of synapses with repeated use; a neural basis for learning and memory.', 'ap-psych'), 'ap-psych', 'Long-Term Potentiation', 'Strengthening of synapses with repeated use; a neural basis for learning and memory.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Bowlby''s idea that early bonds with caregivers shape emotional development and relationships.', 'ap-psych'), 'ap-psych', 'Attachment Theory', 'Bowlby''s idea that early bonds with caregivers shape emotional development and relationships.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Debate over relative influence of genetics versus environment on behavior and traits.', 'ap-psych'), 'ap-psych', 'Nature vs. Nurture', 'Debate over relative influence of genetics versus environment on behavior and traits.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Adjusting behavior or beliefs to match a group (Asch line experiments).', 'ap-psych'), 'ap-psych', 'Conformity', 'Adjusting behavior or beliefs to match a group (Asch line experiments).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Overemphasizing personality and underemphasizing situation when explaining others'' behavior.', 'ap-psych'), 'ap-psych', 'Fundamental Attribution Error', 'Overemphasizing personality and underemphasizing situation when explaining others'' behavior.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP English Language
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('The art of effective or persuasive speaking and writing.', 'ap-lang'), 'ap-lang', 'Rhetoric', 'The art of effective or persuasive speaking and writing.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Appeal to credibility or character of the speaker or writer.', 'ap-lang'), 'ap-lang', 'Ethos', 'Appeal to credibility or character of the speaker or writer.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Appeal to emotion to persuade an audience.', 'ap-lang'), 'ap-lang', 'Pathos', 'Appeal to emotion to persuade an audience.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Appeal to logic, evidence, and reasoning.', 'ap-lang'), 'ap-lang', 'Logos', 'Appeal to logic, evidence, and reasoning.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A clear, defensible claim that answers the prompt and guides the essay.', 'ap-lang'), 'ap-lang', 'Thesis', 'A clear, defensible claim that answers the prompt and guides the essay.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The author''s attitude toward the subject, conveyed through word choice and style.', 'ap-lang'), 'ap-lang', 'Tone', 'The author''s attitude toward the subject, conveyed through word choice and style.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Word choice; specific words create connotation and affect meaning.', 'ap-lang'), 'ap-lang', 'Diction', 'Word choice; specific words create connotation and affect meaning.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Sentence structure; length and arrangement affect rhythm, emphasis, and clarity.', 'ap-lang'), 'ap-lang', 'Syntax', 'Sentence structure; length and arrangement affect rhythm, emphasis, and clarity.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Repetition of a word or phrase at the beginning of successive clauses for emphasis.', 'ap-lang'), 'ap-lang', 'Anaphora', 'Repetition of a word or phrase at the beginning of successive clauses for emphasis.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Combining ideas from multiple sources into a coherent argument with your own voice.', 'ap-lang'), 'ap-lang', 'Synthesis', 'Combining ideas from multiple sources into a coherent argument with your own voice.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP English Literature
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('The central idea or underlying message explored in a literary work.', 'ap-lit'), 'ap-lit', 'Theme', 'The central idea or underlying message explored in a literary work.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A recurring element (image, symbol, or idea) that develops theme.', 'ap-lit'), 'ap-lit', 'Motif', 'A recurring element (image, symbol, or idea) that develops theme.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Use of an object, person, or event to represent abstract ideas beyond literal meaning.', 'ap-lit'), 'ap-lit', 'Symbolism', 'Use of an object, person, or event to represent abstract ideas beyond literal meaning.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Descriptive language appealing to the senses to create vivid mental pictures.', 'ap-lit'), 'ap-lit', 'Imagery', 'Descriptive language appealing to the senses to create vivid mental pictures.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A direct comparison between two unlike things without using like or as.', 'ap-lit'), 'ap-lit', 'Metaphor', 'A direct comparison between two unlike things without using like or as.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Giving human qualities to non-human things.', 'ap-lit'), 'ap-lit', 'Personification', 'Giving human qualities to non-human things.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Hints or clues about events that will occur later in the narrative.', 'ap-lit'), 'ap-lit', 'Foreshadowing', 'Hints or clues about events that will occur later in the narrative.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The audience knows something characters do not, creating tension or humor.', 'ap-lit'), 'ap-lit', 'Dramatic Irony', 'The audience knows something characters do not, creating tension or humor.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Poetry without regular meter or rhyme scheme.', 'ap-lit'), 'ap-lit', 'Free Verse', 'Poetry without regular meter or rhyme scheme.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The voice telling the story; reliability and perspective shape interpretation.', 'ap-lit'), 'ap-lit', 'Narrator', 'The voice telling the story; reliability and perspective shape interpretation.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Spanish Language
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Used for doubts, wishes, emotions, and hypothetical situations (e.g., espero que vengas).', 'ap-spanish'), 'ap-spanish', 'Subjunctive Mood', 'Used for doubts, wishes, emotions, and hypothetical situations (e.g., espero que vengas).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Preterite for completed past actions; imperfect for ongoing or habitual past actions.', 'ap-spanish'), 'ap-spanish', 'Preterite vs. Imperfect', 'Preterite for completed past actions; imperfect for ongoing or habitual past actions.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Ser for permanent traits and identity; estar for location and temporary states.', 'ap-spanish'), 'ap-spanish', 'Ser vs. Estar', 'Ser for permanent traits and identity; estar for location and temporary states.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Por indicates reason, duration, or exchange; para indicates purpose, destination, or deadline.', 'ap-spanish'), 'ap-spanish', 'Por vs. Para', 'Por indicates reason, duration, or exchange; para indicates purpose, destination, or deadline.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Replaces the noun receiving the action (lo, la, los, las) before conjugated verbs.', 'ap-spanish'), 'ap-spanish', 'Direct Object Pronoun', 'Replaces the noun receiving the action (lo, la, los, las) before conjugated verbs.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Verbs like querer, dudar, es importante que often require subjunctive in the dependent clause.', 'ap-spanish'), 'ap-spanish', 'Subjunctive Triggers', 'Verbs like querer, dudar, es importante que often require subjunctive in the dependent clause.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Tú is informal; usted shows respect in many Spanish-speaking cultures.', 'ap-spanish'), 'ap-spanish', 'Register (Tú vs. Usted)', 'Tú is informal; usted shows respect in many Spanish-speaking cultures.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A word similar in Spanish and English (e.g., información/information) but watch false friends.', 'ap-spanish'), 'ap-spanish', 'Cognate', 'A word similar in Spanish and English (e.g., información/information) but watch false friends.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Connectors like sin embargo, por lo tanto, and además improve coherence in essays.', 'ap-spanish'), 'ap-spanish', 'Transition Words', 'Connectors like sin embargo, por lo tanto, and además improve coherence in essays.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Language reflects culture; AP tasks assess understanding of products, practices, and perspectives.', 'ap-spanish'), 'ap-spanish', 'Cultural Perspective', 'Language reflects culture; AP tasks assess understanding of products, practices, and perspectives.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Human Geography
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('The statistical study of human populations: size, density, distribution, and change.', 'ap-hug'), 'ap-hug', 'Demography', 'The statistical study of human populations: size, density, distribution, and change.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Four-stage model linking birth/death rates to economic development and population growth.', 'ap-hug'), 'ap-hug', 'Demographic Transition Model', 'Four-stage model linking birth/death rates to economic development and population growth.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Push factors drive migration from an origin; pull factors attract migrants to a destination.', 'ap-hug'), 'ap-hug', 'Push and Pull Factors', 'Push factors drive migration from an origin; pull factors attract migrants to a destination.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A center where cultural traits originate and spread to other regions.', 'ap-hug'), 'ap-hug', 'Culture Hearth', 'A center where cultural traits originate and spread to other regions.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A group of related languages descended from a common ancestral language.', 'ap-hug'), 'ap-hug', 'Language Family', 'A group of related languages descended from a common ancestral language.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A nation is a group with shared identity; a state is a political unit with defined territory and sovereignty.', 'ap-hug'), 'ap-hug', 'Nation vs. State', 'A nation is a group with shared identity; a state is a political unit with defined territory and sovereignty.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Drawing electoral district boundaries to favor one political party.', 'ap-hug'), 'ap-hug', 'Gerrymandering', 'Drawing electoral district boundaries to favor one political party.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Factors that unify a state (shared language, nationalism, infrastructure).', 'ap-hug'), 'ap-hug', 'Centripetal Force', 'Factors that unify a state (shared language, nationalism, infrastructure).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Factors that divide a state (ethnic conflict, uneven development, devolution).', 'ap-hug'), 'ap-hug', 'Centrifugal Force', 'Factors that divide a state (ethnic conflict, uneven development, devolution).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Mid-20th-century spread of high-yield crops and agricultural technology, especially in developing countries.', 'ap-hug'), 'ap-hug', 'Green Revolution', 'Mid-20th-century spread of high-yield crops and agricultural technology, especially in developing countries.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Environmental Science
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('A community of organisms interacting with each other and their physical environment.', 'ap-enviro'), 'ap-enviro', 'Ecosystem', 'A community of organisms interacting with each other and their physical environment.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Variety of life at genetic, species, and ecosystem levels; supports resilience and ecosystem services.', 'ap-enviro'), 'ap-enviro', 'Biodiversity', 'Variety of life at genetic, species, and ecosystem levels; supports resilience and ecosystem services.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Linear sequence of who eats whom; energy is lost at each trophic level (~10% rule).', 'ap-enviro'), 'ap-enviro', 'Food Chain', 'Linear sequence of who eats whom; energy is lost at each trophic level (~10% rule).', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Maximum population size an environment can sustain indefinitely given available resources.', 'ap-enviro'), 'ap-enviro', 'Carrying Capacity', 'Maximum population size an environment can sustain indefinitely given available resources.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Individuals overuse shared resources because personal benefit exceeds personal cost of depletion.', 'ap-enviro'), 'ap-enviro', 'Tragedy of the Commons', 'Individuals overuse shared resources because personal benefit exceeds personal cost of depletion.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Atmospheric gases trap heat; enhanced by human emissions, driving global climate change.', 'ap-enviro'), 'ap-enviro', 'Greenhouse Effect', 'Atmospheric gases trap heat; enhanced by human emissions, driving global climate change.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Precipitation with low pH from sulfur and nitrogen oxides, harming ecosystems and structures.', 'ap-enviro'), 'ap-enviro', 'Acid Rain', 'Precipitation with low pH from sulfur and nitrogen oxides, harming ecosystems and structures.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Excess nutrients (often from fertilizer runoff) cause algal blooms and oxygen depletion in water.', 'ap-enviro'), 'ap-enviro', 'Eutrophication', 'Excess nutrients (often from fertilizer runoff) cause algal blooms and oxygen depletion in water.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Energy from sources replenished on human timescales: solar, wind, hydro, geothermal.', 'ap-enviro'), 'ap-enviro', 'Renewable Energy', 'Energy from sources replenished on human timescales: solar, wind, hydro, geothermal.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Meeting present needs without compromising future generations'' ability to meet theirs.', 'ap-enviro'), 'ap-enviro', 'Sustainability', 'Meeting present needs without compromising future generations'' ability to meet theirs.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- =====================
-- AP Art History
-- =====================
INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)
VALUES
(generate_tidbit_id('Examining visual elements—line, color, shape, space, texture—without relying on subject alone.', 'ap-art-hist'), 'ap-art-hist', 'Formal Analysis', 'Examining visual elements—line, color, shape, space, texture—without relying on subject alone.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The study of symbols and subject matter and their cultural meaning in artworks.', 'ap-art-hist'), 'ap-art-hist', 'Iconography', 'The study of symbols and subject matter and their cultural meaning in artworks.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Financial or political support of artists, which often shapes subject, style, and function.', 'ap-art-hist'), 'ap-art-hist', 'Patronage', 'Financial or political support of artists, which often shapes subject, style, and function.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Techniques (linear or atmospheric) creating the illusion of depth on a flat surface.', 'ap-art-hist'), 'ap-art-hist', 'Perspective', 'Techniques (linear or atmospheric) creating the illusion of depth on a flat surface.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('A naturalistic standing pose with weight shifted onto one leg, common in classical sculpture.', 'ap-art-hist'), 'ap-art-hist', 'Contrapposto', 'A naturalistic standing pose with weight shifted onto one leg, common in classical sculpture.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('17th-century style emphasizing drama, movement, rich color, and emotional intensity.', 'ap-art-hist'), 'ap-art-hist', 'Baroque', '17th-century style emphasizing drama, movement, rich color, and emotional intensity.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Late 19th-century movement capturing fleeting light and everyday scenes with visible brushwork.', 'ap-art-hist'), 'ap-art-hist', 'Impressionism', 'Late 19th-century movement capturing fleeting light and everyday scenes with visible brushwork.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Early 20th-century break from tradition; experimentation with abstraction and new materials.', 'ap-art-hist'), 'ap-art-hist', 'Modernism', 'Early 20th-century break from tradition; experimentation with abstraction and new materials.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('Interpreting art through historical, religious, political, and social circumstances of its creation.', 'ap-art-hist'), 'ap-art-hist', 'Contextual Analysis', 'Interpreting art through historical, religious, political, and social circumstances of its creation.', 'easy', '[]'::jsonb, NULL, true),

(generate_tidbit_id('The intended purpose of an artwork—worship, commemoration, propaganda, or personal expression.', 'ap-art-hist'), 'ap-art-hist', 'Function', 'The intended purpose of an artwork—worship, commemoration, propaganda, or personal expression.', 'easy', '[]'::jsonb, NULL, true)

ON CONFLICT (id) DO NOTHING;

-- ── Sync preset deck cards from tidbits (term → front, definition → back) ──
INSERT INTO public.cards (deck_id, front, back, card_type, position)
SELECT
  d.id,
  COALESCE(NULLIF(TRIM(t.term), ''), t.text),
  t.text,
  'basic',
  (ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY t.id)::integer - 1)
FROM public.tidbits t
JOIN public.decks d ON d.slug = t.category_id AND d.owner_id IS NULL
WHERE t.category_id LIKE 'ap-%'
  AND t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c WHERE c.deck_id = d.id AND c.back = t.text
  );
