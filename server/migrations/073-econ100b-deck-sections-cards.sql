-- Migration 073: ECON 100B — Macroeconomic Theory, full deck rebuild.
-- UC Berkeley Fall 2026: Ryan D. Edwards, TuTh 17:00-18:29, Pimentel 1.
-- Catalog: growth, business cycles, employment, unemployment, inflation,
-- monetary and fiscal policy; uses calculus; similar topics to 101B.
-- Credit restriction vs 101B / UGBA 101B / S100B.
-- Text: Chad Jones, Macroeconomics. Edwards uses the "old school" Romer
-- model from Jones 1e-5e. Short run is IS-MP-Phillips (not IS-LM).
-- Distinct from ECON 1 (survey) and ECON 101B (more formal / DSGE).

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'econ100b');

DELETE FROM public.tidbits
WHERE category_id = 'econ100b';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ100b');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ100b');

UPDATE public.decks
SET title = 'ECON 100B',
    description = 'Macroeconomic Theory — Edwards: Jones growth, IS-MP-Phillips, open economy',
    cover_emoji = '📈'
WHERE slug = 'econ100b';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('measure',   'Measurement & National Accounts',
   'GDP identity, real vs nominal, growth-rate rules', 0),
  ('production','Growth Facts & Production',
   'Kaldor facts, Cobb-Douglas, development accounting', 1),
  ('solow',     'The Solow Growth Model',
   'Capital accumulation, steady state, transition, Golden Rule', 2),
  ('romer',     'Growth and Ideas (Romer)',
   'Nonrival ideas, old-school Romer, balanced growth', 3),
  ('labor',     'Labor Market & Unemployment',
   'MPL, bathtub model, natural rate, Okun', 4),
  ('inflation', 'Inflation & Money',
   'Quantity theory, Fisher, neutrality, costs of inflation', 5),
  ('iscurve',   'Short Run & the IS Curve',
   'Output gap, demand shocks, real rate, fiscal IS', 6),
  ('phillips',  'Monetary Policy, Phillips & AS/AD',
   'MP/Taylor, Phillips curve, demand vs inflation shocks, ZLB', 7),
  ('policy',    'Consumption, Investment & Government',
   'PIH, user cost, budget constraint, multipliers, debt', 8),
  ('open',      'Open Economy: Trade & Exchange Rates',
   'NX identity, real exchange rate, UIP, trilemma', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'econ100b'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Measurement & National Accounts
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'measure'
CROSS JOIN (VALUES
  (0,  'ECON 100B (Edwards) in one sentence',
       'Long-run growth plus a short-run IS-MP-Phillips model, with algebra on Chad Jones — not 101B DSGE and not Econ 1 slogans. FA26: Ryan Edwards, TuTh 5–6:30pm, Pimentel 1. Old-school Romer from Jones 1e–5e. Credit restriction vs 101B and UGBA 101B. Catalog says calculus; Edwards exams are algebra, graphs, and current events.'),
  (1,  'expenditure identity',
       'Y = C + I + G + NX. Production, income, and expenditure are three readings of the same flow. 100B: if one piece moves, another must, or Y moves. NX = EX − IM. This is an accounting identity, not a behavioral equation — behavior comes in Solow, IS, and open-economy chapters.'),
  (2,  'what counts in GDP',
       'Market value of final goods and services produced in a country in a period. 100B: exclude intermediate goods (double counting), used-asset sales (not current production), and most home production. A new house is I; a used house is not GDP. Inventories that pile up are I (unintended).'),
  (3,  'C, I, G, NX',
       'C: household consumption (durables, nondurables, services). I: business fixed, residential, inventory — not financial assets. G: government purchases of goods and services, not transfers (Social Security is not G). NX: net exports. 100B: a tax cut is not G; a highway is.'),
  (4,  'real vs nominal',
       'Nominal GDP uses current prices; real GDP holds prices fixed (or chain-weights). Inflation is the growth of a price index. 100B: percent change in nominal ≈ percent change in real + inflation. If they give two years of P and Q, compute both, then the deflator.'),
  (5,  'GDP deflator vs CPI',
       'Deflator: prices of everything in GDP (includes I and G, excludes imports). CPI: a fixed basket of consumer goods (includes imports, excludes I). 100B: oil import spike hits CPI harder than the deflator. Neither is "the true cost of living" without a substitution caveat.'),
  (6,  'chain weighting (light)',
       'Fixed-base real GDP misleads when relative prices drift. Chain-weighting updates the base. 100B: you will not build a Fisher index on the exam; you should say why 2012-dollar GDP can look odd for computers. If they give a two-year example, Laspeyres vs Paasche is enough.'),
  (7,  'GDP vs welfare',
       'GDP misses leisure, environment, inequality, home production, and underground activity. GNP counts nationality, not geography. 100B: Edwards/Jones still start with Y because it is measured and it correlates with health and poverty. "GDP is welfare" is a fail; "GDP is the starting statistic" is the course.'),
  (8,  'stocks vs flows',
       'Y, C, I, G are flows (per year). K, B (debt), wealth are stocks. 100B: I is the flow that changes K: ΔK = I − depreciation. Saving is a flow; wealth is a stock. Mixing them is the first accounting miss.'),
  (9,  'national saving identity',
       'S = Y − C − G = I + NX in a closed-plus-NX world (private + public saving). 100B: S − I = NX. A country that invests more than it saves runs a trade deficit (capital inflow). This identity is the backbone of the open-economy section. It does not say deficits "cause" low saving without a model.'),
  (10, 'growth-rate rules',
       'g[XY] = g[X] + g[Y]; g[X/Y] = g[X] − g[Y]; g[X^a] = a g[X]. 100B: Edwards drills these in week 1. If Y = A K^{1/3} L^{2/3}, then g_Y = g_A + (1/3) g_K + (2/3) g_L. Log derivatives are the grown-up version of the same rules.'),
  (11, 'per capita vs total',
       'Level of Y can grow because L grows. Living standards are Y/L (or Y/population). 100B: China vs Luxembourg: total GDP vs GDP per person tell different stories. Solow is written in per-worker units for this reason.'),
  (12, 'measurement exam move',
       'Write Y = C+I+G+NX. Classify the transaction (final vs intermediate, new vs used, transfer vs G). Real vs nominal: deflator = nominal/real. Growth rules on a product or ratio. End with S − I = NX if they give a trade number.'),
  (13, 'counting trap',
       'Adding a used car, a stock trade, or a Social Security check to GDP. Counting both the steel and the car. 100B: financial transactions rearrange claims; GDP is production. Inventory is I even if nobody wanted it — that is how the identity still holds when C is weak.'),
  (14, 'real-nominal trap',
       'Comparing 1980 and 2026 GDP without a price index. Calling CPI inflation "GDP growth." 100B: if nominal Y rose 6% and the deflator 4%, real growth is about 2%. Fisher later: i is not r. Same spirit — peel the price change off the quantity change.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 2. Growth Facts & Production
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'production'
CROSS JOIN (VALUES
  (0,  'why growth is the first half',
       'Small differences in g compound (rule of 70: years to double ≈ 70/g in percent). 100B: the long-run level of Y/L is the Solow/Romer object; the short run is a gap around that path. Edwards: first half is Ch 2–8, second half is fluctuations. Do not skip production to get to the Fed.'),
  (1,  'growth facts (Jones)',
       'Vast differences in Y/L across countries; growth miracles and disasters; US Y/L has grown roughly steadily for a long time; K/Y is more stable than K; r is not exploding. 100B: these are the facts a model must not contradict. "Poor countries grow faster automatically" is not a fact (absolute convergence fails).'),
  (2,  'Cobb-Douglas production',
       'Y = A K^α L^{1-α}, Edwards/Jones often α = 1/3. Constant returns in K and L together; diminishing MPK and MPL separately. 100B: A is TFP, the residual after K and L. If they scale K and L by λ, Y scales by λ (CRS). That is why intensive form y = A k^α works.'),
  (3,  'factor prices and shares',
       'Competitive: MPK = r (or r+d, rental), MPL = w. Cobb-Douglas: MPK = α Y/K, MPL = (1-α) Y/L. Factor shares: rK/Y = α, wL/Y = 1-α. 100B: Euler/CRS: wL + (MPK)K = Y if A is not paid as a rival factor. Shares being roughly constant is why CD is the 100B workhorse.'),
  (4,  'intensive form',
       'y = Y/L, k = K/L. With CD and CRS: y = A k^α. 100B: all the Solow pictures live in (k,y) space. Population growth n = ΔL/L is not "more workers raise y" — it dilutes k. A raise does raise y for given k.'),
  (5,  'development accounting',
       'Split Y/L gaps into k differences vs A differences. 100B: a lot of cross-country income is A (efficiency, institutions, ideas in use), not just "they have fewer factories." If you assign everything to k, you will predict huge return gaps that we do not see (Lucas).'),
  (6,  'objects vs ideas',
       'Objects (K, hours) are rival: one person using a machine keeps another from using it. Ideas are nonrival: many can use the same blueprint. 100B: this is the bridge to Romer. CRS in objects is compatible with increasing returns once ideas are counted. Do not call a machine an idea.'),
  (7,  'diminishing MPK',
       'Extra K, holding L and A fixed, adds less and less. 100B: that is why capital accumulation alone cannot generate perpetual growth in y (Solow). In a picture, y = A k^{1/3} is concave. If MPK did not fall, sY would explode k forever at an increasing rate.'),
  (8,  'rule of 70 and logs',
       'g = 2% per year doubles in about 35 years. 100B: a 1 pp growth gap is a development story, not a rounding error. Growth-rate rules plus the rule of 70 are the arithmetic of the first midterm. If they give levels in two years, g ≈ Δ ln x, not Δx.'),
  (9,  'TFP as a residual',
       'A is whatever makes Y bigger after K and L. Measurement error, capacity utilization, quality of K, human capital, and true technology all sit in A. 100B: "A rose" is not a mechanism until you name one (ideas, institutions, reallocation). Romer will name ideas.'),
  (10, 'human capital (light)',
       'Sometimes Y = A K^α (hL)^{1-α}. Then some of "A" is schooling. 100B: if they add h, treat it like a rival input unless they say otherwise. Do not double-count: years of school in h and also in A.'),
  (11, 'constant returns check',
       'F(λK, λL) = λ F(K,L). 100B: replication argument — two identical plants. IRS in K and L together would mean a bigger country is automatically richer per person, which is not the cross-section. IRS in ideas is different (nonrival).'),
  (12, 'production exam move',
       'Write Y = A K^{1/3} L^{2/3} (or general α). Shares, MPK, MPL. Intensive y = A k^α. Growth rates: g_Y = g_A + α g_K + (1-α) g_L. If they ask why poor countries are poor, split k vs A. Mention nonrival ideas if the next question is Romer.'),
  (13, 'CRS trap',
       'Treating Y = A K^α L^α as CRS (exponents must sum to 1 in K and L). Calling MPK = α A. 100B: MPK = α A k^{α-1} = α Y/K. Forgetting L when you differentiate wrt K is the calculus miss Edwards said would be guided, not a surprise derivative hunt.'),
  (14, 'k-explains-everything trap',
       'Pointing at a Solow picture and saying Africa is poor only because s is low. 100B: s and n matter, but A gaps are first-order. Also: a high MPK in a poor country that we do not observe as a capital flood is a clue that A (or risk, or institutions) differs.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 3. The Solow Growth Model
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'solow'
CROSS JOIN (VALUES
  (0,  'Solow in one sentence',
       'Capital accumulates from saving, dilutes from depreciation and population growth, and runs into diminishing MPK — so k and y settle at a steady state unless A grows. 100B: Edwards does the α=1/3 algebra. The engine of long-run growth in y is not s; it is A (next chapter, Romer).'),
  (1,  'laws of motion',
       'ΔK = sY − dK (closed, no G). Per worker: Δk = s y − (n + d) k. 100B: (n+d)k is break-even investment, the capital you need just to keep k constant. If actual investment s y is above the break-even line, k rises. Draw both curves.'),
  (2,  'steady state',
       'Δk = 0 implies s y* = (n+d) k*. With y = A k^α, k* = [s A / (n+d)]^{1/(1-α)}. 100B: for α=1/3, k* = [s A / (n+d)]^{3/2} and y* = A^{3/2} [s/(n+d)]^{1/2}. Memorize the exponents. A enters y* more than one-for-one because it also raises k*.'),
  (3,  'Solow diagram',
       'Horizontal axis k, sy concave, (n+d)k a ray. Intersection is k*. 100B: a rise in s or A lifts sy; a rise in n or d steepens the ray (or you can think n+d bigger). Arrows: left of k*, k rises. The y* picture is just A k^α evaluated at k*.'),
  (4,  'change in s',
       'Higher s: k* and y* up, c* = (1-s)y* may go up or down (Golden Rule). Growth of y: temporarily higher, then back to g_A (often 0 in the basic Solow). 100B: this is the levels-vs-growth question they love. China-style s boom is a transition, not a permanent g rise in pure Solow.'),
  (5,  'change in n or d',
       'Faster population growth or faster depreciation: lower k* and y*. 100B: n is not "more workers, richer people." Dilution wins in per-worker units. Total Y can still rise because L is bigger. Read the question: y or Y.'),
  (6,  'change in A',
       'Higher TFP: sy shifts up, k* and y* rise, and y* rises more than the direct A effect. 100B: if A grows continuously, the diagram is chasing a moving target — balanced growth with k and y growing at g_A if you put A_t into the model. Basic Ch 5 often holds A fixed, then adds g_A.'),
  (7,  'transition dynamics',
       'Far below k*, MPK is high, net investment is high, growth of k is fast. As you approach k*, growth of k falls to 0 (or to g_A). 100B: this is Solow catch-up. It is conditional on s, n, d, A. Unconditional "poor grow faster" is not the theorem.'),
  (8,  'why s cannot be the engine',
       'Diminishing MPK: you cannot keep raising k/y forever by saving. In steady state, g_y = g_A. 100B: Jones/Edwards punchline before Romer. If they ask "raise s to 100%," y* is finite and c* is 0. Capital is rival and depreciates; that is the whole plot.'),
  (9,  'Golden Rule (guided)',
       's that maxes c* = (1-s)y*(s). Condition: MPK = n+d (gross), or net MPK = n. 100B: Edwards: example with calculus, could appear guided, not a surprise derivative hunt. Dynamic inefficiency: if s is so high that MPK is below n+d, you can cut s, consume more now and later.'),
  (10, 'conditional convergence',
       'Countries with the same s, n, d, A converge to the same y*; poorer ones (lower k) grow faster along the way. 100B: OECD looks like this more than the world. If A differs, there is no reason for levels to meet. "Convergence" without "conditional" is sloppy.'),
  (11, 'K/Y in Solow',
       'In CD steady state, k*/y* = s/(n+d) (the A cancels). 100B: Edwards slides hit this. A capital-output ratio is pinned by saving and effective depreciation, not by A. Useful check: if they give s, n, d, you can get K/Y without knowing A.'),
  (12, 'Solow exam move',
       'Write Δk = s A k^α − (n+d)k. Set Δk=0, solve k* and y* (α=1/3 exponents). Diagram: shift which curve, arrows, levels vs growth. If A is given as growing, g_y = g_A in the long run. Golden Rule only if they ask consumption max.'),
  (13, 'levels-vs-growth trap',
       'Saying a higher s raises long-run growth of y in the A-fixed Solow model. 100B: it raises the path (level) and transitional growth, not the steady-state g. The US has had a fairly stable g for a century; s moves are not the story of that g.'),
  (14, 'diagram trap',
       'Shifting (n+d)k when A changes, or shifting sy when n changes. Drawing sy linear. 100B: A and s move the concave curve; n and d move the ray. Also: k=0 is a steady state but unstable/uninteresting if MPK blows up at 0 (Inada). Start from the interior k*.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 4. Growth and Ideas (Romer)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'romer'
CROSS JOIN (VALUES
  (0,  'Romer in one sentence',
       'Ideas are nonrival, so the economy can have CRS in objects and still grow forever from knowledge. 100B: Edwards uses the old-school Jones 1e–5e Romer, not the later no-scale-effect version. Solow explained levels and transitions; Romer explains sustained g.'),
  (1,  'nonrivalry vs nonexcludability',
       'Nonrival: many people can use the same idea at once (a theorem, a mRNA design). Nonexcludable: hard to stop them (varies: patents, secrecy). 100B: growth theory needs nonrivalry. Policy and market structure need excludability. Do not mix the two words.'),
  (2,  'old-school Romer setup',
       'Y_t = A_t L_yt (output uses labor in production and the stock of ideas). L_yt + L_at = L. Idea accumulation: ΔA_t = z-bar A_t L_at. 100B: z-bar is research productivity. The A_t on the right is "we stand on the shoulders of giants" — more ideas make it easier to find the next one in this version.'),
  (3,  'growth of ideas',
       'ΔA/A = z-bar L_at. If a fraction ℓ of labor is in research, L_at = ℓ L, then g_A = z-bar ℓ L. 100B: that is a scale effect: a bigger population of researchers, faster growth. Edwards will say this is the 1e–5e model. Later Jones models kill the scale effect; do not import them unless asked.'),
  (4,  'balanced growth',
       'If L is constant, g_A is constant, and Y and Y/L grow at g_A (in the simple no-capital Romer). 100B: unlike Solow with fixed A, there is no settling of y to a constant. The "steady state" is a constant growth rate, not a constant level.'),
  (5,  'why ideas keep growing',
       'CRS in idea production wrt the stock A (in old-school Romer) plus a constant research labor input gives constant g_A. 100B: contrast Solow: ΔK = s A K^{1/3} L^{2/3} − dK has diminishing returns to K, so g_K falls as K rises. Rival capital cannot be the engine; nonrival A can.'),
  (6,  'allocation of labor',
       'ℓ in research vs 1−ℓ in production. More ℓ: higher g, lower current Y. 100B: a social planner might pick a different ℓ than the market if ideas spill over (underprovision of R&D). You will not solve a full planner problem; name the tradeoff.'),
  (7,  'Solow plus Romer',
       'Put growing A_t into Solow: along a balanced path, y and k grow at g_A, k/y is constant, and s still sets the level of k/y. 100B: this is the combined long-run picture. Transitional Solow dynamics still apply if k is away from the balanced-growth path.'),
  (8,  'objects vs ideas in policy',
       'Subsidizing K (investment tax credit) vs subsidizing A (R&D, universities, immigration of researchers). 100B: Solow: investment subsidies change levels. Romer: idea policy can change g. Edwards current-events slides (vaccines, FDA) are A-policy stories, not s-stories.'),
  (9,  'patents as a tradeoff',
       'Excludability gives incentive to invent (static monopoly DWL vs dynamic g). 100B: 100A monopoly is the static piece; 100B adds growth. "Abolish patents, ideas are nonrival so free" ignores the incentive. "Infinite patents" ignores the DWL. 100B wants the tradeoff named.'),
  (10, 'scale effect, stated',
       'g depends on the number of researchers, hence on L. 100B: the US should then grow much faster than Denmark in perpetuity because it is bigger — we do not really see that. That is why later textbooks change the idea-production function. On an Edwards exam, use the model he taught (1e–5e).'),
  (11, 'ideas in A vs k',
       'A poor country can, in principle, use world ideas (A is nonrival) but may fail to (institutions, human capital, barriers). 100B: development accounting leftover: "A is low" can mean "ideas not used," not "ideas not invented here." Romer is about the world frontier; adoption is extra.'),
  (12, 'Romer exam move',
       'Write Y = A L_y, ΔA = z-bar A L_a, L_y + L_a = L. Then g_A = z-bar L_a. Contrast diminishing returns in Solow capital accumulation. Nonrival vs rival. If they ask policy: ℓ and z-bar, not s as the engine. Mention scale effect if they change L.'),
  (13, 'rival-ideas trap',
       'Treating a blueprint like a machine (if one firm uses it, another cannot). 100B: that kills perpetual growth the same way Solow does. Also: calling a patent "rivalry" — the patent is excludability, the idea is still nonrival.'),
  (14, 'Solow-engine trap',
       'After Romer week, still answering "what generates long-run growth of y" with "saving" or "capital." 100B: saving sets the balanced-growth level of k/y. Ideas set g. Mixing the two sentences is the cheap miss on the first midterm.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 5. Labor Market & Unemployment
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'labor'
CROSS JOIN (VALUES
  (0,  'wage in the long-run model',
       'Competitive: w = MPL = (1-α) Y/L for CD. 100B: along a balanced growth path, w grows with y and A. The wage is not "set by the Fed." Short-run unemployment will need a different story (sticky wages/prices, search). Keep the long-run labor market and the bathtub distinct.'),
  (1,  'labor demand',
       'Firms hire until MPL = w (real). Labor demand slopes down in w. 100B: A up or K up raises MPL and shifts demand right. A payroll tax on firms is a wedge: the firm sees a higher cost than the worker receives. Same 100A tax picture, now for hours.'),
  (2,  'labor supply',
       'Households trade off consumption and leisure (and home production). Market supply usually slopes up in w. 100B: income and substitution effects can put a backward bend. For aggregates, Edwards/Jones treat supply as upward or even inelastic in the short-run sticky-wage story.'),
  (3,  'bathtub model',
       'Employment E, unemployment U, labor force E+U. Job separations s E, job finding f U. Steady unemployment: s E = f U. 100B: this is a flow model. A higher s or a lower f raises steady U. It is not "there are no jobs" as a stock with no flows.'),
  (4,  'natural rate',
       'u* = U/(E+U) = s/(s+f) in the simple bathtub. 100B: frictional plus structural. Cyclical unemployment is the gap vs u* in a recession (Okun). Policy that changes s or f (UI design, matching, skills) moves u*; demand policy moves the gap, not u*, in the long run.'),
  (5,  'three unemployment types',
       'Frictional: search and match. Structural: skills/location/institutions. Cyclical: slack demand. 100B: the natural rate is frictional + structural. Do not call 2009 unemployment "all frictional." Do not call the time between college and a first job "cyclical" in a boom.'),
  (6,  'unemployment rate vs LFPR',
       'u = U/LF, LFPR = LF/population. 100B: people leaving the labor force can cut u without a healthy market (2020, or an aging society). Employment-population is the extra statistic. If they only give u, ask what happened to LFPR.'),
  (7,  'wage rigidity (light)',
       'If w cannot fall, a demand drop creates unemployment above the flexible-w equilibrium. 100B: efficiency wages, unions, min wage, morale — name one mechanism if they ask why w is sticky. This is the bridge to the short-run model, not a second Solow.'),
  (8,  'Okun''s law',
       'Jones: u − ū ≈ − (1/2) Ỹ, where Ỹ is the output gap. 100B: a 2% output gap is about 1 pp extra unemployment. Direction: boom, u down. This is an empirical regularity used to translate IS/Phillips into labor-market language. It is not a production function.'),
  (9,  'hours vs employment',
       'Y can fall because hours per worker fall (intensive) or because employment falls (extensive). 100B: US recessions hit employment hard; some countries adjust hours. Okun coefficients differ. If they give total hours, you are closer to L in Y = A F(K,L).'),
  (10, 'skill-biased change (light)',
       'A that raises MPL more for skilled labor can raise the skill premium. 100B: inequality is not the core exam object, but "A rose" need not raise every wage equally. Immigration and trade have distributional labor-market effects distinct from the u* bathtub.'),
  (11, 'vacancies and tightness (light)',
       'Tight market: low u, high vacancies, high f. Slack: opposite. 100B: Beveridge: u and vacancies usually move opposite. A simultaneous rise in both is a matching/structural shift (reallocation). Useful for "is this cyclical or structural."'),
  (12, 'labor exam move',
       'Long run: w = MPL, CD share 2/3. Bathtub: u* = s/(s+f). Classify the unemployment. Okun: translate Ỹ into u. If sticky w, a demand drop raises u. LFPR caveat if they give a declining labor force.'),
  (13, 'u-rate trap',
       'Treating a fall in u as always good when LFPR collapsed. Using the unemployment rate as "the fraction of people without jobs" (it is the fraction of the labor force). 100B: retirees are not unemployed. Neither are full-time students who are not looking.'),
  (14, 'stock-without-flows trap',
       'Drawing U as a pile that never turns over. 100B: most spells are short at the US natural rate; s and f are large. A recession is often a collapse in f (and sometimes a rise in s). Policy that "creates a job" without saying what happens to f or demand is incomplete.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 6. Inflation & Money
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'inflation'
CROSS JOIN (VALUES
  (0,  'inflation',
       'Sustained rise in a price index, not one relative price. 100B: π_t ≈ (P_t − P_{t-1})/P_{t-1}. Core vs headline (food/energy). Deflation is negative π. A 20% rent increase in one city is not "the inflation rate" until it is in the basket.'),
  (1,  'quantity theory',
       'MV = PY. If V and Y (potential) are given, π = g_M − g_Y. 100B: long-run inflation is a monetary phenomenon in this model. g_M is the growth of the money supply (or, later, the trend the central bank allows). Hyperinflations are g_M explosions, usually fiscal.'),
  (2,  'classical dichotomy / neutrality',
       'In the long-run flexible-price model, money (and π) do not change real variables (y, r, u*). 100B: that is why the first half can study Solow without the Fed. The second half breaks this in the short run (sticky prices). "Print money, long-run y rises" is the trap.'),
  (3,  'Fisher equation',
       'i = r + π^e (approx). 100B: the real rate r is determined by the real economy (MPK, saving, IS). The nominal rate i moves one-for-one with expected inflation in the long run (Fisher effect). The Fed sets a nominal policy rate; the real rate is i − π^e.'),
  (4,  'real vs nominal interest',
       'r ≈ i − π (ex post) or i − π^e (ex ante). 100B: 1970s: high i, maybe low or negative r. 2010s: low i, also low r. You cannot read "tight money" from i alone. The IS curve later uses R, a real rate.'),
  (5,  'costs of inflation',
       'Expected: shoe leather, menu costs, tax distortions (if brackets/capital taxes are not indexed), noisy relative prices. Unexpected: redistributes between nominal borrowers and lenders. 100B: "inflation is bad because prices rise" is incomplete — wages and incomes are prices too. Name a friction.'),
  (6,  'hyperinflation and seigniorage',
       'Real money demand collapses as π explodes; the government prints to cover a real deficit (seigniorage). 100B: the fix is fiscal (stop the deficit) plus a monetary anchor, not a wage freeze alone. Quantity theory at the extreme.'),
  (7,  'money demand',
       'People hold real balances M/P for transactions, less when i is high (opportunity cost). 100B: V is not a physical constant if i and payments technology move. Quantity theory with stable V is a long-run benchmark. If V falls (crisis, liquidity trap), PY can fall even if M is stable.'),
  (8,  'deflation',
       'π negative: cash gains purchasing power, debt burdens rise in real terms, spending may delay. 100B: the ZLB later — if i cannot go below 0, r = i − π^e rises when π^e falls, which is IS-contractionary. Deflation is not "low prices, consumers win" in a debt economy.'),
  (9,  'relative vs aggregate prices',
       'Oil up is a relative-price shock; it becomes inflation if it spreads into a persistent rise in P (expectations, wages). 100B: the Phillips section will call this an inflation shock ō. Do not treat every commodity spike as g_M. Do not ignore it in CPI either.'),
  (10, 'CPI caveats',
       'Substitution bias, quality, new goods, outlet bias — CPI can overstate π. 100B: indexation (SS, TIPS, contracts) uses some index. Chained CPI is the substitution attempt. You will not compute a Boskin number; you should know why "real wages" depend on which deflator.'),
  (11, 'interest and money in the long run',
       'Higher π^e raises i, raises the cost of holding M, can raise V. 100B: still, the first-order long-run story is π tracks g_M − g_Y. The Fed inflation target is a choice of that trend. r-star (r̄) is a real object from saving/investment/growth.'),
  (12, 'inflation exam move',
       'Define π. Quantity theory: π = g_M − g_Y. Neutrality: real vars unchanged in the long run. Fisher: i = r + π^e. Costs: expected vs unexpected. If they give i and π, compute r. If a hyperinflation, say fiscal plus g_M.'),
  (13, 'more-money-more-Y trap',
       'Using MV=PY to say M up raises real Y in the long run. 100B: P up. Short run can be different (IS-MP). Also: confusing a one-time jump in M (price level jump) with ongoing g_M (ongoing π). Levels vs growth, again.'),
  (14, 'Fisher trap',
       'Treating i as the real cost of capital in IS or Solow. Saying "the Fed raised i so r rose one-for-one" when π^e is moving. 100B: always write r = i − π^e. In a disinflation, i can fall more slowly than π, so r rises — that is the Volcker recession story later.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 7. Short Run & the IS Curve
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'iscurve'
CROSS JOIN (VALUES
  (0,  'long run vs short run',
       'Long run: prices flexible, Y at potential Ȳ from Solow/Romer, money neutral. Short run: sticky prices/wages, Y can differ from Ȳ, monetary and fiscal policy matter. 100B: Jones writes the gap Ỹ = (Y − Ȳ)/Ȳ. The IS-MP-Phillips model is the second half of Edwards.'),
  (1,  'potential output',
       'Ȳ is the flexible-price, natural-rate level from the long-run model (A, K, L, u*). 100B: it grows. A recession is Ỹ negative, not "GDP fell" if Ȳ is falling too (a growth slowdown). Separate trend and cycle or you will call every g drop a demand shock.'),
  (2,  'the IS curve (Jones)',
       'Ỹ_t = ā − b-bar (R_t − r̄). Short-run output rises when demand shocks ā are high and when the real rate R is below the marginal product of capital r̄. 100B: this replaces IS-LM. The Fed sets a rate; there is no LM money-market picture as the default.'),
  (3,  'what is ā',
       'Aggregate demand shock: C, I, G, NX, animal spirits, credit conditions, housing. 100B: ā = 0 is "normal" demand. A housing collapse or a fiscal stimulus is ā. The parameter b-bar is how sensitive demand is to the real rate (interest-sensitive I and durables, maybe NX).'),
  (4,  'what is r̄',
       'The real rate that would make Ỹ = 0 when ā = 0: the long-run MPK / Wicksellian rate, Jones r-bar. 100B: if r̄ falls (slow growth, capital glut) and the Fed does not cut R, you get a negative gap. r-star debates are this parameter. It is not "whatever i the Fed chose."'),
  (5,  'IS graph',
       'Vertical axis R, horizontal Ỹ. IS slopes down: higher real rate, weaker demand, lower gap. 100B: ā shifts IS. A rise in G or a boom in I at given R is a right shift. Tight money is a move along IS (higher R) if the Fed is the one changing R — that is the MP story next.'),
  (6,  'fiscal policy on IS',
       'G up or taxes down (if MPC is positive) raises ā, IS right, Ỹ up at given R. 100B: the short-run multiplier lives here. In the long run, Ỹ = 0 and G crowds out C or I (or NX). Do not import long-run crowding out into a deep recession with R stuck and Ỹ negative.'),
  (7,  'multiplier (Keynesian C)',
       'If C = c_0 + c_y (Y − T), a rise in G or a cut in T is amplified: 1/(1−MPC) in the oldest Keynesian arithmetic. 100B: Jones folds this into ā and b-bar. MPC is larger for hand-to-mouth households (next section). If they want a number, write the simple multiplier and state the held-fixed R.'),
  (8,  'Great Recession as IS',
       'Housing wealth, mortgage credit, and uncertainty smashed ā (and maybe raised credit spreads so effective R for borrowers rose even if the Fed funds rate fell). 100B: that is a demand shock plus a financial wedge, not a Solow technology collapse as the main 2008 story. Ȳ may have been hit too; still start with IS.'),
  (9,  'why not LM',
       'Modern central banks set a policy rate, not M. LM was money supply and money demand determining i. 100B: Edwards/Jones: MP curve instead. If they mention QE or the ZLB, money quantities come back as tools when i is stuck. Default diagram is still IS-MP.'),
  (10, 'investment in IS',
       'I falls when R rises (user cost). Also depends on expected Y, q, credit. 100B: this is the main reason IS slopes down. If I is unresponsive (b-bar small), monetary policy is weak and fiscal is more powerful at given R. Japan/ZLB discussions live here.'),
  (11, 'NX in a closed IS',
       'Closed economy: no NX channel. Open: higher R can appreciate the currency and cut NX, which steepens or shifts IS (later chapter). 100B: if they have not done Ch 19–20 yet, keep NX in ā as "foreign demand" and do not invent UIP. If they have, R works through ε too.'),
  (12, 'IS exam move',
       'Write Ỹ = ā − b-bar(R − r̄). Name which parameter moved. Graph: shift vs move along. Fiscal: ā. Fed: R (next cards). Classify 2008 as ā (and credit). State that this is sticky-price, so Y can differ from Ȳ. Potential Ȳ still comes from the first half.'),
  (13, 'IS-as-supply trap',
       'Treating IS as a production function or as long-run Y. 100B: IS is demand. Supply is Ȳ and the Phillips/AS side. A negative ā is a recession even if A did not fall. Calling every recession "productivity" is the RBC import they did not teach as the default.'),
  (14, 'nominal-rate-on-IS trap',
       'Putting i on the IS axis instead of R. 100B: if π^e jumps, i can rise while R falls, or vice versa. Fisher lives here. The IS relationship is about the real cost of capital and of durables. Label the axis R or you will get the 1970s backward.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 8. Monetary Policy, Phillips & AS/AD
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'phillips'
CROSS JOIN (VALUES
  (0,  'MP curve / Taylor',
       'The central bank sets a real (or nominal) policy rate. Taylor-style: R_t = r̄ + φ (π_t − π*) with φ greater than 1 (Taylor principle): raise R more than one-for-one with inflation. 100B: MP is horizontal at a chosen R in the simplest IS-MP picture, or upward in (Ỹ, R) if they react to the gap too.'),
  (1,  'Phillips curve (Jones)',
       'π_t = π^e_t + v-bar Ỹ_t + ō_t. Inflation rises when the gap is positive and when an inflation shock ō hits (oil, import prices). 100B: v-bar is the slope. Adaptive: π^e = π_{t-1}, so Δπ = v-bar Ỹ + ō. Boom today, inflation tomorrow. This is AS in disguise.'),
  (2,  'adaptive expectations',
       'If people set π^e from last period, a boom builds inflation inertia. Disinflation requires Ỹ negative until π is down (sacrifice ratio). 100B: this is the Volcker plot. Rational expectations / NKPC is 101B flavor; Edwards/Jones adaptive is the default unless they say otherwise.'),
  (3,  'AS/AD in (π, Ỹ)',
       'AD: combining IS and MP, higher π leads the Fed to raise R, which cuts Ỹ (downward AD). AS: Phillips, upward (higher Ỹ, higher π given π^e). 100B: demand shock shifts AD; inflation shock shifts AS. Dynamics: π^e updates, AS walks. Long-run AS is vertical at Ỹ = 0.'),
  (4,  'demand shock path',
       'ā down: AD left, Ỹ down, π down (if the PC has a gap term). Fed can cut R to offset (move back along). 100B: 2008–09 is this plus ZLB. If the Fed does not offset, you get a slump and disinflation (or deflation). Okun: u up.'),
  (5,  'inflation shock path',
       'ō up (oil): AS left, π up, Ỹ down — stagflation. 100B: the Fed faces a tradeoff. Tighten: even lower Ỹ, π comes down faster. Accommodate: protect Ỹ, live with higher π (and maybe unanchor π^e). 1970s vs 2022 is this diagram plus a story about π^e.'),
  (6,  'no long-run tradeoff',
       'Vertical long-run Phillips: Ỹ = 0, any π the Fed targets (if credible). 100B: you cannot keep u below u* forever with inflation. That is the 1960s miss. Short-run tradeoff exists because π^e is sticky. Natural rate hypothesis is the first-half labor market plus this.'),
  (7,  'disinflation / Volcker',
       'To cut π, adaptive PC wants a period of Ỹ negative (high R, IS). 100B: credibility can cut the sacrifice (if π^e jumps down, you need less slack). "Volcker raised i" is incomplete: he raised R and unanchored 1970s π^e came down. Unemployment was the cost.'),
  (8,  'ZLB / liquidity trap',
       'If i cannot go below zero (or the ELB), and π^e is low, R = i − π^e may stay too high for Ỹ = 0. IS-MP: MP stuck, fiscal ā or QE/forward guidance to move IS or π^e. 100B: this is why 2008–15 was not "just cut the funds rate more." Deflation raises R at the ZLB — destabilizing.'),
  (9,  'Okun in the short-run model',
       'Translate Ỹ into u − ū. 100B: the Fed dual mandate (US) is inflation and employment; Okun connects them. A Ỹ of −4% is about +2 pp on u if the coefficient is 1/2. Do not mix the natural rate ū (bathtub) with cyclical u − ū.'),
  (10, 'stabilization',
       'Lean against ā shocks with R (and maybe G). Do not try to hold Ỹ positive forever. 100B: Jones Ch 13 is this. Lags and noisy data: overreacting can add variance (the "Fed caused cycles" debate). Automatic stabilizers are G and T moving without new votes.'),
  (11, 'Great Inflation vs Great Recession',
       'Great Inflation: ō plus unanchored π^e plus a Fed that did not obey Taylor. Great Recession: ā collapse, ZLB, inflation that was too low. 100B: opposite AD/AS diagnoses. Copy-pasting 1979 policy into 2009 (or 2021 into 2009) is the historical miss.'),
  (12, 'Phillips exam move',
       'Write PC: π = π^e + v-bar Ỹ + ō. MP/Taylor with φ greater than 1. AS/AD: which curve shifts. Demand shock vs oil shock. Long-run: Ỹ=0, π = target. ZLB: R stuck, fiscal or π^e. Okun to unemployment. Sacrifice ratio if they disinflate.'),
  (13, 'stable-Phillips-menu trap',
       'Picking a point on a 1960s Phillips curve as a permanent u–π menu. 100B: π^e shifts the curve. Also: drawing AS as if Ȳ moved when ā moved. Ȳ is first-half supply; ā is demand. Oil can hit both ō and Ȳ (capacity) — say so if they give a supply-destroying shock.'),
  (14, 'Taylor-principle trap',
       'Raising i less than one-for-one with π, so R falls when π rises, which is stimulative — the wrong sign, and inflation can explode. 100B: that is why φ greater than 1. Also: treating the funds rate as R when π is 8%. Always convert to real.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 9. Consumption, Investment & Government
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'policy'
CROSS JOIN (VALUES
  (0,  'permanent income / Euler',
       'Households want to smooth c. A transitory income blip is mostly saved; a permanent rise is consumed. 100B: the Euler equation (MRS across time = 1+r, up to discounting) is 100A in a two-period picture. Keynesian C = c_y Y is the hand-to-mouth limit. MPC depends on which household and which shock.'),
  (1,  'MPC and constraints',
       'Borrowing constraints, myopia, and rule-of-thumb consumers raise MPC out of a rebate. 100B: this is why a tax cut can shift ā a lot even if Ricardian households would not. Targeting liquidity-constrained people raises the fiscal multiplier. "MPC is always 1" and "always 0" are both wrong.'),
  (2,  'Ricardian equivalence',
       'A tax cut financed by future taxes, with altruistic/forward-looking agents and no constraints: private saving rises one-for-one, ā does not move. 100B: it is a benchmark, not a fact. It fails with finite lives, myopia, liquidity constraints, and distortionary taxes. Edwards wants when it fails.'),
  (3,  'investment and user cost',
       'Firms invest if MPK covers the user cost: r + d − expected capital gain, times tax wedges. 100B: that is why R belongs in IS. Uncertainty and irreversible investment add an option-value delay (wait). A credit crunch raises the effective user cost without the Fed moving.'),
  (4,  'q theory (light)',
       'q ≈ market value of K / replacement cost. q above 1: invest. 100B: stock-market booms can be q (or a bubble). You will not derive Hayashi; you should connect I to expected profits and R. Residential investment is the same idea with house prices.'),
  (5,  'government budget',
       'G + transfers + i B = T + ΔB + ΔM (simplified). 100B: deficits add to debt. Seigniorage is the ΔM piece (inflation tax). Primary deficit ignores interest. If they give a number, separate primary vs total. This is accounting plus a no-Ponzi condition, not yet a multiplier.'),
  (6,  'debt sustainability',
       'Roughly, if r is less than g, debt/GDP can fall even with modest primary deficits; if r is greater than g, you need primary surpluses. 100B: this is a long-run arithmetic check, not "debt is always fine." Japan vs an emerging-market sudden stop are different r, g, and currency stories.'),
  (7,  'crowding out',
       'Long run, Ỹ=0: more G is less C or I (or NX). Short run with slack and a-fixed R: G can raise Y, little crowding out. If the Fed is offsetting (leaning against Ỹ), fiscal is crowded out via R. 100B: always state the monetary regime. "Crowding out" without IS-MP is a slogan.'),
  (8,  'automatic vs discretionary',
       'Automatic: UI, tax receipts fall in a slump — ā is buffered without a vote. Discretionary: a stimulus bill. 100B: lags (recognition, legislation, implementation) hurt discretionary timing. 2008–09 and 2020 mixed both. Stabilization card from Phillips meets this institutional card.'),
  (9,  'tax vs spend',
       'Balanced-budget multiplier is smaller than a G-only multiplier in simple Keynesian arithmetic. 100B: composition matters (UI vs a tax cut for high savers). Supply-side: distortionary taxes affect Ȳ and r̄ in the long run — first-half A and labor supply, not the IS shock of the week.'),
  (10, 'financial frictions',
       'Banks, collateral, fire sales: a drop in asset prices tightens credit, raises effective R for borrowers, cuts ā. 100B: this is the Jones Great Recession chapter. Capital injections and lender-of-last-resort are financial MP, not the Taylor rule on the funds rate alone.'),
  (11, 'consumption puzzle vs data',
       'PIH predicts smooth c and small MPC; micro rebates often show larger MPCs. 100B: reconcile with heterogeneity (some households at the constraint). Aggregate C still looks smoother than Y. Use the right model for the question they asked (micro rebate vs long-run s in Solow).'),
  (12, 'policy exam move',
       'Name the household: PIH vs constrained (MPC). RE: state the assumptions and a failure. I: user cost / q. Fiscal: IS ā vs long-run crowding out, and what the Fed is doing. Debt: r vs g, primary vs total. Financial: wedge on R, not only G.'),
  (13, 'always-Ricardian trap',
       'Ignoring a rebate because "people save for future taxes" when half the class is hand-to-mouth. 100B: RE is an if, not a theorem about the US. Also: treating a Social Security check as G in GDP (it is a transfer; C may rise).'),
  (14, 'crowding-out-in-the-slump trap',
       'Applying the classical closed-economy result (more G, less I, same Y) to 2009 or the ZLB. 100B: if R is stuck and Ỹ is negative, I is more likely crowded in (higher Y, accelerator) than crowded out. State Ỹ and the MP constraint before you say "deficits raise r."')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

-- =====================================================================
-- 10. Open Economy: Trade & Exchange Rates
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'open'
CROSS JOIN (VALUES
  (0,  'open-economy identity',
       'NX = S − I = (S_private + S_public) − I. A trade deficit means the country is borrowing (capital inflow). 100B: this is Ch 2 identity plus behavior. Twin deficits: a fall in public saving (fiscal deficit) can cut NX if I and private S do not offset. Not automatic — depends on r and the exchange rate.'),
  (1,  'real exchange rate',
       'ε ≈ E P / P* (or the inverse, depending on the book: domestic goods relative to foreign). 100B: Jones: a rise in the real exchange rate that makes home goods expensive cuts NX. Always state which way E is quoted (home per foreign vs foreign per home) before you shift a curve.'),
  (2,  'NX and ε',
       'NX(ε, Y, Y*): expenditure-switching. Home boom (Y up) sucks in imports, NX down. Foreign boom, NX up. 100B: this is the open IS channel. Elasticities (Marshall-Lerner) decide whether a depreciation improves NX; 100B usually assumes it does after a lag (J-curve light).'),
  (3,  'nominal vs real E',
       'E is money per money; ε adjusts for prices. 100B: high home inflation, even with a "stable E," is a real appreciation. PPP: E tracks P/P* in the long run (relative PPP: ΔE/E ≈ π − π*). Short run: E is an asset price and jumps. Do not treat the nominal dollar as competitiveness.'),
  (4,  'UIP / interest parity',
       'i ≈ i* + expected appreciation of foreign (or depreciation of home), plus a premium. 100B: a higher home i attracts capital, home currency appreciates today, which can cut NX. This is how R leaks into ε in an open IS. Risk premia break pure UIP — emerging markets.'),
  (5,  'floating vs fixed',
       'Float: E adjusts, the central bank sets R for domestic goals (inflation/gap). Fix: the central bank must set R to defend E, so it imports the foreign monetary stance. 100B: Mundell-Fleming energy without requiring the 1960s LM. Crisis: running out of reserves under a fix.'),
  (6,  'trilemma',
       'Pick two: independent monetary policy, fixed E, open capital account. 100B: euro-area members gave up their own R. China-style: manage E and keep some capital controls. The US: float and set R. If they ask "why not all three," the UIP-plus-arbitrage sentence is the answer.'),
  (7,  'open IS',
       'Ỹ = ā − b-bar (R − r̄) with ā now including NX(ε, Y*). Higher R: less I and usually an appreciation that cuts NX — extra IS slope. 100B: a foreign recession is a negative ā. A safe-haven appreciation can be contractionary even if the Fed did not tighten. Say the ε channel.'),
  (8,  'twin deficits, carefully',
       'G − T up lowers public saving. If r rises, I may fall (crowding out) and/or capital inflows appreciate ε and NX falls. 100B: 1980s US is the textbook pair. 2008–09: fiscal deficit and a collapsing I, NX not a simple twin. Identity always holds; the split among S, I, NX is the model.'),
  (9,  'PPP and the long run',
       'Tradable goods: prices cannot drift too far (arbitrage). Nontradables: Balassa-Samuelson, richer countries have higher price levels. 100B: PPP is a long-run anchor, a terrible short-run forecast. Real exchange rates can stay away from PPP for years (meandering).'),
  (10, 'sudden stop (light)',
       'Capital inflow reverses: E crashes, R spikes, I and Y collapse. 100B: emerging-market version of an ā shock plus a financial wedge. The identity: NX must jump toward surplus if the inflow dies. Painful via bankruptcy and imported inflation. Not the US 2008 core story (we issue the reserve currency).'),
  (11, 'trade policy vs macro NX',
       'A tariff can switch demand to home goods (micro) but with floating E or retaliation, macro NX is still S − I. 100B: you cannot tariff your way to a surplus if s and I do not change. This is the identity punchline Edwards wants next to Jones Ch 19. Comparative advantage is 100A/1; the deficit is saving.'),
  (12, 'open exam move',
       'Write NX = S − I. Define ε and which way is expensive home goods. UIP: i vs i* and E. Regime: float vs fix vs trilemma. Shock: fiscal, Fed, foreign Y*, risk premium — which of R, ε, NX, Ỹ move. End with identity vs behavior (twin deficits not automatic).'),
  (13, 'identity-as-behavior trap',
       'Saying "the trade deficit is caused by China" as if NX were not also S − I at home. 100B: foreign saving and home I/S both sit in the identity. A full answer names both sides and a relative price (ε or r). Blaming only IM without C+I+G is incomplete.'),
  (14, 'nominal-E-as-NX trap',
       'Reading a stronger dollar as automatically worse NX without prices or lags, or mixing up the quote. 100B: real ε, Marshall-Lerner, and Y vs Y* all matter. Also: a recession (Y down) can improve NX even if E is unchanged — that is the import channel, not a competitiveness miracle.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100b';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'econ100b';
