/**
 * Generates server/migrations/015-ap-seed-tidbits.sql
 * Run: node server/scripts/generate-ap-tidbits-sql.js
 */

const fs = require('fs');
const path = require('path');

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function tidbitRow(categoryId, term, text) {
  const eText = esc(text);
  const eTerm = esc(term);
  const eCat = esc(categoryId);
  return `(generate_tidbit_id('${eText}', '${eCat}'), '${eCat}', '${eTerm}', '${eText}', 'easy', '[]'::jsonb, NULL, true)`;
}

const AP_COURSES = [
  {
    categoryId: 'ap-calc-ab',
    name: 'AP Calculus AB',
    description: 'Limits, derivatives, integrals, and the Fundamental Theorem of Calculus',
    tidbits: [
      ['Limit', 'The value that f(x) approaches as x approaches a point (or infinity), which may differ from f(a).'],
      ['Derivative', 'The instantaneous rate of change of a function, defined as the limit of the difference quotient.'],
      ['Power Rule', 'If f(x) = x^n, then f\'(x) = n·x^(n−1) for any real exponent n.'],
      ['Chain Rule', 'The derivative of a composite function f(g(x)) equals f\'(g(x))·g\'(x).'],
      ['Product Rule', 'The derivative of u·v equals u\'v + uv\'.'],
      ['Critical Point', 'A point where f\'(x) = 0 or f\' is undefined; candidates for local maxima or minima.'],
      ['Riemann Sum', 'An approximation of a definite integral by summing areas of rectangles under a curve.'],
      ['Fundamental Theorem of Calculus', 'Links differentiation and integration: if F\' = f, then ∫ₐᵇ f(x) dx = F(b) − F(a).'],
      ['Mean Value Theorem', 'If f is continuous on [a,b] and differentiable on (a,b), some c satisfies f\'(c) = (f(b)−f(a))/(b−a).'],
      ['L\'Hôpital\'s Rule', 'When a limit has indeterminate form 0/0 or ∞/∞, it may equal the limit of the ratio of derivatives.'],
    ],
  },
  {
    categoryId: 'ap-calc-bc',
    name: 'AP Calculus BC',
    description: 'Series, parametric equations, polar coordinates, and advanced integration',
    tidbits: [
      ['Geometric Series', 'Σ ar^n converges to a/(1−r) when |r| < 1; diverges otherwise.'],
      ['Taylor Series', 'A power series centered at a that approximates f(x) using derivatives at a.'],
      ['Ratio Test', 'For Σ aₙ, if lim |aₙ₊₁/aₙ| < 1 the series converges absolutely; if > 1 it diverges.'],
      ['Parametric Curve', 'A curve defined by x = f(t) and y = g(t) with parameter t.'],
      ['Polar Coordinates', 'A point is given by (r, θ) where r is distance from the origin and θ is the angle from the positive x-axis.'],
      ['Arc Length (Parametric)', 'Length = ∫ √((dx/dt)² + (dy/dt)²) dt over the interval.'],
      ['Integration by Parts', '∫ u dv = uv − ∫ v du; choose u using LIATE (Log, Inverse trig, Algebraic, Trig, Exponential).'],
      ['Partial Fractions', 'Decomposes a rational integrand into simpler fractions for easier integration.'],
      ['Euler\'s Method', 'Numerically approximates solutions to dy/dx = f(x,y) using small steps Δx.'],
      ['Improper Integral', 'An integral with an infinite limit or an integrand that is unbounded at an endpoint.'],
    ],
  },
  {
    categoryId: 'ap-stats',
    name: 'AP Statistics',
    description: 'Data analysis, probability, inference, and experimental design',
    tidbits: [
      ['Population vs. Sample', 'A population is the entire group of interest; a sample is a subset used to estimate population parameters.'],
      ['Random Sample', 'Every member of the population has an equal chance of being selected, reducing bias.'],
      ['Standard Deviation', 'Measures typical distance of data values from the mean; larger σ means more spread.'],
      ['Normal Distribution', 'A symmetric bell-shaped curve defined by mean μ and standard deviation σ.'],
      ['Z-Score', 'z = (x − μ)/σ tells how many standard deviations a value is from the mean.'],
      ['Confidence Interval', 'A range of plausible values for a parameter, computed from sample data with a stated confidence level.'],
      ['P-Value', 'The probability of observing data at least as extreme as the sample, assuming the null hypothesis is true.'],
      ['Type I Error', 'Rejecting a true null hypothesis (false positive).'],
      ['Type II Error', 'Failing to reject a false null hypothesis (false negative).'],
      ['Correlation vs. Causation', 'Strong correlation does not prove that changes in one variable cause changes in another.'],
    ],
  },
  {
    categoryId: 'ap-csa',
    name: 'AP Computer Science A',
    description: 'Java programming, algorithms, and object-oriented design',
    tidbits: [
      ['Class', 'A blueprint for objects that defines fields (state) and methods (behavior).'],
      ['Object', 'An instance of a class with its own values for the class\'s fields.'],
      ['Encapsulation', 'Bundling data and methods while hiding internal details behind a public interface.'],
      ['Inheritance', 'A subclass extends a superclass to reuse code and specialize behavior.'],
      ['Polymorphism', 'A reference can point to objects of different classes and call the appropriate overridden method.'],
      ['ArrayList', 'A resizable array implementation of the List interface in Java.'],
      ['Recursion', 'A method that calls itself with a smaller or simpler input until a base case is reached.'],
      ['Big-O Notation', 'Describes how runtime or space grows with input size n (e.g., O(n), O(n log n)).'],
      ['Interface', 'A contract listing method signatures that implementing classes must provide.'],
      ['Static Method', 'Belongs to the class itself rather than any instance; called as ClassName.method().'],
    ],
  },
  {
    categoryId: 'ap-csp',
    name: 'AP Computer Science Principles',
    description: 'Computing concepts, data, algorithms, and the internet',
    tidbits: [
      ['Algorithm', 'A step-by-step procedure for solving a problem or completing a task.'],
      ['Abstraction', 'Hiding complexity by focusing on essential features while ignoring lower-level details.'],
      ['Binary', 'Base-2 number system using only 0 and 1; the foundation of digital data representation.'],
      ['Lossless Compression', 'Reduces file size without losing any original information (e.g., PNG, ZIP).'],
      ['Lossy Compression', 'Removes some data to shrink files, often acceptable for images and audio (e.g., JPEG, MP3).'],
      ['IP Address', 'A numeric label assigned to each device on a network for routing packets.'],
      ['DNS', 'The Domain Name System translates human-readable domain names into IP addresses.'],
      ['HTTP', 'Hypertext Transfer Protocol defines how clients request and servers deliver web resources.'],
      ['Parallel Computing', 'Multiple processors work on parts of a problem simultaneously to reduce total time.'],
      ['Digital Divide', 'Unequal access to computing devices, connectivity, and digital literacy across groups.'],
    ],
  },
  {
    categoryId: 'ap-chem',
    name: 'AP Chemistry',
    description: 'Atomic structure, bonding, thermodynamics, and chemical reactions',
    tidbits: [
      ['Mole', '6.022 × 10²³ particles (Avogadro\'s number); the SI unit for amount of substance.'],
      ['Ionic Bond', 'Attraction between oppositely charged ions formed by electron transfer between atoms.'],
      ['Covalent Bond', 'Electrons are shared between atoms to achieve more stable electron configurations.'],
      ['Electronegativity', 'An atom\'s ability to attract shared electrons in a bond; increases across a period.'],
      ['VSEPR Theory', 'Predicts molecular geometry from repulsion between valence electron pairs around a central atom.'],
      ['Exothermic Reaction', 'Releases heat to the surroundings; ΔH is negative.'],
      ['Endothermic Reaction', 'Absorbs heat from the surroundings; ΔH is positive.'],
      ['Le Châtelier\'s Principle', 'A system at equilibrium shifts to partially counteract an applied stress (concentration, pressure, temperature).'],
      ['Oxidation', 'Loss of electrons; oxidation number increases.'],
      ['Reduction', 'Gain of electrons; oxidation number decreases (OIL RIG: Oxidation Is Loss, Reduction Is Gain).'],
    ],
  },
  {
    categoryId: 'ap-bio',
    name: 'AP Biology',
    description: 'Cells, genetics, evolution, ecology, and biological systems',
    tidbits: [
      ['Cell Theory', 'All living things are made of cells; cells are the basic unit of life; cells come from pre-existing cells.'],
      ['Mitochondria', 'Organelles that produce ATP through cellular respiration; often called the powerhouse of the cell.'],
      ['Photosynthesis', 'Plants convert light energy, CO₂, and water into glucose and O₂ in chloroplasts.'],
      ['DNA', 'Double-stranded nucleic acid storing genetic information as a sequence of A, T, C, and G bases.'],
      ['Central Dogma', 'Information flows DNA → RNA → protein (transcription then translation).'],
      ['Natural Selection', 'Individuals with advantageous heritable traits survive and reproduce more, changing allele frequencies over time.'],
      ['Hardy-Weinberg Equilibrium', 'Allele frequencies stay constant in a population with no mutation, migration, selection, or drift.'],
      ['Enzyme', 'A biological catalyst that lowers activation energy and speeds up specific chemical reactions.'],
      ['Homeostasis', 'Maintenance of stable internal conditions despite external changes.'],
      ['Food Web', 'A network of feeding relationships showing energy and matter flow through an ecosystem.'],
    ],
  },
  {
    categoryId: 'ap-phys1',
    name: 'AP Physics 1',
    description: 'Algebra-based mechanics, waves, and introductory physics',
    tidbits: [
      ['Displacement', 'The change in position of an object; a vector with magnitude and direction.'],
      ['Velocity', 'The rate of change of displacement with respect to time; a vector quantity.'],
      ['Acceleration', 'The rate of change of velocity; can result from changing speed or direction.'],
      ['Newton\'s First Law', 'An object remains at rest or in uniform motion unless acted on by a net external force.'],
      ['Newton\'s Second Law', 'Net force equals mass times acceleration: ΣF = ma.'],
      ['Newton\'s Third Law', 'For every action force there is an equal and opposite reaction force on a different object.'],
      ['Work', 'Work = F·d·cos θ; energy transferred when a force moves an object through a displacement.'],
      ['Kinetic Energy', 'KE = ½mv²; energy of motion.'],
      ['Conservation of Energy', 'In an isolated system, total energy (including heat and work) remains constant.'],
      ['Simple Harmonic Motion', 'Periodic motion where restoring force is proportional to displacement (e.g., mass on a spring).'],
    ],
  },
  {
    categoryId: 'ap-phys2',
    name: 'AP Physics 2',
    description: 'Fluid mechanics, thermodynamics, optics, and modern physics',
    tidbits: [
      ['Pressure', 'Force per unit area (P = F/A); fluids exert pressure in all directions.'],
      ['Buoyant Force', 'The upward force on an object submerged in fluid, equal to the weight of displaced fluid.'],
      ['Ideal Gas Law', 'PV = nRT relates pressure, volume, moles, and temperature for an ideal gas.'],
      ['First Law of Thermodynamics', 'ΔU = Q − W: change in internal energy equals heat added minus work done by the system.'],
      ['Entropy', 'A measure of energy dispersal or disorder; total entropy of an isolated system tends to increase.'],
      ['Snell\'s Law', 'n₁ sin θ₁ = n₂ sin θ₂ describes refraction of light at a boundary between media.'],
      ['Wave Interference', 'Constructive interference increases amplitude; destructive interference decreases it.'],
      ['Photoelectric Effect', 'Light ejects electrons from a metal only above a threshold frequency, supporting photon model.'],
      ['Half-Life', 'The time for half of a radioactive sample to decay; constant for each isotope.'],
      ['Electric Circuit', 'A closed path for current; resistors in series add; resistors in parallel reduce equivalent resistance.'],
    ],
  },
  {
    categoryId: 'ap-phys-c-m',
    name: 'AP Physics C: Mechanics',
    description: 'Calculus-based kinematics, forces, energy, and rotation',
    tidbits: [
      ['Calculus in Kinematics', 'Velocity is the derivative of position; acceleration is the derivative of velocity.'],
      ['Impulse', 'Impulse = ∫F dt = Δp; equal to the change in momentum of an object.'],
      ['Momentum', 'p = mv; conserved in an isolated system with no external net force.'],
      ['Angular Velocity', 'ω = dθ/dt; rate of change of angular position in radians per second.'],
      ['Torque', 'τ = r × F; rotational analog of force that causes angular acceleration.'],
      ['Moment of Inertia', 'Rotational analog of mass; depends on mass distribution relative to the axis of rotation.'],
      ['Rotational Kinetic Energy', 'KE_rot = ½Iω² for a rigid body rotating about a fixed axis.'],
      ['Center of Mass', 'The point where the entire mass of a system can be considered concentrated for translational motion.'],
      ['Conservative Force', 'Work done is path-independent; potential energy can be defined (gravity, spring force).'],
      ['Rolling Without Slipping', 'The contact point has zero velocity; v_cm = ωR links linear and angular motion.'],
    ],
  },
  {
    categoryId: 'ap-phys-c-e',
    name: 'AP Physics C: E&M',
    description: 'Calculus-based electrostatics, circuits, and magnetism',
    tidbits: [
      ['Coulomb\'s Law', 'F = k|q₁q₂|/r² gives the electrostatic force between two point charges.'],
      ['Electric Field', 'E = F/q; the force per unit positive test charge at a point in space.'],
      ['Gauss\'s Law', 'The net electric flux through a closed surface equals enclosed charge divided by ε₀.'],
      ['Electric Potential', 'Potential energy per unit charge; voltage is the difference in potential between two points.'],
      ['Capacitance', 'C = Q/V stores charge per volt; energy stored U = ½CV².'],
      ['Current', 'I = dQ/dt; rate of charge flow through a conductor, measured in amperes.'],
      ['Ohm\'s Law', 'V = IR relates voltage, current, and resistance in many conductors.'],
      ['Kirchhoff\'s Loop Rule', 'The sum of voltage changes around any closed loop in a circuit equals zero.'],
      ['Magnetic Force on Charge', 'F = qv × B; a moving charge experiences force perpendicular to v and B.'],
      ['Faraday\'s Law', 'A changing magnetic flux through a loop induces an emf that opposes the change (Lenz\'s law).'],
    ],
  },
  {
    categoryId: 'ap-ush',
    name: 'AP US History',
    description: 'American history from pre-Columbian societies to the present',
    tidbits: [
      ['Columbian Exchange', 'Transfer of plants, animals, diseases, and culture between the Americas and Afro-Eurasia after 1492.'],
      ['Great Awakening', '18th-century religious revivals that emphasized personal faith and challenged established authority.'],
      ['Declaration of Independence', '1776 document asserting natural rights and listing grievances against King George III.'],
      ['Constitution', '1787 framework establishing federal government with separation of powers and checks and balances.'],
      ['Manifest Destiny', '19th-century belief that US expansion across North America was justified and inevitable.'],
      ['Emancipation Proclamation', '1863 executive order freeing enslaved people in Confederate-held territory during the Civil War.'],
      ['Reconstruction', '1865–1877 period of rebuilding the South and defining rights for formerly enslaved people.'],
      ['Progressive Era', 'Late 19th–early 20th century reform movement targeting corruption, monopolies, and social conditions.'],
      ['New Deal', 'FDR\'s programs (1930s) to combat the Great Depression through relief, recovery, and reform.'],
      ['Civil Rights Movement', '1950s–1960s struggle to end legal segregation and secure voting and equal protection for Black Americans.'],
    ],
  },
  {
    categoryId: 'ap-world',
    name: 'AP World History',
    description: 'Global history from 1200 CE to the present',
    tidbits: [
      ['Silk Roads', 'Network of trade routes connecting East Asia, Central Asia, the Middle East, and Europe c. 1200–1450.'],
      ['Mongol Empire', 'Largest contiguous land empire in history; facilitated trade and cultural exchange across Eurasia.'],
      ['Columbian Exchange', 'Global transfer of crops, livestock, and diseases after European contact with the Americas.'],
      ['Transatlantic Slave Trade', 'Forced migration of millions of Africans to the Americas, shaping economies and societies.'],
      ['Industrial Revolution', 'Shift from hand production to machine manufacturing, beginning in Britain in the late 18th century.'],
      ['Imperialism', 'Extension of a nation\'s power over other territories, often through colonization and economic control.'],
      ['World War I', '1914–1918 global conflict fueled by nationalism, alliances, and militarism; reshaped the world order.'],
      ['Decolonization', 'Mid-20th-century wave of independence movements ending European colonial rule in Asia and Africa.'],
      ['Cold War', '1947–1991 geopolitical rivalry between the US and USSR without direct large-scale warfare between them.'],
      ['Globalization', 'Increasing interconnectedness of economies, cultures, and communication across national borders.'],
    ],
  },
  {
    categoryId: 'ap-euro',
    name: 'AP European History',
    description: 'European history from 1450 to the present',
    tidbits: [
      ['Renaissance', 'Cultural rebirth in Italy c. 1400–1600 emphasizing humanism, classical learning, and individual achievement.'],
      ['Protestant Reformation', '16th-century religious movement challenging Catholic Church authority, led by Luther and others.'],
      ['Scientific Revolution', '16th–17th century shift to empirical observation and mathematical reasoning in understanding nature.'],
      ['Enlightenment', '18th-century intellectual movement stressing reason, individual rights, and skepticism of tradition.'],
      ['French Revolution', '1789–1799 upheaval that ended the monarchy and spread ideas of liberty, equality, and nationalism.'],
      ['Congress of Vienna', '1814–1815 settlement that restored conservative order in Europe after Napoleon\'s defeat.'],
      ['Industrialization', 'Mechanization of production in Britain spread across Europe, transforming work and urban life.'],
      ['World War I', 'Total war that destroyed empires, killed millions, and set conditions for fascism and WWII.'],
      ['Holocaust', 'Nazi genocide of six million Jews and millions of others during World War II.'],
      ['European Union', 'Post-WWII integration project promoting economic cooperation and political unity among member states.'],
    ],
  },
  {
    categoryId: 'ap-gov',
    name: 'AP US Government',
    description: 'Constitutional foundations, institutions, and political participation',
    tidbits: [
      ['Separation of Powers', 'Legislative, executive, and judicial branches share authority to prevent any one from dominating.'],
      ['Checks and Balances', 'Each branch can limit the others (e.g., veto, judicial review, confirmation).'],
      ['Federalism', 'Power is divided between the national government and state governments.'],
      ['Bill of Rights', 'First ten amendments protecting individual liberties such as speech, religion, and due process.'],
      ['Marbury v. Madison', '1803 case establishing judicial review—the power of courts to strike down unconstitutional laws.'],
      ['Electoral College', 'Indirect system for electing the president using state-by-state electoral votes.'],
      ['Iron Triangle', 'Informal alliance among a congressional committee, a bureaucratic agency, and an interest group.'],
      ['Pluralism', 'Theory that competition among interest groups produces broadly representative policy outcomes.'],
      ['Incumbent Advantage', 'Officeholders often win reelection due to name recognition, resources, and casework.'],
      ['Civil Liberties vs. Civil Rights', 'Liberties protect freedom from government; rights protect equal treatment and participation.'],
    ],
  },
  {
    categoryId: 'ap-macro',
    name: 'AP Macroeconomics',
    description: 'National income, inflation, unemployment, and fiscal policy',
    tidbits: [
      ['GDP', 'Gross Domestic Product measures the total market value of final goods and services produced in a country in a year.'],
      ['Recession', 'A significant decline in economic activity spread across the economy, lasting more than a few months.'],
      ['Unemployment Rate', 'Percentage of the labor force that is jobless and actively seeking work.'],
      ['Inflation', 'A sustained rise in the overall price level, reducing purchasing power of money.'],
      ['Aggregate Demand', 'Total spending on domestic goods and services: C + I + G + (X − M).'],
      ['Fiscal Policy', 'Government use of spending and taxation to influence the economy.'],
      ['Monetary Policy', 'Central bank actions (interest rates, money supply) to promote stable prices and employment.'],
      ['Multiplier Effect', 'An initial change in spending leads to a larger change in national income.'],
      ['Phillips Curve', 'Short-run inverse relationship between unemployment and inflation (trade-off).'],
      ['Comparative Advantage', 'Countries gain from trade by specializing in goods they produce at lower opportunity cost.'],
    ],
  },
  {
    categoryId: 'ap-micro',
    name: 'AP Microeconomics',
    description: 'Supply and demand, market structures, and factor markets',
    tidbits: [
      ['Scarcity', 'Limited resources relative to unlimited wants force choices about allocation.'],
      ['Opportunity Cost', 'The value of the next-best alternative forgone when making a decision.'],
      ['Law of Demand', 'As price rises, quantity demanded falls, ceteris paribus.'],
      ['Law of Supply', 'As price rises, quantity supplied increases, ceteris paribus.'],
      ['Equilibrium', 'The price and quantity where quantity demanded equals quantity supplied.'],
      ['Price Elasticity of Demand', 'Measures responsiveness of quantity demanded to a change in price.'],
      ['Marginal Utility', 'Additional satisfaction from consuming one more unit of a good.'],
      ['Diminishing Marginal Returns', 'Adding more of one input while holding others fixed eventually yields smaller increases in output.'],
      ['Perfect Competition', 'Many firms sell identical products; no single seller can influence market price.'],
      ['Monopoly', 'A single seller dominates the market with significant barriers to entry.'],
    ],
  },
  {
    categoryId: 'ap-psych',
    name: 'AP Psychology',
    description: 'Biological bases, cognition, development, and social psychology',
    tidbits: [
      ['Neuron', 'A nerve cell that transmits information via electrical impulses and chemical neurotransmitters.'],
      ['Synapse', 'The junction between neurons where neurotransmitters carry signals across a small gap.'],
      ['Classical Conditioning', 'Learning through association (Pavlov): neutral stimulus paired with unconditioned stimulus.'],
      ['Operant Conditioning', 'Learning through consequences (Skinner): behavior shaped by reinforcement and punishment.'],
      ['Working Memory', 'Short-term system for temporarily holding and manipulating information (Baddeley\'s model).'],
      ['Long-Term Potentiation', 'Strengthening of synapses with repeated use; a neural basis for learning and memory.'],
      ['Attachment Theory', 'Bowlby\'s idea that early bonds with caregivers shape emotional development and relationships.'],
      ['Nature vs. Nurture', 'Debate over relative influence of genetics versus environment on behavior and traits.'],
      ['Conformity', 'Adjusting behavior or beliefs to match a group (Asch line experiments).'],
      ['Fundamental Attribution Error', 'Overemphasizing personality and underemphasizing situation when explaining others\' behavior.'],
    ],
  },
  {
    categoryId: 'ap-lang',
    name: 'AP English Language',
    description: 'Rhetorical analysis, argument, and synthesis writing',
    tidbits: [
      ['Rhetoric', 'The art of effective or persuasive speaking and writing.'],
      ['Ethos', 'Appeal to credibility or character of the speaker or writer.'],
      ['Pathos', 'Appeal to emotion to persuade an audience.'],
      ['Logos', 'Appeal to logic, evidence, and reasoning.'],
      ['Thesis', 'A clear, defensible claim that answers the prompt and guides the essay.'],
      ['Tone', 'The author\'s attitude toward the subject, conveyed through word choice and style.'],
      ['Diction', 'Word choice; specific words create connotation and affect meaning.'],
      ['Syntax', 'Sentence structure; length and arrangement affect rhythm, emphasis, and clarity.'],
      ['Anaphora', 'Repetition of a word or phrase at the beginning of successive clauses for emphasis.'],
      ['Synthesis', 'Combining ideas from multiple sources into a coherent argument with your own voice.'],
    ],
  },
  {
    categoryId: 'ap-lit',
    name: 'AP English Literature',
    description: 'Literary analysis, poetry, and prose interpretation',
    tidbits: [
      ['Theme', 'The central idea or underlying message explored in a literary work.'],
      ['Motif', 'A recurring element (image, symbol, or idea) that develops theme.'],
      ['Symbolism', 'Use of an object, person, or event to represent abstract ideas beyond literal meaning.'],
      ['Imagery', 'Descriptive language appealing to the senses to create vivid mental pictures.'],
      ['Metaphor', 'A direct comparison between two unlike things without using like or as.'],
      ['Personification', 'Giving human qualities to non-human things.'],
      ['Foreshadowing', 'Hints or clues about events that will occur later in the narrative.'],
      ['Dramatic Irony', 'The audience knows something characters do not, creating tension or humor.'],
      ['Free Verse', 'Poetry without regular meter or rhyme scheme.'],
      ['Narrator', 'The voice telling the story; reliability and perspective shape interpretation.'],
    ],
  },
  {
    categoryId: 'ap-spanish',
    name: 'AP Spanish Language',
    description: 'Interpersonal, interpretive, and presentational communication in Spanish',
    tidbits: [
      ['Subjunctive Mood', 'Used for doubts, wishes, emotions, and hypothetical situations (e.g., espero que vengas).'],
      ['Preterite vs. Imperfect', 'Preterite for completed past actions; imperfect for ongoing or habitual past actions.'],
      ['Ser vs. Estar', 'Ser for permanent traits and identity; estar for location and temporary states.'],
      ['Por vs. Para', 'Por indicates reason, duration, or exchange; para indicates purpose, destination, or deadline.'],
      ['Direct Object Pronoun', 'Replaces the noun receiving the action (lo, la, los, las) before conjugated verbs.'],
      ['Subjunctive Triggers', 'Verbs like querer, dudar, es importante que often require subjunctive in the dependent clause.'],
      ['Register (Tú vs. Usted)', 'Tú is informal; usted shows respect in many Spanish-speaking cultures.'],
      ['Cognate', 'A word similar in Spanish and English (e.g., información/information) but watch false friends.'],
      ['Transition Words', 'Connectors like sin embargo, por lo tanto, and además improve coherence in essays.'],
      ['Cultural Perspective', 'Language reflects culture; AP tasks assess understanding of products, practices, and perspectives.'],
    ],
  },
  {
    categoryId: 'ap-hug',
    name: 'AP Human Geography',
    description: 'Population, culture, political organization, and land use',
    tidbits: [
      ['Demography', 'The statistical study of human populations: size, density, distribution, and change.'],
      ['Demographic Transition Model', 'Four-stage model linking birth/death rates to economic development and population growth.'],
      ['Push and Pull Factors', 'Push factors drive migration from an origin; pull factors attract migrants to a destination.'],
      ['Culture Hearth', 'A center where cultural traits originate and spread to other regions.'],
      ['Language Family', 'A group of related languages descended from a common ancestral language.'],
      ['Nation vs. State', 'A nation is a group with shared identity; a state is a political unit with defined territory and sovereignty.'],
      ['Gerrymandering', 'Drawing electoral district boundaries to favor one political party.'],
      ['Centripetal Force', 'Factors that unify a state (shared language, nationalism, infrastructure).'],
      ['Centrifugal Force', 'Factors that divide a state (ethnic conflict, uneven development, devolution).'],
      ['Green Revolution', 'Mid-20th-century spread of high-yield crops and agricultural technology, especially in developing countries.'],
    ],
  },
  {
    categoryId: 'ap-enviro',
    name: 'AP Environmental Science',
    description: 'Ecosystems, biodiversity, pollution, and sustainability',
    tidbits: [
      ['Ecosystem', 'A community of organisms interacting with each other and their physical environment.'],
      ['Biodiversity', 'Variety of life at genetic, species, and ecosystem levels; supports resilience and ecosystem services.'],
      ['Food Chain', 'Linear sequence of who eats whom; energy is lost at each trophic level (~10% rule).'],
      ['Carrying Capacity', 'Maximum population size an environment can sustain indefinitely given available resources.'],
      ['Tragedy of the Commons', 'Individuals overuse shared resources because personal benefit exceeds personal cost of depletion.'],
      ['Greenhouse Effect', 'Atmospheric gases trap heat; enhanced by human emissions, driving global climate change.'],
      ['Acid Rain', 'Precipitation with low pH from sulfur and nitrogen oxides, harming ecosystems and structures.'],
      ['Eutrophication', 'Excess nutrients (often from fertilizer runoff) cause algal blooms and oxygen depletion in water.'],
      ['Renewable Energy', 'Energy from sources replenished on human timescales: solar, wind, hydro, geothermal.'],
      ['Sustainability', 'Meeting present needs without compromising future generations\' ability to meet theirs.'],
    ],
  },
  {
    categoryId: 'ap-art-hist',
    name: 'AP Art History',
    description: 'Global art traditions, visual analysis, and historical context',
    tidbits: [
      ['Formal Analysis', 'Examining visual elements—line, color, shape, space, texture—without relying on subject alone.'],
      ['Iconography', 'The study of symbols and subject matter and their cultural meaning in artworks.'],
      ['Patronage', 'Financial or political support of artists, which often shapes subject, style, and function.'],
      ['Perspective', 'Techniques (linear or atmospheric) creating the illusion of depth on a flat surface.'],
      ['Contrapposto', 'A naturalistic standing pose with weight shifted onto one leg, common in classical sculpture.'],
      ['Baroque', '17th-century style emphasizing drama, movement, rich color, and emotional intensity.'],
      ['Impressionism', 'Late 19th-century movement capturing fleeting light and everyday scenes with visible brushwork.'],
      ['Modernism', 'Early 20th-century break from tradition; experimentation with abstraction and new materials.'],
      ['Contextual Analysis', 'Interpreting art through historical, religious, political, and social circumstances of its creation.'],
      ['Function', 'The intended purpose of an artwork—worship, commemoration, propaganda, or personal expression.'],
    ],
  },
];

