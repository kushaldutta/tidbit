-- Migration 058: CHEM 1A — General Chemistry, full deck rebuild.
-- UC Berkeley Fall 2026. Catalog (current): stoichiometry, quantum atoms,
-- periodic table, bonding, real/ideal gases, thermochemistry, intro
-- thermodynamics and equilibrium, acid-base and solubility equilibria,
-- intro oxidation-reduction, intro chemical kinetics.
-- Textbook used in recent Chem 1A offerings: Atkins, Jones & Laverman,
-- Chemical Principles: The Quest for Insight (7th ed. electronic excerpt).
-- Sequence follows Berkeley's physical-first lecture calendar (not Zumdahl).

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'chem1a');

DELETE FROM public.tidbits
WHERE category_id = 'chem1a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'chem1a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'chem1a');

UPDATE public.decks
SET title = 'CHEM 1A',
    description = 'General Chemistry — Atkins Chemical Principles: atoms, bonding, gases, thermo, equilibrium',
    cover_emoji = '🧪'
WHERE slug = 'chem1a';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('stoichiometry',            'Stoichiometry & the Mole',
   'Moles, reactions, limiting reagent, molarity (Fundamentals)', 0),
  ('quantum-atoms',            'Quantum Mechanics & the H Atom',
   'Photons, quantization, orbitals, quantum numbers (Ch 1A–1D)', 1),
  ('periodic-multielectron',   'Multi-electron Atoms & Periodic Trends',
   'Screening, Aufbau, IE, EA, effective nuclear charge (Ch 1E–1F)', 2),
  ('bonding-lewis-vsepr',      'Lewis Structures, VSEPR & Hybridization',
   'Ionic/covalent bonding, resonance, molecular shape (Ch 2A–2F)', 3),
  ('mo-imf',                   'MO Theory & Intermolecular Forces',
   'Bond order, paramagnetism, IMF, H-bonding, phases (Ch 2G, 3E–3F)', 4),
  ('gases',                    'Gases & Kinetic Molecular Theory',
   'Ideal/real gases, pressure, Maxwell speed distribution (Ch 3A–3D)', 5),
  ('thermochemistry',          'Thermochemistry & the First Law',
   'Heat, work, enthalpy, Hess''s law, calorimetry (Ch 4A–4C)', 6),
  ('entropy-equilibrium',      'Entropy, Free Energy & Equilibrium',
   'Second law, ΔG, K, Le Chatelier (Ch 4–5)', 7),
  ('acids-solubility',         'Acids, Bases, Buffers & Solubility',
   'pH, Ka/Kb, neutralization, Ksp (Ch 6A–6E, 6I)', 8),
  ('redox-kinetics',           'Redox, Cells & Chemical Kinetics',
   'Oxidation numbers, electrochemical cells, rates, Ea (Ch 6K; kinetics intro)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'chem1a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Stoichiometry & the Mole
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'stoichiometry'
CROSS JOIN (VALUES
  (0,  'mole (mol)',
       'SI unit for amount of substance: 1 mol contains NA = 6.022 × 10²³ entities (Avogadro''s number). Moles connect the microscopic count of atoms to laboratory mass.'),
  (1,  'molar mass',
       'Mass of one mole of a substance in g/mol; numerically equal to the formula mass in amu. n = m / M.'),
  (2,  'empirical vs. molecular formula',
       'Empirical: simplest whole-number ratio of atoms. Molecular: actual number of atoms in a molecule. Molecular = (empirical) × integer = molar mass / empirical mass.'),
  (3,  'balanced chemical equation',
       'Conservation of atoms: coefficients give mole ratios of reactants and products. Never change subscripts to balance — that changes identity.'),
  (4,  'stoichiometric ratio',
       'The mole-to-mole conversion factor from the balanced equation. All stoichiometry problems go through moles, not grams directly.'),
  (5,  'limiting reagent',
       'The reactant that is fully consumed first and thereby sets the maximum product. Identify by converting each reactant to moles of product; the smaller yield wins.'),
  (6,  'theoretical vs. actual vs. percent yield',
       'Theoretical: amount predicted from the limiting reagent. Actual: isolated in lab. Percent yield = (actual / theoretical) × 100%.'),
  (7,  'molarity (M)',
       'Moles of solute per liter of solution. n = M × V. Dilution: M1 V1 = M2 V2 because moles of solute are conserved.'),
  (8,  'combustion analysis',
       'Burn a hydrocarbon; mass of CO2 gives moles C, mass of H2O gives moles H. Remainder (if any) is often O. Used to find empirical formulas.'),
  (9,  'solution stoichiometry (titration)',
       'Use molarity and balanced equation to relate volumes. At the equivalence point, moles of titrant match the stoichiometric requirement of analyte.'),
  (10, 'percent composition',
       'Mass percent of an element = (mass of element in formula / molar mass) × 100%. Reverse: from percents assume 100 g and convert to moles for the empirical formula.'),
  (11, 'aqueous ions / strong electrolytes',
       'Soluble ionic compounds and strong acids dissociate completely. Net ionic equations omit spectator ions and show the actual chemical change.'),
  (12, 'precipitation reaction',
       'Two aqueous solutions form an insoluble solid (precipitate). Solubility rules (e.g. nitrates soluble; most Ag+, Pb2+, Hg2 2+ chlorides insoluble) predict the product.'),
  (13, 'conservation of mass',
       'In a closed chemical reaction, total mass of reactants equals total mass of products. The mole concept is how chemists count while still conserving atoms.'),
  (14, 'concentration units besides M',
       'Molality (mol/kg solvent) is temperature-independent; mole fraction is used in colligative properties and gas mixtures. Chem 1A mainly uses molarity for solutions.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Quantum Mechanics & the H Atom
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'quantum-atoms'
CROSS JOIN (VALUES
  (0,  'photon / Planck relation',
       'E = hν = hc/λ. Light is quantized; a photon''s energy is set by its frequency. Higher frequency (shorter λ) means more energy per photon.'),
  (1,  'photoelectric effect',
       'Electrons are ejected from a metal only if ν > ν0 (a threshold). KE_max = hν − Φ. Intensity changes the number of electrons, not their individual KE — evidence for photons.'),
  (2,  'wave–particle duality',
       'Light and matter both show wave and particle behavior. de Broglie: λ = h/p. Electrons in atoms are described by waves (orbitals), not miniature planets.'),
  (3,  'Bohr model (what it got right / wrong)',
       'Right: quantized energy levels and E = −13.6 eV / n² for hydrogen. Wrong: electrons in definite orbits; fails for multi-electron atoms and cannot explain fine structure.'),
  (4,  'Rydberg formula',
       '1/λ = R (1/n1² − 1/n2²) for H-atom emission/absorption lines. Balmer series ends at n1 = 2 (visible); Lyman at n1 = 1 (UV).'),
  (5,  'particle in a box',
       'E_n = n² h² / (8 m L²), n = 1, 2, 3… Energy is quantized because the wave must fit an integer number of half-wavelengths. Smaller box → larger level spacing.'),
  (6,  'Heisenberg uncertainty principle',
       'Δx Δp ≥ h/4π. You cannot know position and momentum arbitrarily well at once. Confining an electron (small Δx) raises its kinetic energy.'),
  (7,  'wavefunction ψ and |ψ|²',
       'ψ is the quantum state; |ψ|² dV is the probability of finding the electron in that volume. Nodes are where ψ = 0 (and thus probability is zero).'),
  (8,  'principal quantum number n',
       'n = 1, 2, 3… sets the shell and, for hydrogen, the energy. Larger n: larger orbital, higher energy, electron farther from the nucleus on average.'),
  (9,  'angular momentum quantum number ℓ',
       'ℓ = 0, 1, …, n−1. Labels subshells: s, p, d, f. Determines orbital shape (spherical s, dumbbell p) and orbital angular momentum.'),
  (10, 'magnetic quantum number mℓ',
       'mℓ = −ℓ … +ℓ. Labels the orientation of the orbital in space. A p subshell (ℓ = 1) has three orbitals (px, py, pz).'),
  (11, 'spin quantum number ms',
       'ms = +1/2 or −1/2. An orbital holds at most two electrons with opposite spin (Pauli). Spin is an intrinsic quantum number, not a tiny spinning ball.'),
  (12, 'hydrogen energy levels',
       'En = −13.6 eV / n² (or −RH hc / n²). Degenerate in ℓ and mℓ: 2s and 2p have the same energy in H (not in multi-electron atoms).'),
  (13, 'radial node vs. angular node',
       'Radial nodes = n − ℓ − 1 (spherical surfaces). Angular nodes = ℓ (planes or cones). 2s has one radial node; 2p has one angular node.'),
  (14, 'ground state of H',
       '1s¹: n = 1, ℓ = 0, mℓ = 0. The 1s orbital is spherically symmetric with no nodes and the electron density peaked at the nucleus (though r = 0 probability in a shell is 0).')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Multi-electron Atoms & Periodic Trends
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'periodic-multielectron'
CROSS JOIN (VALUES
  (0,  'electron shielding (screening)',
       'Inner electrons reduce the full nuclear charge felt by outer electrons. Effective nuclear charge Zeff ≈ Z − S. Poor shielding by d/f electrons explains many anomalies.'),
  (1,  'effective nuclear charge Zeff',
       'The net positive charge experienced by an electron. Increases across a period (Z up, same shell) more than down a group (new shell, more shielding).'),
  (2,  'Aufbau principle',
       'Fill orbitals from lowest energy up: 1s, 2s, 2p, 3s, 3p, 4s, 3d, … In multi-electron atoms, ns fills before (n−1)d because of shielding and penetration.'),
  (3,  'Hund''s rule',
       'For degenerate orbitals, maximize unpaired electrons with parallel spin before pairing. Lowers electron–electron repulsion; explains paramagnetism of N, O2, etc.'),
  (4,  'Pauli exclusion principle',
       'No two electrons in an atom can share the same four quantum numbers. An orbital holds at most two electrons of opposite spin.'),
  (5,  'electron configuration (exceptions)',
       'Cr is [Ar] 4s¹ 3d⁵ and Cu is [Ar] 4s¹ 3d¹⁰: half-filled and filled d subshells are especially stable. Write ions by removing ns electrons first.'),
  (6,  'ionization energy (IE)',
       'Energy to remove an electron from a gas-phase atom. Increases across a period (Zeff) and decreases down a group (larger n). Exceptions: Be→B and N→O (subshell stability).'),
  (7,  'electron affinity (EA)',
       'Energy change when a gas-phase atom gains an electron. More negative (favorable) toward F/Cl. Noble gases and filled subshells have EA near zero or positive.'),
  (8,  'atomic radius trend',
       'Decreases across a period (Zeff pulls electrons in) and increases down a group (new shell). Cations are smaller than the parent atom; anions are larger.'),
  (9,  'ionic radius',
       'For isoelectronic species (same electron count), radius decreases as Z increases (more protons, tighter pull): S²⁻ > Cl⁻ > Ar > K⁺ > Ca²⁺.'),
  (10, 'electronegativity',
       'Tendency of an atom in a bond to attract electrons. Increases toward F (Pauling scale). Difference Δχ predicts bond polarity (ionic if large, covalent if small).'),
  (11, 'metallic character',
       'Increases down a group and to the left: low IE, tend to lose electrons, form cations, conduct electricity. Opposite of nonmetallic character.'),
  (12, 'penetration',
       's orbitals have probability density near the nucleus, so they are less shielded than p or d of the same n. That is why 2s is below 2p in multi-electron atoms.'),
  (13, 'successive ionization energies',
       'IE1 < IE2 < IE3 … with a huge jump after the valence shell is emptied. That jump identifies group number (e.g. huge jump after IE2 → alkaline earth).'),
  (14, 'periodic table blocks',
       's-block: groups 1–2. p-block: 13–18. d-block: transition metals (filling (n−1)d). f-block: lanthanides/actinides. Chemistry of a group is similar because of the same valence configuration.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Lewis, VSEPR & Hybridization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'bonding-lewis-vsepr'
CROSS JOIN (VALUES
  (0,  'ionic bond',
       'Electrostatic attraction after electron transfer from a low-IE metal to a high-EA nonmetal. Lattice energy (Born–Haber) measures the solid''s stability: higher charges and smaller ions → stronger lattice.'),
  (1,  'covalent bond',
       'Shared electron pair between atoms (typically nonmetals). Bond length and strength correlate inversely; multiple bonds are shorter and stronger than singles between the same atoms.'),
  (2,  'Lewis structure rules',
       'Count valence electrons, connect atoms with singles, complete octets (H wants 2), then form multiple bonds if needed. Least electronegative atom is usually central.'),
  (3,  'formal charge',
       'FC = valence − (nonbonding e⁻) − ½(bonding e⁻). Best Lewis structure: FC closest to zero, negative FC on the more electronegative atom.'),
  (4,  'resonance',
       'Two or more Lewis structures with the same atom arrangement but different electron placement. The real molecule is a hybrid; bonds are equivalent (e.g. ozone, carbonate).'),
  (5,  'octet exceptions',
       'Incomplete: B, Be (electron deficient). Expanded: period 3+ can use d orbitals / extra valence (PCl5, SF6). Odd-electron radicals (NO, NO2) cannot pair all electrons.'),
  (6,  'VSEPR',
       'Electron domains (bonds and lone pairs) repel and arrange to maximize distance. Lone pairs take more space than bonding pairs, compressing bond angles (NH3 107°, H2O 104.5°).'),
  (7,  'electron-domain vs. molecular geometry',
       'AX2E0 linear, AX3E0 trigonal planar, AX4E0 tetrahedral, AX5E0 trigonal bipyramidal, AX6E0 octahedral. Molecular shape names ignore lone pairs (AX2E1 = bent).'),
  (8,  'polarity of a molecule',
       'A molecule is polar if it has a nonzero dipole moment: polar bonds arranged so they do not cancel (H2O yes, CO2 no). Shape from VSEPR is required to decide.'),
  (9,  'hybridization (sp, sp2, sp3)',
       'Mix s and p orbitals on the central atom to match the electron-domain geometry: 2 domains → sp (180°), 3 → sp2 (120°), 4 → sp3 (109.5°).'),
  (10, 'sp3d and sp3d2',
       'Trigonal bipyramidal (5 domains) and octahedral (6 domains) for expanded octets. Equatorial vs. axial positions are not equivalent in TBP (lone pairs prefer equatorial).'),
  (11, 'sigma vs. pi bonds',
       'σ: head-on overlap, free rotation (approximately). π: side-on overlap of leftover p orbitals; a double bond is σ+π, a triple is σ+2π. π bonds restrict rotation.'),
  (12, 'bond order (Lewis)',
       'Number of bonding pairs between two atoms (1, 2, or 3). Resonance averages them (benzene C–C bond order 1.5). Higher order → shorter, stronger bond.'),
  (13, 'dipole moment',
       'μ = q × d. Vector from δ+ to δ−. Measured in debye. Used experimentally to confirm polarity predicted from electronegativity and shape.'),
  (14, 'coordinate (dative) covalent bond',
       'Both electrons in the shared pair come from one atom (NH3→BF3, H3O+). Once formed, it is indistinguishable from an ordinary covalent bond.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. MO Theory & Intermolecular Forces
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'mo-imf'
CROSS JOIN (VALUES
  (0,  'molecular orbital',
       'An orbital delocalized over the molecule, formed by combining AOs. Bonding MOs are lower energy (in-phase); antibonding MOs (*) are higher (out-of-phase, node between nuclei).'),
  (1,  'MO bond order',
       'BO = ½ (bonding e⁻ − antibonding e⁻). BO = 0 means no stable molecule (He2). Fractional orders are allowed (O2: BO = 2).'),
  (2,  'O2 paramagnetism',
       'MO theory puts two unpaired electrons in π* orbitals; O2 is paramagnetic. Lewis structures fail here — a classic Chem 1A reason to learn MO theory.'),
  (3,  'N2 vs. O2 MO order',
       'For B2, C2, N2 the σ2p lies above the π2p; for O2 and F2, σ2p is below π2p. That switch changes predicted magnetism of B2 and C2.'),
  (4,  'HOMO and LUMO',
       'Highest occupied and lowest unoccupied MOs. The HOMO–LUMO gap sets color, reactivity, and whether a molecule is a conductor, semiconductor, or insulator analog.'),
  (5,  'delocalization (beyond Lewis)',
       'π electrons in conjugated systems (benzene, ozone) occupy MOs spread over several atoms; that extra stability is resonance energy.'),
  (6,  'London dispersion forces',
       'Instantaneous induced dipoles; present in all molecules. Stronger for larger, more polarizable electron clouds (I2 vs. F2; hydrocarbons with more surface area).'),
  (7,  'dipole–dipole attraction',
       'Between permanent dipoles of polar molecules. Weaker than H-bonds, stronger (per similar size) than dispersion alone. Raises boiling point relative to nonpolar isomers.'),
  (8,  'hydrogen bonding',
       'A strong dipole attraction when H is bound to N, O, or F and approaches another N/O/F lone pair. Explains water''s high bp, DNA base pairing, and protein secondary structure.'),
  (9,  'ion–dipole',
       'Attraction between an ion and a polar molecule (Na+ and water). The main reason ionic solids dissolve in water.'),
  (10, 'polarizability',
       'How easily the electron cloud distorts. Larger atoms (down a group) are more polarizable → stronger dispersion. F is small and not very polarizable.'),
  (11, 'vapor pressure and IMF',
       'Stronger IMF → lower vapor pressure at a given T (harder to escape into gas). Volatile liquids have weak IMF and high vapor pressure.'),
  (12, 'phase of a substance at room T',
       'A qualitative IMF contest: strong H-bonding or ionic/network covalent → solid/liquid (H2O, SiO2, NaCl); weak dispersion → gas (CH4, N2) unless the molecule is very large.'),
  (13, 'surface tension / viscosity',
       'Both increase with stronger IMF. Hydrogen-bonded liquids (glycerol, water) are more viscous and have higher surface tension than hydrocarbons of similar mass.'),
  (14, 'network covalent solid',
       'Atoms covalently bonded in an extended lattice (diamond, quartz, graphite). Very high melting points; not molecular. Graphite conducts in-plane because of delocalized π electrons.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Gases
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'gases'
CROSS JOIN (VALUES
  (0,  'pressure (microscopic origin)',
       'P is the momentum transferred to a wall per time per area from molecular collisions. More frequent or harder collisions (higher T or density) raise P.'),
  (1,  'ideal gas law',
       'PV = nRT. Assumes point particles and no attractions. R = 0.08206 L·atm·mol⁻¹·K⁻¹ or 8.314 J·mol⁻¹·K⁻¹. T must be in kelvin.'),
  (2,  'STP / molar volume',
       'Historically 1 atm and 0 °C: 22.4 L/mol. SATP (1 bar, 25 °C) is ~24.8 L/mol. Use PV = nRT rather than memorizing if P or T differ.'),
  (3,  'Boyle / Charles / Avogadro',
       'Boyle: P ∝ 1/V at constant n,T. Charles: V ∝ T at constant n,P. Avogadro: V ∝ n at constant P,T. Combined in the ideal gas law.'),
  (4,  'Dalton''s law of partial pressures',
       'P_total = Σ Pi, and Pi = χi P_total where χi is mole fraction. Gases in a mixture act independently if ideal.'),
  (5,  'mole fraction χ',
       'χi = ni / n_total. For an ideal mixture, χi = Pi / P_total. Used for air (χ_N2 ≈ 0.78) and collected-over-water problems (subtract P_H2O).'),
  (6,  'kinetic molecular theory',
       'Gas particles are tiny, in constant random motion, collide elastically, and have KE_avg = (3/2) kT per molecule = (3/2) RT per mole. No attractions in the ideal model.'),
  (7,  'root-mean-square speed',
       'urms = √(3RT/M) with M in kg/mol. Lighter molecules move faster at the same T (H2 vs. O2). Matches effusion and diffusion rates.'),
  (8,  'Maxwell–Boltzmann speed distribution',
       'A probability distribution of molecular speeds. Higher T: curve flattens and the peak shifts right. Heavier M: peak shifts left. Never all molecules at the same speed.'),
  (9,  'Graham''s law of effusion',
       'Rate ∝ 1/√M. The ratio of effusion rates of two gases = √(M2/M1). Used historically to enrich isotopes (UF6).'),
  (10, 'real gases / van der Waals',
       '(P + a n²/V²)(V − n b) = nRT. a corrects for attractions (lowers observed P); b is excluded volume per mole. Deviations worst at high P and low T.'),
  (11, 'when the ideal gas law fails',
       'Near condensation: attractions matter (Z = PV/nRT < 1). At very high P: finite size dominates (Z > 1). Noble gases at room T/low P are nearly ideal.'),
  (12, 'compressibility factor Z',
       'Z = PV/nRT. Z = 1 is ideal. Z < 1: attractions dominate. Z > 1: repulsive/finite-size effects dominate.'),
  (13, 'gas stoichiometry',
       'At the same T and P, volume ratios of gases equal mole ratios (Gay-Lussac / Avogadro). Combine with PV = nRT when T or P is not the same for all species.'),
  (14, 'mean free path',
       'Average distance a molecule travels between collisions. Longer at low P (vacuum). Sets diffusion rates and whether a gas is in the continuum or Knudsen regime.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Thermochemistry & the First Law
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'thermochemistry'
CROSS JOIN (VALUES
  (0,  'system vs. surroundings',
       'System: the part we study (reaction mixture). Surroundings: everything else. Universe = system + surroundings. Heat and work cross the boundary.'),
  (1,  'first law of thermodynamics',
       'ΔU = q + w. Internal energy is conserved; energy lost by the system is gained by the surroundings. U is a state function; q and w are path functions.'),
  (2,  'sign convention (chemistry)',
       'q > 0: heat absorbed by the system (endothermic). w > 0: work done on the system. Expansion work w = −P_ext ΔV (system does work, w negative).'),
  (3,  'state function',
       'Depends only on the current state (T, P, composition), not the path: U, H, S, G. Heat and work are not state functions — they depend on how you get there.'),
  (4,  'enthalpy H',
       'H = U + PV. At constant pressure, q_p = ΔH. Convenient for open beakers and biological conditions. ΔH < 0 exothermic; ΔH > 0 endothermic.'),
  (5,  'heat capacity vs. specific heat',
       'C = q / ΔT (extensive). Specific heat c is per gram; molar heat capacity is per mole. q = m c ΔT for a temperature change with no phase change.'),
  (6,  'calorimetry',
       'Coffee-cup (constant P): q_p = ΔH. Bomb (constant V): q_v = ΔU. The heat absorbed by the calorimeter + water equals −q_reaction.'),
  (7,  'Hess''s law',
       'ΔH is path-independent: add formation or other known ΔH values (reversing a reaction flips the sign; multiplying scales ΔH). Used when a reaction cannot be run cleanly.'),
  (8,  'standard enthalpy of formation ΔHf°',
       'ΔH to form 1 mol of compound from elements in their standard states (1 bar, specified T, usually 25 °C). ΔHf°(element, standard state) = 0. ΔH°rxn = Σ n ΔHf°(products) − Σ n ΔHf°(reactants).'),
  (9,  'bond enthalpy (approximate ΔH)',
       'ΔH ≈ Σ bonds broken − Σ bonds formed (all positive tabulated bond energies). Approximate because tabulated values are averages, not molecule-specific.'),
  (10, 'enthalpy of phase change',
       'ΔHfus and ΔHvap are endothermic. ΔHvap > ΔHfus for a given substance (you disrupt more IMF going to gas). At the boiling point, q = n ΔHvap with T constant.'),
  (11, 'work of expansion',
       'Reversible isothermal ideal-gas work is larger in magnitude than a single-step irreversible expansion against constant P_ext. More steps → closer to the reversible limit.'),
  (12, 'relation ΔH vs. ΔU',
       'ΔH = ΔU + Δn_g RT for ideal-gas reactions at constant T (Δn_g = change in moles of gas). If no gases change, ΔH ≈ ΔU.'),
  (13, 'endothermic vs. exothermic (molecular)',
       'Exothermic: products sit in a lower potential-energy well (stronger bonds / IMF). Endothermic: the reverse. Temperature can still rise locally from kinetics; ΔH is about the states.'),
  (14, 'standard state',
       'For a pure solid/liquid: the pure substance at 1 bar. For a gas: ideal gas at 1 bar. For a solute: 1 M ideal solution. Required so tabulated ΔHf° and ΔG° are comparable.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Entropy, Free Energy & Equilibrium
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'entropy-equilibrium'
CROSS JOIN (VALUES
  (0,  'entropy S',
       'A measure of the number of accessible microstates (S = k ln W). Spontaneous processes increase the entropy of the universe. Gases >> liquids > solids in molar S.'),
  (1,  'second law',
       'For any real (irreversible) process, ΔS_univ = ΔS_sys + ΔS_surr > 0. Reversible: ΔS_univ = 0. The system entropy can decrease if the surroundings increase more.'),
  (2,  'ΔS_surr for heat flow',
       'At constant T, ΔS_surr ≈ −q_sys / T. An exothermic reaction (q_sys < 0) increases surroundings entropy — why combustion is spontaneous despite organizing products.'),
  (3,  'third law',
       'The entropy of a perfect crystal at 0 K is zero. Absolute S° values can therefore be tabulated; ΔS°rxn = Σ n S°(products) − Σ n S°(reactants).'),
  (4,  'Gibbs free energy G',
       'G = H − TS. At constant T and P, ΔG < 0 is the criterion for spontaneity. ΔG = 0 at equilibrium. ΔG° is for standard states, not necessarily the current mixture.'),
  (5,  'ΔG = ΔH − TΔS (signs)',
       'ΔH < 0, ΔS > 0: always spontaneous. ΔH > 0, ΔS < 0: never. The mixed cases switch at T = ΔH/ΔS (e.g. ice melting, the reverse of dissolving some salts).'),
  (6,  'standard free energy of formation ΔGf°',
       'ΔG to form 1 mol from elements in standard states. ΔG°rxn = Σ n ΔGf°(prod) − Σ n ΔGf°(react). Elements in standard state have ΔGf° = 0.'),
  (7,  'equilibrium constant K',
       'For aA + bB ⇌ cC + dD, K = (a_C^c a_D^d) / (a_A^a a_B^b) with activities ≈ pressures in bar or concentrations in M (dilute). Pure solids/liquids do not appear.'),
  (8,  'ΔG° and K',
       'ΔG° = −RT ln K. K > 1 ↔ ΔG° < 0 (products favored at standard states). K is temperature-dependent; it is not changed by a catalyst or by amounts mixed (those change Q).'),
  (9,  'reaction quotient Q',
       'Same form as K but with current activities. Compare Q to K: Q < K proceeds forward; Q > K reverse; Q = K equilibrium. ΔG = ΔG° + RT ln Q.'),
  (10, 'Le Chatelier''s principle',
       'A system at equilibrium responds to a disturbance by partially undoing it. Add reactant → shift right. Increase P (decrease V) → shift toward fewer gas moles. Add inert gas at constant V: no shift.'),
  (11, 'temperature and K (van ''t Hoff)',
       'Exothermic (ΔH < 0): raising T decreases K (treat heat as a product). Endothermic: raising T increases K. Catalysts equalize forward/reverse rates but do not change K.'),
  (12, 'Kp vs. Kc',
       'Kp = Kc (RT)^{Δn_g} for ideal gases (R in L·bar·K⁻¹·mol⁻¹ if P in bar). If Δn_g = 0, Kp = Kc.'),
  (13, 'heterogeneous equilibrium',
       'Activities of pure solids and pure liquids are 1, so they drop out of K. CaCO3(s) ⇌ CaO(s) + CO2(g) has K = P_CO2 — the pressure of CO2 is fixed at a given T.'),
  (14, 'coupling reactions',
       'A nonspontaneous step (ΔG > 0) can proceed if it is coupled to a strongly negative ΔG process (ATP hydrolysis, a favorable redox). The sum of ΔG values must be negative.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Acids, Bases, Buffers & Solubility
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'acids-solubility'
CROSS JOIN (VALUES
  (0,  'Arrhenius / Brønsted–Lowry / Lewis acids',
       'Arrhenius: H+ / OH− in water. Brønsted: proton donor / acceptor. Lewis: electron-pair acceptor / donor (BF3, metal cations). Chem 1A lives mostly in Brønsted aqueous chemistry.'),
  (1,  'strong vs. weak acid',
       'Strong: complete dissociation (HCl, HBr, HI, HNO3, H2SO4 first proton, HClO4). Weak: equilibrium with Ka < 1 (acetic, HF). Strength is about Ka, not concentration.'),
  (2,  'Ka, Kb, and Kw',
       'Ka = [H3O+][A−]/[HA]. Kb = [OH−][BH+]/[B]. Kw = [H3O+][OH−] = 1.0 × 10⁻¹⁴ at 25 °C. For a conjugate pair, Ka × Kb = Kw.'),
  (3,  'pH and pOH',
       'pH = −log[H3O+]; pOH = −log[OH−]; pH + pOH = 14 at 25 °C. Each pH unit is a tenfold [H3O+] change. pKa = −log Ka; smaller pKa = stronger acid.'),
  (4,  'autoionization of water',
       '2 H2O ⇌ H3O+ + OH−. Neutral water has [H3O+] = [OH−] = 10⁻⁷ M at 25 °C (pH 7). Kw increases with T, so neutral pH is temperature-dependent.'),
  (5,  'percent ionization of a weak acid',
       '√(Ka / c) × 100% for the usual approximation when x ≪ c. Dilution increases percent ionization even though [H3O+] falls.'),
  (6,  'acid–base conjugate pairs',
       'HA and A−; B and BH+. The stronger the acid, the weaker its conjugate base. Cl− is a negligible base; F− and acetate are weak bases.'),
  (7,  'buffer',
       'A weak acid + its conjugate base (similar concentrations) that resists pH change. Henderson–Hasselbalch: pH = pKa + log([A−]/[HA]). Best buffering when pH ≈ pKa.'),
  (8,  'buffer capacity',
       'How much strong acid/base can be added before pH swings. Higher total [HA]+[A−] and ratios near 1 give more capacity. Dilute buffers have little capacity.'),
  (9,  'titration equivalence point',
       'Moles of titrant = stoichiometric moles of analyte. Strong–strong: pH 7. Weak acid–strong base: pH > 7 (A− is a weak base). Half-equivalence: pH = pKa.'),
  (10, 'polyprotic acids',
       'H2SO3, H2CO3, H3PO4 lose protons in steps with Ka1 > Ka2 > Ka3. For most, the first dissociation dominates [H3O+]. Amphoteric HCO3− can act as acid or base.'),
  (11, 'solubility product Ksp',
       'For MxAy(s) ⇌ x M + y A, Ksp = [M]^x [A]^y (saturated). Smaller Ksp is not always lower molar solubility — check stoichiometry (AB vs. AB2).'),
  (12, 'common-ion effect',
       'Adding an ion already in the Ksp or Ka equilibrium shifts left (Le Chatelier): lower solubility, or a weaker acid ionizes less. Used in buffers and selective precipitation.'),
  (13, 'Q vs. Ksp (precipitation)',
       'If Q > Ksp, the solution is supersaturated and a precipitate forms until Q = Ksp. If Q < Ksp, more solid can dissolve.'),
  (14, 'pH and solubility of hydroxides / carbonates',
       'Insoluble metal hydroxides dissolve in acid (consume OH−). Carbonates fizz with acid (CO2). Complex-ion formation (NH3 + Ag+) can also pull more solid into solution.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Redox, Cells & Chemical Kinetics
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'redox-kinetics'
CROSS JOIN (VALUES
  (0,  'oxidation number',
       'A bookkeeping charge: elements 0; F is −1; O is usually −2 (peroxides −1); H is +1 with nonmetals, −1 with metals. The sum of oxidation numbers equals the ion/molecule charge.'),
  (1,  'oxidation vs. reduction',
       'Oxidation is loss of electrons (oxidation number up). Reduction is gain (oxidation number down). OIL RIG. They always occur together.'),
  (2,  'oxidizing vs. reducing agent',
       'The oxidizing agent is reduced (it takes electrons). The reducing agent is oxidized (it gives electrons). Fluorine is a powerful oxidizing agent; alkali metals are strong reducing agents.'),
  (3,  'balancing redox (half-reactions)',
       'Split into oxidation and reduction, balance atoms then O (with H2O) then H (with H+) then charge (with e−). In base, add OH− to both sides to neutralize H+. Add the halves so electrons cancel.'),
  (4,  'galvanic (voltaic) cell',
       'A spontaneous redox reaction (ΔG < 0, E > 0) that does electrical work. Oxidation at the anode, reduction at the cathode. Electrons flow anode → cathode through the wire.'),
  (5,  'salt bridge',
       'Allows ion flow to maintain charge balance without mixing the half-cell solutions. Cations toward the cathode, anions toward the anode.'),
  (6,  'standard cell potential E°',
       'E°_cell = E°_cathode − E°_anode (reduction potentials as tabulated). E° > 0 means the cell is spontaneous under standard conditions. E° is intensive (not multiplied by coefficients).'),
  (7,  'ΔG° and E°',
       'ΔG° = −n F E°. n is moles of electrons in the balanced cell reaction; F is Faraday''s constant (96485 C/mol). Positive E° ↔ negative ΔG° ↔ K > 1.'),
  (8,  'Nernst equation (intro)',
       'E = E° − (RT/nF) ln Q. At 25 °C, E = E° − (0.0591 V / n) log Q. Concentration cells have E° = 0 but E ≠ 0 if Q ≠ 1.'),
  (9,  'reaction rate',
       'Change in concentration per time. Rate = −(1/a) Δ[A]/Δt = +(1/c) Δ[C]/Δt from aA → cC. Instantaneous rate is the slope of [ ] vs. t.'),
  (10, 'rate law and order',
       'Rate = k [A]^m [B]^n. Orders m, n are experimental, not from stoichiometry (unless elementary). Overall order = m + n. k has units that depend on overall order.'),
  (11, 'integrated rate laws (0, 1st, 2nd)',
       'Zero: [A] = [A]0 − kt (linear vs. t). First: ln[A] = ln[A]0 − kt (half-life constant). Second: 1/[A] = 1/[A]0 + kt. Plot to find the order.'),
  (12, 'half-life (first order)',
       't1/2 = ln 2 / k ≈ 0.693/k. Independent of concentration — why radioactive decay and many drugs are quoted with a single half-life.'),
  (13, 'Arrhenius equation / activation energy',
       'k = A e^{−Ea/RT}. Higher T or lower Ea (catalyst) increases k. A catalyst provides a lower-Ea path; it is not consumed and does not change ΔG or K.'),
  (14, 'collision theory / elementary steps',
       'Molecules must collide with enough energy and proper orientation. A unimolecular elementary step is first order; bimolecular is second. The slow (rate-determining) step sets the observed rate law.')
) AS c(pos, front, back)
WHERE d.slug = 'chem1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'chem1a';
