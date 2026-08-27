-- Migration 051: EPS 7 — Introduction to Climate Change, preset deck cards.
-- Covers the full Fall 2026 syllabus (Prof. Romps, UC Berkeley).
-- ~15 cards per section × 8 topic sections = ~120 cards total.
-- Safe to re-run: each section block is guarded by NOT EXISTS.

-- =====================================================================
-- 1. Energy & Thermodynamics
--    Lectures: Joule/Watt, energy transfer, units, Wien's law,
--              Stefan–Boltzmann
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'energy-thermodynamics'
CROSS JOIN (VALUES
  (0,  'joule (J)',
       'SI unit of energy; the work done when a force of one newton acts over one metre, or the energy of one watt sustained for one second.'),
  (1,  'watt (W)',
       'SI unit of power; one joule of energy transferred or converted per second.'),
  (2,  'James Prescott Joule',
       '19th-century physicist who established the mechanical equivalent of heat and showed that different forms of energy are interconvertible.'),
  (3,  'James Watt',
       '18th-century Scottish engineer who dramatically improved the steam engine and whose name is used for the unit of power.'),
  (4,  'power',
       'The rate at which energy is transferred or converted; measured in watts (W = J/s).'),
  (5,  'electromagnetic radiation',
       'Energy that travels as oscillating electric and magnetic fields; includes visible light, infrared, and ultraviolet; always travels at c in a vacuum.'),
  (6,  'blackbody',
       'An idealized object that perfectly absorbs all incident radiation and emits radiation whose spectrum depends only on its temperature.'),
  (7,  'Wien''s displacement law',
       'The peak wavelength of blackbody radiation (λ_max) is inversely proportional to absolute temperature: λ_max = 2.898 × 10⁻³ m·K / T.'),
  (8,  'Stefan–Boltzmann law',
       'The total power emitted per unit area by a blackbody equals σT⁴, where σ ≈ 5.67 × 10⁻⁸ W m⁻² K⁻⁴.'),
  (9,  'Stefan–Boltzmann constant (σ)',
       '≈ 5.67 × 10⁻⁸ W m⁻² K⁻⁴; the proportionality constant linking blackbody emission to the fourth power of temperature.'),
  (10, 'solar constant',
       'Average solar irradiance at Earth''s mean distance from the Sun; approximately 1361 W m⁻².'),
  (11, 'albedo',
       'The fraction of incoming solar radiation reflected by a surface; ranges from 0 (perfect absorber) to 1 (perfect reflector). Earth''s average is ~0.30.'),
  (12, 'infrared (IR) radiation',
       'Electromagnetic radiation with wavelengths ~0.7–1000 µm; emitted by all objects at ordinary temperatures and the main form lost by Earth to space.'),
  (13, 'Kelvin scale',
       'Absolute temperature scale starting at absolute zero (0 K = −273.15 °C); required by Stefan–Boltzmann and Wien''s law.'),
  (14, 'energy balance (Earth)',
       'Equilibrium between incoming absorbed solar radiation and outgoing infrared radiation emitted to space; any imbalance drives warming or cooling.')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 2. Earth's Atmosphere
--    Lectures: atmosphere composition, Clausius–Clapeyron, lapse rate
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'earths-atmosphere'
CROSS JOIN (VALUES
  (0,  'atmosphere',
       'The layer of gases surrounding Earth held by gravity; by volume ~78% N₂, ~21% O₂, ~1% Ar, plus trace GHGs.'),
  (1,  'troposphere',
       'Lowest atmospheric layer (surface to ~12 km); contains all weather; temperature decreases with altitude at the lapse rate.'),
  (2,  'stratosphere',
       'Atmospheric layer from ~12 to ~50 km; contains the ozone layer; temperature increases with altitude due to UV absorption.'),
  (3,  'Clausius–Clapeyron equation',
       'Describes how saturation vapor pressure increases approximately exponentially with temperature; roughly +7% per °C of warming.'),
  (4,  'saturation vapor pressure',
       'The maximum partial pressure of water vapor that air can hold at a given temperature; increases sharply with temperature.'),
  (5,  'relative humidity',
       'Ratio of actual water vapor pressure to saturation vapor pressure at the same temperature, expressed as a percentage.'),
  (6,  'lapse rate',
       'The rate at which atmospheric temperature decreases with increasing altitude; the dry adiabatic lapse rate (DALR) is ~9.8 °C km⁻¹.'),
  (7,  'dry adiabatic lapse rate (DALR)',
       '~9.8 °C km⁻¹; the cooling rate of rising unsaturated air when it expands without exchanging heat with its surroundings.'),
  (8,  'moist adiabatic lapse rate (MALR)',
       '~4–7 °C km⁻¹; less steep than the DALR because condensation releases latent heat that partially offsets adiabatic cooling.'),
  (9,  'latent heat',
       'Energy absorbed or released during a phase change (e.g., evaporation, condensation) with no temperature change; ~2.5 × 10⁶ J kg⁻¹ for water.'),
  (10, 'convection',
       'Vertical heat transport by rising warm air parcels and sinking cool air; the dominant mechanism in the troposphere.'),
  (11, 'water vapor',
       'The most abundant greenhouse gas; its atmospheric concentration rises with temperature, making it the most important positive climate feedback.'),
  (12, 'ozone (O₃)',
       'Triatomic oxygen; stratospheric ozone absorbs UV radiation protecting life; tropospheric ozone is a GHG and pollutant.'),
  (13, 'tropopause',
       'Boundary between the troposphere and stratosphere; located at ~12 km in the mid-latitudes.'),
  (14, 'adiabatic process',
       'A thermodynamic process in which no heat is exchanged with the surroundings; rising air cools adiabatically as it expands.')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 3. Greenhouse Effect
--    Lectures: radiative transfer, greenhouse gases, discovery of
--              global warming
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'greenhouse-effect'
CROSS JOIN (VALUES
  (0,  'greenhouse effect',
       'The warming of Earth''s surface caused by atmospheric gases that absorb outgoing infrared radiation and re-emit it in all directions.'),
  (1,  'greenhouse gas (GHG)',
       'Atmospheric gas that absorbs and emits IR radiation, trapping heat; major GHGs include CO₂, CH₄, N₂O, H₂O vapor, and halocarbons.'),
  (2,  'carbon dioxide (CO₂)',
       'Primary long-lived GHG from fossil fuel combustion and deforestation; pre-industrial ~280 ppm, now >420 ppm — a 50% increase.'),
  (3,  'methane (CH₄)',
       'GHG ~80× more potent than CO₂ over 20 years; emitted from livestock, rice paddies, landfills, and natural gas leaks.'),
  (4,  'nitrous oxide (N₂O)',
       'GHG ~270× more potent than CO₂ over 100 years; emitted from nitrogen fertilizers, livestock, and combustion.'),
  (5,  'radiative transfer',
       'The propagation of electromagnetic radiation through the atmosphere via absorption and re-emission; governs how GHGs trap heat.'),
  (6,  'absorption spectrum',
       'The set of wavelengths at which a molecule absorbs radiation, determined by its vibrational and rotational modes.'),
  (7,  'natural greenhouse effect',
       'Without any greenhouse gases, Earth''s average surface temperature would be about −18 °C; GHGs raise it to ~+15 °C.'),
  (8,  'enhanced greenhouse effect',
       'Amplification of the natural greenhouse effect due to human-caused increases in GHG concentrations.'),
  (9,  'Eunice Newton Foote',
       'American scientist who in 1856 first showed experimentally that CO₂ absorbs more heat than air, predating Tyndall.'),
  (10, 'Svante Arrhenius',
       'Swedish chemist who in 1896 first calculated that doubling atmospheric CO₂ would raise Earth''s temperature by ~5 °C.'),
  (11, 'carbon cycle',
       'The movement of carbon among atmosphere, oceans, land, and living organisms; natural fluxes are ~10× larger than human emissions.'),
  (12, 'parts per million (ppm)',
       'Unit used to express trace gas concentrations; 1 ppm CO₂ means one CO₂ molecule per million air molecules.'),
  (13, 'residence time',
       'How long a substance remains in the atmosphere before being removed; CO₂ has an effective residence time of hundreds to thousands of years.'),
  (14, 'global warming potential (GWP)',
       'Comparative index measuring how much heat a GHG traps over a given time horizon relative to CO₂ (GWP = 1).')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 4. Feedbacks & Climate Sensitivity
--    Lectures: forcing, feedback, cloud taxonomy, fossil fuels,
--              climate sensitivity calculation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'feedbacks-climate-sensitivity'
CROSS JOIN (VALUES
  (0,  'radiative forcing (RF)',
       'Change in the net energy flux at the tropopause caused by a perturbation (e.g., doubled CO₂); positive RF warms, negative cools; measured in W m⁻².'),
  (1,  'climate feedback',
       'A process that either amplifies (positive) or dampens (negative) an initial climate perturbation.'),
  (2,  'positive feedback',
       'A feedback that amplifies the initial change; examples include ice–albedo and water vapor feedbacks.'),
  (3,  'negative feedback',
       'A feedback that opposes and dampens the initial change; the dominant negative feedback is Planck (blackbody) radiation.'),
  (4,  'Planck (blackbody) feedback',
       'As Earth warms, it radiates more energy to space (∝ T⁴), restoring balance; the primary stabilizing feedback in the climate system.'),
  (5,  'ice–albedo feedback',
       'Warming melts bright ice and snow, exposing darker ocean or land that absorbs more sunlight, causing further warming.'),
  (6,  'water vapor feedback',
       'Warmer air holds more water vapor; because H₂O is a GHG, this amplifies the initial warming — the largest positive feedback.'),
  (7,  'lapse rate feedback',
       'Changes in the vertical temperature profile affect how much IR escapes to space; negative in the tropics, positive at high latitudes.'),
  (8,  'cloud feedback',
       'Changes in cloud amount, altitude, and type in response to warming; net effect is positive in current best estimates but uncertain.'),
  (9,  'equilibrium climate sensitivity (ECS)',
       'The long-term global mean temperature increase after a doubling of CO₂ once all slow feedbacks have operated; likely 2.5–4 °C.'),
  (10, 'transient climate response (TCR)',
       'Warming at the time CO₂ doubles in a 1%/yr increase scenario; less than ECS because oceans absorb heat; typically 1.2–2.4 °C.'),
  (11, 'fossil fuels',
       'Coal, oil, and natural gas — ancient organic material compressed over millions of years; burning releases stored carbon as CO₂.'),
  (12, 'cumulus cloud',
       'Puffy, vertically developed cloud formed by convection; fair-weather cumulus are benign, but cumulonimbus bring storms.'),
  (13, 'stratus cloud',
       'Low, grey, horizontally layered cloud; reflects sunlight efficiently and exerts a net cooling effect.'),
  (14, 'cirrus cloud',
       'High, wispy ice-crystal clouds; thin enough to let in sunlight but thick enough to trap outgoing IR — net warming effect.'),
  (15, 'feedback parameter (λ)',
       'Quantifies the change in outgoing radiation per degree of warming; negative λ = stable, positive λ = unstable.')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 5. Evidence & Impacts
--    Lectures: evidence of warming, ocean acidification, climate
--              models, IPCC, other gases, scary feedbacks
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'evidence-impacts'
CROSS JOIN (VALUES
  (0,  'global mean temperature (GMT)',
       'The average surface temperature of Earth; has risen ~1.2–1.3 °C above the 1850–1900 pre-industrial baseline.'),
  (1,  'Keeling Curve',
       'Continuous record of atmospheric CO₂ at Mauna Loa Observatory since 1958; shows an unambiguous upward trend with seasonal oscillations.'),
  (2,  'ocean heat content',
       'Total thermal energy stored in the oceans; has absorbed ~90% of the excess energy from the enhanced greenhouse effect.'),
  (3,  'ocean acidification',
       'Decrease in ocean pH caused by CO₂ dissolving in seawater and forming carbonic acid; pH has fallen ~0.1 units since industrialization.'),
  (4,  'carbonic acid (H₂CO₃)',
       'Weak acid formed when CO₂ dissolves in water; dissociates to release H⁺ ions, lowering ocean pH.'),
  (5,  'coral bleaching',
       'Stress response in which corals expel their symbiotic algae (zooxanthellae), losing colour and nutrition; triggered by excess heat and/or acidification.'),
  (6,  'sea level rise',
       'Rise in global mean sea level (~3.7 mm yr⁻¹ currently) driven by thermal expansion of seawater and melting of land ice.'),
  (7,  'General Circulation Model (GCM)',
       'Numerical climate model that solves physics equations on a 3-D atmospheric/oceanic grid to simulate and project climate.'),
  (8,  'IPCC',
       'Intergovernmental Panel on Climate Change; UN body founded in 1988 that synthesises peer-reviewed climate science into assessment reports.'),
  (9,  'attribution science',
       'Field that quantifies how much human greenhouse gas emissions have contributed to specific observed climate changes or extreme events.'),
  (10, 'tropospheric warming / stratospheric cooling',
       'Observed "fingerprint" of GHG forcing: GHGs warm the lower atmosphere while cooling the stratosphere, distinguishing it from solar forcing.'),
  (11, 'halocarbons (CFCs / HFCs)',
       'Industrial fluorinated gases with GWPs thousands of times greater than CO₂; regulated by the Montreal Protocol and Kigali Amendment.'),
  (12, 'Montreal Protocol',
       '1987 international treaty phasing out ozone-depleting substances (CFCs); considered the most successful environmental agreement.'),
  (13, 'permafrost carbon feedback',
       'Thawing permafrost releases stored CO₂ and CH₄, amplifying warming — a large and potentially irreversible positive feedback.'),
  (14, 'methane clathrates',
       'Ice-like solids containing methane trapped on ocean floors and in permafrost; could release large amounts of CH₄ if destabilised by warming.')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 6. Paleoclimate & Future Projections
--    Lectures: paleoclimate, ice and sea level, superstorms,
--              future Earth
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'paleoclimate-future'
CROSS JOIN (VALUES
  (0,  'paleoclimate',
       'The study of Earth''s past climates using physical, chemical, and biological proxies preserved in ice, sediment, coral, and tree rings.'),
  (1,  'ice core',
       'Cylinder of ice drilled from a glacier or ice sheet; trapped air bubbles directly record past atmospheric CO₂ and CH₄ concentrations.'),
  (2,  'proxy record',
       'An indirect indicator of past climate (tree rings, coral bands, pollen, sediment isotopes) used where direct measurements are unavailable.'),
  (3,  'Milankovitch cycles',
       'Regular variations in Earth''s orbital eccentricity (~100 kyr), axial tilt (~41 kyr), and precession (~23 kyr) that pace glacial–interglacial cycles.'),
  (4,  'ice age (glacial period)',
       'Period of significantly cooler global temperatures and widespread glaciation; Earth has cycled between glacials and interglacials for ~2.6 Myr.'),
  (5,  'Holocene',
       'The current interglacial epoch, beginning ~12,000 years ago; the relatively stable climate in which all of human civilisation developed.'),
  (6,  'thermal expansion',
       'The increase in ocean volume as seawater warms; currently responsible for roughly one-third to one-half of observed sea level rise.'),
  (7,  'ice sheet',
       'A continental-scale glacier covering >50,000 km²; Greenland and Antarctica together hold ice equivalent to ~65 m of sea level.'),
  (8,  'marine ice sheet instability (MISI)',
       'Self-reinforcing retreat of ice sheets grounded below sea level; once initiated, can accelerate irreversibly without additional forcing.'),
  (9,  'tipping point',
       'A climate threshold beyond which a system shifts to a qualitatively different state that can persist even if forcing is reversed.'),
  (10, 'RCP (Representative Concentration Pathway)',
       'IPCC emission scenarios labelled by their 2100 radiative forcing (e.g., RCP 2.6 = strong mitigation; RCP 8.5 = business-as-usual).'),
  (11, 'extreme precipitation',
       'More intense rainfall events in a warming world, partly explained by Clausius–Clapeyron: warmer air holds more water vapour, intensifying storms.'),
  (12, 'superstorm',
       'An exceptionally large and intense cyclonic storm; a warmer, moister atmosphere increases potential intensity via higher vapour content.'),
  (13, 'wet-bulb temperature',
       'Temperature measured by a thermometer covered in a wet cloth; the limit for human survivability is ~35 °C wet-bulb, expected to be exceeded more often with warming.'),
  (14, 'committed warming',
       'Future warming that will occur even if emissions stop today, due to the thermal inertia of the oceans and the long atmospheric lifetime of CO₂.')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 7. Energy Solutions
--    Lectures: biomass, hydro, nuclear, wind, solar
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'energy-solutions'
CROSS JOIN (VALUES
  (0,  'biomass energy',
       'Energy from organic materials (wood, crops, waste); roughly carbon-neutral only if new biomass is grown to reabsorb the emitted CO₂.'),
  (1,  'BECCS (bioenergy with CCS)',
       'Burns biomass for energy then captures and stores the CO₂; net carbon-negative if the full chain is efficient — but requires vast land.'),
  (2,  'hydropower',
       'Electricity generated by flowing or falling water; currently the largest source of low-carbon electricity globally (~16% of world electricity).'),
  (3,  'nuclear fission',
       'Splitting of heavy nuclei (e.g., U-235) releases ~1 million times more energy per atom than burning fossil fuels; no direct CO₂ emissions.'),
  (4,  'nuclear power',
       'Low-carbon electricity from fission; concerns include high construction costs, radioactive waste storage, and rare but severe accident risks.'),
  (5,  'wind power',
       'Electricity from kinetic energy of wind; one of the fastest-growing energy sources; capacity factor ~25–45% for modern turbines.'),
  (6,  'capacity factor',
       'Actual energy output divided by maximum possible output over a period; accounts for variability — solar ~15–25%, wind ~25–45%.'),
  (7,  'solar photovoltaic (PV)',
       'Converts sunlight directly to electricity via the photovoltaic effect in semiconductor cells; costs have dropped >90% since 2010.'),
  (8,  'concentrated solar power (CSP)',
       'Uses mirrors to focus sunlight onto a receiver, generating heat to drive a turbine; can incorporate thermal storage for dispatchable power.'),
  (9,  'levelized cost of electricity (LCOE)',
       'Lifetime cost of a power plant per unit of electricity generated ($/MWh), accounting for capital, fuel, and operating costs.'),
  (10, 'grid parity',
       'When the LCOE of a renewable source equals or falls below that of conventional electricity; solar and wind have reached parity in most markets.'),
  (11, 'energy storage',
       'Technologies (Li-ion batteries, pumped hydro, hydrogen, compressed air) that store electricity to smooth out variable renewable generation.'),
  (12, 'decarbonisation',
       'The process of reducing or eliminating CO₂ emissions from energy, industry, transport, and agriculture to reach net-zero.'),
  (13, 'electrification',
       'Replacing fossil fuel uses (cars, heating, industrial processes) with electricity, enabling decarbonisation when the grid is clean.'),
  (14, 'energy efficiency',
       'Reducing energy use for the same service output; often the lowest-cost mitigation option — sometimes called the "first fuel."')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 8. Climate Policy & Action
--    Lectures: domestic policy (ITC/PTC), international agreements
--              (Rio, Kyoto, Paris), carbon tax, obstruction, rights
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'climate-policy'
CROSS JOIN (VALUES
  (0,  'Investment Tax Credit (ITC)',
       'U.S. federal tax credit equal to a percentage of the capital cost of solar and other clean energy projects; reduces upfront investment cost.'),
  (1,  'Production Tax Credit (PTC)',
       'U.S. federal tax credit per kilowatt-hour generated from wind and other qualifying renewables; rewards actual clean electricity output.'),
  (2,  'Inflation Reduction Act (IRA)',
       '2022 U.S. law providing ~$370 billion in clean energy tax incentives; the largest climate legislation in U.S. history.'),
  (3,  'carbon tax',
       'A fee on the carbon content of fossil fuels; internalises the social cost of emissions and incentivises fuel switching — widely seen as the most economically efficient climate policy.'),
  (4,  'cap-and-trade',
       'Sets a declining cap on total GHG emissions; companies buy and sell permits, creating a carbon price while guaranteeing an emission limit.'),
  (5,  'social cost of carbon (SCC)',
       'Estimated present-value economic damage from emitting one additional tonne of CO₂; used in cost-benefit analyses of climate regulations; ~$50–$200/tonne in major estimates.'),
  (6,  'UNFCCC',
       'United Nations Framework Convention on Climate Change; 1992 treaty establishing the framework for all subsequent global climate negotiations.'),
  (7,  'Rio Earth Summit (1992)',
       'UN Conference on Environment and Development in Rio de Janeiro; produced the UNFCCC and established the principle of "common but differentiated responsibilities."'),
  (8,  'Kyoto Protocol',
       '1997 agreement under the UNFCCC binding developed nations to quantified GHG reduction targets for 2008–2012; the first binding international climate treaty.'),
  (9,  'Paris Agreement',
       '2015 accord in which 196 parties pledged Nationally Determined Contributions (NDCs) to limit warming to well below 2 °C and pursue 1.5 °C.'),
  (10, 'nationally determined contribution (NDC)',
       'A country''s self-set climate pledge under the Paris Agreement; submitted every five years with a ratchet mechanism to increase ambition.'),
  (11, 'net zero',
       'A state in which anthropogenic GHG emissions are balanced by removals, so no additional CO₂ accumulates in the atmosphere.'),
  (12, 'just transition',
       'Ensuring the shift to a low-carbon economy creates decent jobs, social equity, and does not disproportionately harm fossil-fuel-dependent workers and communities.'),
  (13, 'fossil fuel obstruction',
       'Efforts by fossil fuel interests to delay, weaken, or prevent climate regulation through lobbying, funding doubt campaigns, and shaping political discourse.'),
  (14, 'climate rights movement',
       'Legal and political efforts — including youth litigation and constitutional challenges — asserting a right to a stable climate as a fundamental human right.')
) AS c(pos, front, back)
WHERE  d.slug = 'eps7'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- 9. Update deck card count
-- =====================================================================
UPDATE public.decks
SET    card_count = (
  SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id
)
WHERE  slug = 'eps7';