const lines = [];
lines.push('-- Migration 015: Seed AP categories + starter tidbits (10 per course, term + definition).');
lines.push('-- Run after 014-ap-catalog-wiring.sql.');
lines.push('-- Requires generate_tidbit_id(tidbit_text, cat_id) already installed in Supabase.');
lines.push('-- Safe to re-run: ON CONFLICT (id) DO NOTHING on tidbits.');
lines.push('-- After running, flip contentLive: true per course in src/config/courseCatalog.js.');
lines.push('');
lines.push('-- ── AP categories ────────────────────────────────────────────────────────────');
lines.push('INSERT INTO categories (id, name, description, sort_order) VALUES');

const catRows = AP_COURSES.map((c, i) => {
  const sort = 100 + i;
  return `  ('${c.categoryId}', '${esc(c.name)}', '${esc(c.description)}', ${sort})`;
});
lines.push(catRows.join(',\n'));
lines.push('ON CONFLICT (id) DO UPDATE SET');
lines.push('  name = EXCLUDED.name,');
lines.push('  description = EXCLUDED.description;');
lines.push('');

for (const course of AP_COURSES) {
  lines.push('-- =====================');
  lines.push(`-- ${course.name}`);
  lines.push('-- =====================');
  lines.push('INSERT INTO tidbits (id, category_id, term, text, difficulty, tags, source, is_active)');
  lines.push('VALUES');
  const rows = course.tidbits.map(([term, text]) => tidbitRow(course.categoryId, term, text));
  lines.push(rows.join(',\n\n'));
  lines.push('');
  lines.push('ON CONFLICT (id) DO NOTHING;');
  lines.push('');
}

lines.push('-- ── Sync preset deck cards from tidbits (term → front, definition → back) ──');
lines.push('INSERT INTO public.cards (deck_id, front, back, card_type, position)');
lines.push('SELECT');
lines.push('  d.id,');
lines.push('  COALESCE(NULLIF(TRIM(t.term), \'\'), t.text),');
lines.push('  t.text,');
lines.push('  \'basic\',');
lines.push('  (ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY t.id)::integer - 1)');
lines.push('FROM public.tidbits t');
lines.push('JOIN public.decks d ON d.slug = t.category_id AND d.owner_id IS NULL');
lines.push("WHERE t.category_id LIKE 'ap-%'");
lines.push('  AND t.is_active = true');
lines.push('  AND NOT EXISTS (');
lines.push('    SELECT 1 FROM public.cards c WHERE c.deck_id = d.id AND c.back = t.text');
lines.push('  );');
lines.push('');

const outPath = path.join(__dirname, '../migrations/015-ap-seed-tidbits.sql');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath} (${AP_COURSES.length} courses, ${AP_COURSES.length * 10} tidbits)`);
