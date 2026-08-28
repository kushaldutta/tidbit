-- Migration 055: BIO 1A — General Biology Lecture, full deck rebuild.
-- UC Berkeley Fall 2026. Catalog: cell structure/function, molecular and
-- organismal genetics, animal development, form and function.
-- Textbook: Campbell Biology (11th/12th ed.), the standard Bio 1A text.
-- Three historical units match recent Fall offerings (Schekman / Niyogi / Lones).
--
-- Fall 2026 exams (classes.berkeley.edu, tentative):
--   Midterm 1: Monday, Sep 28, 2026, 8–9 am
--   Midterm 2: Monday, Nov 2, 2026, 8–9 am
--   Final:     Monday, Dec 14, 2026, 7–10 pm

-- ─────────────────────────────────────────────────────────────
-- 0. Wipe any existing hand-entered / leftover tidbit cards
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'bio1a');

DELETE FROM public.tidbits
WHERE category_id = 'bio1a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'bio1a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'bio1a');

UPDATE public.decks
SET title = 'BIO 1A',
    description = 'General Biology Lecture — cells, genetics, development, and animal physiology (Campbell Biology)',
    cover_emoji = '🔬'
WHERE slug = 'bio1a';

-- ─────────────────────────────────────────────────────────────
-- 1. Sections (Campbell chapters as taught in Bio 1A)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('chemistry-macromolecules', 'Chemistry of Life & Macromolecules',
   'Water, carbon chemistry, proteins, lipids, carbs, nucleic acids (Ch 2–5)', 0),
  ('cells-membranes',          'Cell Structure & Membranes',
   'Organelles, cytoskeleton, membrane structure, transport (Ch 6–7)', 1),
  ('energy-enzymes',           'Energy, Enzymes & Metabolism',
   'Free energy, ATP, enzyme kinetics, regulation (Ch 8)', 2),
  ('respiration-photosynthesis','Respiration & Photosynthesis',
   'Glycolysis, TCA, ETC, fermentation, light and Calvin cycles (Ch 9–10)', 3),
  ('cell-division',            'Mitosis & Meiosis',
   'Cell cycle, mitosis, meiosis, crossing over (Ch 12–13)', 4),
  ('mendelian-chromosomal',    'Mendelian & Chromosomal Genetics',
   'Mendel, linkage, sex linkage, chromosomal inheritance (Ch 14–15)', 5),
  ('molecular-genetics',       'DNA Replication & Gene Expression',
   'DNA structure, replication, transcription, translation, genetic code (Ch 16–17)', 6),
  ('regulation-biotech',       'Gene Regulation, Genomes & Biotech',
   'Operons, eukaryotic regulation, epigenetics, CRISPR, cancer (Ch 18–21)', 7),
  ('signaling-development',    'Cell Signaling & Development',
   'Signal transduction, animal development, stem cells (Ch 11, 47)', 8),
  ('animal-physiology',        'Animal Form, Function & Physiology',
   'Homeostasis, endocrine, nervous, immune, circulation, excretion (Ch 40–50)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'bio1a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Chemistry of Life & Macromolecules  (Ch 2–5)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'chemistry-macromolecules'
CROSS JOIN (VALUES
  (0,  'polar covalent bond',
       'Electrons are shared unequally; the more electronegative atom (e.g. O in H2O) carries a partial negative charge.'),
  (1,  'hydrogen bond',
       'Weak attraction between a partially positive H (bonded to O or N) and a nearby electronegative atom; explains water cohesion, DNA base pairing, and protein secondary structure.'),
  (2,  'emergent properties of water',
       'Cohesion/adhesion, high specific heat, high heat of vaporization, expansion upon freezing, and versatility as a solvent — all due to hydrogen bonding.'),
  (3,  'pH',
       'pH = −log10[H+]; each unit is a 10-fold change in [H+]. Buffers (weak acid + conjugate base) resist pH change in cells.'),
  (4,  'carbon skeleton',
       'Carbon forms four covalent bonds and can make chains, rings, and double bonds; the backbone of organic molecules.'),
  (5,  'functional group',
       'A chemically reactive group attached to a carbon skeleton (hydroxyl, carbonyl, carboxyl, amino, sulfhydryl, phosphate, methyl) that determines molecular properties.'),
  (6,  'dehydration synthesis vs. hydrolysis',
       'Dehydration joins monomers by removing H2O; hydrolysis splits polymers by adding H2O.'),
  (7,  'carbohydrate',
       'Sugars and polymers of sugars; glycosidic bonds. Monosaccharides (glucose) fuel cells; starch/glycogen store energy; cellulose/chitin are structural.'),
  (8,  'lipid',
       'Hydrophobic molecules: fats (triacylglycerols), phospholipids (bilayer), and steroids (cholesterol, hormones). Saturated fats pack tightly; unsaturated have kinks from double bonds.'),
  (9,  'protein primary structure',
       'The linear amino-acid sequence, joined by peptide bonds; determines all higher levels of folding.'),
  (10, 'protein secondary / tertiary / quaternary structure',
       'Secondary: α-helix and β-sheet from backbone H-bonds. Tertiary: overall 3-D fold from side-chain interactions. Quaternary: assembly of multiple polypeptides.'),
  (11, 'denaturation',
       'Loss of a protein native fold (heat, pH, salt) that typically abolishes function; primary sequence remains intact.'),
  (12, 'nucleic acid',
       'Polymer of nucleotides (sugar + phosphate + nitrogenous base) linked by phosphodiester bonds. DNA stores information; RNA is the working copy.'),
  (13, 'complementary base pairing',
       'A pairs with T (or U in RNA) via 2 H-bonds; G pairs with C via 3 H-bonds. Explains DNA replication fidelity and transcription.'),
  (14, 'central dogma',
       'Information flows DNA → RNA → protein. Reverse transcriptase (in retroviruses) is the notable exception.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Cell Structure & Membranes  (Ch 6–7)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cells-membranes'
CROSS JOIN (VALUES
  (0,  'cell theory',
       'All living organisms are made of cells; the cell is the basic unit of life; all cells arise from preexisting cells.'),
  (1,  'prokaryote vs. eukaryote',
       'Prokaryotes lack a nucleus and membrane-bound organelles; eukaryotes have both. Both have plasma membrane, cytosol, ribosomes, and DNA.'),
  (2,  'nucleus',
       'Houses chromosomes; nuclear envelope with pores; nucleolus assembles ribosomal subunits.'),
  (3,  'endomembrane system',
       'Nuclear envelope, ER, Golgi, lysosomes, vesicles, and plasma membrane — a connected trafficking network for protein and lipid processing.'),
  (4,  'rough ER vs. smooth ER',
       'Rough ER: ribosomes synthesize secreted/membrane proteins. Smooth ER: lipid synthesis, detoxification, Ca2+ storage.'),
  (5,  'Golgi apparatus',
       'Cis-to-trans stack that modifies, sorts, and packages proteins and lipids into vesicles destined for secretion, membranes, or lysosomes.'),
  (6,  'lysosome',
       'Acidic organelle with hydrolases that digest macromolecules; autophagy recycles damaged organelles.'),
  (7,  'mitochondrion',
       'Site of cellular respiration (TCA + oxidative phosphorylation); double membrane; has its own circular DNA and 70S ribosomes.'),
  (8,  'chloroplast',
       'Site of photosynthesis in plants and algae; thylakoids stacked as grana; also has its own DNA. Endosymbiotic origin shared with mitochondria.'),
  (9,  'cytoskeleton',
       'Microtubules (tubulin; tracks for kinesin/dynein, mitotic spindle), microfilaments (actin; cell shape, myosin motors), intermediate filaments (mechanical strength).'),
  (10, 'fluid mosaic model',
       'Plasma membrane is a phospholipid bilayer with embedded proteins that can diffuse laterally; cholesterol modulates fluidity.'),
  (11, 'selective permeability',
       'Small nonpolar molecules (O2, CO2) cross freely; ions and large polar molecules need proteins. Amphipathic phospholipids create the barrier.'),
  (12, 'passive transport',
       'Diffusion down a concentration (or electrochemical) gradient; no ATP. Includes simple diffusion, facilitated diffusion, and osmosis.'),
  (13, 'osmosis (animal vs. plant cell)',
       'Water moves toward higher solute concentration. Animal cells lyse in hypotonic solution; plant cells become turgid (cell wall prevents bursting).'),
  (14, 'active transport',
       'Moves solutes against their gradient using ATP (e.g. Na+/K+ pump: 3 Na+ out, 2 K+ in). Coupled (secondary) active transport uses an ion gradient as the energy source.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Energy, Enzymes & Metabolism  (Ch 8)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'energy-enzymes'
CROSS JOIN (VALUES
  (0,  'metabolism',
       'The sum of all chemical reactions in an organism; catabolism breaks down molecules (releases energy); anabolism builds them (requires energy).'),
  (1,  'first law of thermodynamics',
       'Energy is conserved: it can be transferred or transformed but not created or destroyed.'),
  (2,  'second law of thermodynamics',
       'Every energy transfer increases the entropy (disorder) of the universe; living systems remain ordered by exporting entropy as heat.'),
  (3,  'Gibbs free energy (ΔG)',
       'ΔG = ΔH − TΔS. Spontaneous (exergonic) reactions have ΔG < 0; endergonic reactions (ΔG > 0) require energy input.'),
  (4,  'ATP as energy currency',
       'Hydrolysis of ATP → ADP + Pi is highly exergonic; cells couple it to endergonic reactions via phosphorylated intermediates.'),
  (5,  'activation energy (Ea)',
       'The energy barrier that must be crossed for reactants to become products; enzymes lower Ea without changing ΔG.'),
  (6,  'enzyme active site',
       'The pocket where substrate binds (induced fit); orients substrates and stabilizes the transition state.'),
  (7,  'enzyme kinetics (Vmax, KM)',
       'Vmax is the maximum rate when enzyme is saturated. KM is the [substrate] at ½ Vmax; lower KM means higher affinity.'),
  (8,  'competitive inhibition',
       'Inhibitor binds the active site; can be overcome by more substrate. Raises apparent KM; Vmax unchanged.'),
  (9,  'noncompetitive (allosteric) inhibition',
       'Inhibitor binds elsewhere and changes enzyme shape; Vmax decreases; extra substrate cannot fully overcome it.'),
  (10, 'allosteric regulation',
       'A molecule binds a site other than the active site and stabilizes the active or inactive form; common in multi-subunit enzymes.'),
  (11, 'feedback inhibition',
       'The end product of a pathway allosterically inhibits an early enzyme, preventing overproduction.'),
  (12, 'cofactor vs. coenzyme',
       'Cofactor: non-protein helper (often a metal ion). Coenzyme: organic cofactor (NAD+, FAD, coenzyme A), often derived from vitamins.'),
  (13, 'energy coupling',
       'Using the free energy of an exergonic process (ATP hydrolysis, ion gradient) to drive an endergonic one so the overall ΔG is negative.'),
  (14, 'redox reaction',
       'Oxidation is loss of electrons (often as H); reduction is gain of electrons. NAD+ is reduced to NADH, which carries high-energy electrons to the ETC.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Respiration & Photosynthesis  (Ch 9–10)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'respiration-photosynthesis'
CROSS JOIN (VALUES
  (0,  'cellular respiration (overall)',
       'C6H12O6 + 6 O2 → 6 CO2 + 6 H2O + energy. Glucose is oxidized; O2 is the final electron acceptor.'),
  (1,  'glycolysis',
       'In the cytosol: glucose → 2 pyruvate + 2 ATP (net) + 2 NADH. Does not require oxygen.'),
  (2,  'pyruvate oxidation',
       'In the mitochondrial matrix: pyruvate → acetyl-CoA + CO2 + NADH, catalyzed by pyruvate dehydrogenase.'),
  (3,  'citric acid cycle (TCA / Krebs)',
       'Acetyl-CoA + oxaloacetate → citrate; one turn yields 2 CO2, 3 NADH, 1 FADH2, 1 GTP/ATP, and regenerates oxaloacetate.'),
  (4,  'electron transport chain (respiration)',
       'NADH/FADH2 donate electrons to complexes I–IV in the inner mitochondrial membrane; O2 is reduced to H2O at complex IV.'),
  (5,  'chemiosmosis / oxidative phosphorylation',
       'ETC pumps H+ into the intermembrane space; ATP synthase lets H+ flow back, driving ADP + Pi → ATP. Yields most of the ATP from glucose.'),
  (6,  'fermentation',
       'Regenerates NAD+ in the absence of O2 so glycolysis can continue. Lactic acid: pyruvate → lactate. Alcohol: pyruvate → ethanol + CO2.'),
  (7,  'photosynthesis (overall)',
       '6 CO2 + 6 H2O + light → C6H12O6 + 6 O2. Water is oxidized (O2 comes from H2O); CO2 is reduced to sugar.'),
  (8,  'light reactions',
       'In thylakoid membranes: photosystems II then I absorb photons, split H2O, produce O2, ATP (photophosphorylation), and NADPH.'),
  (9,  'photosystem II and I',
       'PSII (P680) oxidizes water and feeds electrons down the chain; PSI (P700) reduces NADP+ to NADPH. Noncyclic (Z-scheme) flow makes both ATP and NADPH.'),
  (10, 'Calvin cycle',
       'In the stroma: Rubisco fixes CO2 onto RuBP → 3-PGA; ATP and NADPH reduce it to G3P; some G3P exits as sugar, the rest regenerates RuBP.'),
  (11, 'photorespiration',
       'When O2 competes with CO2 at Rubisco, carbon is wasted; C4 and CAM plants concentrate CO2 to minimize it.'),
  (12, 'C4 vs. CAM photosynthesis',
       'C4: spatial separation (mesophyll then bundle-sheath). CAM: temporal separation (stomata open at night). Both use PEP carboxylase for initial CO2 capture.'),
  (13, 'NADH vs. NADPH',
       'NADH carries electrons in catabolism (respiration). NADPH carries electrons in anabolism (Calvin cycle, biosynthesis).'),
  (14, 'substrate-level vs. oxidative phosphorylation',
       'Substrate-level: ATP made by direct phosphate transfer (glycolysis, TCA). Oxidative: ATP made by chemiosmosis at ATP synthase.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Mitosis & Meiosis  (Ch 12–13)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cell-division'
CROSS JOIN (VALUES
  (0,  'chromosome vs. chromatid',
       'A chromosome is a DNA molecule + proteins. After S phase it consists of two sister chromatids joined at the centromere; they become separate chromosomes once they split.'),
  (1,  'cell cycle phases',
       'G1 (growth), S (DNA replication), G2 (prepare to divide), M (mitosis + cytokinesis). G0 is a nondividing resting state.'),
  (2,  'mitosis stages',
       'Prophase/prometaphase: chromosomes condense, spindle forms, nuclear envelope breaks. Metaphase: aligned at plate. Anaphase: sisters separate. Telophase: nuclei reform.'),
  (3,  'kinetochore',
       'Protein complex at the centromere that attaches microtubules; tension at kinetochores satisfies the spindle assembly checkpoint.'),
  (4,  'cytokinesis',
       'Animal cells: contractile actin-myosin ring pinches a cleavage furrow. Plant cells: cell plate forms from Golgi vesicles.'),
  (5,  'G1 / G2 / M checkpoints',
       'G1: is the environment favorable and DNA intact? G2: is replication complete? M: are all kinetochores attached? Failure can arrest the cycle or trigger apoptosis.'),
  (6,  'cyclin–CDK',
       'Cyclins accumulate and bind cyclin-dependent kinases; the complex phosphorylates targets that drive the cycle. Cyclins are then degraded.'),
  (7,  'haploid vs. diploid',
       'Haploid (n): one set of chromosomes (gametes). Diploid (2n): two homologous sets (somatic cells). Humans: n = 23, 2n = 46.'),
  (8,  'meiosis I vs. meiosis II',
       'Meiosis I separates homologous chromosomes (reductional). Meiosis II separates sister chromatids (equational), like mitosis on haploid cells.'),
  (9,  'crossing over (recombination)',
       'In prophase I, homologous chromosomes form a synaptonemal complex and exchange DNA at chiasmata; a major source of genetic diversity.'),
  (10, 'independent assortment',
       'Each homologous pair orients independently at metaphase I; 2^n combinations of chromosomes in gametes (n = haploid number).'),
  (11, 'nondisjunction',
       'Homologs or sisters fail to separate; gametes get n+1 or n−1 chromosomes. Aneuploidy (e.g. trisomy 21) results after fertilization.'),
  (12, 'mitosis vs. meiosis outcome',
       'Mitosis: two genetically identical diploid daughters. Meiosis: four genetically unique haploid gametes.'),
  (13, 'synapsis',
       'Pairing of homologous chromosomes in prophase I so that crossing over can occur; does not happen in mitosis.'),
  (14, 'cancer and the cell cycle',
       'Cancer cells ignore checkpoints (e.g. p53 loss, overactive Ras) and often have unlimited division (telomerase). Proto-oncogenes become oncogenes when hyperactivated; tumor suppressors must lose both copies.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Mendelian & Chromosomal Genetics  (Ch 14–15)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'mendelian-chromosomal'
CROSS JOIN (VALUES
  (0,  'allele',
       'An alternative version of a gene at a given locus. Diploid organisms have two alleles per locus (one from each parent).'),
  (1,  'genotype vs. phenotype',
       'Genotype is the allelic makeup (AA, Aa, aa). Phenotype is the observable trait, which also depends on environment.'),
  (2,  'Mendel law of segregation',
       'The two alleles of a gene separate into different gametes during meiosis; each gamete gets one.'),
  (3,  'Mendel law of independent assortment',
       'Alleles of different genes on different chromosomes segregate independently; a dihybrid AaBb produces four equally likely gametes.'),
  (4,  'Punnett square (monohybrid)',
       'Aa × Aa → 1 AA : 2 Aa : 1 aa genotypic ratio and 3:1 phenotypic ratio if A is completely dominant.'),
  (5,  'testcross',
       'Cross an individual of unknown genotype with a homozygous recessive; offspring ratios reveal whether the unknown was homozygous or heterozygous.'),
  (6,  'incomplete dominance',
       'Heterozygote phenotype is intermediate (red × white → pink). Genotypic and phenotypic ratios of F2 are both 1:2:1.'),
  (7,  'codominance',
       'Both alleles are fully expressed (ABO blood type: IA and IB). Not blending.'),
  (8,  'epistasis',
       'One gene masks or modifies the phenotypic expression of another (e.g. labrador coat color: B/b pigment, E/e deposition).'),
  (9,  'sex-linked inheritance',
       'Genes on the X (or Y) chromosome. X-linked recessives (hemophilia, color blindness) appear more in XY individuals, who are hemizygous.'),
  (10, 'linked genes',
       'Genes on the same chromosome that tend to be inherited together; recombination frequency < 50% maps their distance in centimorgans.'),
  (11, 'recombination frequency',
       'RF = recombinant offspring / total. 1 map unit = 1% recombination. RF = 50% means unlinked (different chromosomes or far apart).'),
  (12, 'Barr body',
       'Inactivated X chromosome in XX cells (dosage compensation); explains calico cats and mosaic X-linked phenotypes.'),
  (13, 'pedigree analysis',
       'Squares = males, circles = females; filled = affected. Autosomal recessive skips generations; autosomal dominant appears every generation; X-linked recessive never father-to-son.'),
  (14, 'polygenic inheritance',
       'Many loci contribute additively to a quantitative trait (height, skin color), producing a continuous, often bell-shaped distribution.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. DNA Replication & Gene Expression  (Ch 16–17)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'molecular-genetics'
CROSS JOIN (VALUES
  (0,  'Watson–Crick DNA structure',
       'Antiparallel double helix; sugar-phosphate backbone outside, bases inside. Semiconservative replication follows from complementary pairing.'),
  (1,  'semiconservative replication',
       'Each daughter duplex has one parental strand and one new strand (Meselson–Stahl).'),
  (2,  'origin of replication',
       'Site where helicase unwinds DNA and replication forks form. Bacteria: one origin. Eukaryotes: many origins per chromosome.'),
  (3,  'DNA polymerase',
       'Adds dNTPs to a 3-OH (synthesis 5→3 only). Requires an RNA primer (primase). Polymerase III is the main bacterial replicase; polymerase I removes primers.'),
  (4,  'leading vs. lagging strand',
       'Leading: continuous synthesis toward the fork. Lagging: Okazaki fragments synthesized away from the fork, later joined by DNA ligase.'),
  (5,  'proofreading and mismatch repair',
       'DNA polymerase 3→5 exonuclease removes mispaired bases. Mismatch repair (MutS/MutL) fixes remaining errors after replication.'),
  (6,  'telomere / telomerase',
       'Chromosome ends shorten because lagging-strand primers leave a gap. Telomerase (an RNA-templated reverse transcriptase) extends telomeres in germ and stem cells.'),
  (7,  'transcription',
       'RNA polymerase synthesizes RNA 5→3 from a DNA template (reads 3→5). Promoter (TATA box in eukaryotes) positions initiation; terminator (or poly-A signal) ends it.'),
  (8,  'mRNA processing (eukaryotes)',
       '5 cap, 3 poly-A tail, and splicing of introns by the spliceosome (snRNPs). Alternative splicing yields multiple proteins from one gene.'),
  (9,  'genetic code',
       'Triplet, degenerate (redundant), nearly universal, non-overlapping. Start: AUG (Met). Stops: UAA, UAG, UGA.'),
  (10, 'tRNA and wobble',
       'tRNA carries an amino acid at the 3 end and an anticodon that pairs with the codon. Wobble at the third codon position lets one tRNA read multiple codons.'),
  (11, 'translation stages',
       'Initiation: ribosome + Met-tRNA at start codon. Elongation: A site codon recognition, peptide bond (peptidyl transferase, a ribozyme), translocation. Termination: release factor at stop codon.'),
  (12, 'ribosome sites A / P / E',
       'A: incoming aminoacyl-tRNA. P: peptidyl-tRNA holding the chain. E: exiting deacylated tRNA.'),
  (13, 'silent / missense / nonsense mutation',
       'Silent: same amino acid. Missense: different amino acid. Nonsense: premature stop. Frameshift (indel not multiple of 3) scrambles all downstream codons.'),
  (14, 'Beadle and Tatum one-gene–one-enzyme',
       'Each gene encodes a polypeptide (updated from enzyme). Neurospora auxotrophs mapped a linear biosynthetic pathway.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Gene Regulation, Genomes & Biotech  (Ch 18–21)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'regulation-biotech'
CROSS JOIN (VALUES
  (0,  'operon',
       'A cluster of bacterial genes transcribed as one mRNA from a shared promoter, controlled by an operator.'),
  (1,  'lac operon',
       'Inducible: allolactose inactivates the repressor so lactose-metabolizing genes are on. Glucose low → cAMP–CAP activates transcription (positive control).'),
  (2,  'trp operon',
       'Repressible: tryptophan activates the repressor, turning off biosynthetic genes when the amino acid is abundant.'),
  (3,  'eukaryotic transcriptional regulation',
       'Enhancers (distant DNA) bind activators that loop to the promoter with mediators and transcription factors; silencers / repressors oppose them.'),
  (4,  'chromatin remodeling',
       'Histone acetylation loosens chromatin (on); histone methylation and DNA methylation (CpG) often silence genes. Heterochromatin is condensed and inactive.'),
  (5,  'epigenetics',
       'Heritable gene-expression states not encoded in the DNA sequence (imprinting, X-inactivation, histone/DNA marks) that can persist through mitosis.'),
  (6,  'miRNA / RNAi',
       'Small RNAs loaded onto RISC bind complementary mRNA, causing degradation or translational block — a post-transcriptional control.'),
  (7,  'differential gene expression',
       'Nearly all cells in an organism share the same genome; cell type is defined by which genes are transcribed.'),
  (8,  'recombinant DNA / plasmid',
       'A plasmid is a circular extra-chromosomal DNA used as a cloning vector. Restriction enzymes cut palindromic sites; ligase joins DNA from different sources.'),
  (9,  'PCR',
       'Heat denature, anneal primers, extend with heat-stable polymerase (Taq); each cycle doubles the target. Exponential amplification of a defined DNA segment.'),
  (10, 'gel electrophoresis',
       'DNA (negative) migrates toward the anode; smaller fragments move farther through the agarose matrix. Used to size and separate DNA.'),
  (11, 'CRISPR–Cas9',
       'Guide RNA directs Cas9 nuclease to a complementary genomic site next to a PAM; a double-strand break is repaired by NHEJ (knockout) or HDR (precise edit).'),
  (12,  'genome',
       'The complete DNA content of an organism. Humans: ~3 billion bp, ~20,000 protein-coding genes; most DNA is noncoding (introns, repeats, regulatory).'),
  (13, 'proto-oncogene vs. tumor suppressor',
       'Proto-oncogene (e.g. Ras, Myc): gain-of-function of one allele can drive cancer. Tumor suppressor (e.g. p53, Rb): both alleles must be lost (two-hit).'),
  (14, 'cDNA',
       'DNA reverse-transcribed from mRNA; lacks introns. Used to clone eukaryotic genes in bacteria and to measure expressed sequences.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Cell Signaling & Development  (Ch 11, 47)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'signaling-development'
CROSS JOIN (VALUES
  (0,  'three stages of cell signaling',
       'Reception (ligand binds receptor), transduction (relay / cascade), response (gene expression, enzyme activity, or cytoskeletal change).'),
  (1,  'ligand–receptor specificity',
       'A signal molecule fits a receptor binding site; only cells with that receptor respond, even if the ligand is everywhere.'),
  (2,  'G protein-coupled receptor (GPCR)',
       'Ligand activates a G protein (GDP → GTP); the G protein then turns on an effector (adenylyl cyclase, phospholipase C). GTP hydrolysis resets it.'),
  (3,  'receptor tyrosine kinase (RTK)',
       'Ligand-induced dimerization; each monomer phosphorylates tyrosines on the other (autophosphorylation); phosphotyrosines recruit intracellular proteins.'),
  (4,  'ligand-gated ion channel',
       'Ligand binding opens (or closes) a channel; ions flow down their gradient and change membrane potential (e.g. nicotinic ACh receptor at synapses).'),
  (5,  'second messenger',
       'Small intracellular molecule that spreads the signal: cAMP, IP3, DAG, Ca2+. Amplifies and speeds the response.'),
  (6,  'phosphorylation cascade',
       'A kinase phosphorylates the next kinase; phosphatases reverse it. Allows amplification, branching, and rapid on/off control.'),
  (7,  'apoptosis',
       'Programmed cell death: caspases dismantle the cell without inflammation. Used in development (digit formation) and to remove damaged cells.'),
  (8,  'fertilization (animal)',
       'Sperm–egg fusion; fast block (membrane depolarization) and slow block (cortical granule reaction / fertilization envelope) prevent polyspermy.'),
  (9,  'cleavage',
       'Rapid mitotic divisions of the zygote without growth, producing a blastula (blastocyst in mammals) from a morula.'),
  (10, 'gastrulation',
       'Cell movements that form three germ layers: ectoderm (skin, nervous system), mesoderm (muscle, bone, blood), endoderm (gut lining, lungs, liver).'),
  (11, 'neurulation',
       'Dorsal ectoderm folds into the neural tube (CNS); neural crest cells migrate to form PNS, pigment cells, and craniofacial structures.'),
  (12, 'induction / morphogen',
       'One group of cells signals neighbors to adopt a fate. A morphogen (e.g. Bicoid, Sonic hedgehog) forms a concentration gradient that specifies position.'),
  (13, 'stem cell',
       'Self-renewing cell that can differentiate. Totipotent: whole organism. Pluripotent (ES / iPS): all body cell types. Multipotent: a restricted lineage.'),
  (14, 'cytoplasmic determinants',
       'Maternally deposited mRNAs and proteins unevenly distributed in the egg; after cleavage, different blastomeres inherit different determinants and fates.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Animal Form, Function & Physiology  (Ch 40–50)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'animal-physiology'
CROSS JOIN (VALUES
  (0,  'homeostasis',
       'Maintenance of a stable internal environment (temperature, pH, osmolarity, glucose) despite external change; usually by negative feedback.'),
  (1,  'negative vs. positive feedback',
       'Negative: response opposes the stimulus (thermoregulation, blood glucose). Positive: response amplifies the stimulus (oxytocin in childbirth, blood clotting).'),
  (2,  'endotherm vs. ectotherm',
       'Endotherms generate metabolic heat to regulate body temperature; ectotherms rely mainly on the environment. Both can still behaviorally thermoregulate.'),
  (3,  'endocrine vs. nervous signaling',
       'Endocrine: hormones via blood, slower, longer-lasting, broadcast. Nervous: action potentials and synapses, fast, spatially precise.'),
  (4,  'peptide vs. steroid hormone',
       'Peptide/amine: water-soluble, cell-surface receptor, second messengers. Steroid/thyroid: lipid-soluble, intracellular receptor, change transcription.'),
  (5,  'hypothalamus–pituitary axis',
       'Hypothalamus controls anterior pituitary with releasing hormones (portal system) and posterior pituitary by neurons (ADH, oxytocin stored and released).'),
  (6,  'resting membrane potential',
       'Typical neuron ~ −70 mV: Na+/K+ pump (3 Na out / 2 K in) plus K+ leak channels make the inside negative relative to outside.'),
  (7,  'action potential',
       'Depolarization past threshold opens voltage-gated Na+ channels (rising phase); they inactivate and voltage-gated K+ channels open (falling phase / undershoot). All-or-none, regenerative.'),
  (8,  'synapse',
       'Chemical: AP opens Ca2+ channels; vesicles release neurotransmitter onto ligand-gated receptors (EPSP or IPSP). Electrical: gap junctions couple cells directly.'),
  (9,  'CNS vs. PNS',
       'CNS: brain and spinal cord. PNS: sensory (afferent) and motor (efferent). Motor splits into somatic (skeletal muscle) and autonomic (sympathetic / parasympathetic).'),
  (10, 'innate vs. adaptive immunity',
       'Innate: barriers, phagocytes, complement, inflammation; rapid and nonspecific. Adaptive: B and T lymphocytes, antigen-specific, memory, slower primary response.'),
  (11, 'antibody (humoral) vs. cell-mediated immunity',
       'B cells / antibodies neutralize extracellular pathogens. Cytotoxic T cells (CD8) kill infected cells presenting antigen on MHC I. Helper T cells (CD4) coordinate via MHC II.'),
  (12, 'closed circulatory system (mammal)',
       'Double circuit: pulmonary (right heart → lungs) and systemic (left heart → body). Arteries away, veins toward, capillaries for exchange. SA node is the pacemaker.'),
  (13, 'gas exchange',
       'O2 and CO2 move by diffusion. Alveoli maximize surface area; hemoglobin binds O2 cooperatively. CO2 is mostly carried as bicarbonate.'),
  (14, 'osmoregulation / kidney nephron',
       'Filtration at glomerulus, reabsorption and secretion along tubule. Loop of Henle creates a medullary osmotic gradient so collecting ducts (ADH / aquaporins) can make concentrated urine.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- ─────────────────────────────────────────────────────────────
-- Update card count
-- ─────────────────────────────────────────────────────────────
UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'bio1a';
