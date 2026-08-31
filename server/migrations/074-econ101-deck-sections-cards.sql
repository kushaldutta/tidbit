-- Migration 074: ECON 101 — new preset deck (app class id econ101).
-- Berkeley catalog name is ECON 101B, Macroeconomics (Quantitative).
-- UC Berkeley Fall 2026: Jon Steinsson, TuTh 08:00-09:29, Physics Building 4.
-- Same topics as 100B, more calculus and explicit equations. Credit restriction
-- vs 100B / UGBA 101B / S100B. Distinct from Edwards/Jones 100B and from 101A
-- (Lanzani, micro). Sequence follows Steinsson notes: measurement, Malthus,
-- production, Solow, ideas, labor, money/LM, IS, Phillips, MP/ZLB/fiscal.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'econ101',
  'ECON 101',
  'Macroeconomics (Quantitative) — Steinsson: Malthus, Solow, IS-MP-Phillips',
  'uc-berkeley:econ101:fa26',
  'system',
  true,
  '📈',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

UPDATE public.classes
SET title = 'Macroeconomics (Quantitative)'
WHERE id = 'uc-berkeley:econ101:fa26';

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'econ101');

DELETE FROM public.tidbits
WHERE category_id = 'econ101';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ101');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ101');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('facts',     'Measurement & Growth Facts',
   'GDP identity, real vs nominal, Kaldor facts, growth rules', 0),
  ('malthus',   'Malthus & Pre-Industrial Stagnation',
   'Subsistence, population checks, why y was flat for centuries', 1),
  ('production','Production & Development Accounting',
   'Cobb-Douglas, factor shares, A vs k, objects vs ideas', 2),
  ('solow',     'The Solow Growth Model',
   'Capital accumulation, steady state, levels vs growth', 3),
  ('ideas',     'Ideas, the IR & Long-Run Growth',
   'Nonrival ideas, Romer, why Solow is not the engine', 4),
  ('labor',     'Labor, Unemployment & Okun',
   'MPL, bathtub, natural rate, Okun coefficient', 5),
  ('money',     'Money, Quantity Theory & LM',
   'MV=PY, Fisher, medieval model, LM then MP', 6),
  ('iscurve',   'Short Run & the IS Curve',
   'Output gap, sticky prices, demand shocks, fiscal IS', 7),
  ('phillips',  'Phillips Curve & the Great Inflation',
   'Adaptive PC, vertical LRPC, sacrifice ratio', 8),
  ('policy',    'MP, ZLB & Fiscal Policy',
   'Taylor principle, ZLB, optimal policy, government', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'econ101'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Measurement & Growth Facts
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'facts'
CROSS JOIN (VALUES
  (0,  'ECON 101 (Steinsson) in one sentence',
       'This is catalog 101B: math-intensive macro with the same topics as 100B, more calculus and written equations. FA26: Jon Steinsson, TuTh 8–9:30am, Physics 4. Path: measurement, Malthus, Solow, ideas, then IS-MP-Phillips. Not Edwards/Jones 100B. Not 101A micro (Lanzani). The app lists the class as ECON 101.'),
  (1,  'expenditure identity',
       'Y = C + I + G + NX. Production, income, and expenditure are three readings of one flow. 101: identities first, behavior later. NX = EX − IM. A transfer is not G. Inventory that nobody wanted is still I, which is how the identity survives a demand crash.'),
  (2,  'what is in GDP',
       'Market value of final goods and services produced in a period. 101: drop intermediates, used assets, most home production. A new house is I; selling a used house is not current Y. Financial trades rearrange claims.'),
  (3,  'real vs nominal',
       'Nominal uses current P; real holds P fixed or chain-weights. Percent change in nominal is about real growth plus inflation. 101: if they give two years of P and Q, compute both then the deflator. Comparing 1980 and 2026 dollars without a deflator is a fail.'),
  (4,  'deflator vs CPI',
       'Deflator: GDP basket (includes I and G, excludes imports). CPI: consumer basket (includes imports). 101: an oil import spike hits CPI harder. Neither is exact welfare without substitution. Steinsson cares that you know which index you wrote.'),
  (5,  'growth-rate rules',
       'g[XY] = g[X]+g[Y]; g[X/Y] = g[X]−g[Y]; g[X^a] = a g[X]. 101: if Y = A K^{1/3} L^{2/3}, then g_Y = g_A + (1/3)g_K + (2/3)g_L. Logs are the grown-up version. These rules are how you go from levels to growth on every midterm.'),
  (6,  'rule of 70',
       'Years to double ≈ 70 / (g in percent). 101: a 1 pp growth gap is a civilization, not a rounding error. Use it on y, not on a one-year cycle. Compounding is why the first half of the course exists.'),
  (7,  'Kaldor facts (targets)',
       'Roughly stable g of Y/L in rich countries; K/Y more stable than K; labor and capital shares not exploding; r not exploding. 101: a model that makes r go to infinity as K grows has already lost. CD plus labor-augmenting A is built to hit these.'),
  (8,  'cross-country facts',
       'Huge Y/L gaps; growth miracles and disasters; absolute convergence fails; conditional convergence is closer in similar clubs. 101: poor is not automatically fast. Development accounting will split k vs A. Malthus will explain why y was flat for most of history.'),
  (9,  'stocks vs flows',
       'Y, C, I are flows. K, debt, population are stocks. 101: ΔK = I − dK. Mixing a stock and a flow in one equation without time is the first math miss. Solow and Malthus are stock-flow models.'),
  (10, 'S − I = NX',
       'National saving minus investment equals net exports. 101: a trade deficit is capital inflow, an identity, not a China lemma. Behavior (r, the real exchange rate) decides the split. Same identity 100B uses; 101 will put it in equations.'),
  (11, 'per worker vs aggregate',
       'Living standards are y = Y/L (or per person). Total Y can rise from L alone. 101: Malthus and Solow are written in per-worker (or per-effective-worker) units on purpose. Read the question: y or Y.'),
  (12, 'facts exam move',
       'Write Y=C+I+G+NX. Classify the transaction. Real vs nominal plus deflator. Hit a Kaldor fact if they ask what a model must match. Growth rules on a product or power. End with S−I=NX if they give a trade number.'),
  (13, 'counting trap',
       'Adding Social Security, a stock trade, or a used car to GDP. Counting steel and the car. 101: GDP is production. Transfers can still change C later (IS), but they are not G in the identity.'),
  (14, 'levels-vs-growth trap already',
       'Treating a one-year boom as a Kaldor growth fact. 101: the first half is centuries and balanced paths; the second half is gaps around the path. Mixing them is how you call every recession a Solow technology collapse.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 2. Malthus & Pre-Industrial Stagnation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'malthus'
CROSS JOIN (VALUES
  (0,  'Malthus in one sentence',
       'If living standards rise, population rises until y is back at subsistence — so land-and-labor economies have no long-run growth in y. 101: Steinsson starts here because Solow is the escape from this trap, and ideas are the escape from Solow. 100B skipped this chapter.'),
  (1,  'the production story',
       'Fixed land (or a rival resource), labor L, diminishing MPL. y = Y/L falls as L rises. 101: a technology or land boom raises y on impact, then L grows and eats the gain. Draw y against L, subsistence as a horizontal line.'),
  (2,  'subsistence',
       'The y at which population growth is zero (births = deaths, or fertility = replacement). 101: above it, L grows; below it, L shrinks. Steady state is y at subsistence, not a golden-age consumption max. That is the dismal part.'),
  (3,  'preventive vs positive checks',
       'Preventive: later marriage, fewer births. Positive: famine, disease, war when y is low. 101: both close the loop from y to ΔL. You do not need the 1798 moralizing; you need the sign of n(y).'),
  (4,  'steady state in the diagram',
       'Intersection of the y(L) curve and subsistence. 101: a better A or more land shifts y(L) up, so equilibrium L is higher and long-run y is unchanged (pure Malthus). Short run: y high while L has not caught up (the Black Death the other way).'),
  (5,  'Black Death comparative static',
       'L down, MPL and y up, then population slowly recovers and y falls back. 101: this is the model''s best historical illustration. Wages high for a generation is not a new balanced-growth path. Contrast Solow, where a one-time L drop also raises k and can have a long transition.'),
  (6,  'why most of history looks flat',
       'From the agricultural revolution to ~1700, y in western Europe is not a modern growth miracle. 101: Malthus is the default. Institutions, expropriation, and disease are extra. Do not import Solow g_A into 1400.'),
  (7,  'what would break Malthus',
       'A growing A that outruns L; a fertility transition (n no longer rises with y); capital that is accumulable without a fixed land constraint. 101: the IR plus later demography. Steinsson''s next chapters are exactly those breaks.'),
  (8,  'expropriation (light)',
       'If surplus is stolen, the incentive to accumulate or invent dies. 101: this is complementary to Malthus, not a substitute diagram. Name it if they ask why some places stayed poor even when land was abundant.'),
  (9,  'Malthus vs Solow, one contrast',
       'Malthus: the rival fixed factor is land, the accumuland is people, long-run y pinned. Solow: the rival accumuland is K, L grows exogenously, long-run y pinned unless A grows. 101: both have diminishing returns and a steady level. Neither is an ideas engine.'),
  (10, 'math of n(y)',
       'Simplest: n = n(y − y_sub). Steady state y* = y_sub, L* from y(L*)=y_sub. 101: if they give a linear n and CD in land and labor, you can solve L*. Calculus is fair game in 101 — unlike Edwards 100B, derivatives can be the question, not only guided.'),
  (11, 'wages in Malthus',
       'Competitive: w = MPL, which is decreasing in L. 101: long-run w is subsistence-related (up to a labor-supply story). A productivity boom that is fully absorbed by L does not raise long-run w. That is the political bite of the model.'),
  (12, 'Malthus exam move',
       'Write y(L) diminishing, n(y), subsistence line. Shock A or land: L* up, y* unchanged in the long run. Transition: y high then falling. Name the IR/fertility break if they ask how we escaped. Contrast Solow in one sentence.'),
  (13, 'Malthus-as-Solow trap',
       'Putting K in the Malthus picture as if capital accumulation raised long-run y with land fixed and n(y) still on. 101: extra K that is reproducible is Solow; extra people against land is Malthus. Also: treating subsistence as a preference, not a demographic equilibrium.'),
  (14, 'IR-without-a-break trap',
       'Saying "we grew because we saved" as the escape from Malthus. 101: saving K on a fixed-land Malthus world still gets eaten by L unless A or fertility changed. Steinsson wants the mechanism: ideas and/or n(y) flattening.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 3. Production & Development Accounting
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'production'
CROSS JOIN (VALUES
  (0,  'Cobb-Douglas',
       'Y = A K^α L^{1-α}, Steinsson often α=1/3. CRS in K and L; diminishing MPK and MPL. 101: A is TFP, a residual. Intensive form y = A k^α. If they scale K and L by λ, Y scales by λ. That replication argument is why we use CRS in objects.'),
  (1,  'factor prices',
       'Competitive: MPK = r (rental), MPL = w. CD: MPK = α Y/K, MPL = (1-α) Y/L. Shares: rK/Y=α, wL/Y=1-α. 101: Euler/CRS: factor payments exhaust Y if A is not a rival paid factor. Constant shares are why CD is the 101 workhorse (Kaldor).'),
  (2,  'development accounting',
       'Split Y/L gaps into k vs A. 101: a lot of the cross-section is A (efficiency, institutions, ideas in use), not just missing factories. If it were only k, MPK in poor countries would look huge and capital should flood in (Lucas puzzle).'),
  (3,  'objects vs ideas',
       'Objects are rival; ideas are nonrival. 101: CRS in objects plus nonrival A can yield increasing returns overall. Do not call a machine an idea. This sentence is the bridge from Solow to Romer and from Malthus (rival land) to modern growth.'),
  (4,  'growth accounting',
       'g_Y = g_A + α g_K + (1-α) g_L. Solow residual is g_A. 101: most of modern growth in y is the residual, not capital deepening, once you do the accounting. That is the empirical punch before the Romer theory.'),
  (5,  'intensive form',
       'y=Y/L, k=K/L, y=A k^α. 101: n = ΔL/L dilutes k; it is not "more workers, richer people." A raise raises y at given k. All Solow pictures live here. Per-effective-worker k-tilde = K/(A L) if A grows.'),
  (6,  'labor-augmenting A',
       'Y = F(K, A L) (Harrod-neutral) is the form that fits balanced growth with CD. 101: Steinsson flags this. Hick-neutral A multiplying F also works with CD (they coincide). You will not prove Uzawa; you should write the intensive variable the notes use.'),
  (7,  'diminishing MPK',
       'Extra K, A and L fixed, adds less and less. 101: that is why s cannot be a perpetual engine (next section). Graph: y = A k^{1/3} concave. If MPK did not fall, k would explode.'),
  (8,  'human capital (light)',
       'Sometimes Y = A K^α (h L)^{1-α}. Then part of the residual is schooling. 101: do not put h in both the rival input and A. Mankiw-Romer-Weil is the empirics Steinsson may cite after Solow.'),
  (9,  'institutions in A',
       'A includes misallocation, property rights, and whether world ideas are used. 101: a poor country can in principle use nonrival ideas and still have low A. Romer is about the frontier; adoption is extra. Malthus expropriation is the violent version.'),
  (10, 'constant returns check',
       'F(λK,λL)=λF(K,L). IRS in K and L together would make big countries automatically richer per person, which is not the cross-section. 101: IRS in ideas is different because ideas are nonrival. State which inputs you are scaling.'),
  (11, 'why α≈1/3',
       'Capital share in national accounts. 101: if they change α, exponents on s and A in Solow k* change (1/(1−α)). Memorize α=1/3 as the default number, not a law of nature.'),
  (12, 'production exam move',
       'Write Y=A K^{1/3} L^{2/3}. Shares, MPK, MPL. Intensive y=A k^α. Growth accounting. Split a Y/L gap into k vs A. Mention nonrival ideas if the next question is Romer or Malthus-vs-modern.'),
  (13, 'CRS trap',
       'Y = A K^α L^α as CRS (exponents on rival inputs must sum to 1). MPK = α A. 101: MPK = α Y/K = α A k^{α−1}. Forgetting L when differentiating wrt K is the derivative they are allowed to ask.'),
  (14, 'k-explains-everything trap',
       'Pointing at a production picture and saying poor countries are poor only because s is low. 101: s matters in Solow levels; A gaps are first-order in the data. High predicted MPK that we do not see as a capital flood is the clue.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 4. The Solow Growth Model
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'solow'
CROSS JOIN (VALUES
  (0,  'Solow in one sentence',
       'K accumulates from saving and runs into diminishing MPK, so k and y settle unless A grows — capital is not the engine. 101: Steinsson discrete time: K_{t+1} = s Y_t + (1−d) K_t. Same lesson as 100B, with more algebra. Contrast Malthus: here L is exogenous, not the accumuland.'),
  (1,  'laws of motion',
       'ΔK = sY − dK. Per worker: Δk = s y − (n+d)k. 101: (n+d)k is break-even investment. If s y is above the ray, k rises. Draw both. Steinsson L7: this is "very similar to the Malthus diagram" with K in place of L.'),
  (2,  'steady state',
       's y* = (n+d) k*. With y=A k^α, k* = [s A/(n+d)]^{1/(1-α)}. 101: α=1/3 implies k* = [s A/(n+d)]^{3/2} and y* = A^{3/2} [s/(n+d)]^{1/2}. A enters more than one-for-one because it also raises k*. Know the exponents.'),
  (3,  'diagram',
       'k on the axis, concave s y, ray (n+d)k. 101: s or A lift the concave curve; n or d steepen the ray. Arrows toward k*. y* is just A k^α at k*. Do not shift the ray when A changes.'),
  (4,  'change in s',
       'Higher s: k* and y* up; transitional g higher; steady-state g_y still g_A (0 if A fixed). c*=(1-s)y* may rise or fall (Golden Rule). 101: China-style s is a level/transition story. This is the question they love.'),
  (5,  'change in n or d',
       'Faster n or d: lower k* and y*. 101: n is dilution in per-worker units. Total Y can still rise. Read y vs Y. Same sign as a Malthus L increase, different mechanism (here n is exogenous).'),
  (6,  'change in A',
       'Higher A: k* and y* up, y* more than one-for-one. If A grows at g, balanced growth: y and k grow at g, k/y constant. 101: write per-effective-worker variables if the notes do. Basic L7 often holds A fixed first, then adds g.'),
  (7,  'why s is not the engine',
       'Diminishing MPK: you cannot raise k/y forever. In steady state g_y = g_A. 101: Easterly/Krugman history Steinsson cites — 1950s "just invest" advice. Capital accumulation cannot serve as an engine for long-run growth. Quote that sentence.'),
  (8,  'transition / catch-up',
       'Far below k*, MPK high, k grows fast. Conditional on s,n,d,A. 101: unconditional "poor grow faster" is not the theorem. MRW (1992) is the empirics slide. A gap in A means no reason for levels to meet.'),
  (9,  'Golden Rule',
       's that maxes c*=(1-s)y*. Condition: MPK = n+d (gross). 101: calculus is fair. Dynamic inefficiency if s is so high that MPK is below n+d: cut s, consume more now and later. 100B treated this as guided; 101 can ask the derivative.'),
  (10, 'K/Y in CD steady state',
       'k*/y* = s/(n+d) (A cancels). 101: a useful check. If they give s, n, d, you have the capital-output ratio without knowing A. Along a balanced path with growing A, K/Y is still pinned this way.'),
  (11, 'Solow with g_A and n',
       'Define k-tilde = K/(A L). Steady k-tilde*, y grows at g_A, Y grows at g_A+n. 101: this is the full model. Levels of the path still depend on s. Growth of y in the long run does not.'),
  (12, 'Solow exam move',
       'Write Δk = s A k^α − (n+d)k. Solve k* and y* (α=1/3 exponents). Shift which curve. Levels vs growth. If A grows, g_y=g_A. Golden Rule only if they ask max c. One sentence vs Malthus (L vs K).'),
  (13, 'levels-vs-growth trap',
       'A higher s raises long-run g of y in the A-fixed model. 101: it raises the path and transitional g, not steady-state g. Same trap as 100B, now with the discrete-time law if they gave K_{t+1}.'),
  (14, 'diagram trap',
       'Moving (n+d)k when A changes, or sy when n changes. Drawing sy linear. 101: also writing the Malthus n(y) loop on top of Solow as if L were endogenous without saying so. Pick one model unless they asked to nest them.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 5. Ideas, the IR & Long-Run Growth
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ideas'
CROSS JOIN (VALUES
  (0,  'why Solow is not enough',
       'With A fixed, y is constant in the long run. History after ~1800 is not that. 101: the engine is A, and A is ideas. Malthus blocked y; Solow blocked using K as g; Romer explains sustained g. Steinsson textbook: how did growth begin.'),
  (1,  'nonrivalry vs excludability',
       'Nonrival: many people use one blueprint. Nonexcludable: hard to stop them (patents, secrecy vary). 101: growth theory needs nonrivalry. Incentives need some excludability. Mixing the two words is the cheap miss.'),
  (2,  'Romer idea accumulation',
       'Simple version: ΔA = z A L_a (research labor times the stock). Then g_A = z L_a. 101: "shoulders of giants" is the A on the right. Contrast Solow: ΔK has diminishing returns to K. Ideas can be CRS in A; capital cannot.'),
  (3,  'scale effect',
       'More researchers, higher g. 101: a bigger L (or ℓ in research) raises g_A in this version. The US-vs-Denmark objection is real; later models kill the scale effect. Use the version Steinsson taught that week.'),
  (4,  'balanced growth with ideas',
       'g_y = g_A along the path; k/y still looks Solow. 101: s sets the level of k/y; ideas set g. Combining the models is the grown-up long-run picture. Do not answer "what generates g" with "saving" after this week.'),
  (5,  'industrial revolution as a break',
       'Sustained g of y begins when idea production and institutions support it, and later when n(y) flattens (demographic transition). 101: Steinsson wants both the A story and why Malthus stopped eating the surplus. "Coal" or "culture" without a model is incomplete.'),
  (6,  'objects vs ideas in policy',
       'Investment tax credit: Solow levels. R&D, universities, immigration of researchers: A and maybe g. 101: patents trade static monopoly (100A) against dynamic g. Name the tradeoff; do not pick a corner as a slogan.'),
  (7,  'allocation of labor',
       'ℓ in research vs production: more ℓ, higher g, lower current Y. 101: spillovers mean the market ℓ may be too low. You will not solve a planner; name the externality. This is 100A missing markets, now in growth.'),
  (8,  'ideas in poor countries',
       'World A is nonrival, so in principle adoptable. Low A can mean unused ideas (barriers, human capital, misallocation). 101: Romer is the frontier; development accounting is whether you operate at it. Not "they have not invented calculus."'),
  (9,  'expanding variety / quality (light)',
       'Romer variety vs Aghion-Howitt quality ladders (creative destruction). 101: if they only taught the simple ΔA=z A L_a, stay there. If they named creative destruction, growth can destroy old firms — a distributional hit that Solow does not have.'),
  (10, 'fundamental causes (light)',
       'Institutions, geography, culture as reasons A and s differ. 101: Steinsson graduate slides exist; 101B wants you not to stop at "A is low" without a candidate. Acemoglu-Robinson flavor is enough if they assigned it.'),
  (11, 'IR vs a one-time A jump',
       'A one-time A jump in Solow raises the path, not g. The IR is ongoing g_A. 101: a "Great Inventor" story that stops is Solow. A research sector that keeps producing is Romer. Malthus would have eaten a one-time A jump via L.'),
  (12, 'ideas exam move',
       'Write ΔA = z A L_a, g_A = z L_a. Nonrival vs rival. Solow: s sets k/y, not g. Escape from Malthus: A outruns L and/or n(y) flattens. Policy: ℓ and z, not s as the engine. Scale effect if they change L.'),
  (13, 'rival-ideas trap',
       'Treating a blueprint like a machine. 101: that restores diminishing returns and kills perpetual g the Solow way. A patent is excludability, not rivalry.'),
  (14, 'saving-as-IR trap',
       'After ideas week, still answering "why did growth begin" with "the saving rate rose." 101: s can move the Solow path; the IR is g_A and a fertility break. High s in a Malthus world raises L, not y*.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 6. Labor, Unemployment & Okun
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'labor'
CROSS JOIN (VALUES
  (0,  'long-run wage',
       'w = MPL = (1-α) Y/L for CD. Along balanced growth, w grows with y and A. 101: the Fed does not set the long-run real wage. Short-run unemployment needs sticky W/P or search. Keep this market distinct from the bathtub.'),
  (1,  'labor demand and supply',
       'Demand: MPL=w, downward. A or K up shifts demand right. Supply: leisure vs c, usually upward. 101: a payroll tax is a wedge (100A). For aggregates in the short-run model, labor is often the gap via Okun, not a full hours diagram.'),
  (2,  'bathtub',
       's E = f U in steady flows. u* = s/(s+f). 101: unemployment is a flow object. Higher s or lower f raises u*. Cyclical: f collapses in a recession. Do not draw U as a pile that never turns over.'),
  (3,  'natural rate',
       'Frictional + structural. Cyclical is the gap vs u*. 101: policy on s and f (UI, matching, skills) moves u*; demand policy moves the gap in the sticky-price half. Natural-rate hypothesis is this plus a vertical LR Phillips curve.'),
  (4,  'three types',
       'Frictional: search. Structural: skills/location/institutions. Cyclical: slack demand. 101: 2009 is not all frictional. College-to-job in a boom is not cyclical. Classify before you prescribe.'),
  (5,  'u vs LFPR',
       'u = U/LF. LFPR = LF/population. 101: people leaving LF can cut u without a healthy market. Employment-population is the extra statistic. Retirees are not unemployed.'),
  (6,  'Okun''s law (Steinsson)',
       'u − ū ≈ −(1/2) Ỹ. A 2% output gap is about 1 pp extra unemployment. 101: this is how the IS-MP-Phillips model talks to the labor market. It is an empirical regularity, not a production function. He writes the 1/2 explicitly.'),
  (7,  'wage rigidity',
       'If w cannot fall, a demand drop creates u above the flexible-w equilibrium. 101: efficiency wages, unions, min wage, morale — name one if they ask why. This is the bridge to sticky-price short run, not a second Solow.'),
  (8,  'hours vs employment',
       'Y can fall on the intensive (hours) or extensive (employment) margin. 101: US recessions hit employment hard. If they give total hours, you are closer to L in Y=A F(K,L). Okun coefficients differ across countries.'),
  (9,  'Beveridge (light)',
       'u and vacancies usually move opposite (tight vs slack). Both up is a matching/structural shift. 101: useful when they ask cyclical vs structural after a reallocation shock.'),
  (10, 'skill-biased A (light)',
       'A that raises skilled MPL more raises the skill premium. 101: "A rose" need not raise every w equally. Inequality is not the core exam object unless they made it one.'),
  (11, 'employment in the long-run model',
       'L given or inelastic; u at u*; Y at potential. 101: the first half can ignore cyclical u. The second half''s Ỹ is the percent gap vs that potential. Mixing "unemployment in Solow" without a labor-market model is sloppy.'),
  (12, 'labor exam move',
       'Long run: w=MPL, share 2/3. Bathtub: u*=s/(s+f). Classify the type. Okun: Ỹ to u with coefficient 1/2. Sticky w: demand drop raises u. LFPR caveat if the labor force moved.'),
  (13, 'u-rate trap',
       'A fall in u is always good when LFPR collapsed. u as "the fraction of people without jobs." 101: it is the fraction of the labor force. Students not looking are not U.'),
  (14, 'Okun-as-identity trap',
       'Treating u − ū = −(1/2)Ỹ as accounting rather than an estimated slope. 101: if they give a different coefficient, use theirs. Also: using Okun to back out Ỹ in the long-run model where Ỹ=0 by construction.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 7. Money, Quantity Theory & LM
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'money'
CROSS JOIN (VALUES
  (0,  'what money is',
       'A medium of exchange, unit of account, store of value. 101: Steinsson L10 starts here. Inside vs outside money can wait. The point is transactions: people hold M because goods are not all bartered. That is why M/P appears in a demand function.'),
  (1,  'quantity theory',
       'MV=PY. If V and potential Y are given, inflation = g_M − g_Y. 101: long-run inflation is a monetary phenomenon in this model. Hyperinflation is g_M exploding, usually fiscal (seigniorage). A one-time M jump is a price-level jump, not ongoing inflation.'),
  (2,  'neutrality / dichotomy',
       'In the flexible-price long run, M and inflation do not change real y, r, u*. 101: that is why growth theory skipped the Fed. The short run breaks this (sticky P). "Print money, long-run y rises" is the trap.'),
  (3,  'Fisher',
       'i = r + expected inflation. 101: r is real (MPK, IS). i is what you see. The Fed sets a nominal policy rate; the real rate is i minus expected inflation. 1970s: high i, maybe low r. Never put i on the IS axis.'),
  (4,  'medieval / cash economy',
       'Steinsson''s stepping-stone: transactions need cash, P may be sticky in the short run, so M can move Y. 101: price-setting: if demand is high today, the shopkeeper raises P tomorrow. That is a primitive Phillips curve. Then he modernizes it.'),
  (5,  'LM curve (then we drop it)',
       'M/P = L(Y,i): money demand rises in Y, falls in i. Given M, higher Y needs higher i to clear. 101: that is the old IS-LM. Steinsson then says modern central banks set a rate, not M — replace LM with MP. Know LM so you see what got replaced.'),
  (6,  'from LM to MP',
       'If the central bank targets i (or r), it supplies whatever M is demanded. LM becomes a horizontal MP in (Y, r) space. 101: "ignore the money market" for modern policy, until the ZLB when i cannot fall and quantities/QE return.'),
  (7,  'money demand and V',
       'Real balances M/P fall when i is high. V is not a physical constant. 101: a crisis (liquidity trap) can collapse V, so PY falls even if M is stable. Quantity theory with stable V is the long-run benchmark.'),
  (8,  'costs of inflation',
       'Expected: shoe leather, menu, tax misindexation, noisy relative prices. Unexpected: borrowers vs lenders. 101: "prices up is bad" is incomplete — wages are prices too. Name a friction. Hyperinflation: fiscal plus a monetary restart.'),
  (9,  'deflation',
       'Negative inflation: cash gains, real debt up, spending delays. 101: at the ZLB, expected deflation raises r = i − π^e and is IS-contractionary. Not "cheap goods, consumers win" in a debt economy.'),
  (10, 'seigniorage',
       'Real resources from printing: related to M growth and real balances. 101: in a hyperinflation, money demand collapses and the tax base shrinks. The fix is the budget, not a wage freeze alone.'),
  (11, 'interest in the long run',
       'Fisher: i tracks expected inflation one-for-one given r. r-star is a real object from saving, investment, and growth. 101: the inflation target is a choice of trend g_M − g_Y. Do not call r-star "whatever the funds rate is."'),
  (12, 'money exam move',
       'MV=PY, inflation = g_M − g_Y. Neutrality in the long run. Fisher: i = r + expected inflation. Medieval sticky-P: M can move Y. LM: M/P=L(Y,i), then replace with MP. ZLB: quantities matter again.'),
  (13, 'more-M-more-Y trap',
       'Using MV=PY to raise real Y in the long run. 101: P up. Short run can differ. Also: a one-time M jump vs ongoing g_M (level of P vs inflation). Levels vs growth, money edition.'),
  (14, 'LM-as-modern-Fed trap',
       'Drawing upward LM as the default 2026 policy model. 101: Steinsson modernizes to MP. Use LM if they are still in the money-market week or at the ZLB with a money-supply story. Label which regime.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 8. Short Run & the IS Curve
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'iscurve'
CROSS JOIN (VALUES
  (0,  'long run vs short run',
       'Long run: flexible P, Y at potential Y-bar from Solow/ideas, money neutral. Short run: sticky P/W, Y can differ from Y-bar. 101: Steinsson writes the gap Ỹ = (Y − Y-bar)/Y-bar. The second half is IS-MP-Phillips. Do not diagnose a demand slump as a Solow A collapse by default.'),
  (1,  'potential output',
       'Y-bar is natural-rate, flexible-price output (A, K, L, u*). It grows. 101: a recession is Ỹ negative. If Y-bar is also falling, that is a growth slowdown. Separate trend and cycle.'),
  (2,  'IS (Steinsson)',
       'Ỹ = a-bar − α (R − r-bar). Gap up when demand shocks are high and when the real rate R is below r-bar (MPK / Wicksellian rate). 101: same object as Jones, different letters. No LM in the default modern diagram. The Fed sets a rate.'),
  (3,  'a-bar',
       'Demand shock: C, I, G, NX, animal spirits, credit, housing. 101: a-bar=0 is normal demand. 2008 is a-bar (and a credit wedge on effective R). α is interest sensitivity of demand (I, durables, maybe NX).'),
  (4,  'r-bar',
       'The real rate that makes Ỹ=0 when a-bar=0. 101: if r-bar falls (slow growth, capital glut) and the Fed does not cut R, you get a negative gap. r-star debates are this parameter. It is not the funds rate.'),
  (5,  'IS graph',
       'R on the vertical axis, Ỹ horizontal. IS slopes down. a-bar shifts IS. Tight money is a move along (higher R) if MP is changing R. 101: label R, not i. Fisher is why.'),
  (6,  'fiscal on IS',
       'G up or T down (if MPC positive) raises a-bar, IS right, Ỹ up at given R. 101: the short-run multiplier lives here. Long run Ỹ=0, G crowds out C or I (or NX). Do not import crowding out into a slump with R stuck.'),
  (7,  'Keynesian multiplier',
       'C = c_0 + c_y (Y−T) gives 1/(1−MPC) if R is held fixed. 101: Steinsson folds this into a-bar and α. Hand-to-mouth households raise MPC. State the held-fixed R. Ricardian households would not move a-bar for a tax cut (later).'),
  (8,  'consumption Euler / PIH (light)',
       'Two-period: MRS = 1+r (100A). Transitory income is mostly saved; permanent is consumed. 101: Keynesian C is the constrained limit. Use the right household for the question. This is why rebates can still shift IS.'),
  (9,  'investment in IS',
       'I falls when R rises (user cost). Also q, expected Y, credit. 101: main reason IS slopes down. If α is small, MP is weak and fiscal is more powerful at given R. Japan/ZLB discussions live here.'),
  (10, 'Great Recession as IS',
       'Housing, credit, uncertainty smashed a-bar; borrower R rose even as the funds rate fell. 101: demand plus a financial wedge, not Solow A as the main 2008 story. Y-bar may have been hit too; still start with IS.'),
  (11, 'open IS (light)',
       'Higher R can appreciate the currency and cut NX, extra slope. Foreign Y-star is a-bar. 101: if they have not done open economy, keep NX in a-bar as foreign demand. UIP is extra, not the default first IS lecture.'),
  (12, 'IS exam move',
       'Write Ỹ = a-bar − α(R − r-bar). Name the parameter. Graph: shift vs move along. Fiscal: a-bar. Fed: R (MP next). 2008: a-bar and credit. Sticky P, so Y can differ from Y-bar. Potential still comes from the first half.'),
  (13, 'IS-as-supply trap',
       'Treating IS as a production function or as long-run Y. 101: IS is demand. Supply is Y-bar and Phillips/AS. A negative a-bar is a recession even if A did not fall.'),
  (14, 'nominal-rate-on-IS trap',
       'Putting i on the IS axis. 101: if expected inflation jumps, i and R can move opposite. The IS relation is the real cost of capital. Label R or you get the 1970s backward.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 9. Phillips Curve & the Great Inflation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'phillips'
CROSS JOIN (VALUES
  (0,  'language',
       'Phillips curve, price-setting equation, and short-run AS are the same object in this course. 101: Steinsson L16. Medieval: P tomorrow responds to excess demand today. Then he puts expected inflation in.'),
  (1,  'expectations-augmented PC',
       'π_t = expected π_t + v-bar Ỹ_t + o-bar_t. Adaptive: expected π = π_{t-1}, so the change in inflation = v-bar Ỹ + o-bar. 101: boom today, inflation tomorrow. o-bar is oil/import shocks. v-bar is the slope.'),
  (2,  'medieval PC vs modern',
       'Medieval long run had a non-vertical flavor if expected inflation was zero by habit. 101: that suggested a permanent u–inflation menu (1960s). Adaptive expected inflation kills the menu: long-run PC is vertical at Ỹ=0.'),
  (3,  'vertical LRPC',
       'Stable inflation implies Ỹ=0. Money is neutral in the long run. 101: you cannot keep u below u* forever with inflation. Natural-rate hypothesis. The 1960s miss. Short-run tradeoff exists because expected inflation is sticky.'),
  (4,  'Great Inflation',
       'Unanchored expected inflation plus a Fed that did not obey a Taylor principle, plus oil o-bar. 101: the PC shifted up. Trying to hold u below u* raised inflation. Disinflation later required slack (Volcker).'),
  (5,  'sacrifice ratio',
       'Disinflation with adaptive PC wants Ỹ negative until inflation is down. 101: credibility (expected inflation jumping down) cuts the output cost. "Volcker raised i" is incomplete: he raised R and expected inflation came down.'),
  (6,  'AS/AD in (inflation, Ỹ)',
       'AD: IS plus MP, higher inflation leads the Fed to raise R, which cuts Ỹ (downward). AS: Phillips, upward given expected inflation. 101: demand shock shifts AD; inflation shock shifts AS. Expected inflation updates, AS walks. LRAS vertical at Ỹ=0.'),
  (7,  'demand shock path',
       'a-bar down: AD left, Ỹ down, inflation down. Fed can cut R to offset. 101: 2008–09 plus ZLB. Okun: u up. If they do not offset, slump and disinflation (or deflation).'),
  (8,  'inflation shock path',
       'o-bar up: AS left, inflation up, Ỹ down — stagflation. 101: tighten (more Ỹ pain, faster inflation down) vs accommodate (protect Ỹ, risk unanchoring). 1970s vs 2022 is this diagram plus a story about expected inflation.'),
  (9,  'NKPC (light)',
       'Rational expectations: inflation depends on expected future inflation and a gap (or marginal cost). 101: Steinsson flags this as 101B flavor vs 100B adaptive-only. If they did not derive Calvo, do not invent θ. Adaptive is the default exam PC unless they say NK.'),
  (10, 'Okun in this block',
       'Translate Ỹ into u − ū with 1/2. Dual mandate: inflation and employment. 101: do not mix ū (bathtub) with cyclical u − ū. A Ỹ of minus 4% is about +2 pp on u.'),
  (11, 'no long-run menu',
       'Picking a 1960s Phillips point as permanent policy is the trap. 101: expected inflation shifts the curve. Also: drawing AS as if Y-bar moved when a-bar moved. Oil can hit o-bar and Y-bar (capacity) — say both if they destroy supply.'),
  (12, 'Phillips exam move',
       'Write π = expected π + v-bar Ỹ + o-bar. Adaptive update. LR: Ỹ=0, inflation = target if MP is sensible. Demand vs oil shock on AS/AD. Sacrifice ratio if they disinflate. Okun to u. Name the 1960s miss.'),
  (13, 'stable-Phillips trap',
       'A permanent u–inflation menu. 101: that is the medieval/1960s PC. Also using the unemployment rate on a PC without Okun when the model is in Ỹ. Convert or they will mark units wrong.'),
  (14, 'PC-as-production trap',
       'Treating a Phillips shift as a Solow A movement without saying so. 101: o-bar can be related to supply, but Ỹ is still the gap vs Y-bar. First-half A changes Y-bar; second-half o-bar changes inflation given the gap.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

-- =====================================================================
-- 10. MP, ZLB & Fiscal Policy
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'policy'
CROSS JOIN (VALUES
  (0,  'MP curve',
       'Central bank sets a real (or nominal) policy rate. Simplest: horizontal MP in (Ỹ, R) space — they choose the gap via IS. 101: Steinsson L17. Replaces LM. Together IS and MP determine Ỹ and R. Then Phillips determines inflation.'),
  (1,  'Taylor principle',
       'Raise R more than one-for-one with inflation (phi greater than 1), or R falls when inflation rises and the gap explodes. 101: that is why the 1970s were unstable under some descriptions. Always convert the funds rate to R using expected inflation.'),
  (2,  'full modern BC model',
       'MP sets R. IS: Ỹ = a-bar − α(R − r-bar). PC: π = expected π + v-bar Ỹ + o-bar. Okun to u. 101: write all four if they say "the model." Logic: R to Ỹ to inflation (and next period''s expected inflation).'),
  (3,  'optimal MP (intuition)',
       'Offset a-bar with R to keep Ỹ near 0 and inflation near target. Inflation shocks: a tradeoff (no divine coincidence if both inflation and the gap are costly). 101: you will not solve a Ramsey problem; name the tradeoff and the instrument R.'),
  (4,  'ZLB',
       'i cannot go below zero (or ELB). If expected inflation is low, R stays too high, Ỹ negative. 101: Steinsson: at the ZLB the MP curve can slope the wrong way in inflation–gap space because deflation raises R. Destabilizing. Fiscal, QE, forward guidance, higher inflation target are the tools.'),
  (5,  'ZLB MP curve (sign)',
       'With i=0, R = −expected inflation. Adaptive PC: worse slump, more disinflation, higher R — a vicious loop. 101: this is the lecture-17 graph. Contrast ordinary MP, which can cut R when Ỹ falls.'),
  (6,  'QE and guidance (light)',
       'When i is stuck, buy duration (QE) or promise future low R (guidance) to move longer real rates or expected inflation. 101: money quantities come back. Do not pretend the funds rate is the only instrument in 2009–15.'),
  (7,  'fiscal at the ZLB',
       'G raises a-bar when MP cannot cut R. Crowding out via R is off if R is stuck. 101: Steinsson L18. Multipliers larger than in a Taylor regime that offsets. Still: composition, lags, and eventual debt. 100A crowding-out slogan is the wrong regime.'),
  (8,  'government budget',
       'G + transfers + i B = T + ΔB + ΔM. Primary vs total deficit. 101: seigniorage is the ΔM piece. Debt sustainability: if r is less than g, debt/GDP can fall with modest primary deficits; if r is greater than g, you need surpluses. Arithmetic, not a slogan.'),
  (9,  'Ricardian equivalence',
       'Tax cut, future taxes, forward-looking unconstrained agents: private saving up, a-bar unchanged. 101: benchmark, not a fact. Fails with constraints, myopia, finite lives, distortionary taxes. Hand-to-mouth is why rebates shift IS.'),
  (10, 'automatic vs discretionary',
       'Automatic: UI and tax receipts buffer a-bar without a vote. Discretionary: a bill, with lags. 101: 2008–09 and 2020 mixed both. Timing is why "just wait for Congress" is a weak stabilizer next to MP — except at the ZLB.'),
  (11, 'financial MP',
       'Lender of last resort, capital injections, credit spreads: effective R for borrowers, not only the funds rate. 101: Jones/Steinsson Great Recession. A Taylor rule on i can look easy while IS is still smashed.'),
  (12, 'policy exam move',
       'Write MP, IS, PC, Okun. Taylor: phi greater than 1. Shock: which instrument. ZLB: R stuck, fiscal or expected inflation, vicious deflation loop. Debt: r vs g, primary vs total. RE: when it fails. End with the regime (Taylor vs ZLB).'),
  (13, 'Taylor-principle trap',
       'Raising i less than one-for-one with inflation, so R falls. 101: stimulative when you meant to tighten. Also treating the funds rate as R when inflation is 8%.'),
  (14, 'crowding-out-at-ZLB trap',
       'Classical closed-economy "more G, less I, same Y" in 2009. 101: if R is stuck and Ỹ is negative, G can raise Y and crowd I in (accelerator). State Ỹ and the MP constraint before you say deficits raise r.')
) AS c(pos, front, back)
WHERE d.slug = 'econ101';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'econ101';
