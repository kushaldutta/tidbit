-- Migration 060: CHEM 3A — Chemical Structure and Reactivity, full deck.
-- UC Berkeley catalog: intro to organic structures, bonding, and reactivity;
-- alkanes, alkyl halides, alcohols, alkenes, alkynes, and organometallics.
-- 3 units lecture (3AL is the lab). Prereq CHEM 1A (C-) or AP Chem 4+.
-- No credit after CHEM 12A. Second semester is CHEM 3B (aromatics/carbonyls).
-- Textbook used in recent 3A offerings: Vollhardt & Schore, Organic Chemistry
-- (8th ed.). Lecture order follows that text; IR/NMR is tested in 3AL, not 3A.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'chem3a',
  'CHEM 3A',
  'Chemical Structure and Reactivity — Vollhardt & Schore: alkanes through alkynes',
  'uc-berkeley:chem3a:fa26',
  'system',
  true,
  '🧪',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'chem3a');

DELETE FROM public.tidbits
WHERE category_id = 'chem3a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'chem3a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'chem3a');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('structure-bonding',      'Structure & Bonding',
   'Lewis, hybridization, resonance, formal charge (Vollhardt Ch 1)', 0),
  ('reactivity-acids',       'Structure & Reactivity',
   'Acids/bases, pKa, nucleophiles and electrophiles (Ch 2)', 1),
  ('alkanes-radicals',       'Alkanes & Radical Reactions',
   'Nomenclature, conformations, halogenation, BDE (Ch 3)', 2),
  ('cycloalkanes',           'Cyclic Alkanes',
   'Ring strain, chair cyclohexane, cis/trans (Ch 4)', 3),
  ('stereochemistry',        'Stereoisomers',
   'Chirality, R/S, enantiomers, diastereomers (Ch 5)', 4),
  ('substitution',           'Haloalkanes: SN1 & SN2',
   'Nucleophilic substitution, solvent, rearrangements (Ch 6–7)', 5),
  ('elimination',            'Elimination: E1 & E2',
   'Zaitsev, stereochemistry, competing with substitution (Ch 7)', 6),
  ('alcohols-ethers',        'Alcohols & Ethers',
   'Hydroxy group, conversion of alcohols, ether/epoxide chemistry (Ch 8–9)', 7),
  ('alkenes',                'Alkenes: Structure & Addition',
   'Nomenclature, stability, electrophilic addition (Ch 10–11)', 8),
  ('alkynes-organometallics','Alkynes & Organometallics',
   'Alkyne additions, acetylides, Grignard and organolithium (Ch 12; catalog)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'chem3a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Structure & Bonding
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'structure-bonding'
CROSS JOIN (VALUES
  (0,  'organic chemistry (3A scope)',
       'Chemistry of carbon compounds. CHEM 3A is first-semester orgo: structure, bonding, and reactivity of alkanes, alkyl halides, alcohols, alkenes, alkynes, and organometallics. Aromatics and carbonyls wait for 3B.'),
  (1,  'tetravalent carbon',
       'Carbon has four valence electrons and forms four bonds. That, plus C–C chains, is why organic molecules have huge structural diversity. Expanding carbon past four bonds is not a 3A mechanism.'),
  (2,  's and p orbitals / hybridization',
       'Hybrid orbitals mix on one atom to aim bonds. sp3: tetrahedral, 109.5°. sp2: trigonal planar, 120°, leftover p for a π bond. sp: linear, 180°, two leftover p orbitals (alkynes, allenes). More s character → shorter, stronger, more acidic C–H.'),
  (3,  'sigma vs. pi bonds',
       'σ: head-on overlap, free rotation (unless locked by a ring or another π bond). π: side-on overlap of p orbitals; rotation would break the overlap, so alkenes do not freely rotate. A double bond is one σ + one π; a triple is one σ + two π.'),
  (4,  'Lewis structure checklist',
       'Count valence electrons, connect atoms (C in the middle, H on the outside), give octets, assign formal charge. Minimize charge separation. Never draw five bonds to C or two bonds to H.'),
  (5,  'formal charge',
       'FC = valence electrons − (lone-pair electrons + ½ bonding electrons). Neutral carbon with four bonds has FC 0. Carbocations are C with three bonds (FC +1); carbanions have three bonds + a lone pair (FC −1).'),
  (6,  'resonance (rules)',
       'Same atom connectivity, only electron placement changes. Move π electrons and lone pairs, not σ-framework atoms. The actual molecule is a hybrid; more contributors and less charge separation mean a better (lower-energy) hybrid.'),
  (7,  'major vs. minor resonance contributor',
       'Prefer: filled octets, negative charge on more electronegative atoms, fewer charges. A contributor that leaves carbon with six electrons is usually minor. Never mix resonance with equilibrium arrows — those are different processes.'),
  (8,  'curved-arrow notation',
       'Arrows show electron-pair movement: from a source (lone pair or bond) to a sink (atom or bond being formed). Two-electron arrows are the 3A default. Fishhook (single-barbed) arrows are for radicals (Ch 3).'),
  (9,  'electronegativity and bond polarity',
       'C–H is nearly nonpolar. C–O, C–N, C–X (halogen) are polar: the more electronegative atom holds more electron density and is the electrophilic carbon''s neighbor. Polar bonds set up where nucleophiles attack.'),
  (10, 'bond-line (skeletal) notation',
       'Vertices and ends are carbons; hydrogens on carbon are implied. Heteroatoms (O, N, X) and their attached H must be drawn. Charge lives on the atom that bears it. This is the language of every 3A mechanism.'),
  (11, 'constitutional isomers',
       'Same molecular formula, different connectivity (butane vs. 2-methylpropane). Distinct from stereoisomers (same connectivity, different 3D arrangement). Count degrees of unsaturation to constrain possible constitutions.'),
  (12, 'degree of unsaturation (IHD)',
       'For CnHm, DU = (2n+2 − m)/2, then adjust for heteroatoms (halogen counts as H; O ignored; N: add one H in the formula). Each ring or π bond is one DU; a triple bond is two.'),
  (13, 'functional group (3A set)',
       'A reactive subunit: haloalkane (C–X), alcohol (C–OH), ether (C–O–C), alkene (C=C), alkyne (C≡C), organometallic (C–M). 3A teaches how each group''s electronics and sterics control mechanism.'),
  (14, 'spectroscopy in 3A vs. 3AL',
       'IR and NMR are taught and tested in CHEM 3AL (lab), not in 3A lecture exams in the Vollhardt sequence. Do not skip lab spectra, but do not expect 3A midterms to be structure-from-NMR problems.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Structure & Reactivity
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'reactivity-acids'
CROSS JOIN (VALUES
  (0,  'Brønsted acid / base in orgo',
       'Acid: proton donor. Base: proton acceptor (needs a lone pair or π bond). Organic acids you actually meet: carboxylic acids, phenols, alcohols, thiols, terminal alkynes, and very weakly, alkanes. Stronger acid = weaker (more stable) conjugate base.'),
  (1,  'pKa (how 3A uses it)',
       'pKa = −log Ka. Smaller pKa = stronger acid. Typical landmarks: HCl ~ −7, carboxylic acid ~ 5, PhOH ~ 10, ROH ~ 16, terminal alkyne ~ 25, amine ~ 38, alkane ~ 50. A base can deprotonate an acid if the product acid has a higher pKa (equilibrium favors the weaker acid).'),
  (2,  'why ROH is more acidic than RH',
       'The conjugate base RO− puts the negative charge on oxygen (electronegative, well solvated). R− puts it on carbon. Electronegativity and solvation stabilize the anion → lower pKa for the alcohol.'),
  (3,  'inductive effect on acidity',
       'Nearby electronegative atoms (F, Cl, CF3) pull electron density and stabilize an anion, lowering pKa. The effect falls off with distance. Fluoroacetic acid is stronger than acetic acid for this reason.'),
  (4,  'resonance and acidity',
       'If the conjugate base is resonance-delocalized, the acid is stronger (carboxylic acids vs. alcohols; phenols vs. alcohols). Draw the anion contributors — that is the 3A explanation, not a memorized slogan.'),
  (5,  'nucleophile vs. base (split)',
       'Both have electron pairs. Basicity is thermodynamic affinity for H+. Nucleophilicity is kinetic affinity for carbon (or another electrophile). Sterically bulky bases (t-butoxide) can be strong bases but poor nucleophiles — that split drives E2 vs. SN2.'),
  (6,  'electrophile',
       'Electron-poor site that accepts a pair: carbocation, C–X carbon, carbonyl carbon (3B), H+. Polarization and empty orbitals make a carbon electrophilic. 3A substitutions and additions always start by naming Nu and E.'),
  (7,  'Lewis acid / Lewis base',
       'Lewis acid: electron-pair acceptor (BF3, AlCl3, carbocation). Lewis base: pair donor. Brønsted acids/bases are a subset (the electrophile is H+). Useful when you later meet acid-catalyzed additions.'),
  (8,  'reaction coordinate diagram',
       'Energy vs. reaction progress. Peaks are transition states; valleys are intermediates. ΔG° is reactant vs. product; Ea (or ΔG‡) is the barrier. The rate-determining step is the highest barrier from the starting material, not always the tallest single peak in a multi-step path.'),
  (9,  'Hammond postulate',
       'The TS resembles the species closest to it in energy. Endothermic step: late TS, looks like the intermediate/product. Exothermic step: early TS, looks like the reactant. Used to reason about carbocation-like TS in additions and SN1.'),
  (10, 'kinetic vs. thermodynamic product',
       'Kinetic: formed faster (lower barrier), may be reversible or not. Thermodynamic: more stable, wins at equilibrium (high T, long time, reversible conditions). 3A alkenes: Zaitsev vs. Hofmann is this language.'),
  (11, 'reactive intermediates (3A)',
       'Carbocation (sp2, empty p, 6 e−, Lewis acid). Carbanion (lone pair, nucleophilic). Radical (odd electron, fishhook arrows). Stability order for R+ and R· is 3° > 2° > 1° > methyl (hyperconjugation + inductive).'),
  (12, 'hyperconjugation',
       'Donation from adjacent C–H or C–C σ bonds into an empty or half-empty p orbital. Explains why more substituted carbocations and radicals are more stable, and part of why more substituted alkenes are more stable.'),
  (13, 'solvent polarity (preview)',
       'Polar protic (water, alcohols): H-bond, stabilize ions, slow SN2 (solvent cages the Nu), help SN1. Polar aprotic (acetone, DMSO, DMF): dissolve salts but do not H-bond to anions → naked, faster SN2 nucleophiles.'),
  (14, 'Coulomb''s law as a 3A theme',
       'Opposite charges attract; like charges repel. Distance and dielectric constant matter. Robak-style 3A uses this constantly: where the nucleophile attacks, why a carbocation wants substitution, why a crowded TS is high in energy.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Alkanes & Radical Reactions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'alkanes-radicals'
CROSS JOIN (VALUES
  (0,  'alkane formula and naming',
       'Saturated acyclic: CnH2n+2. IUPAC: longest chain is the parent; number to give substituents the lowest set of locants; prefixes di, tri, tetra do not count in alphabetizing; iso and cyclo do. Common names (n-butyl, tert-butyl) still appear in 3A.'),
  (1,  'conformational analysis (ethane)',
       'Rotation about C–C: staggered (60°) is a minimum; eclipsed (0°) is a maximum (~3 kcal/mol for ethane). Newman projection looks down the bond. Staggered minimizes torsional strain.'),
  (2,  'butane conformers',
       'Anti (Me 180° apart): global minimum. Gauche (60°): a bit higher (steric). Eclipsed with two Me together is the worst. Populations follow Boltzmann: more anti at equilibrium, but gauche is not rare.'),
  (3,  'torsional vs. steric vs. angle strain',
       'Torsional: eclipsing. Steric (van der Waals): groups too close in space. Angle: bond angles forced away from 109.5° (small rings). All three show up again in cycloalkanes.'),
  (4,  'bond dissociation energy (BDE)',
       'Enthalpy to break a bond homolytically (each atom gets one electron → radicals). Weaker C–H (3° vs. 1°) means a more stable radical left behind. BDE tables predict regiochemistry of radical halogenation.'),
  (5,  'homolytic vs. heterolytic cleavage',
       'Homo: each atom gets one electron (radicals, fishhooks). Hetero: both electrons go to one atom (ions, two-electron arrows). Alkanes in 3A halogenation are a homolytic story.'),
  (6,  'radical halogenation mechanism',
       'Initiation: X2 → 2 X· (hv or heat, or peroxide). Propagation: X· abstracts H to give R·, then R· + X2 gives RX and X·. Termination: two radicals combine. The chain can turn over many times per initiation.'),
  (7,  'chlorination vs. bromination selectivity',
       'Cl· is reactive and less selective (mix of 1°, 2°, 3° products, statistical + modest 3° preference). Br· is less reactive and highly selective for the weakest C–H (almost all 3° when available). Hammond: bromination has a late, radical-like TS.'),
  (8,  'relative rates (3° : 2° : 1°)',
       'Typical lecture numbers: chlorination ~ 5 : 4 : 1; bromination ~ 1600 : 80 : 1 (order-of-magnitude). Multiply by the number of equivalent hydrogens to predict the product ratio.'),
  (9,  'radical stability order',
       'Benzyl ≈ allyl > 3° > 2° > 1° > methyl. Resonance (allyl/benzyl) beats alkyl substitution. Vinyl and aryl radicals are unstable (high s character, poor hyperconjugation) — you do not halogenate those C–H easily.'),
  (10, 'exothermicity of X2 + RH',
       'Fluorination is violently exothermic (not a lab method). Chlorination is useful. Bromination is milder and more selective. Iodination is endothermic and not a practical alkane functionalization.'),
  (11, 'physical properties of alkanes',
       'London dispersion only: bp rises with surface area (straight chain > branched of the same formula). Insoluble in water; dissolve in other hydrocarbons. Chemically inert to acids/bases/nucleophiles — that is why radicals (or later, C–H activation) are needed.'),
  (12, 'combustion (not a mechanism focus)',
       'Complete combustion: CnH2n+2 + excess O2 → n CO2 + (n+1) H2O. Used in thermochemistry comparisons (branched alkanes have slightly lower heats of combustion per CH2 when more stable).'),
  (13, 'initiation tricks',
       'Light (hv) or heat splits X2. Peroxides (RO–OR) also initiate radical chains and appear again in anti-Markovnikov HBr addition to alkenes — a 3A crossover you must not mix with ionic addition.'),
  (14, 'why alkanes are a poor Nu and poor E',
       'No polar bonds, no lone pairs, no empty orbitals, strong C–H and C–C. Ionic 3A reactions happen at functional groups, not at unactivated alkanes. Radical halogenation is the 3A exception that installs a handle (C–X).')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Cyclic Alkanes
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cycloalkanes'
CROSS JOIN (VALUES
  (0,  'cycloalkane formula',
       'One ring: CnH2n (same as a monoalkene — DU = 1). Name as cycloalkane; substituents get the lowest numbers; for two substituents, the first in the alphabet gets position 1 if there is a tie.'),
  (1,  'Baeyer (angle) strain',
       'Cyclopropane (~60°) and cyclobutane (~90°) are far from 109.5° and are strained. Cyclopentane is close; cyclohexane is strain-free in the chair. Heats of combustion per CH2 quantify this.'),
  (2,  'cyclopropane bonding (qualitative)',
       'Bent “banana” bonds: orbitals cannot point directly at each other. Weak C–C, extra p character, unusually reactive toward some electrophiles (later 3B). Torsional strain too: all C–H eclipsed in a planar picture; the ring puckers only a little.'),
  (3,  'cyclopentane envelope',
       'Puckers to an envelope (or half-chair) to relieve eclipsing. Angle strain is small; residual torsional strain remains. Not a chair.'),
  (4,  'cyclohexane chair',
       'All angles ~109.5°, all bonds staggered: the 3A gold-standard conformer. Draw two parallel lines, then the head and foot. Every carbon has one axial and one equatorial substituent.'),
  (5,  'axial vs. equatorial',
       'Axial: perpendicular to the average ring plane, alternate up/down around the ring. Equatorial: around the “equator,” roughly in the plane. Large groups prefer equatorial to avoid 1,3-diaxial steric strain.'),
  (6,  'ring flip',
       'Chair ⇌ chair through a half-chair/boat path (~10–11 kcal/mol barrier, fast at room T). Every axial substituent becomes equatorial and vice versa; up stays up. Equilibrium favors the chair with the bulky group equatorial.'),
  (7,  'A-value',
       '−ΔG° for putting a substituent axial vs. equatorial (kcal/mol). t-Butyl ~ 4.9 (locks the chair); methyl ~ 1.7; Cl smaller. Use A-values to predict the major conformer, not to invent new stereochemistry.'),
  (8,  'cis / trans on rings',
       'Two substituents on the same face = cis; opposite faces = trans. On cyclohexane, cis-1,2 is ax,eq (or eq,ax); trans-1,2 is eq,eq or ax,ax. The trans-1,2 diequatorial is usually preferred.'),
  (9,  '1,3-diaxial interaction',
       'An axial group clashes with the other two axial hydrogens (or groups) on the same face, two carbons away. That is the steric cost of axial substitution — same physics as gauche butane.'),
  (10, 'boat and twist-boat',
       'Boat has flagpole interactions and eclipsing; higher than chair. Twist-boat is a bit lower than boat and is a real intermediate on the flip path, but chairs dominate the population.'),
  (11, 'decalin (preview)',
       'Two fused chairs. Trans-decalin cannot flip (bridgehead geometry); cis-decalin can. Shows up if 3A discusses fused rings or steroids later; the skill is still “draw chairs and assign ax/eq.”'),
  (12, 'spiro vs. fused vs. bridged (vocab)',
       'Spiro: one shared atom. Fused: one shared bond (two atoms). Bridged: two non-adjacent shared atoms (norbornane). Bredt''s rule (later): no double bond at a strained bridgehead.'),
  (13, 'naming disubstituted cyclohexanes',
       'Number so the first point of difference is lowest; cis/trans describes relative configuration, not R/S. You still assign R/S separately if the problem asks for absolute configuration.'),
  (14, 'using chairs in mechanisms',
       'E2 on cyclohexane requires anti-periplanar H and LG — both axial. That is why a trans-1,2-dibromide with both bromines equatorial will not eliminate until it flips (or it may not, if the flip is costly).')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Stereochemistry
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'stereochemistry'
CROSS JOIN (VALUES
  (0,  'chiral vs. achiral',
       'Chiral: not superimposable on its mirror image (no Sn symmetry; typically no plane or center of symmetry). Achiral: is superimposable. A carbon with four different substituents is a stereocenter (asymmetric carbon) and is the usual 3A source of chirality.'),
  (1,  'enantiomers',
       'Nonsuperimposable mirror images. Identical physical properties in an achiral environment (bp, mp, NMR) except the sign of optical rotation. Differ in chiral environments (enzymes, polarimetry, some NMR chiral shift reagents).'),
  (2,  'diastereomers',
       'Stereoisomers that are not mirror images (e.g. cis vs. trans alkenes; (R,R) vs. (R,S) for two stereocenters). Different physical properties — they can be separated by ordinary distillation/chromatography.'),
  (3,  'Cahn–Ingold–Prelog (R/S)',
       'Rank the four substituents by atomic number at the first point of difference (isotopes: higher mass wins). View with the lowest priority (usually H) in back. 1→2→3 clockwise = R; counterclockwise = S. A hashed H in front means you reverse the assignment.'),
  (4,  'optical activity / [α]',
       'Chiral samples rotate plane-polarized light. Enantiomers rotate equally in opposite directions. [α] is not predictable from R vs. S — do not assume R is (+) . ee (enantiomeric excess) = |% major − % minor|.'),
  (5,  'racemic mixture',
       '1:1 enantiomers. Optical rotation is zero. Often written (±) or rac. Formed when a reaction creates a stereocenter from an achiral starting material with no chiral influence (e.g. SN1 on an achiral 3° halide).'),
  (6,  'meso compound',
       'Contains stereocenters but is achiral because of an internal plane (or center) of symmetry. Classic: meso-tartaric acid; cis-1,2-disubstituted cyclohexane can be meso. Meso ≠ racemic: one compound, not a mixture.'),
  (7,  'maximum stereoisomers',
       'For n stereocenters, at most 2^n stereoisomers. Meso forms and other symmetries reduce the count. Always check for an internal mirror before claiming 2^n distinct molecules.'),
  (8,  'E / Z alkenes',
       'Each carbon of the C=C ranked by CIP. Higher priorities on the same side = Z (zusammen); opposite = E (entgegen). Cis/trans is only unambiguous for disubstituted alkenes with two H. Use E/Z for tri- and tetrasubstituted.'),
  (9,  'prochirality / enantiotopic faces (preview)',
       'An sp2 carbon (carbonyl, later 3B; or a trigonal carbon in addition) has two faces. Attack from opposite faces gives enantiomers if no other stereocenter is present. 3A alkene additions to cis/trans already force you to think 3D.'),
  (10, 'stereospecific vs. stereoselective',
       'Stereospecific: different stereoisomeric starting materials give different stereoisomeric products (SN2 inversion; anti addition of Br2). Stereoselective: one starting material prefers one stereoisomer of product (Zaitsev E2 favoring the E-alkene).'),
  (11, 'Fischer projection (light touch)',
       'Horizontal bonds come out; vertical go back. Useful for sugars (3B) and for counting meso forms. A 90° rotation in the plane inverts configuration; 180° preserves it. If 3A shows one, that is the rule.'),
  (12, 'optical purity vs. ee',
       'Historically, optical purity = [α]obs / [α]max. For modern 3A, ee from integration or polarimetry is the quantity that maps to the mole-fraction difference of enantiomers.'),
  (13, 'resolution (idea)',
       'Separating enantiomers requires a chiral agent (diastereomeric salts, enzymes, chiral chromatography). You cannot distill a racemate into enantiomers with an achiral column.'),
  (14, 'drawing 3A stereochemistry',
       'Use wedges/dashes at tetrahedral carbons; never put two wedges on one carbon without a clear tetrahedral geometry. Keep the carbon skeleton in the plane. If the problem gives a chair, assign ax/eq and then R/S if asked.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Haloalkanes: SN1 & SN2
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'substitution'
CROSS JOIN (VALUES
  (0,  'haloalkane naming and polarity',
       'Fluoro, chloro, bromo, iodo as prefixes. C–X is polar: carbon is electrophilic. Leaving-group ability roughly I > Br > Cl ≫ F in substitution (weaker base, weaker C–X). F is a terrible LG in 3A SN1/SN2.'),
  (1,  'nucleophilic substitution (overview)',
       'Nu: attacks carbon; X leaves. Two limiting mechanisms: SN2 (concerted) and SN1 (carbocation). 3A exams live in predicting which one and drawing the arrows plus stereochemical outcome.'),
  (2,  'SN2 mechanism',
       'Backside attack: Nu bonds as LG leaves, pentacoordinate TS. Rate = k[RX][Nu]. Inversion of configuration (Walden). Concerted — no carbocation, so no rearrangement. Preferred by methyl and 1° (sometimes 2°).'),
  (3,  'SN2 steric effects',
       'The Nu must reach the backside. Methyl > 1° > 2° ≫ 3° (3° is effectively never SN2). Neopentyl (1° but adjacent to a t-butyl) is also terrible. Draw the TS crowding, not just a slogan.'),
  (4,  'SN2 nucleophile trends',
       'Charge: Nu− faster than NuH. Polarizability: I− > Br− > Cl− in protic solvent; in polar aprotic the order can invert. Steric bulk kills SN2 (t-butoxide is a base, not an SN2 Nu). Solvent: polar aprotic speeds anion SN2.'),
  (5,  'SN1 mechanism',
       'Step 1 (slow): ionization to R+ + X−. Step 2 (fast): Nu captures R+. Rate = k[RX] (first-order). Racemization (often partial, ion pairing). 3° > 2°; methyl/1° do not do SN1. Polar protic solvents help.'),
  (6,  'carbocation rearrangements',
       'If a 1,2-hydride or 1,2-alkyl shift gives a more stable R+, it happens in SN1 (and E1, and some additions). SN2 never rearranges. Always check the neighbors of a 2° cation for a 3° rescue.'),
  (7,  'solvolysis',
       'The solvent is the nucleophile (water → alcohol; alcohol → ether). Classic SN1 test: t-butyl chloride in water/ethanol. Rate tracks carbocation stability, not how good a “Nu” the solvent is as a charged species.'),
  (8,  'leaving groups',
       'Good LG = weak base (stable when it leaves): TsO−, I−, Br−, H2O (from protonated alcohols), Cl−. HO−, RO−, H−, R− are terrible LGs — you must protonate or convert OH before substitution.'),
  (9,  'allylic and benzylic RX',
       'Both SN1 (resonance-stabilized R+) and SN2 (unhindered, polarizable) can be fast. Vinyl and aryl halides do neither in 3A: the C–X is on sp2 carbon, backside is blocked, and R+ would be vinyl/phenyl (bad).'),
  (10, 'SN1 vs. SN2 decision tree',
       'Look at the carbon (methyl/1° → SN2; 3° → SN1; 2° → both, use Nu and solvent). Strong Nu / polar aprotic / inversion → SN2. Weak Nu / polar protic / racemization / rearrangement → SN1.'),
  (11, 'inversion vs. racemization drawings',
       'SN2: dash in, wedge out (or the reverse) — the Nu takes the LG''s opposite face. SN1: both faces of the planar R+; expect a racemate, sometimes a bit of retention from ion-pair shielding.'),
  (12, 'tosylates and mesylates',
       'Convert ROH to ROTs or ROMs (TsCl or MsCl, pyridine) without inverting the carbon, then SN2. The S–O cleavage does not happen; C–O does. This is how 3A substitutes alcohols with control of stereochemistry.'),
  (13, 'effect of the halogen (kinetics)',
       'For both SN1 and SN2, RI is fastest, RF slowest among methyl/1°/2° iodides vs. fluorides. Polarizability and C–X BDE both contribute. Do not confuse this with acidity of HX.'),
  (14, 'common 3A nucleophiles',
       'Halides (NaI/acetone Finkelstein), HO−/RO− (makes alcohols/ethers), HS−/RS−, N3−, CN−, NH3/amines, carboxylate (makes esters). Neutral water/alcohol are SN1 nucleophiles. Organometallics are too basic — they eliminate, they do not SN2 2°/3° RX well.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Elimination: E1 & E2
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'elimination'
CROSS JOIN (VALUES
  (0,  'elimination vs. substitution',
       'Elimination removes H and LG from adjacent carbons → π bond (alkene, or alkyne if already unsaturated). Same substrates as substitution; the split is base strength, temperature, and sterics. Heat and bulky bases favor elimination.'),
  (1,  'E2 mechanism',
       'Concerted: base takes β-H as LG leaves, forming the π bond in one TS. Rate = k[RX][base]. Requires anti-periplanar H–C–C–LG (180°). Preferred by strong bases and by 2°/3° substrates.'),
  (2,  'anti-periplanar requirement',
       'The σ(C–H) and σ(C–X) must be aligned so the developing p orbitals overlap. In Newman terms: H and X opposite. In chairs: both axial. If the only available H is gauche, E2 is slow or gives a different regioisomer.'),
  (3,  'Zaitsev vs. Hofmann',
       'Zaitsev: more substituted alkene (usually E-alkene), from small strong bases (NaOEt, KOH). Hofmann: less substituted alkene, from bulky bases (t-BuOK) or poor LGs that force an early TS. Name the major alkene; do not forget stereochemistry (E vs. Z).'),
  (4,  'E1 mechanism',
       'Same first step as SN1 (R+), then a weak base (often solvent) takes β-H. Rate = k[RX]. Gives Zaitsev alkenes, can rearrange. Competes with SN1 whenever a carbocation exists — you often get a mix.'),
  (5,  'E1 vs. E2 decision',
       'Strong base, bimolecular kinetics, anti geometry, 2°/3° → E2. Weak base, polar protic, 3° (and some 2°), rearrangements → E1. Methyl never eliminates (no β-carbon with H in a useful way for a simple RX).'),
  (6,  'competing SN2 vs. E2 (2° RX)',
       'Primary + small Nu (I−, N3−, CH3O− in CH3OH sometimes) → SN2. Primary + bulky base (t-BuOK) → E2. Secondary + strong bulky base → E2. Secondary + good Nu, polar aprotic, mild base → SN2. Tertiary + strong base → E2; tertiary + weak Nu → SN1/E1 mix.'),
  (7,  'cyclohexane E2',
       'LG and H must both be axial (trans-diaxial). A t-butyl lock can freeze a chair so the only axial H available determines the alkene. This is a favorite 3A exam drawing.'),
  (8,  'deuterium labeling / kinetic isotope',
       'If the β-C–H(D) breaks in the RDS (E2), kH/kD is large. Used conceptually to show E2 is concerted. You will not calculate KIEs, but you should know what they imply.'),
  (9,  'conjugate bases as leaving groups (alcohols)',
       'HO− does not leave. Protonate first (E1 in acid) or convert to OTs/OMs/Br (PBr3, SOCl2) then E2. Acid-catalyzed dehydration of 3° alcohols is classic E1 (rearrangements allowed).'),
  (10, 'Saytzeff spelling / history',
       'Zaitsev (Saytzeff) observed that the more substituted alkene dominates when the base is not bulky. 3A still uses this as a default unless the problem specifies t-butoxide or a bulky ammonium hydroxide (Hofmann).'),
  (11, 'alkene stereochemistry from E2',
       'The anti-periplanar arrangement sets which stereoisomer you get from a given diastereomeric starting material (stereospecific). Draw the Newman, eclipse H and LG opposite, then form the π bond.'),
  (12, 'temperature',
       'Elimination increases ΔS (more molecules / more freedom in the π bond). Higher T favors E over SN. “Heat / reflux” in a 3A recipe is a hint: draw the alkene.'),
  (13, 'β-elimination to alkynes (preview)',
       'Vicinal or geminal dihalides + excess strong base (NaNH2) give alkynes — two successive E2 events. Terminal alkynes need 3 equivalents of NaNH2 then water (the acetylide is deprotonated). Full treatment is Ch 12.'),
  (14, 'common 3A elimination bases',
       'NaOEt / EtOH, KOH / EtOH, t-BuOK / t-BuOH, DBU/DBN (non-nucleophilic). LDA is more 3B/enolate, but you may see it as a very strong bulky base. Never use a Grignard as a “gentle SN2 nucleophile” on a 2° halide — it will deprotonate/eliminate.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Alcohols & Ethers
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'alcohols-ethers'
CROSS JOIN (VALUES
  (0,  'alcohol classification and pKa',
       '1°, 2°, 3° by how many carbons sit on the C–OH carbon. pKa ~ 16–18. Phenols (~10) are 3B. Hydrogen bonding raises bp relative to similar-MW ethers/alkanes. Water-soluble at low carbon count.'),
  (1,  'making alkoxides',
       'ROH + NaH (irreversible, H2 gas) or Na/K metal. A weaker base (NaOH) does not fully deprotonate alcohols (equilibrium). Alkoxides are both strong bases and, if unhindered, SN2 nucleophiles (Williamson).'),
  (2,  'Williamson ether synthesis',
       'RO− + 1° (or methyl) R′X → ROR′ (SN2). Use the alkoxide from the more hindered alcohol and the halide from the less hindered partner. 3° R′X gives E2, not ether.'),
  (3,  'converting OH into a leaving group',
       'Protonate (acid, then SN1/E1). Or PBr3 (1°/2° alcohols → RBr, inversion). SOCl2 / pyridine (RCl, inversion). TsCl / pyridine (ROTs, retention at carbon). Then substitute or eliminate.'),
  (4,  'acid-catalyzed dehydration',
       '3° (easy) and 2° alcohols + H2SO4/heat → alkenes (E1, Zaitsev, rearrangements). 1° alcohols dehydrate with more heat, often E2-like after protonation, still can rearrange via hydride shift to a 2° cation.'),
  (5,  'oxidation of alcohols (3A level)',
       '1° → aldehyde → carboxylic acid with strong oxidants (CrO3, KMnO4, Jones). Stop at aldehyde with PCC or a Swern/DMP-type reagent (names vary by instructor). 2° → ketone. 3°: no C–H on the carbinol carbon, no oxidation under these conditions.'),
  (6,  'Grignard addition to carbonyls (catalog organometallics)',
       'RMgX adds to formaldehyde → 1° alcohol; to aldehyde → 2°; to ketone → 3°. Then H3O+ workup. The C–C bond is the point: you lengthen the carbon chain. Dry ether solvent; no water/alcohol until workup.'),
  (7,  'organolithium vs. Grignard',
       'RLi is more ionic/reactive than RMgX but does the same additions in 3A. Both are destroyed by acids, water, alcohols, amines — any OH/NH. You cannot make RMgX from a molecule that already has OH.'),
  (8,  'from RX to RMgX',
       'RX + Mg in dry ether (or THF). I and Br work best; Cl slower; F no. Vinyl/aryl Grignards are possible (sp2) but alkyl 3° RX often eliminate instead. This is the catalog “organometallics” entry.'),
  (9,  'protecting alcohols (idea)',
       'If you need a Grignard elsewhere, hide OH as a silyl ether (TBDMS) or THP, do the reaction, deprotect. 3A may only mention “protect,” not a full TBDMS mechanism.'),
  (10, 'epoxides from alkenes (preview/crossover)',
       'Peroxyacid (mCPBA) → epoxide (concerted, stereospecific). Acid-catalyzed epoxide opening: Nu attacks the more substituted carbon (SN1-like). Base-catalyzed: Nu attacks the less substituted (SN2).'),
  (11, 'acid-catalyzed ether cleavage',
       'HBr or HI, heat: SN2 on 1°/methyl ethers (methyl ether → MeX + ROH), SN1 on 3°. Anisole-type aryl alkyl ethers cleave the alkyl side. Not a room-temperature water reaction.'),
  (12, 'thiols and sulfides (light)',
       'RSH is more acidic than ROH and a better Nu (polarizable). RS− does clean SN2. Disulfides (RSSR) appear in biochemistry; 3A may skip them. Do not confuse SH acidity with OH.'),
  (13, 'pinacol rearrangement (sometimes 3A)',
       'Vicinal diol + acid → ketone via carbocation and 1,2-shift. A rearrangement showcase. If your instructor skips it, still know 1,2-shifts from SN1.'),
  (14, '3A synthesis logic (alcohols)',
       'Need an alcohol? Hydrate an alkene, SN2 OH− on 1° RX, or Grignard + carbonyl. Need to replace OH? Make a good LG first. Need an ether? Williamson from the less hindered RX. Always ask which carbon is electrophilic.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Alkenes: Structure & Addition
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'alkenes'
CROSS JOIN (VALUES
  (0,  'alkene bonding and geometry',
       'sp2 carbons, trigonal planar, C=C = σ + π. Cis/trans or E/Z. No rotation. Heat of hydrogenation: more substituted alkenes are more stable (hyperconjugation + inductive); trans more stable than cis (steric) except in small cycloalkenes.'),
  (1,  'alkene nomenclature',
       'Parent is the longest chain containing the C=C; number from the end nearer the double bond; the C=C locant is the first olefinic carbon. Include E/Z or cis/trans. Cycloalkenes: the double bond is C1–C2.'),
  (2,  'electrophilic addition (general)',
       'π bond attacks an electrophile, giving a carbocation (or bridged ion), then a nucleophile captures. Markovnikov: H (or the electrophile) ends up so the cation sits on the more substituted carbon. Rearrangements possible whenever a free R+ forms.'),
  (3,  'HX addition',
       'HBr, HCl, HI: Markovnikov, carbocation intermediate, racemization at a new stereocenter, rearrangements. HI fastest, HF not a practical 3A addition. Peroxides + HBr only: radical anti-Markovnikov (exception).'),
  (4,  'acid-catalyzed hydration',
       'Dilute H2SO4 / H2O: Markovnikov alcohol, R+ intermediate, rearrangements. Mechanism: protonate π, water attacks R+, deprotonate. Equilibrium — concentrated acid + heat reverses it (dehydration).'),
  (5,  'oxymercuration–demercuration',
       'Hg(OAc)2 / H2O then NaBH4: Markovnikov alcohol without rearrangement (bridged mercurinium ion; water attacks the more substituted carbon). Stereochemistry: anti opening of the bridge, then demercuration loses stereochemical purity at that carbon.'),
  (6,  'hydroboration–oxidation',
       'BH3·THF (or 9-BBN) then H2O2 / HO−: anti-Markovnikov, syn addition of H and OH. Concerted four-center TS, no free R+. The B goes to the less substituted carbon; oxidation replaces C–B with C–OH with retention.'),
  (7,  'halogenation (Br2, Cl2)',
       'Bridged halonium ion, then backside attack by X− → anti addition of two X (trans-1,2-dihalide from a cis alkene, etc. — stereospecific). No rearrangements. In water: halohydrin (X and OH, OH on the more substituted carbon).'),
  (8,  'halohydrin regiochemistry',
       'Water (not X−) attacks the more substituted carbon of the cyclic halonium (more carbocation character there). Anti stereochemistry. Product is a vicinal halo-alcohol.'),
  (9,  'hydrogenation',
       'H2 / Pd, Pt, or Ni: syn addition of two H, alkane. More substituted alkenes hydrogenate more slowly but are more stable thermodynamically — kinetics vs. thermodynamics. Lindlar (partial) is an alkyne tool.'),
  (10, 'epoxidation and dihydroxylation',
       'mCPBA: syn epoxide (concerted). Acid then water: trans diol (anti opening). OsO4 or cold KMnO4: syn diol. Hot KMnO4 / acid: oxidative cleavage (ketones/acids) — know the cleavage products.'),
  (11, 'ozonolysis (3A level)',
       'O3 then Zn/Me2S (reductive): aldehydes and ketones. O3 then H2O2 (oxidative): ketones and carboxylic acids. Count carbons: the C=C is cut. Useful for structure proof and retrosynthesis.'),
  (12, 'carbocation additions vs. concerted',
       'Free R+ (HX, acid hydration): Markovnikov + rearrangement + mixed stereochemistry. Bridged or concerted (Br2, hydroboration, epoxidation, hydrogenation): stereospecific, usually no rearrangement. That dichotomy is the 3A alkene exam.'),
  (13, 'polymer / radical addition (light)',
       'Peroxide-initiated addition of HBr is the radical exception. Polymerization of alkenes is chemE/materials flavor, not a 3A mechanism drill unless listed. Do not radical-add HCl/HI in the same way — the 3A exception is HBr/ROOR.'),
  (14, 'synthesis: installing an alcohol on an alkene',
       'Need Markovnikov, rearrangement OK: H3O+. Need Markovnikov, no rearrangement: Hg(OAc)2. Need anti-Markovnikov syn: BH3 then H2O2. Need anti X,OH: Br2/H2O. Pick the reagent from the regiochemistry the target demands.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Alkynes & Organometallics
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'alkynes-organometallics'
CROSS JOIN (VALUES
  (0,  'alkyne bonding and acidity',
       'sp carbons, linear. Terminal C–H pKa ~ 25: deprotonated by NaNH2 (not by HO−). Internal alkynes are not acidic at carbon. The acetylide is a carbon nucleophile — the 3A way to make C–C bonds besides Grignard.'),
  (1,  'naming alkynes',
       'Parent includes the triple bond; −yne suffix; locant for the first sp carbon. Enynes number to give the lowest set, often preferring the alkene if there is a tie (instructor-dependent). Terminal = 1-yne.'),
  (2,  'making alkynes from dihalides',
       'Vicinal or geminal dihalide + excess NaNH2 (then water if you want the terminal alkyne, not the sodium acetylide). Two E2 eliminations. This is how 3A goes alkene → dihalide → alkyne.'),
  (3,  'acetylide SN2 (chain elongation)',
       'RC≡C− + methyl or 1° R′X → RC≡CR′. 2°/3° R′X: E2 instead. Then you can reduce or hydrate the new alkyne. Retrosynthesis: split a C–C next to a triple bond.'),
  (4,  'hydrogenation of alkynes',
       'H2 / Pd (excess): all the way to alkane. Lindlar (Pd/CaCO3, quinoline, Pb poison) or Ni2B: stop at cis-alkene. Na / NH3(l): trans-alkene (radical anion, anti). Choose the dissolving-metal vs. Lindlar from the alkene stereochemistry you need.'),
  (5,  'HX and X2 addition to alkynes',
       'First addition Markovnikov (vinyl cation or related; terminal alkyne → geminal dihalide after 2 HX). Excess HX gives geminal dihalide. X2 adds stepwise; excess gives tetrahalide. Vinyl cations are less stable than alkyl — terminal alkynes still follow Markovnikov.'),
  (6,  'hydration of alkynes (Hg2+)',
       'HgSO4 / H2SO4 / H2O: Markovnikov, enol → ketone (tautomerism). Terminal alkyne → methyl ketone. This is 3A''s first look at keto–enol tautomerism; the ketone is the thermodynamic product.'),
  (7,  'hydroboration of alkynes',
       'R2BH (often bulky, Sia2BH or 9-BBN) then H2O2: anti-Markovnikov, terminal alkyne → aldehyde after tautomerism of the enol. Contrast with Hg2+ hydration (ketone). Internal alkynes give ketones either way.'),
  (8,  'tautomerism (keto–enol)',
       'Enol (C=C–OH) ⇌ ketone (CH–C=O). For simple aldehydes/ketones, the keto form dominates. Acid or base catalyzes the shift. You do not isolate the vinyl alcohol from alkyne hydration.'),
  (9,  'Grignard as a base vs. a nucleophile',
       'RMgX deprotonates terminal alkynes, alcohols, water, CO2 workup acids — any acidic H. It adds to C=O (nucleophile) when no acidic H is present. If the substrate has both, the acidic H wins first.'),
  (10, 'carbonation of Grignards',
       'RMgX + CO2 then H3O+ → RCO2H (carboxylic acid, one extra carbon). A 3A/early-3B synthesis step that still uses the organometallic you made in 3A.'),
  (11, 'Gilman reagents (sometimes 3A)',
       'R2CuLi (from 2 RLi + CuI) couple with 1° RX or vinyl/aryl halides (core-type coupling) without the E2 mess of RMgX on 2°/3°. If your lecturer skips cuprates, still know why RMgX fails those couplings.'),
  (12, 'retrosynthesis with acetylides and Grignards',
       'See a new C–C next to an alcohol? Grignard + carbonyl. See an internal alkyne from a smaller piece? Acetylide + 1° RX. See a trans-alkene from an alkyne? Na/NH3. Cis? Lindlar. Write the forward reagents after you disconnect.'),
  (13, 'what 3A does not cover (yet)',
       'Benzene/aromatic substitution, enolates, aldol, carboxylic acid derivatives, and amines as functional-group chapters are CHEM 3B. Do not “invent” a Friedel–Crafts on a 3A midterm.'),
  (14, '3A big picture',
       'Structure (hybrids, resonance, stereochemistry) tells you where charge and orbitals sit. Mechanisms (SN1/2, E1/2, electrophilic addition, radical chains, organometallic addition) tell you how electrons move. Reagents are just named versions of those patterns.')
) AS c(pos, front, back)
WHERE d.slug = 'chem3a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'chem3a';
