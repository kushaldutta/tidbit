-- Migration 056: BIO 1B — General Biology Lecture and Laboratory, full deck rebuild.
-- UC Berkeley Fall 2026. Catalog: plant development, form, and function;
-- population genetics, ecology, and evolution. Sponsored by Integrative Biology.
-- Textbook: Campbell Biology (11th/12th ed.); OpenStax Biology 2e is an accepted alt.
-- Three faculty units (Evolution → Ecology → Organismal Biology), matching
-- https://ib.berkeley.edu/courses/bio1b/

-- ─────────────────────────────────────────────────────────────
-- 0. Wipe leftover cards/sections
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'bio1b');

DELETE FROM public.tidbits
WHERE category_id = 'bio1b';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'bio1b');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'bio1b');

UPDATE public.decks
SET title = 'BIO 1B',
    description = 'General Biology — evolution, ecology, and plant/organismal biology (Campbell Biology)',
    cover_emoji = '🌿'
WHERE slug = 'bio1b';

-- ─────────────────────────────────────────────────────────────
-- 1. Sections
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('darwin-evidence',          'Darwin & Evidence of Evolution',
   'Natural selection, homology, fossil record as evidence (Ch 22)', 0),
  ('population-genetics',      'Population Genetics',
   'Hardy–Weinberg, mutation, drift, gene flow, selection (Ch 23)', 1),
  ('speciation-phylogeny',     'Speciation, Sexual Selection & Phylogeny',
   'Species concepts, reproductive isolation, trees, homology (Ch 24, 26)', 2),
  ('history-of-life',          'History of Life & Human Evolution',
   'Origin of life, radiations, mass extinctions, hominins (Ch 25, 34)', 3),
  ('climate-biomes',           'Climate, Biomes & Distributions',
   'Climate drivers, terrestrial/aquatic biomes, niche, range (Ch 52)', 4),
  ('population-ecology',       'Population Ecology',
   'Demography, exponential/logistic growth, life history (Ch 53)', 5),
  ('community-ecology',        'Community Ecology',
   'Interactions, competition, succession, diversity, disease (Ch 54)', 6),
  ('ecosystems-conservation',  'Ecosystems, Climate Change & Conservation',
   'Energy flow, nutrient cycles, biodiversity crisis (Ch 55–56)', 7),
  ('microbial-plant-diversity', 'Microbes, Fungi & Land Plants',
   'Prokaryotes, fungi, algae, bryophytes, seed plants (Ch 27–31)', 8),
  ('plant-form-function',      'Plant Form, Function & Physiology',
   'Tissues, growth, water transport, hormones, tropisms (Ch 35–39)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'bio1b'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Darwin & Evidence of Evolution  (Ch 22)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'darwin-evidence'
CROSS JOIN (VALUES
  (0,  'evolution (biological)',
       'Change in allele frequencies in a population over generations; descent with modification from common ancestors.'),
  (1,  'Darwin''s two main claims',
       'Species share common ancestry, and natural selection is the chief mechanism that adapts populations to their environment.'),
  (2,  'natural selection',
       'Individuals with heritable traits that confer higher survival or reproduction leave more offspring; those traits increase in frequency. Selection acts on individuals; populations evolve.'),
  (3,  'requirements for natural selection',
       'Variation in a trait, heritability of that variation, and differential reproductive success correlated with the trait.'),
  (4,  'fitness (evolutionary)',
       'Relative contribution of an individual (or genotype) to the next generation''s gene pool; not synonymous with strength or health.'),
  (5,  'adaptation',
       'A heritable trait that increases fitness in a given environment, produced by natural selection — not by an individual trying to change.'),
  (6,  'homology',
       'Similarity due to shared ancestry (forelimb bones of tetrapods). Distinguished from analogy/homoplasy, which is similarity from convergent evolution.'),
  (7,  'vestigial structure',
       'A reduced remnant of a trait that had a function in ancestors (whale pelvis, human appendix/coccyx); evidence of descent.'),
  (8,  'fossil record as evidence',
       'Documents extinct forms, transitional series (e.g. tetrapod origins, whale evolution), and the temporal order of appearance of taxa.'),
  (9,  'biogeography',
       'Geographic distribution of species reflects history (continental drift, island colonization). Closely related species often occupy adjacent regions.'),
  (10, 'artificial selection',
       'Humans choose breeders with desired traits; Darwin used it as an analogy for natural selection (pigeons, crops, dogs).'),
  (11, 'Lamarck vs. Darwin',
       'Lamarck: inheritance of acquired characteristics and inner drive toward complexity. Darwin: variation is undirected; selection sorts existing heritable variation.'),
  (12,  'modern synthesis',
       'Fusion of Darwinian selection with Mendelian genetics: evolution is change in allele frequencies; mutation supplies variation; selection, drift, and gene flow change frequencies.'),
  (13, 'direct observation of evolution',
       'Examples include antibiotic resistance, pesticide resistance, and Darwin''s finch beak shifts after drought — selection can be rapid.'),
  (14, 'evolution does not imply progress',
       'Selection has no predetermined goal; traits that are adaptive now can become liabilities if the environment changes. Complexity is not always favored.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Population Genetics  (Ch 23)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'population-genetics'
CROSS JOIN (VALUES
  (0,  'population (evolutionary)',
       'A group of individuals of the same species that live in the same area and interbreed, producing fertile offspring; the unit that evolves.'),
  (1,  'gene pool',
       'All copies of every allele at every locus in a population. Allele frequency is the proportion of a given allele in that pool.'),
  (2,  'Hardy–Weinberg equilibrium',
       'If mating is random and no evolutionary forces act, p² + 2pq + q² = 1 (genotype frequencies) and allele frequencies p, q stay constant. A null model.'),
  (3,  'Hardy–Weinberg assumptions',
       'No mutation, no gene flow, no selection, infinite (or very large) population size, and random mating. Violation of any one can change frequencies.'),
  (4,  'calculating allele frequency',
       'For two alleles, p = freq(A) = (2 N_AA + N_Aa) / 2N. q = 1 − p. Observed genotype frequencies compared to p², 2pq, q² test for equilibrium.'),
  (5,  'mutation as a force',
       'Ultimate source of new alleles; per-locus rates are small so mutation alone changes frequencies slowly. Recombination shuffles existing variation.'),
  (6,  'genetic drift',
       'Random change in allele frequencies, strongest in small populations. Causes loss of heterozygosity and can fix deleterious alleles.'),
  (7,  'founder effect',
       'A few individuals colonize a new area; the new gene pool is a biased sample of the source. A form of drift.'),
  (8,  'bottleneck',
       'A sharp reduction in population size (disaster, hunting) that randomly reduces genetic variation; recovery of N does not immediately restore diversity.'),
  (9,  'gene flow (migration)',
       'Movement of alleles between populations via migrants or gametes. Tends to homogenize allele frequencies and can introduce new alleles or swamp local adaptation.'),
  (10, 'directional / stabilizing / disruptive selection',
       'Directional: favors one tail. Stabilizing: favors the intermediate. Disruptive: favors both extremes over the mean.'),
  (11, 'heterozygote advantage',
       'Heterozygotes have higher fitness than either homozygote (sickle-cell allele in malaria regions); maintains both alleles (balancing selection).'),
  (12, 'frequency-dependent selection',
       'Fitness of a phenotype depends on its frequency (e.g. rare-morph advantage in prey); another form of balancing selection.'),
  (13, 'inbreeding',
       'Mating among relatives increases homozygosity. Inbreeding depression is reduced fitness from exposing deleterious recessives; it does not by itself change allele frequencies.'),
  (14, 'genetic variation is required',
       'Selection cannot produce adaptation without heritable variation. Quantitative traits are often polygenic; heritability is the fraction of phenotypic variance that is genetic.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Speciation, Sexual Selection & Phylogeny  (Ch 23–24, 26)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'speciation-phylogeny'
CROSS JOIN (VALUES
  (0,  'sexual selection',
       'Differential mating success. Intrasexual: competition within a sex (male–male combat). Intersexual: mate choice (often female preference for ornaments).'),
  (1,  'sexual dimorphism',
       'Males and females differ in appearance or size; often the result of sexual selection (peacock tails, antlers).'),
  (2,  'advantage of sex (twofold cost)',
       'Asexual females transmit all genes and produce only daughters. Sex persists because recombination can purge deleterious combinations and keep up with changing selection (Red Queen).'),
  (3,  'biological species concept',
       'Species are groups of actually or potentially interbreeding populations that are reproductively isolated from other such groups. Fails for asexuals and fossils.'),
  (4,  'prezygotic barriers',
       'Prevent fertilization: habitat, temporal, behavioral isolation; mechanical mismatch; gametic incompatibility.'),
  (5,  'postzygotic barriers',
       'After fertilization: hybrid inviability, hybrid sterility (mule), hybrid breakdown in later generations.'),
  (6,  'allopatric speciation',
       'A geographic barrier splits a population; divergence (selection, drift) then produces reproductive isolation. The most common geographic mode.'),
  (7,  'sympatric speciation',
       'Speciation without geographic isolation: polyploidy (especially plants), habitat differentiation, or sexual selection within the same range.'),
  (8,  'polyploidy',
       'Extra chromosome sets. Autopolyploidy: within a species. Allopolyploidy: hybridization plus chromosome doubling. Instant speciation common in plants.'),
  (9,  'phylogeny / phylogenetic tree',
       'A hypothesis of evolutionary relationships. Tips = taxa; nodes = common ancestors; a clade is an ancestor plus all descendants (monophyletic).'),
  (10, 'shared derived character (synapomorphy)',
       'A trait that originated in the last common ancestor of a clade and is used to group that clade. Shared ancestral traits (symplesiomorphies) do not define nested groups.'),
  (11, 'homology vs. homoplasy on trees',
       'Homology is inherited from a common ancestor. Homoplasy (convergence or reversal) independently produces similar traits and can mislead tree building.'),
  (12, 'parsimony / maximum likelihood',
       'Parsimony prefers the tree with the fewest character changes. Likelihood and Bayesian methods model substitution rates and are standard in modern phylogenetics.'),
  (13, 'molecular clock',
       'If substitutions accumulate at a roughly constant rate, genetic distance can date divergences when calibrated with fossils.'),
  (14, 'outgroup',
       'A related taxon outside the group of interest; used to root the tree and polarize characters (ancestral vs. derived).')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. History of Life & Human Evolution  (Ch 25, 34)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'history-of-life'
CROSS JOIN (VALUES
  (0,  'age of Earth / first life',
       'Earth ~4.6 billion years old. Oldest widely accepted fossils of life (stromatolites, isotopic signatures) ~3.5–3.7 Ga; life was prokaryotic for most of history.'),
  (1,  'abiotic origin of life (Oparin–Haldane)',
       'Hypothesis: organic monomers form abiotically, polymerize, get packaged into membranes (protocells), and a hereditary molecule (RNA world) enables Darwinian evolution.'),
  (2,  'oxygen revolution',
       'Cyanobacterial photosynthesis raised atmospheric O2 ~2.4 Ga, causing a mass extinction of anaerobes and enabling aerobic respiration and later ozone.'),
  (3,  'endosymbiosis',
       'Mitochondria and chloroplasts originated from engulfed bacteria (α-proteobacteria and cyanobacteria). Evidence: own circular DNA, 70S ribosomes, double membranes.'),
  (4,  'Cambrian explosion',
       '~540 Ma: rapid appearance of most animal body plans in the fossil record. Likely a mix of ecological escalation, developmental genes, and better preservation.'),
  (5,  'colonization of land',
       'Plants, fungi, and arthropods by ~470–400 Ma; tetrapods later. Key plant adaptations: cuticle, stomata, vascular tissue, seeds.'),
  (6,  'mass extinction',
       'Geologically brief interval of globally elevated extinction. Five major Phanerozoic events; the end-Cretaceous (66 Ma) killed non-avian dinosaurs (impact + volcanism).'),
  (7,  'adaptive radiation',
       'Rapid origination of many species from a common ancestor as they fill ecological niches (after extinctions, on islands, or with a key innovation).'),
  (8,  'continental drift / plate tectonics',
       'Moving continents change climate, ocean circulation, and isolation of biotas (Gondwana, Wallace''s Line). Explains many biogeographic patterns.'),
  (9,  'three-domain system',
       'Bacteria, Archaea, and Eukarya. Archaea are closer to eukaryotes than to bacteria; eukaryotes arose via archaeal host + bacterial endosymbiont.'),
  (10, 'hominin',
       'The clade including humans and extinct relatives closer to us than to chimpanzees. Bipedalism appears early; large brains and stone tools later.'),
  (11, 'Australopithecus vs. Homo',
       'Australopithecus: bipedal, relatively small brain, Africa. Homo: larger brain, stone tools, later body size; H. erectus first to leave Africa in a major way.'),
  (12, 'Out of Africa (recent African origin)',
       'Anatomically modern H. sapiens originated in Africa ~200–300 ka and later spread, largely replacing other Homo with limited Neanderthal/Denisovan admixture.'),
  (13, 'Neanderthals',
       'Eurasian Homo that interbred with modern humans; non-African people typically carry ~1–2% Neanderthal ancestry. Not a failed precursor of H. sapiens.'),
  (14, 'mosaic evolution of humans',
       'Traits did not evolve as a package: bipedalism, reduced canines, tool use, brain expansion, and language have different timings in the hominin record.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Climate, Biomes & Distributions  (Ch 52)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'climate-biomes'
CROSS JOIN (VALUES
  (0,  'ecology',
       'The study of interactions among organisms and between organisms and their environment, from individuals to the biosphere.'),
  (1,  'climate vs. weather',
       'Weather is short-term atmospheric conditions. Climate is the long-term average (temperature, precipitation, seasonality) that structures biomes.'),
  (2,  'latitudinal climate pattern',
       'Uneven solar heating: tropics receive more direct sunlight. Hadley cells: warm air rises at the equator (rain) and descends at ~30° (deserts).'),
  (3,  'Coriolis effect',
       'Earth''s rotation deflects moving air: to the right in the Northern Hemisphere, left in the Southern; shapes trade winds and westerlies.'),
  (4,  'rain shadow',
       'Moist air rises and cools on the windward slope (rain); descending dry air on the leeward side creates arid conditions.'),
  (5,  'biome',
       'A major vegetation type determined largely by climate (tropical rainforest, savanna, desert, grassland, temperate forest, taiga, tundra).'),
  (6,  'tropical rainforest',
       'High temperature and rainfall year-round; highest terrestrial productivity and diversity; nutrient-poor soils because nutrients are locked in biomass.'),
  (7,  'desert',
       'Low precipitation, not necessarily hot. Organisms show water conservation (CAM plants, nocturnal animals). Often at 30° latitude or in rain shadows.'),
  (8,  'temperate grassland vs. temperate forest',
       'Grasslands: seasonal drought/fire, deep fertile soils. Temperate deciduous forest: more precipitation, seasonal leaf drop, layered vegetation.'),
  (9,  'tundra',
       'Low temperature, short growing season, permafrost; low shrubs, mosses, lichens. Alpine tundra is similar but at high elevation.'),
  (10, 'aquatic biomes',
       'Defined more by physical factors (light, depth, salinity, flow) than vegetation: lakes (littoral, limnetic, profundal), wetlands, streams, estuaries, oceans (photic vs. aphotic).'),
  (11, 'thermocline / turnover',
       'A steep temperature gradient in a lake. Seasonal turnover in temperate lakes mixes oxygen and nutrients between layers.'),
  (12, 'species range / distribution',
       'Limited by abiotic factors (temperature, water, soil) and biotic factors (competition, predation, dispersal ability, history).'),
  (13, 'dispersal',
       'Movement of individuals or gametes away from origin. Can be limited by barriers; transplants can test whether a range limit is dispersal vs. environment.'),
  (14, 'ecological niche',
       'The set of conditions and resources a species uses (Hutchinson: n-dimensional hypervolume). Fundamental niche = potential; realized niche = after biotic interactions.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Population Ecology  (Ch 53)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'population-ecology'
CROSS JOIN (VALUES
  (0,  'population ecology',
       'Study of how and why population size (N) changes: births, deaths, immigration, emigration.'),
  (1,  'density and dispersion',
       'Density = N per unit area. Dispersion: clumped (most common), uniform (territoriality), or random.'),
  (2,  'demography',
       'Vital statistics of a population: age structure, birth rates, death rates, generation time. Life tables and survivorship curves summarize them.'),
  (3,  'survivorship curves',
       'Type I: low juvenile mortality, high late (humans). Type II: constant risk (some birds). Type III: high juvenile mortality, then flattening (oysters, many plants).'),
  (4,  'exponential (density-independent) growth',
       'dN/dt = rN. J-shaped. r is the intrinsic rate of increase. Occurs when resources are not limiting (invasion, recovery after a crash).'),
  (5,  'logistic growth',
       'dN/dt = rN (K − N)/K. S-shaped approach to carrying capacity K, the maximum N the environment can sustain. Growth slows as N approaches K.'),
  (6,  'carrying capacity (K)',
       'Set by limiting resources (food, space, water). Can change with climate, habitat, and human impact; not a fixed number.'),
  (7,  'density-dependent vs. independent regulation',
       'Dependent: death or birth rates change with N (competition, disease, predation). Independent: weather, catastrophes affect a similar fraction regardless of N.'),
  (8,  'life-history trade-off',
       'Energy used for reproduction cannot be used for growth or survival. Semelparity (one big bout) vs. iteroparity (repeated reproduction).'),
  (9,  'r-selected vs. K-selected',
       'r: many small offspring, little care, early reproduction, unstable habitats. K: few well-provisioned offspring, late reproduction, competitive environments. Ends of a continuum.'),
  (10, 'metapopulation',
       'A set of local populations linked by dispersal. Occupancy depends on colonization vs. extinction of patches; isolation and patch size matter.'),
  (11, 'age structure pyramid',
       'A broad base implies a growing population; a narrow base implies decline or aging. Used to project human population change.'),
  (12, 'human population growth',
       'Grew exponentially after agriculture and especially after industrial/medical transitions. Demographic transition: high birth/death → low birth/death as development proceeds.'),
  (13, 'ecological footprint',
       'Area of productive land/water required to support a person''s or nation''s resource use and waste. A measure of demand relative to Earth''s biocapacity.'),
  (14, 'Allee effect',
       'At very low N, fitness can decline (harder to find mates, lose social foraging). Populations can go extinct even before resources run out.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Community Ecology  (Ch 54)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'community-ecology'
CROSS JOIN (VALUES
  (0,  'community',
       'All populations of different species living and interacting in an area. Structure is described by composition, diversity, and food-web links.'),
  (1,  'species richness vs. evenness / diversity',
       'Richness = number of species. Evenness = how equal their abundances are. Diversity indices combine both (Shannon, Simpson).'),
  (2,  'competition (−/−)',
       'Species harm each other by using a shared limiting resource. Intraspecific is within a species; interspecific is between species.'),
  (3,  'competitive exclusion principle',
       'Two species competing for the same limiting resource cannot stably coexist; one drives the other locally extinct (Gause).'),
  (4,  'resource partitioning / character displacement',
       'Coexisting competitors use resources differently (space, time, diet). Character displacement: traits diverge more in sympatry than in allopatry.'),
  (5,  'predation / herbivory (+/−)',
       'One organism eats another. Generates adaptations: crypsis, aposematism, mimicry (Batesian: harmless mimics harmful; Müllerian: harmful species converge).'),
  (6,  'parasitism and disease ecology',
       'Parasite benefits, host is harmed. Transmission often increases with host density. Pathogens can regulate host populations and structure communities.'),
  (7,  'mutualism (+/+)',
       'Both species benefit (mycorrhizae, pollination, gut microbiomes). Can be obligate or facultative; cheaters are a constant evolutionary issue.'),
  (8,  'commensalism (+/0)',
       'One benefits, the other is unaffected (epiphytes on trees, in the idealized case). Many supposed commensals turn out weakly positive or negative.'),
  (9,  'trophic structure / food web',
       'Who eats whom. Food chains are paths through a web. Energy is lost at each transfer (~10% rule), limiting food-chain length.'),
  (10, 'keystone species',
       'A species whose effect on community structure is disproportionate to its biomass (Pisaster seastars, sea otters). Not the same as a dominant abundant species.'),
  (11, 'foundation / ecosystem engineer',
       'Foundation species (trees, kelp) provide physical structure. Engineers (beavers, corals) modify habitat and thereby affect many other species.'),
  (12, 'disturbance and intermediate disturbance hypothesis',
       'Disturbance removes biomass and frees resources. Diversity is often highest at intermediate frequency/intensity of disturbance, which prevents both competitive exclusion and constant reset.'),
  (13, 'ecological succession',
       'Directional community change after disturbance. Primary: from bare substrate (lava, glacial till). Secondary: soil remains (fire, logging). Pioneer species → later competitively dominant species.'),
  (14, 'latitudinal diversity gradient',
       'More species toward the tropics. Hypotheses include more energy/productivity, larger area, greater climatic stability, and more time since glaciation.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Ecosystems, Climate Change & Conservation  (Ch 55–56)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ecosystems-conservation'
CROSS JOIN (VALUES
  (0,  'ecosystem',
       'A community plus its abiotic environment, linked by energy flow and chemical cycling.'),
  (1,  'primary production',
       'Rate at which autotrophs convert energy into biomass. GPP = total photosynthesis; NPP = GPP − autotroph respiration. NPP is energy available to consumers.'),
  (2,  'limits on NPP',
       'Terrestrial: temperature, moisture, nutrients (often N). Aquatic: light and nutrients (N, P, Fe in oceans). Upwelling fuels high marine production.'),
  (3,  'trophic efficiency',
       'Typically ~10% of energy is transferred to the next trophic level; the rest is lost as heat, waste, and uneaten biomass. Explains why top predators are rare.'),
  (4,  'biogeochemical cycle',
       'Chemical elements cycle between organic and inorganic pools. Unlike energy, matter is recycled. Water, carbon, nitrogen, and phosphorus are the core cycles.'),
  (5,  'carbon cycle',
       'Photosynthesis and respiration dominate the fast cycle. Fossil-fuel burning and land-use change add CO2 to the atmosphere, driving climate change.'),
  (6,  'nitrogen cycle',
       'N2 is abundant but inert. Nitrogenase (bacteria, often in legumes) fixes N2 → ammonia. Nitrification, assimilation, ammonification, and denitrification complete the cycle. Haber–Bosch now rivals natural fixation.'),
  (7,  'phosphorus cycle',
       'No major atmospheric pool; weathered from rock, cycles through soil, organisms, and sediment. Often limiting in freshwater; excess causes eutrophication.'),
  (8,  'eutrophication',
       'Nutrient overload (N, P) → algal blooms → decomposition depletes oxygen → dead zones. A classic human disruption of nutrient cycles.'),
  (9,  'greenhouse effect and climate change',
       'CO2, CH4, N2O trap outgoing IR. Rising greenhouse gases from fossil fuels and land use warm the planet, shift biomes, acidify oceans, and raise sea level.'),
  (10, 'biodiversity crisis',
       'Current extinction rates far exceed background. Drivers (HIPPO / IPBES): habitat loss, invasive species, pollution, population (human), overharvest, plus climate change.'),
  (11, 'habitat fragmentation',
       'Large habitat split into small, isolated patches. Edge effects increase; interior specialists decline. Corridors and larger reserves mitigate isolation.'),
  (12, 'island biogeography',
       'Species richness on an island balances immigration and extinction. Larger, closer islands support more species. Applied to habitat fragments as habitat islands.'),
  (13, 'minimum viable population / extinction vortex',
       'MVP is the smallest N likely to persist. Small N → inbreeding and drift → lower fitness → still smaller N (extinction vortex).'),
  (14, 'conservation strategies',
       'Protect habitat (hotspots, reserves), restore ecosystems, control invasives, sustainable harvest, ex situ breeding as a last resort, and address climate and consumption.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Microbes, Fungi & Land Plants  (Ch 27–31)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'microbial-plant-diversity'
CROSS JOIN (VALUES
  (0,  'prokaryote diversity',
       'Bacteria and Archaea: no nucleus, circular chromosomes, 70S ribosomes. Morphologies include cocci, bacilli, spirilla; cell walls differ (peptidoglycan in bacteria).'),
  (1,  'Gram-positive vs. Gram-negative',
       'Gram-positive: thick peptidoglycan, stain purple. Gram-negative: thin peptidoglycan plus outer LPS membrane, stain pink; often more antibiotic-resistant.'),
  (2,  'metabolic diversity of prokaryotes',
       'Photo- vs. chemo-; auto- vs. hetero-trophy. Includes nitrogen fixation, methanogenesis (Archaea), and anoxygenic photosynthesis — unmatched chemical versatility.'),
  (3,  'microbial community roles',
       'Decomposers, mutualists (gut, nodules), pathogens, and primary producers (cyanobacteria). Microbiomes shape animal and plant health.'),
  (4,  'fungi',
       'Opisthokont heterotrophs that absorb food after secreting enzymes. Hyphae form a mycelium; cell walls of chitin. Closely related to animals, not plants.'),
  (5,  'fungal nutrition and ecology',
       'Decomposers of lignin and cellulose; mycorrhizal mutualists; parasites (athlete''s foot, chestnut blight); some predators of nematodes.'),
  (6,  'mycorrhizae',
       'Fungus–root mutualism: fungus gets sugars; plant gets water and minerals (especially P). Arbuscular (endomycorrhizae) and ectomycorrhizae are the two major types.'),
  (7,  'lichen',
       'A stable association of a fungus with a photosynthetic alga or cyanobacterium; pioneer species on rock and indicators of air quality.'),
  (8,  'algae and the origin of land plants',
       'Land plants (embryophytes) evolved from charophyte green algae. Shared traits: sporopollenin, similar cell-division machinery, and chlorophyll a + b.'),
  (9,  'adaptations to land',
       'Cuticle and stomata (water retention vs. gas exchange), apical meristems, alternation of generations, and protected embryos. Vascular tissue and seeds came later.'),
  (10, 'alternation of generations',
       'Multicellular diploid sporophyte (meiosis → spores) alternates with multicellular haploid gametophyte (mitosis → gametes). The sporophyte becomes dominant in later plant groups.'),
  (11, 'bryophytes (mosses, liverworts, hornworts)',
       'Nonvascular; gametophyte-dominant; require water for swimming sperm. Pioneer species; peat mosses store huge carbon stocks.'),
  (12, 'seed-free vascular plants (ferns, lycophytes)',
       'True xylem/phloem, sporophyte-dominant, still free-living gametophytes and swimming sperm. Formed Carboniferous coal forests.'),
  (13, 'gymnosperms',
       'Naked seeds on cones. Pollen frees reproduction from water. Conifers dominate many boreal and montane forests; include cycads, Ginkgo, gnetophytes.'),
  (14, 'angiosperms',
       'Flowering plants: ovules in an ovary that becomes fruit. Double fertilization (zygote + endosperm). Most diverse plant group; coevolved with animal pollinators.')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Plant Form, Function & Physiology  (Ch 35–39)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'plant-form-function'
CROSS JOIN (VALUES
  (0,  'plant organs',
       'Root (anchor, absorb water/minerals, store), stem (support, transport), leaf (photosynthesis). Together they form the root and shoot systems.'),
  (1,  'dermal / ground / vascular tissue',
       'Dermal: epidermis, cuticle, stomata. Ground: parenchyma, collenchyma, sclerenchyma. Vascular: xylem (water, minerals) and phloem (sugars).'),
  (2,  'meristems and indeterminate growth',
       'Apical meristems at root and shoot tips drive primary growth. Lateral meristems (vascular and cork cambium) drive secondary growth (wood, bark) in woody plants.'),
  (3,  'primary growth of roots',
       'Root cap protects the apical meristem; zone of division, elongation, then differentiation. Root hairs (epidermal) greatly increase absorptive surface.'),
  (4,  'primary growth of shoots',
       'Shoot apical meristem produces leaf primordia and axillary buds (which can become branches). Stomata on leaves regulate gas exchange.'),
  (5,  'xylem transport (cohesion–tension)',
       'Transpiration from leaves creates tension that pulls a continuous water column (cohesion via H-bonds; adhesion to cellulose) from roots to shoots. Passive — no ATP pump of water.'),
  (6,  'stomatal regulation',
       'Guard cells open when turgid (K+ influx, water follows) to allow CO2 in; close under drought (ABA signaling) to limit water loss. Trade-off between photosynthesis and transpiration.'),
  (7,  'phloem translocation (pressure-flow)',
       'Sources load sugar into sieve tubes (often active); water follows, raising pressure. Flow toward sinks (roots, fruits, growing tips) where sugar is unloaded.'),
  (8,  'apoplast vs. symplast',
       'Apoplast: cell walls and extracellular space. Symplast: cytoplasm connected by plasmodesmata. The Casparian strip in the endodermis forces water into the symplast before xylem.'),
  (9,  'essential nutrients',
       'Macronutrients (N, P, K, Ca, Mg, S) needed in large amounts; micronutrients (Fe, Mn, Zn, …) in trace amounts. Deficiency symptoms are diagnostic.'),
  (10, 'nitrogen fixation in plants',
       'Rhizobium (and related) bacteria in root nodules of legumes convert N2 to ammonium the plant can use; the plant supplies carbon. A key mutualism in agriculture.'),
  (11, 'phototropism and auxin',
       'Shoots bend toward light because auxin redistributes to the shaded side, causing those cells to elongate (Went, Cholodny–Went). Roots are often positively gravitropic.'),
  (12, 'major plant hormones',
       'Auxin: elongation, apical dominance. Cytokinin: cell division. Gibberellin: stem elongation, seed germination. ABA: stress, dormancy, stomatal closure. Ethylene: fruit ripening, senescence.'),
  (13, 'photoperiodism and phytochrome',
       'Flowering can be short-day, long-day, or day-neutral. Phytochrome (Pr/Pfr) senses red vs. far-red light and measures night length; also mediates shade avoidance.'),
  (14, 'plant defenses',
       'Constitutive: cuticle, thorns, secondary metabolites (alkaloids, tannins). Induced: jasmonate signaling after herbivory; recruitment of parasitoid wasps via volatiles. Molecular dialogue with pathogens (R genes).')
) AS c(pos, front, back)
WHERE d.slug = 'bio1b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- ─────────────────────────────────────────────────────────────
UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'bio1b';
