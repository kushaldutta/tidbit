-- Migration 059: CHEM 1B — General Chemistry, full deck rebuild.
-- UC Berkeley (current catalog): kinetics, electrochemistry, states of matter,
-- binary mixtures, thermodynamic efficiency and the direction of chemical change,
-- quantum mechanical bonding, introduction to spectroscopy.
-- Special topics: modern chemistry/biochemistry and chemical engineering.
-- 4 units with a large lab; recent offerings still use Atkins Chemical Principles
-- plus Harris Quantitative Chemical Analysis for lab/spectroscopy/calibration.
-- Prerequisite: CHEM 1A/1AL (or 4A / AP). Credit restriction vs. CHEM 4B.
-- This deck goes beyond 1A intros rather than repeating them.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'chem1b');

DELETE FROM public.tidbits
WHERE category_id = 'chem1b';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'chem1b');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'chem1b');

UPDATE public.decks
SET title = 'CHEM 1B',
    description = 'General Chemistry — kinetics, electrochemistry, mixtures, bonding, spectroscopy (Atkins + Harris lab)',
    cover_emoji = '🧪'
WHERE slug = 'chem1b';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('condensed-phases',       'States of Matter',
   'Solids, liquids, phase diagrams, critical point (catalog: states of matter)', 0),
  ('binary-mixtures',        'Binary Mixtures & Colligative Properties',
   'Raoult, Henry, distillation, freezing-point depression', 1),
  ('thermo-efficiency',      'Thermodynamic Efficiency & Direction of Change',
   '2nd law, Carnot, ΔG vs ΔA, coupled processes', 2),
  ('kinetics',               'Chemical Kinetics',
   'Rate laws, mechanisms, Arrhenius, collision theory', 3),
  ('catalysis',              'Catalysis & Enzyme Kinetics',
   'Homogeneous/heterogeneous catalysis, Michaelis–Menten', 4),
  ('electrochem-cells',      'Electrochemical Cells & Nernst',
   'Galvanic cells, E vs E°, concentration cells', 5),
  ('electrochem-applied',    'Electrolysis, Batteries & Corrosion',
   'Faraday, fuel cells, electrolytic refining', 6),
  ('qm-bonding',             'Quantum Bonding',
   'MO theory, delocalization, band structure intro', 7),
  ('spectroscopy',           'Spectroscopy',
   'Beer–Lambert, UV-vis, IR, NMR, fluorescence', 8),
  ('separations-modern',     'Separations & Modern Chemistry',
   'Chromatography, calibration, green chemistry, chemE/biochem', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'chem1b'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. States of Matter
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'condensed-phases'
CROSS JOIN (VALUES
  (0,  'crystalline vs. amorphous solid',
       'Crystalline: long-range periodic order (unit cell repeats). Amorphous: no long-range order (glass, many polymers). Crystals have sharp melting points; glasses soften over a range.'),
  (1,  'unit cell',
       'The smallest repeating box that generates the crystal by translation. Lattice points + motif (atoms/ions/molecules) define the structure. Cell contents must match the empirical formula after sharing faces/edges/corners.'),
  (2,  'cubic lattices (sc, bcc, fcc)',
       'Simple cubic: 1 atom/cell, CN 6. Body-centered cubic: 2 atoms/cell, CN 8. Face-centered cubic (ccp): 4 atoms/cell, CN 12. Packing fraction is highest for fcc/hcp.'),
  (3,  'coordination number (solids)',
       'Number of nearest neighbors. Ionic CN is set by radius ratio; metallic CN is often 8 or 12. Higher CN generally means denser packing.'),
  (4,  'types of crystalline solids',
       'Molecular (ice, dry ice): weak IMF, low mp. Ionic (NaCl): high mp, brittle, conduct when molten. Metallic: delocalized electrons, ductile, conduct. Network covalent (diamond, SiO2): very high mp.'),
  (5,  'band theory (metal vs. insulator)',
       'Overlap of many AOs makes bands. Metals: partially filled band (or overlapping bands) so electrons can move. Insulators: large gap between filled valence and empty conduction band. Semiconductors: small gap.'),
  (6,  'liquid structure',
       'Short-range order (nearest-neighbor shells) but no long-range periodicity. Molecules continually rearrange; viscosity reflects how slowly that happens (stronger IMF → higher viscosity).'),
  (7,  'phase diagram of a pure substance',
       'P–T map of solid/liquid/gas. Curves: coexistence (two phases, 1 degree of freedom by Gibbs phase rule F = C − P + 2). Triple point: three phases. Critical point: liquid and gas become indistinguishable.'),
  (8,  'triple point vs. critical point',
       'Triple: unique P,T where solid, liquid, and gas coexist. Critical (Tc, Pc): end of the liquid–gas curve; above Tc you cannot liquefy by pressure alone (supercritical fluid).'),
  (9,  'supercritical fluid',
       'T > Tc and P > Pc. Density like a liquid, transport like a gas; no meniscus. Used as a solvent (scCO2 extraction of caffeine) in Chem 1B/chemE contexts.'),
  (10, 'Clapeyron / Clausius–Clapeyron',
       'dP/dT = ΔH / (T ΔV) along a coexistence curve. For vaporization, ΔV ≈ V_gas so ln P = −ΔHvap/RT + const. Explains why boiling point rises with P and why vapor-pressure curves are exponential in 1/T.'),
  (11, 'heating curve',
       'T rises in a single phase (q = m c ΔT) and plateaus at a phase change (q = n ΔH). Slope is smaller where C is larger. You cannot skip the plateau without supplying the latent heat.'),
  (12, 'polymorphs / allotropes',
       'Same composition, different crystal structures (carbon: diamond/graphite; ice Ih vs ice VI). Stability regions appear as separate solid fields on the phase diagram.'),
  (13, 'surface energy and small particles',
       'High surface-to-volume ratio raises free energy: nanoparticles melt lower and dissolve more readily than bulk. Relevant to catalysis and nanomaterials guest lectures.'),
  (14, 'Gibbs phase rule',
       'F = C − P + 2 (for P,T as intensive variables). One-component, two-phase: F = 1 (curve). Three-phase: F = 0 (triple point). Binary systems have extra composition variables.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Binary Mixtures & Colligative Properties
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'binary-mixtures'
CROSS JOIN (VALUES
  (0,  'ideal solution (Raoult''s law)',
       'P_i = χ_i P_i*. Each component''s partial pressure equals its mole fraction times its pure vapor pressure. Like dissolves like: similar IMF (benzene/toluene).'),
  (1,  'positive vs. negative deviation from Raoult',
       'Positive (P > Raoult): A–B attractions weaker than A–A/B–B (easier to vaporize). Negative: A–B stronger (harder to vaporize; often H-bonding pairs).'),
  (2,  'Henry''s law',
       'For a dilute volatile solute, P_i = k_H χ_i (or c_i). Used for gases dissolved in liquids (O2 in water, CO2 in soda). k_H is T-dependent — gases are less soluble as T rises.'),
  (3,  'vapor composition vs. liquid composition',
       'In an ideal binary, the vapor is richer in the more volatile component (higher P*). This is the basis of distillation: repeated vaporization enriches the light component.'),
  (4,  'temperature–composition (T–x) diagram',
       'At fixed P: a lens between liquidus and vaporus. Tie line: liquid and vapor compositions in equilibrium. Lever rule gives the relative amounts of each phase.'),
  (5,  'azeotrope',
       'A mixture that boils at constant composition (vapor = liquid). Positive azeotrope: minimum-boiling (ethanol–water). Simple distillation cannot pass the azeotrope.'),
  (6,  'fractional distillation',
       'A column with many vapor–liquid equilibria (theoretical plates). More plates → closer approach to the pure volatile component, until an azeotrope stops you.'),
  (7,  'colligative properties',
       'Depend on the number of solute particles, not their identity (ideal dilute): vapor-pressure lowering, boiling-point elevation, freezing-point depression, osmotic pressure.'),
  (8,  'boiling-point elevation / freezing-point depression',
       'ΔTb = i Kb m, ΔTf = i Kf m. m is molality. i (van ''t Hoff factor) is 1 for nonelectrolytes and ≈ number of ions for strong electrolytes (with ion pairing reducing i).'),
  (9,  'osmotic pressure Π',
       'Π = i M RT (van ''t Hoff). The pressure that must be applied to stop solvent flow into a more concentrated solution through a semipermeable membrane. Used to find molar masses of macromolecules.'),
  (10, 'van ''t Hoff factor i',
       'Apparent number of particles per formula unit. NaCl ≈ 2, CaCl2 ≈ 3 in dilute solution. At higher concentration, ion pairing makes i smaller than the integer ideal value.'),
  (11, 'molality vs. molarity (why molality for colligative)',
       'Molality uses kg of solvent (independent of T). Molarity uses liters of solution (expands with T). Colligative laws are derived in mole fraction / molality.'),
  (12, 'liquid–liquid immiscibility',
       'If A–B interactions are sufficiently unfavorable, the mixture splits into two liquid phases (oil/water). A miscibility gap appears on the T–x diagram.'),
  (13, 'solid–liquid phase diagram (binary)',
       'Eutectic: the composition and T where a liquid freezes to two solids at once (lowest melting mixture). Used in solder and freeze-point engineering.'),
  (14, 'activity and nonideal mixtures',
       'Replace χ with activity a = γχ. Activity coefficient γ captures deviations from Raoult/Henry. Chem 1B introduces this so equilibrium constants stay thermodynamically honest.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Thermodynamic Efficiency & Direction of Change
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'thermo-efficiency'
CROSS JOIN (VALUES
  (0,  'direction of spontaneous change',
       'Isolated system: ΔS > 0. Constant T,V: ΔA < 0 (Helmholtz). Constant T,P: ΔG < 0 (Gibbs). Chem 1B emphasizes matching the criterion to the constraints (lab flask vs. bomb).'),
  (1,  'Helmholtz free energy A',
       'A = U − TS. Maximum work (non-PV) available at constant T,V. Useful for constant-volume electrochemistry and statistical mechanics; G is more common in open beakers.'),
  (2,  'maximum non-expansion work',
       'w_add,max = ΔG (constant T,P). That is why cell potential maps to ΔG: electrical work is the extra work a redox reaction can do besides PΔV.'),
  (3,  'Carnot efficiency',
       'η_max = 1 − Tc/Th for a heat engine between two reservoirs (T in kelvin). No real engine beats Carnot; this is the 2nd-law limit on converting heat to work.'),
  (4,  'heat engine vs. heat pump',
       'Engine: takes heat from hot, dumps some to cold, work out. Refrigerator/heat pump: work in, heat moved from cold to hot. COP is not bounded by 1 the way η is.'),
  (5,  'irreversibility and lost work',
       'Friction, unrestrained expansion, finite-ΔT heat flow, and mixing generate extra entropy. The extra TΔS is work you can never recover as useful work.'),
  (6,  'standard vs. actual ΔG',
       'ΔG = ΔG° + RT ln Q. A reaction with ΔG° > 0 can still go forward if Q is small enough (Le Chatelier / coupled removal of product). ΔG° alone does not decide a lab mixture.'),
  (7,  'temperature as a switch for direction',
       'If ΔH and ΔS have the same sign, there is a crossover T ≈ ΔH/ΔS (e.g. dissolving some salts, the Boudouard reaction, protein unfolding). Plot ΔG vs T is a straight line of slope −ΔS if ΔH,ΔS ≈ const.'),
  (8,  'coupled processes',
       'A process with ΔG > 0 can be driven by one with larger negative ΔG if they share an intermediate (ATP hydrolysis driving biosynthesis; a pump maintaining a gradient).'),
  (9,  'chemical potential μ',
       'μ_i = (∂G/∂n_i)_{T,P,n_j}. Equilibrium when μ is equal in all phases/compartments. For an ideal solution, μ_i = μ_i° + RT ln χ_i. Gradients in μ drive diffusion and phase change.'),
  (10, 'open, closed, isolated',
       'Open: matter and energy. Closed: energy but not matter. Isolated: neither. Entropy of an isolated system never decreases; Earth is not isolated (sunlight).'),
  (11, 'efficiency of chemical energy conversion',
       'Fuel cells can exceed Carnot limits of heat engines because they convert chemical free energy to work electrochemically, not by burning then running a turbine. ChemE special-topic link.'),
  (12, 'standard states in 1B calculations',
       'Gases: 1 bar ideal. Solutes: 1 M ideal. Solvents: pure liquid. Using the wrong standard state makes K dimensionless-looking but numerically wrong.'),
  (13, 'entropy of mixing (ideal)',
       'ΔS_mix = −R Σ n_i ln χ_i > 0. Mixing of similar liquids is entropy-driven even when ΔH_mix ≈ 0. Demixing requires unfavorable enthalpy to win.'),
  (14, 'why “heat death” is not a lab concern',
       'The 2nd law does not forbid local order (crystals, life) as long as the universe''s entropy rises. Organisms are open systems exporting entropy as heat and waste.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Chemical Kinetics
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'kinetics'
CROSS JOIN (VALUES
  (0,  'rate vs. thermodynamics',
       'ΔG says whether a process can go; the rate law says how fast. Diamond → graphite is spontaneous and glacially slow. Catalysts change rate, not K.'),
  (1,  'differential rate law',
       'Rate = k [A]^m [B]^n. m,n are reaction orders (experimental). For an elementary step they match molecularity. Overall order = m+n sets the units of k.'),
  (2,  'method of initial rates',
       'Compare initial rates while changing one concentration. If doubling [A] doubles rate → first order in A; quadruples → second order. Isolates each order.'),
  (3,  'integrated first-order law',
       'ln[A] = ln[A]0 − kt. Linear plot of ln[A] vs t. t1/2 = ln 2 / k, independent of [A]0. Radioactive decay and many isomerizations.'),
  (4,  'integrated second-order law',
       '1/[A] = 1/[A]0 + kt (for 2A → products). t1/2 = 1/(k[A]0) — longer when more dilute. Distinguishes 2nd from 1st order experimentally.'),
  (5,  'zero-order kinetics',
       'Rate = k when a catalyst or surface is saturated (or a photochemical photon flux is limiting). [A] vs t is linear until the reactant is gone. Enzyme at high [S] looks zero-order in S.'),
  (6,  'elementary step / molecularity',
       'A single collision event: uni-, bi-, or (rare) termolecular. The rate law of an elementary step follows from the step as written. Overall reactions usually are not elementary.'),
  (7,  'reaction mechanism',
       'A sequence of elementary steps that sum to the overall reaction. Must be consistent with the observed rate law and any detected intermediates.'),
  (8,  'rate-determining step',
       'The slowest step. If it is first, the rate law matches that step. If a fast equilibrium precedes it, substitute intermediate concentrations using K (pre-equilibrium approximation).'),
  (9,  'steady-state approximation',
       'For a reactive intermediate I, d[I]/dt ≈ 0. Solve for [I] and substitute into the rate of product formation. Used when I never accumulates.'),
  (10, 'Arrhenius plot',
       'ln k = ln A − Ea/RT. Slope = −Ea/R. Two-point: ln(k2/k1) = −(Ea/R)(1/T2 − 1/T1). A (prefactor) contains collision frequency and orientation.'),
  (11, 'activation energy and the transition state',
       'Ea is the energy barrier to the activated complex. Hammond: for an endothermic step the TS resembles products. Catalysts stabilize the TS (lower Ea) for both directions equally.'),
  (12, 'collision theory vs. TST',
       'Collision: rate ∝ (collision frequency) × e^{−Ea/RT} × steric factor. Transition-state theory: K‡ for forming the TS, then a frequency kT/h to cross it. Both explain the T dependence.'),
  (13, 'unimolecular (Lindemann) idea',
       'A + M ⇌ A* + M, then A* → products. At low P the activation collisions are rate-limiting (2nd order); at high P the decay of A* is (1st order). Explains pressure-dependent gas rates.'),
  (14, 'temperature and equilibrium vs. rate',
       'Raising T always speeds both directions (higher k), but K = k_f/k_r may go up or down with T depending on ΔH. Do not confuse “faster” with “more product at equilibrium.”')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Catalysis & Enzyme Kinetics
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'catalysis'
CROSS JOIN (VALUES
  (0,  'catalyst definition',
       'Provides an alternate mechanism with lower Ea; is regenerated. Does not change ΔG° or K; it shortens the time to reach the same equilibrium.'),
  (1,  'homogeneous vs. heterogeneous catalysis',
       'Homogeneous: catalyst in the same phase (acid-catalyzed esterification, organometallic). Heterogeneous: different phase, usually a solid surface (Haber, catalytic converters).'),
  (2,  'adsorption on a surface (Langmuir idea)',
       'Reactants bind to sites; rate can saturate when sites are full (like enzyme saturation). Dissociative adsorption of H2 on metals is a classic chemisorption step.'),
  (3,  'Haber–Bosch (chemE special topic)',
       'N2 + 3 H2 ⇌ 2 NH3 on Fe catalyst; high P favors product (fewer gas moles), moderate T is a kinetics/equilibrium compromise. Feeds fertilizer and thus the food system.'),
  (4,  'catalytic converter',
       'Heterogeneous catalyst (Pt/Pd/Rh) oxidizes CO and hydrocarbons and reduces NOx. Example of using surface chemistry to meet emissions constraints.'),
  (5,  'autocatalysis',
       'A product speeds the reaction (Mn2+ in permanganate–oxalate). Rate can accelerate before it decays — clock reactions in 1B lab.'),
  (6,  'Michaelis–Menten equation',
       'v = Vmax [S] / (KM + [S]). At [S] ≪ KM, first-order in S; at [S] ≫ KM, zero-order (enzyme saturated). Vmax = k2 [E]0.'),
  (7,  'KM (Michaelis constant)',
       'The [S] at which v = Vmax/2. A rough inverse-affinity measure (smaller KM → tighter apparent binding) when k−1 ≫ k2.'),
  (8,  'Lineweaver–Burk plot',
       '1/v vs 1/[S]: intercept 1/Vmax, slope KM/Vmax. Used in 1B to extract constants, with the caveat that it distorts error at low [S].'),
  (9,  'competitive inhibition',
       'Inhibitor binds the active site. Apparent KM increases; Vmax unchanged (enough S outcompetes I). Common drug-design motif.'),
  (10, 'noncompetitive / mixed inhibition',
       'Inhibitor binds elsewhere (or ESI). Vmax decreases; KM may stay the same (pure noncompetitive) or change (mixed). Cannot be fully overcome by extra S.'),
  (11, 'turnover number kcat',
       'Maximum number of substrate molecules converted per enzyme per time (≈ k2). Catalytic efficiency is often quoted as kcat/KM (diffusion-limited ceiling ~10^8–10^9 M⁻¹ s⁻¹).'),
  (12, 'acid–base catalysis',
       'H+ or OH− (or amino-acid side chains) stabilize a TS by proton transfer. Specific vs. general acid catalysis is distinguished by whether rate depends on pH only or also on buffer concentration.'),
  (13, 'green chemistry and catalysis',
       'A catalyst that runs at lower T, in water, with higher atom economy, reduces waste and energy — a recurring 1B lab/lecture theme (Douskey-style green chemistry).'),
  (14, 'inhibiting a pathway vs. changing K',
       'Blocking an enzyme changes how fast a metabolite appears, not the equilibrium constant of the reaction it catalyzes. Cells use both kinetics (flux) and thermodynamics (coupling) to control pathways.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Electrochemical Cells & Nernst
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'electrochem-cells'
CROSS JOIN (VALUES
  (0,  'cell notation',
       'Anode | anode compartment || cathode compartment | cathode. The double bar is the salt bridge. Electrons in the wire run left → right as written if E > 0.'),
  (1,  'standard hydrogen electrode (SHE)',
       'Pt, H2 (1 bar) | H+ (1 M) assigned E° = 0. All other standard reduction potentials are measured relative to SHE.'),
  (2,  'standard reduction potential table',
       'More positive E° means a better oxidizing agent (species on the left more eager to gain electrons). The strongest reductants are metals with very negative E° (Li, K, Ca).'),
  (3,  'combining half-cells',
       'E°_cell = E°_red (cathode) − E°_red (anode), or E°_ox + E°_red. Do not multiply E° by coefficients — potential is intensive. Do multiply n when converting to ΔG.'),
  (4,  'ΔG = −nFE',
       'n = mol e− in the balanced reaction; F = 96485 C/mol. E > 0 ↔ ΔG < 0. This is the 1B link between electrochemistry and the direction of chemical change.'),
  (5,  'Nernst equation',
       'E = E° − (RT/nF) ln Q. At 25 °C: E = E° − (0.0591 V/n) log Q. Q uses the same reaction as the cell as written (products over reactants, solids/liquids omitted).'),
  (6,  'concentration cell',
       'Same half-reaction on both sides, different concentrations. E° = 0, but E = −(0.0591/n) log Q ≠ 0 until concentrations equalize. Spontaneous direction dilutes the concentrated side.'),
  (7,  'pH from a cell (glass electrode idea)',
       'A hydrogen or glass electrode plus Nernst: E depends on log [H+]. That is how pH meters work — a concentration cell in disguise.'),
  (8,  'effect of T on E',
       'From ΔG = ΔH − TΔS = −nFE, dE/dT = ΔS/nF. Endothermic cells can have E that rises with T. Nernst also has an explicit T in the RT/nF prefactor.'),
  (9,  'equilibrium constant from E°',
       'At equilibrium E = 0 so log K = n E° / 0.0591 V (25 °C). A cell with E° = 0.30 V and n = 2 has a huge K — redox can go essentially to completion.'),
  (10, 'overpotential (qualitative)',
       'Real electrodes often need extra voltage beyond Nernst because of slow kinetics at the surface. Explains why water electrolysis needs more than 1.23 V.'),
  (11, 'inert vs. active electrodes',
       'Pt or graphite: surface for electron transfer, not a reactant. Zn or Cu metal: the electrode itself is oxidized or deposited. Mass of an active electrode changes with charge passed.'),
  (12,  'liquid junction / salt bridge role',
       'Without ion flow, charge builds up and current stops. KCl bridges are common because K+ and Cl− have similar mobilities, minimizing junction potentials.'),
  (13, 'standard vs. formal potential',
       'E° assumes unit activity. Formal potential E°′ is measured in a specified medium (ionic strength, complexing ligands) and is what you actually use in the lab.'),
  (14, 'predicting spontaneous redox (no cell)',
       'A species can oxidize another if the reduction of the first has higher E° than the reduction of the second. Example: Cl2 oxidizes Br− (chlorine water test) because E°(Cl2/Cl−) > E°(Br2/Br−).')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Electrolysis, Batteries & Corrosion
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'electrochem-applied'
CROSS JOIN (VALUES
  (0,  'electrolytic cell',
       'Nonspontaneous redox driven by an external voltage (E_cell < 0). Anode is still oxidation, but the signs of the terminals reverse relative to a galvanic cell: the anode is attached to the positive supply.'),
  (1,  'Faraday''s laws',
       'Moles of e− = (I t)/F. Mass deposited ∝ charge. For M^{n+} + n e− → M, moles metal = (I t)/(n F). The quantitative core of electroplating calculations.'),
  (2,  'electrolysis of aqueous NaCl',
       'At the cathode, water (or H+) is reduced to H2 rather than Na+ (E° more favorable, plus overpotential details). At the anode, Cl− may be oxidized to Cl2 in concentrated brine (chlor-alkali process) rather than O2.'),
  (3,  'electrolysis of water',
       '2 H2O → 2 H2 + O2. Minimum E° = 1.23 V; practice needs more. Acid: cathode 2 H+ + 2 e− → H2. Base: 2 H2O + 2 e− → H2 + 2 OH−. Stoichiometry: twice the volume of H2 as O2.'),
  (4,  'electrorefining / electroplating',
       'Impure Cu anode dissolves; pure Cu plates on the cathode; less-active impurities fall as anode slime (Ag, Au). Jewelry plating uses Faraday to set thickness from time and current.'),
  (5,  'primary vs. secondary battery',
       'Primary: not rechargeable (alkaline Zn–MnO2). Secondary: rechargeable (lead–acid, Li-ion) — charging is electrolysis that reverses the galvanic discharge reaction.'),
  (6,  'lead–acid battery',
       'Discharge: Pb + PbO2 + 2 H2SO4 → 2 PbSO4 + 2 H2O. Both electrodes convert to PbSO4; H2SO4 is consumed so density of the electrolyte tracks state of charge.'),
  (7,  'lithium-ion battery (1B level)',
       'Li+ shuttles between a graphite anode (LixC6) and a metal-oxide cathode. Not plating bulk Li metal in a well-designed cell. High energy density; chemistry is intercalation, not a simple aqueous half-cell.'),
  (8,  'fuel cell',
       'Reactants (H2, O2 or methanol/air) are supplied continuously; not a closed battery. H2–O2 PEM cell: anode H2 → 2 H+ + 2 e−, cathode ½ O2 + 2 H+ + 2 e− → H2O. Efficiency can beat heat engines.'),
  (9,  'corrosion of iron',
       'Anodic: Fe → Fe2+ + 2 e−. Cathodic (aerated): O2 + 2 H2O + 4 e− → 4 OH−. Differential aeration (a water drop) sets up a concentration cell: rust forms at the edge, pits under the drop.'),
  (10, 'cathodic protection',
       'Force the metal to be a cathode: sacrificial anode (Zn, Mg on a ship/pipeline) or impressed current. The protected steel does not oxidize while the sacrificial metal does.'),
  (11, 'galvanization',
       'Zinc coating on steel. Even if scratched, Zn is more easily oxidized (more negative E°) and protects steel sacrificially. Tin plate does not: exposed Fe rusts faster.'),
  (12, 'electrochemical series in aqueous solution',
       'You cannot plate Na from aqueous Na+; water reduces first. You can plate Cu, Ag, Au easily. Molten-salt electrolysis (Hall–Héroult for Al) is used when water would interfere.'),
  (13, 'Hall–Héroult (chemE special topic)',
       'Al2O3 dissolved in molten cryolite, electrolyzed to Al(l) and CO/CO2 at carbon anodes. Enormous electrical energy demand — why Al recycling is so valuable.'),
  (14, 'solar cell vs. galvanic cell',
       'A photovoltaic cell is not a redox battery: a semiconductor p–n junction separates photoexcited charges. 1B often contrasts this with photoelectrochemical cells that do use half-reactions.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Quantum Bonding
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'qm-bonding'
CROSS JOIN (VALUES
  (0,  'LCAO-MO idea',
       'MOs are linear combinations of atomic orbitals. n AOs → n MOs. In-phase combination is bonding (lower E, density between nuclei); out-of-phase is antibonding (node between nuclei).'),
  (1,  'overlap and energy match',
       'Strong bonding requires similar AO energies and good overlap (same symmetry). 1s on H mixes well with 2p on F; core orbitals stay localized and nonbonding.'),
  (2,  'σ vs. π MOs',
       'σ: cylindrical symmetry about the internuclear axis (s–s, s–pz, pz–pz head-on). π: nodal plane containing the axis (px–px side-on). A double bond is σ + π.'),
  (3,  'bond order from MO filling',
       'BO = ½ (N_bonding − N_antibonding). O2: (σ2s)²(σ*2s)²(σ2p)²(π2p)⁴(π*)² → BO = 2, two unpaired e−. Removing an antibonding e− (O2 → O2+) raises BO and shortens the bond.'),
  (4,  'paramagnetism as an MO test',
       'Unpaired electrons in MOs (O2, B2) make a molecule attracted to a magnet. Lewis octets get this wrong for O2 — a Chem 1B reason to prefer MO over Lewis for diatomics.'),
  (5,  'HOMO–LUMO gap and color/reactivity',
       'A small gap means visible absorption (colored compounds) and often higher reactivity (electrons easily promoted). Conjugation shrinks the π–π* gap (polyenes, dyes).'),
  (6,  'particle-in-a-box model of conjugated dyes',
       'Longer conjugated chain → larger “box” → smaller ΔE between levels → red-shifted absorption. Qualitative 1B spectroscopy/bonding crossover.'),
  (7,  'delocalization energy',
       'Electrons in conjugated or aromatic π systems are lower in energy than in localized double bonds. Benzene''s extra stability is why it undergoes substitution rather than addition.'),
  (8,  'hybridization as a VB picture',
       'VB: mix AOs on one atom to aim hybrid lobes at neighbors, then form localized σ bonds. Complements MO: hybrids explain geometry; MOs explain spectra and magnetism.'),
  (9,  'sp vs. sp2 vs. sp3 (1B emphasis)',
       'More s character → shorter, stronger, more electronegative hybrid orbital (sp C–H more acidic than sp3). Used for structure, not just VSEPR labels.'),
  (10, 'ionic vs. covalent vs. metallic bonding (QM view)',
       'Ionic: electrons localized on anions. Covalent: shared pairs / bonding MOs. Metallic: electrons delocalized over the lattice (bands). Real bonds sit on a continuum (electronegativity difference).'),
  (11, 'polar covalent bond and dipole',
       'Unequal MO coefficients: more electron density on the electronegative atom. Molecular dipole is the vector sum; QM charge distribution replaces a simple Lewis cartoon.'),
  (12, 'frontier orbitals in reactions',
       'Nucleophiles donate from the HOMO; electrophiles accept into the LUMO. A qualitative predictor of where a reaction starts (used again in organic 3A).'),
  (13, 'from molecules to solids (bands)',
       'N atoms → N closely spaced MOs → a continuous band. Filling and gaps recover conductors/semiconductors/insulators — the chemE/materials special-topic hook.'),
  (14, 'computational chemistry (WebMO-style lab)',
       '1B labs often compute optimized geometries and orbital pictures. Results are approximate (basis set, method) but make HOMO/LUMO and electrostatic potential concrete.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Spectroscopy
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'spectroscopy'
CROSS JOIN (VALUES
  (0,  'spectroscopy (definition)',
       'Interaction of light with matter as a function of wavelength/frequency. Absorption, emission, and scattering report energy-level spacings and concentrations.'),
  (1,  'Beer–Lambert law',
       'A = ε b c = −log(I/I0). A is absorbance (dimensionless), ε molar absorptivity, b path length, c concentration. Linear only in a limited range (too concentrated → deviations).'),
  (2,  'transmittance vs. absorbance',
       'T = I/I0; A = −log T. T = 0.1 means A = 1 (90% of light absorbed). Spectrophotometers report A because it is linear in c.'),
  (3,  'calibration curve (Harris lab)',
       'Measure A for standards, plot A vs c, fit a line, interpolate unknowns. Include a blank. Quality 1B practice: linear range, residual plots, and not extrapolating wildly.'),
  (4,  'UV–visible electronic spectra',
       'Promote electrons between MOs (π → π*, n → π*). Conjugated organics and d–d / charge-transfer complexes of metals absorb in the visible. Complements the particle-in-a-box dye lab.'),
  (5,  'chromophore',
       'The part of a molecule responsible for absorption (C=C–C=C, carbonyl n→π*, a metal ion). Auxochromes shift λ_max by changing the gap.'),
  (6,  'infrared spectroscopy',
       'Vibrational transitions. A dipole-moment change is required. Fingerprint region (~1500–600 cm⁻¹) identifies a molecule; characteristic stretches (O–H, C=O, C≡N) diagnose functional groups.'),
  (7,  'Hooke''s-law vibration (qualitative)',
       'ν̄ ∝ √(k/μ). Stronger bonds and lighter atoms vibrate at higher wavenumber (C–H above C–C; C≡C above C=C). Explains isotope shifts (C–D vs C–H).'),
  (8,  'NMR (intro)',
       'Nuclei with spin (1H, 13C) absorb radiofrequency in a magnetic field. Chemical shift reports electronic environment; integration (1H) reports proton count; splitting reports neighboring protons (n+1 rule).'),
  (9,  'fluorescence vs. phosphorescence',
       'Fluorescence: rapid emission from a singlet excited state (ns). Phosphorescence: slower emission from a triplet (spin-forbidden). Both are emission spectroscopies used in bioassays.'),
  (10, 'selection rules (qualitative)',
       'Not every energy gap appears: IR needs a changing dipole; electronic transitions have symmetry/spin rules. “Forbidden” bands are weak, not always absent.'),
  (11, 'atomic emission / flame tests',
       'Electronic transitions of atoms give line spectra (unique λ). Used in AES/AAS for elemental analysis — Harris quantitative analysis territory.'),
  (12, 'signal-to-noise and blanks',
       'A measured absorbance includes cuvette, solvent, and stray light. Always zero/blank the instrument. Detection limit is set by noise, not by Beer''s law algebra.'),
  (13, 'isosbestic point',
       'A wavelength where two interconverting species have the same ε. A stays constant as the equilibrium shifts — useful in acid–base indicator and kinetics labs.'),
  (14, 'why 1B labs start with spectroscopy',
       'It is how you quantify dyes, chlorophyll, taurine (HPLC-UV), and kinetics (absorbance vs time). The lecture QM gap (ΔE = hν) is the same physics as the spectrophotometer.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Separations & Modern Chemistry
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'separations-modern'
CROSS JOIN (VALUES
  (0,  'chromatography (principle)',
       'Analytes partition between a mobile phase and a stationary phase. Different partition coefficients → different retention times. Separation is thermodynamics (K) plus kinetics (band broadening).'),
  (1,  'retention factor k′',
       'k′ = (tR − tM)/tM. How much longer a peak is retained than an unretained marker. Larger k′ means more time on the stationary phase.'),
  (2,  'resolution Rs',
       'How well two peaks separate: distance between maxima vs. their widths. Rs ≥ 1.5 is baseline resolution. Improved by selectivity (chemistry) or more plates (column efficiency).'),
  (3,  'theoretical plates N',
       'N = 16 (tR/w)² or 5.54 (tR/w½)². More plates → narrower peaks. A longer column or smaller particles increases N (HPLC vs. gravity column).'),
  (4,  'GC vs. HPLC vs. TLC',
       'GC: volatile analytes, gas mobile phase, often MS detection. HPLC: liquids, including nonvolatiles (taurine in Red Bull labs). TLC: cheap, qualitative Rf = d_spot/d_solvent.'),
  (5,  'normal vs. reversed phase',
       'Normal: polar stationary (silica), nonpolar solvent; polar compounds stick. Reversed: C18 silica, polar solvent; nonpolar analytes retain — the HPLC default.'),
  (6,  'extraction (liquid–liquid)',
       'Partition between two immiscible solvents (like dissolves like). Multiple small extractions beat one large one (same Kd). Orange-oil 1B lab is steam distillation + organic extraction.'),
  (7,  'calibration: external, internal, standard addition',
       'External: standards run separately. Internal: add a known compound to every sample to correct recovery. Standard addition: spike the sample itself when the matrix is nasty.'),
  (8,  'accuracy vs. precision vs. uncertainty',
       'Accuracy: close to the true value. Precision: repeatable. A 1B lab grade cares about both plus propagated error (Harris). Significant figures should match the instrument, not wishful thinking.'),
  (9,  'green chemistry principles (1B flavor)',
       'Atom economy, safer solvents, catalysis over stoichiometric reagents, energy efficiency, and designing degradable products. Used to justify experiment redesigns in modern 1B.'),
  (10, 'atom economy',
       'Mass of desired product / mass of all reactants × 100%. A rearrangement can be 100%; a substitution that makes a leaving-group salt is not. Complementary to percent yield.'),
  (11, 'biochemistry hook: cofactors and electron transfer',
       'NAD+/NADH and the respiratory ETC are electrochemical half-reactions in water. 1B electrochemistry is the same Nernst math as bioenergetics (special topic).'),
  (12, 'chemical engineering hook: rate + equilibrium + transport',
       'A reactor is sized from kinetics; conversion is capped by K(T,P); separations (distillation, extraction) recover product. 1B is the molecular basis of those three chemE pillars.'),
  (13, 'analytical figures of merit',
       'Sensitivity (slope of calibration), LOD/LOQ, linear range, selectivity. A method can be precise and still useless if it is not selective (overlapping HPLC peaks).'),
  (14, 'why 1B is a lab-lecture hybrid',
       'The catalog topics (kinetics, electrochemistry, mixtures, spectroscopy) are exactly what you measure: rates from A vs t, E from a cell, boiling diagrams, and Beer''s-law concentrations.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'chem1b';
