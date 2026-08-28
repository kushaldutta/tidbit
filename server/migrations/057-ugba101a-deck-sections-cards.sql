-- Migration 057: UGBA 101A — Microeconomic Analysis for Business Decisions.
-- Haas School of Business, UC Berkeley Fall 2026.
-- Catalog: prices, outputs, and inputs; competitive environment and policy.
-- Standard text: Pindyck & Rubinfeld, Microeconomics (applied/business sequence).
-- Credit restriction vs. ECON 100A / 101A — this deck is the Haas applied version.

-- ─────────────────────────────────────────────────────────────
-- 1. Preset deck
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'ugba101a',
  'UGBA 101A',
  'Microeconomic Analysis for Business Decisions — Pindyck & Rubinfeld, Haas',
  'uc-berkeley:ugba101a:fa26',
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

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'ugba101a');

DELETE FROM public.tidbits
WHERE category_id = 'ugba101a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'ugba101a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'ugba101a');

-- ─────────────────────────────────────────────────────────────
-- 2. Sections (Pindyck/Rubinfeld chapter groups)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('supply-demand',          'Markets, Supply & Demand',
   'Market definition, supply, demand, equilibrium (Ch 1–2)', 0),
  ('elasticity-policy',      'Elasticity & Market Interventions',
   'Price/income/cross elasticity, taxes, ceilings, surplus (Ch 2, 9)', 1),
  ('consumer-theory',        'Consumer Theory & Demand',
   'Utility, MRS, income/substitution effects, market demand (Ch 3–4)', 2),
  ('production',             'Production',
   'Inputs, MP, AP, isoquants, returns to scale (Ch 6)', 3),
  ('costs',                  'Cost of Production',
   'Opportunity cost, MC/AC, short vs long run, economies of scale (Ch 7)', 4),
  ('perfect-competition',    'Perfect Competition',
   'Price taking, shutdown, short/long-run supply, efficiency (Ch 8–9)', 5),
  ('monopoly-pricing',       'Monopoly & Pricing Power',
   'MR, markup, deadweight loss, price discrimination (Ch 10–11)', 6),
  ('oligopoly-games',        'Oligopoly & Game Theory',
   'Nash, Cournot, Bertrand, Stackelberg, cartels, strategy (Ch 12–13)', 7),
  ('uncertainty-info',       'Uncertainty & Asymmetric Information',
   'Expected utility, risk, moral hazard, adverse selection (Ch 5, 17)', 8),
  ('externalities-policy',   'Externalities, Public Goods & Factor Markets',
   'Pigouvian taxes, Coase, labor demand, NPV (Ch 14–15, 18)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'ugba101a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Markets, Supply & Demand
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'supply-demand'
CROSS JOIN (VALUES
  (0,  'microeconomics (business lens)',
       'How firms and consumers choose under scarcity: prices, output, and input use, and how market structure and policy change those choices.'),
  (1,  'opportunity cost',
       'The value of the next-best alternative forgone. Economic cost includes opportunity cost; accounting cost usually does not (e.g. owner''s time, invested capital).'),
  (2,  'market definition',
       'The set of products and geographic area that compete closely enough to constrain a firm''s price. Too narrow or too broad a market misleads strategy and antitrust.'),
  (3,  'demand curve',
       'Quantity buyers will purchase at each price, holding other factors fixed. Downward sloping: substitution and income effects. A change in price is a movement along the curve.'),
  (4,  'demand shifters',
       'Income, prices of related goods (substitutes/complements), tastes, expectations, and number of buyers. These shift the whole curve, not a movement along it.'),
  (5,  'supply curve',
       'Quantity sellers will offer at each price. Usually upward sloping because MC rises. A change in price is a movement along supply.'),
  (6,  'supply shifters',
       'Input prices, technology, taxes/subsidies, number of firms, and expectations. Lower input costs or better tech shift supply right (more Q at each P).'),
  (7,  'market equilibrium',
       'The price at which Qd = Qs. At that P there is no shortage or surplus, so no pressure for P to change if nothing else shifts.'),
  (8,  'shortage vs. surplus',
       'P below equilibrium: Qd > Qs (shortage) → P rises. P above equilibrium: Qs > Qd (surplus) → P falls.'),
  (9,  'comparative statics',
       'How equilibrium P and Q change when a curve shifts. Demand up: P and Q up. Supply up: P down, Q up. Simultaneous shifts make one of P or Q ambiguous without magnitudes.'),
  (10, 'normal vs. inferior good',
       'Normal: demand rises with income. Inferior: demand falls with income (ramen, used goods for some consumers).'),
  (11, 'substitutes vs. complements',
       'Substitutes: a rise in the price of one raises demand for the other (Coke/Pepsi). Complements: a rise in one''s price lowers demand for the other (cars/gasoline).'),
  (12, 'reservation price',
       'The maximum a buyer will pay (or the minimum a seller will accept). Demand/supply curves rank these valuations.'),
  (13, 'ceteris paribus',
       'Hold other things equal when tracing a curve. Real-world data mix price movements with shifters, which is why identification of demand vs. supply is a core empirical problem.'),
  (14, 'positive vs. normative',
       'Positive: what is / what will happen (equilibrium after a tax). Normative: what should happen (is the tax fair?). Business analysis starts with positive models.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Elasticity & Market Interventions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'elasticity-policy'
CROSS JOIN (VALUES
  (0,  'price elasticity of demand (ε)',
       'ε = (%ΔQd) / (%ΔP). Always reported as a positive number or as a negative; |ε| > 1 elastic, < 1 inelastic, = 1 unit elastic. Measures price sensitivity.'),
  (1,  'point vs. arc elasticity',
       'Point: (dQ/dP)×(P/Q) at a point on the curve. Arc: midpoint formula between two points, used with discrete data so the start/end point does not flip the answer.'),
  (2,  'what makes demand more elastic',
       'Close substitutes, longer time horizon, larger budget share, luxuries vs. necessities, and a narrowly defined market (one brand vs. all beverages).'),
  (3,  'elasticity along a linear demand curve',
       'A straight-line demand is elastic at high P / low Q and inelastic at low P / high Q; unit elastic at the midpoint. Slope is not the same as elasticity.'),
  (4,  'revenue and elasticity',
       'If demand is elastic, a price cut raises total revenue (TR = P×Q). If inelastic, a price cut lowers TR. At unit elasticity, TR is maximized.'),
  (5,  'income elasticity',
       '(%ΔQ) / (%Δ income). Positive for normal goods; > 1 luxury; between 0 and 1 necessity; negative for inferior goods.'),
  (6,  'cross-price elasticity',
       '(%ΔQ_A) / (%ΔP_B). Positive: substitutes. Negative: complements. Near zero: unrelated goods.'),
  (7,  'price elasticity of supply',
       '(%ΔQs) / (%ΔP). More elastic when firms can easily expand (spare capacity, flexible inputs, long run). Perfectly inelastic supply is vertical (fixed Q).'),
  (8,  'consumer surplus',
       'Area under demand and above price: willingness to pay minus what buyers actually pay. A measure of buyer gains from trade.'),
  (9,  'producer surplus',
       'Area above supply (MC) and below price: price minus willingness to sell. A measure of seller gains from trade.'),
  (10, 'deadweight loss (DWL)',
       'Lost total surplus from units that would have been mutually beneficial but are not traded (tax, monopoly, binding price control). A triangle in the usual diagram.'),
  (11,  'specific tax incidence',
       'A per-unit tax wedges P_buyer above P_seller. Statutory incidence (who writes the check) does not determine economic incidence; elasticities do. The more inelastic side bears more of the tax.'),
  (12, 'price ceiling',
       'A legal maximum P. Binding if below equilibrium: shortage, queuing, black markets, and quality deterioration (rent control).'),
  (13, 'price floor',
       'A legal minimum P. Binding if above equilibrium: surplus (unemployment with a binding minimum wage in the simple model; agricultural stockpiles).'),
  (14, 'ad valorem vs. specific tax',
       'Specific: $t per unit (shifts supply up by t). Ad valorem: percent of price (rotates/pivots the curve). Both create a wedge and DWL if they reduce quantity.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Consumer Theory & Demand
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'consumer-theory'
CROSS JOIN (VALUES
  (0,  'utility / preference axioms',
       'Preferences are typically assumed complete, transitive, and monotonic. Utility is an ordinal ranking of bundles, not a cardinal happiness score.'),
  (1,  'indifference curve',
       'All bundles that give the same utility. Slope down (more of one good requires less of the other), convex to the origin if the consumer likes averages, and they cannot cross.'),
  (2,  'marginal rate of substitution (MRS)',
       'MRS = MU_x / MU_y = the rate at which the consumer will trade y for one more x while staying indifferent. Equals the absolute slope of the indifference curve.'),
  (3,  'diminishing MRS',
       'As you get more x and less y, you give up fewer y for extra x. Convex indifference curves; interior optima rather than all-or-nothing baskets.'),
  (4,  'budget constraint',
       'P_x x + P_y y = I. Slope = −P_x/P_y. An income increase shifts it out in parallel; a price change rotates it around the other good''s intercept.'),
  (5,  'utility maximization (interior)',
       'Choose the bundle where MRS = P_x/P_y, or MU_x/P_x = MU_y/P_y (equal bang per buck), and the budget is exhausted.'),
  (6,  'corner solution',
       'If MRS never equals the price ratio, the consumer spends everything on one good (perfect substitutes with a steep enough price ratio).'),
  (7,  'income and substitution effects',
       'A price fall: substitution effect (relative prices) always toward the cheaper good; income effect (real income up) reinforces for normal goods and opposes for inferior goods.'),
  (8,  'Giffen good',
       'A strongly inferior good whose income effect outweighs the substitution effect, so the demand curve slopes up. Rare; a theoretical polar case.'),
  (9,  'Engel curve',
       'Quantity of a good vs. income. Upward for normal goods; downward for inferior goods.'),
  (10, 'market demand',
       'Horizontal sum of individual demand curves at each price. Used as the industry demand facing a competitive market or a monopolist.'),
  (11, 'consumer surplus from a demand curve',
       'For a unit, surplus is reservation price minus P. For many units, integrate under demand above P. Revealed by the demand curve itself.'),
  (12, 'network externality (demand)',
       'Value of a good rises (bandwagon) or falls (snob) with how many others buy it. Bandwagon makes market demand more elastic in the relevant range.'),
  (13, 'complements in consumption',
       'Goods consumed together; indifference curves and demand systems treat them as having negative cross-price elasticity (printers and ink).'),
  (14, 'revealed preference',
       'If a bundle A is chosen when B is affordable, A is revealed preferred to B. Used to test consistency of choices without assuming a utility function up front.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Production
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'production'
CROSS JOIN (VALUES
  (0,  'production function',
       'Q = f(K, L, …): the maximum output obtainable from a given mix of inputs, given technology. It is a technological, not a cost, relationship.'),
  (1,  'short run vs. long run (production)',
       'Short run: at least one input is fixed (usually capital). Long run: all inputs are variable; the firm can change plant size.'),
  (2,  'marginal product (MP)',
       'MP_L = ΔQ/ΔL (holding K fixed). Extra output from one more unit of the input. Decision-relevant for hiring.'),
  (3,  'average product (AP)',
       'AP_L = Q/L. Output per unit of input. AP rises while MP > AP and falls when MP < AP (same geometry as MC vs. AC).'),
  (4,  'diminishing marginal returns',
       'In the short run, adding more of a variable input to a fixed input eventually lowers MP. A technological fact, not a long-run returns-to-scale statement.'),
  (5,  'isoquant',
       'All input combinations (K, L) that produce the same Q. Analogous to an indifference curve; slope is the MRTS.'),
  (6,  'marginal rate of technical substitution (MRTS)',
       'MRTS_{L for K} = MP_L / MP_K: how much K you can drop if you add one L and keep Q constant. Diminishing MRTS → convex isoquants.'),
  (7,  'returns to scale',
       'Scale all inputs by t. Increasing: f(tK,tL) > t Q (often from specialization). Constant: = t Q. Decreasing: < t Q (coordination, congestion).'),
  (8,  'perfect substitutes vs. fixed proportions',
       'Linear isoquants: inputs substitute at a constant rate. L-shaped (Leontief): must use inputs in a fixed ratio; extra of one input alone adds nothing.'),
  (9,  'Cobb–Douglas production',
       'Q = A K^α L^β. If α+β = 1, constant returns to scale. MP_L = β A K^α L^{β−1}; easy closed forms for cost minimization.'),
  (10, 'technological change',
       'A shift of the production function: more Q from the same inputs (higher A). Distinct from moving along an isoquant by changing the input mix.'),
  (11, 'labor productivity',
       'Output per worker (or per hour). Rises with human capital, physical capital, and technology; a core driver of long-run living standards and unit labor cost.'),
  (12, 'isoquant map vs. isocost',
       'Cost-min: tangency of isoquant and isocost, or MP_L/w = MP_K/r (equal bang per dollar of input).'),
  (13, 'expansion path',
       'The cost-minimizing (K, L) as output rises, for given input prices. Traces how the firm scales inputs in the long run.'),
  (14, 'sunk vs. fixed input',
       'A fixed input cannot be varied in the short run. Whether its cost is sunk depends on whether that expenditure can be recovered — a separate, decision-relevant distinction.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Cost of Production
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'costs'
CROSS JOIN (VALUES
  (0,  'economic vs. accounting cost',
       'Economic cost = explicit outlays + opportunity cost of owner time and capital. Accounting profit can be positive while economic profit is zero (normal return).'),
  (1,  'sunk cost',
       'An already-incurred cost that cannot be recovered. Rational decisions ignore sunk costs; they are not part of MC or avoidable cost.'),
  (2,  'fixed vs. variable cost',
       'FC does not vary with Q in the short run (lease). VC does (materials, hourly labor). TC = FC + VC. FC can be sunk or not.'),
  (3,  'marginal cost (MC)',
       'MC = ΔTC/ΔQ = ΔVC/ΔQ. The cost of one more unit. Profit max always compares MR to MC. MC typically U-shaped in the short run because of diminishing returns.'),
  (4,  'average costs (AFC, AVC, ATC)',
       'AFC = FC/Q (always falling). AVC = VC/Q. ATC = TC/Q = AFC + AVC. MC intersects AVC and ATC at their minima.'),
  (5,  'short-run cost curves (geometry)',
       'When MC < AC, AC is falling; when MC > AC, AC is rising. The MC curve is the firm''s supply curve above min AVC (competitive case).'),
  (6,  'long-run average cost (LRAC)',
       'The lower envelope of short-run ATC curves for different plant sizes. The firm chooses the plant that minimizes cost for the planned Q.'),
  (7,  'economies of scale',
       'LRAC falling as Q rises (spreading setup costs, specialization, bulk buying). Distinct from diminishing returns, which is a short-run, one-input phenomenon.'),
  (8,  'diseconomies of scale',
       'LRAC rising at high Q: coordination problems, bureaucracy, scarce specialized inputs. Sets a limit to firm size in a competitive industry.'),
  (9,  'economies of scope',
       'Cheaper to produce two products in one firm than separately: C(Q1,Q2) < C(Q1,0) + C(0,Q2). Shared R&D, brand, or distribution.'),
  (10, 'learning curve',
       'Unit cost falls with cumulative past output (learning-by-doing), not just current scale. A reason to price low early to gain volume.'),
  (11, 'isocost line',
       'wL + rK = C. Slope = −w/r. Cost min: isoquant tangent to the lowest reachable isocost.'),
  (12, 'input-price change',
       'A wage increase rotates isocosts and raises MC/AVC; the firm substitutes toward capital in the long run if MRTS allows it.'),
  (13, 'user cost of capital',
       'Economic cost of using a machine for a period: depreciation + forgone interest (r × capital value), minus any capital gain. Not the purchase price itself.'),
  (14, 'relevant cost for a decision',
       'Only incremental (avoidable) costs and opportunity costs. Allocated overhead that does not change with the decision should not drive a go/no-go choice.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Perfect Competition
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'perfect-competition'
CROSS JOIN (VALUES
  (0,  'perfect competition assumptions',
       'Many buyers and sellers, homogeneous product, free entry/exit (long run), perfect information, firms are price takers (perfectly elastic residual demand).'),
  (1,  'price taker / residual demand',
       'The firm can sell any Q at the market P and nothing at a higher P. So MR = P. Profit max: P = MC (on the rising MC).'),
  (2,  'short-run supply (competitive firm)',
       'The MC curve above minimum AVC. Below min AVC, the firm produces zero (cannot cover variable costs). Between min AVC and min ATC it produces but takes losses.'),
  (3,  'shutdown rule',
       'Shut down in the short run if P < min AVC (variable costs not covered). Continue if min AVC ≤ P < min ATC: losses are smaller than FC, which is sunk in the SR.'),
  (4,  'short-run industry supply',
       'Horizontal sum of firms'' MC-above-AVC curves. Market P comes from industry S and market D; each firm then takes that P.'),
  (5,  'economic profit vs. zero profit',
       'π = TR − economic cost. Zero economic profit means the firm earns a normal return on capital — it is willing to stay. Positive profit attracts entry.'),
  (6,  'long-run equilibrium (constant-cost industry)',
       'Entry drives P down to min LRAC. Firms produce at efficient scale, π = 0, P = MC = min AC. Long-run industry supply is horizontal at that cost.'),
  (7,  'increasing-cost industry',
       'As the industry expands, input prices rise (specialized land, skilled labor). Long-run supply slopes up; remaining firms earn zero profit at the new higher min AC.'),
  (8,  'decreasing-cost industry',
       'Industry expansion lowers input costs (thicker supplier networks). Long-run supply slopes down. Rare, but possible in some high-tech clusters.'),
  (9,  'allocative efficiency (competitive market)',
       'P = MC means the last unit''s value to buyers equals its resource cost. Total surplus (CS + PS) is maximized — no DWL.'),
  (10, 'productive efficiency',
       'In long-run competition, firms produce at min AC. Goods are made at the lowest possible cost given technology.'),
  (11, 'producer surplus (firm)',
       'TR minus variable cost (or area above MC up to Q*). Equals operating profit plus any rents on scarce fixed inputs.'),
  (12, 'free entry as a discipline',
       'Even without many current rivals, the threat of entry can hold P near cost if entry is cheap (contestable-market intuition). Sunk entry costs weaken that threat.'),
  (13, 'constant-cost long-run supply elasticity',
       'Infinite: any P above min AC brings unbounded entry. Used as a benchmark when thinking about tradable commodities.'),
  (14, 'why businesses still study the competitive model',
       'It is the benchmark for commodities, agriculture, and some financial markets, and the welfare standard against which monopoly and policy are judged.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Monopoly & Pricing Power
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'monopoly-pricing'
CROSS JOIN (VALUES
  (0,  'monopoly',
       'A single seller of a good with no close substitutes and barriers to entry. Faces the market demand curve; P falls as Q rises, so MR < P.'),
  (1,  'marginal revenue (downward demand)',
       'MR = P (1 + 1/ε) with ε the elasticity (negative). MR is below P; for linear demand, MR has the same intercept and twice the slope. Produce where MR = MC, then read P off demand.'),
  (2,  'markup / Lerner index',
       '(P − MC)/P = −1/ε. More inelastic demand → higher markup. A business measure of market power. Competitive limit: ε → −∞, markup → 0.'),
  (3,  'monopoly deadweight loss',
       'The monopolist restricts Q below the competitive Q (where P = MC). Units valued above MC are not sold. DWL is the surplus triangle between demand and MC from Q_m to Q_c.'),
  (4,  'barriers to entry',
       'Economies of scale (natural monopoly), control of a key input, patents/copyrights, network effects, switching costs, and government licenses/franchises.'),
  (5,  'natural monopoly',
       'LRAC still falling through the relevant demand; one firm can serve the market at lower cost than two. Typical of utilities; often rate-of-return or price-cap regulation.'),
  (6,  'monopsony',
       'A single buyer (e.g. a company town''s labor market). Faces an upward supply curve, so ME > w; hires where VMP = ME and pays the supply wage — too little employment relative to competition.'),
  (7,  'price discrimination (conditions)',
       'Need market power, ability to sort customers (or units) by willingness to pay, and prevention of resale/arbitrage.'),
  (8,  'first-degree (perfect) price discrimination',
       'Charge each unit its reservation price. Captures all CS; can produce the efficient Q (MR = P on each unit). Rare; approximates personalized pricing / auctions.'),
  (9,  'second-degree price discrimination',
       'Menu pricing: quantity discounts, versions (basic vs. pro), two-part tariffs. Consumers self-select; the firm screens types without observing them.'),
  (10, 'third-degree price discrimination',
       'Charge different groups different P (student vs. adult, geographic markets). Set MR equal across markets and equal to MC. Charge more where demand is less elastic.'),
  (11, 'two-part tariff',
       'Fixed fee + per-unit price. With identical consumers, set per-unit P = MC and extract surplus with the fee. With mixed types, a higher per-unit P plus lower fee is often optimal.'),
  (12, 'bundling',
       'Selling goods together (software suite, value meal) can raise profit when reservation prices are negatively correlated across customers.'),
  (13, 'peak-load pricing',
       'Capacity is shared across periods with different demand (airlines, electricity). Charge more in the peak so P reflects both MC of output and scarce capacity.'),
  (14, 'antitrust intuition',
       'Policy worries when market power plus barriers cause high markups and DWL, or exclusionary conduct. Market definition (substitutes, geography) is the first step in any case.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Oligopoly & Game Theory
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'oligopoly-games'
CROSS JOIN (VALUES
  (0,  'oligopoly',
       'A few firms, products homogeneous or differentiated, each firm''s profit depends on rivals'' actions. Strategic interdependence is the defining feature.'),
  (1,  'Nash equilibrium',
       'A profile of strategies such that no player wants to deviate given the others'' strategies. The workhorse solution concept for simultaneous-move games.'),
  (2,  'dominant strategy',
       'A strategy that is best no matter what the rival does. If both have a dominant strategy, that pair is the unique Nash (Prisoner''s Dilemma).'),
  (3,  'Prisoner''s Dilemma (business)',
       'Each firm has a dominant strategy to undercut / advertise / pollute, yet both are worse than if they could commit to cooperate. Explains why cartels are unstable.'),
  (4,  'Cournot competition',
       'Firms simultaneously choose quantities; price clears the market. Equilibrium Q is above monopoly and below competition; more firms → closer to P = MC.'),
  (5,  'Bertrand competition (identical products, constant MC)',
       'Firms simultaneously set prices. Nash: P = MC (like competition) if products are perfect substitutes and firms can serve all demand — the Bertrand paradox.'),
  (6,  'differentiated Bertrand',
       'When products are not identical, prices stay above MC. Differentiation (brand, location, features) is how firms escape pure price wars.'),
  (7,  'Stackelberg',
       'Quantity leader moves first; follower reacts with a Cournot best response. Leader produces more and earns more than in simultaneous Cournot (first-mover advantage).'),
  (8,  'reaction (best-response) function',
       'A firm''s optimal Q or P as a function of the rival''s choice. Cournot Nash is where reaction curves cross.'),
  (9,  'cartel / collusion',
       'Firms jointly restrict Q like a monopolist and split the profit. Unstable: each member wants to cheat. Facilitated by few firms, transparency, and repeated interaction.'),
  (10, 'repeated games / grim trigger',
       'If the game is repeated and the future is valuable enough, the threat of reverting to Nash punishment can sustain collusion (tacit or explicit).'),
  (11, 'monopolistic competition',
       'Many firms, free entry, differentiated products. Short run: like a small monopolist (P > MC). Long run: entry drives π → 0 but P still > MC (excess capacity).'),
  (12, 'strategic substitutes vs. complements',
       'Quantities are often substitutes (your extra Q lowers rival''s best Q). Prices can be complements (your cut leads rival to cut). Matters for mergers and capacity choices.'),
  (13, 'entry deterrence',
       'Incumbent invests in capacity, contracts, or brand to make entry unprofitable. Only credible if the investment changes post-entry payoffs (sunk capacity, not cheap talk).'),
  (14, 'winner''s curse (auctions)',
       'In a common-value auction, the winner tends to be the most optimistic bidder and may overpay. Sophisticated bidders shade bids; relevant for oil leases and M&A.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Uncertainty & Asymmetric Information
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'uncertainty-info'
CROSS JOIN (VALUES
  (0,  'expected value vs. expected utility',
       'EV is the probability-weighted payoff. Risk-averse people maximize E[U(wealth)], not EV; a fair gamble can have negative expected utility.'),
  (1,  'risk aversion',
       'Prefers a sure amount to a risky prospect with the same EV. Equivalent to concave U (Jensen''s inequality). The risk premium is what they pay to avoid the risk.'),
  (2,  'risk loving vs. risk neutral',
       'Risk loving: convex U; pays to take fair gambles. Risk neutral: linear U; decides on EV only. Firms are often treated as risk neutral if owners are diversified.'),
  (3,  'diversification',
       'Combining imperfectly correlated risks reduces portfolio variance. The remaining systematic risk cannot be diversified away.'),
  (4,  'value of information',
       'The increase in expected payoff (or utility) from observing a signal before choosing. Information is worth buying only if it can change the decision.'),
  (5,  'asymmetric information',
       'One party knows more than the other (quality, effort, health). Undermines the first-best competitive outcome; creates a role for contracts, brands, and regulation.'),
  (6,  'adverse selection',
       'Hidden type before contract: bad risks or low-quality sellers are more eager to trade (Akerlof lemons). Markets can unravel toward low quality.'),
  (7,  'lemons market',
       'Buyers, unable to tell quality, offer an average price; good cars exit; the mix worsens. Warranties, inspections, and reputation are market responses.'),
  (8,  'moral hazard',
       'Hidden action after contract: insured people take less care; employees shirk. The contract changes incentives, not just who is in the pool.'),
  (9,  'principal–agent problem',
       'Owner (principal) vs. manager (agent) with different goals and hidden effort. Incentive pay, monitoring, and stock options try to align interests — each with costs.'),
  (10, 'signaling',
       'Informed party takes a costly action to reveal type (education in Spence, warranties, advertising). The signal works only if it is cheaper for the good type.'),
  (11, 'screening',
       'Uninformed party offers a menu of contracts so types self-select (insurance deductibles, airline fare classes). Same idea as second-degree price discrimination.'),
  (12, 'efficiency wage',
       'Pay above the market-clearing wage to raise effort, reduce turnover, or attract better applicants — a moral-hazard / selection response in labor markets.'),
  (13, 'insurance and information',
       'Risk pooling is valuable, but asymmetric information produces underinsurance, deductibles, and copays as second-best tools against selection and hazard.'),
  (14, 'reputation as an asset',
       'In repeated markets, a brand that would lose future profit from cheating can sustain high quality — converting a hidden-information problem into a repeated game.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Externalities, Public Goods & Factor Markets
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'externalities-policy'
CROSS JOIN (VALUES
  (0,  'externality',
       'A cost or benefit imposed on a third party not priced in the market. Negative: MSC > MPC (pollution). Positive: MSB > MPB (vaccination, R&D spillovers).'),
  (1,  'Pigouvian tax / subsidy',
       'A tax equal to marginal external cost (or subsidy equal to marginal external benefit) that aligns private and social incentives and can restore the efficient Q.'),
  (2,  'Coase theorem',
       'If property rights are well defined and bargaining is costless, parties can negotiate to the efficient outcome regardless of who holds the right. Transaction costs and many parties break it.'),
  (3,  'tradable permits',
       'Cap total emissions and let firms trade rights. Equalizes MAC across firms (cost-effective) and lets the market find who abates. Quantity is certain; price is not.'),
  (4,  'public good',
       'Nonrival (one person''s use does not reduce another''s) and nonexcludable (hard to keep nonpayers out). Markets underprovide because of free riding.'),
  (5,  'free-rider problem',
       'Each person wants others to pay for the public good. Voluntary contribution undersupplies relative to Samuelson''s condition (sum of MB = MC).'),
  (6,  'common-pool resource',
       'Rival but nonexcludable (fisheries, aquifers). Tragedy of the commons: overuse. Cures: property rights, quotas, community governance (Ostrom).'),
  (7,  'derived demand for labor',
       'Firms hire labor because of the output it produces. Competitive firm hires until VMP_L = w, where VMP_L = P × MP_L (or MR × MP_L with market power).'),
  (8,  'monopsony in labor (business)',
       'A large employer faces upward labor supply; ME > w. Employs too few workers at a wage below VMP. A minimum wage can, in this model, raise both w and employment.'),
  (9,  'economic rent',
       'Payment to a factor above its opportunity cost (inelastic land, star talent, a unique patent). Who captures rent depends on bargaining and contracts.'),
  (10, 'present discounted value (PDV)',
       'PDV = ∑ C_t / (1+r)^t. The right way to compare cash flows over time. Higher r or later cash lowers PDV.'),
  (11, 'net present value (NPV) rule',
       'Invest if PDV of benefits minus PDV of costs > 0 (or IRR > opportunity cost of capital, with caveats when projects differ in scale/timing).'),
  (12, 'user cost of depletable resources',
       'Extracting a barrel today forgoes selling it tomorrow. Efficient extraction equates current net price to PDV of future net price (Hotelling intuition).'),
  (13, 'general-equilibrium efficiency (benchmark)',
       'Competitive markets with no externalities or information problems: P = MC in every market and MRS equalized — a first-best allocation. Real business settings violate the assumptions, which is why strategy and policy matter.'),
  (14, 'why this course is for managers',
       'The toolkit is: know your elasticities and costs, set MR = MC, anticipate rivals (games), and watch incentive/information problems inside the firm and in regulation.')
) AS c(pos, front, back)
WHERE d.slug = 'ugba101a'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'ugba101a';
