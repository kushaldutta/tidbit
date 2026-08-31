-- Migration 072: ECON 100A — Microeconomic Theory, full deck rebuild.
-- UC Berkeley Fall 2026: James D. Campbell, MoWe 17:00-18:29, Wheeler 150.
-- Catalog: consumer and producer theory, competitive equilibrium, monopoly,
-- general equilibrium, asymmetric information; uses calculus. Similar topics
-- to 101A (less formal). Credit restriction vs 101A / UGBA 101A / S100A.
-- Primary: Campbell course pack. Reference: Varian, Intermediate Micro with
-- Calculus. Distinct from ECON 1 (survey, no Lagrange) and UGBA 101A (Haas).

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'econ100a');

DELETE FROM public.tidbits
WHERE category_id = 'econ100a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ100a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ100a');

UPDATE public.decks
SET title = 'ECON 100A',
    description = 'Microeconomic Theory — Campbell: optimization, GE, games, information',
    cover_emoji = '📈'
WHERE slug = 'econ100a';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('prefs',       'Preferences, Utility & Choice',
   'Axioms, MRS, budget, Lagrange, interior vs corner', 0),
  ('demand',      'Demand, Slutsky & Labor Supply',
   'Marshallian/Hicksian, income and substitution, labor/leisure', 1),
  ('uncertainty', 'Choice under Uncertainty',
   'Expected utility, risk aversion, insurance', 2),
  ('exchange',    'Exchange Equilibrium & Welfare',
   'Edgeworth, Pareto, first and second welfare theorems', 3),
  ('producer',    'Producer Theory',
   'Technology, costs, profit max, supply', 4),
  ('partial',     'Partial Equilibrium',
   'Competitive markets, surplus, taxes, entry', 5),
  ('geprod',      'GE with Production',
   'Robinson Crusoe, production Edgeworth, efficiency', 6),
  ('monopoly',    'Monopoly & Pricing Power',
   'MR=MC, markup, discrimination, natural monopoly', 7),
  ('games',       'Games & Oligopoly',
   'Nash, Cournot, Bertrand, Stackelberg, collusion', 8),
  ('info',        'Externalities & Asymmetric Information',
   'Pigou, Coase, lemons, signaling, moral hazard', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'econ100a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Preferences, Utility & Choice
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'prefs'
CROSS JOIN (VALUES
  (0,  'ECON 100A (Campbell) in one sentence',
       'Set up, solve, and interpret optimization models of consumers and firms, then put them in markets — calculus on the course pack, not 101A analysis. FA26: Jim Campbell, MoWe 5–6:30pm, Wheeler 150. Credit restriction vs 101A and UGBA 101A. Reference: Varian with calculus. Not Econ 1 graphs-only; not Haas applied cases.'),
  (1,  'preference axioms',
       'Completeness: any two bundles ranked. Transitivity: no cycles. Monotonicity (more is better) and convexity (averages weakly preferred) are the usual extras. 100A: convexity gives convex-to-origin ICs and diminishing MRS. If transitivity fails, max U is not a well-posed story.'),
  (2,  'utility as representation',
       'A utility function represents preferences if u(x) is at least u(y) exactly when x is weakly preferred to y. Unique only up to a strictly increasing transform. 100A: MU levels are not comparable across people or even across increasing transforms of the same person. MRS is ordinal and is what the FOC uses.'),
  (3,  'MRS',
       'MRS_{12} = MU1/MU2 = how much good 2 you will give up for one more of good 1, holding u fixed. Slope of the IC is -MRS. 100A: at an interior tangency, MRS = p1/p2. If MRS is greater than the price ratio, buy more of 1. Compute from u, do not eyeball a cartoon IC unless they drew one.'),
  (4,  'budget set',
       'p · x at most m (plus maybe time or other constraints). Slope -p1/p2, intercepts m/p_i. 100A: a price change rotates; an income change shifts parallel. If they add a ration or a two-part tariff, the budget is kinked — corners and kinks are where derivatives lie.'),
  (5,  'rational choice problem',
       'max u(x) s.t. p · x = m (local nonsatiation: the constraint binds). 100A: this is the grammar of the course. Write the Lagrangian, take FOCs, plus complementary slackness if inequalities. An interior solution is not guaranteed (perfect substitutes, bliss points).'),
  (6,  'Lagrange FOC (two goods)',
       'L = u(x1,x2) + lambda (m - p1 x1 - p2 x2). FOCs: MU1 = lambda p1, MU2 = lambda p2, and the budget. 100A: lambda is the marginal utility of income. Dividing the two FOCs: MRS = p1/p2. If they give Cobb-Douglas, you should know the expenditure shares without grinding every time.'),
  (7,  'Cobb-Douglas demand',
       'u = x^a y^b: spend a/(a+b) of income on x, b/(a+b) on y. 100A: x* = [a/(a+b)] m / p_x. Homothetic: income expansion is a ray. Elasticity of demand for own price is -1. If they change a, shares change — not a shifter of tastes in the Econ 1 slogan sense, a parameter of u.'),
  (8,  'perfect substitutes and complements',
       'Substitutes: linear u, bang-per-buck (MU/p) picks a corner unless the ratio equals the price ratio (then the whole segment). Complements: min{ax, by}, L-shaped ICs, consume on the kink. 100A: Lagrange interior FOCs fail at kinks and corners. Check MRS vs prices, then the boundary.'),
  (9,  'quasilinear',
       'u = v(x) + y (y is the numeraire). No income effect on x if the consumer stays interior in y. 100A: inverse demand is v''(x) = p (if y is priced at 1). Partial-equilibrium CS calculations love this. If income is too low to buy the interior x, you are in a corner — the no-income-effect slogan dies.'),
  (10, 'corner solutions',
       'If MRS at 0 is still less than p1/p2, buy zero of good 1. Kuhn-Tucker: MU1 - lambda p1 at most 0, and = 0 if x1 is positive. 100A: always check whether the candidate interior point is feasible and whether a corner beats it. Perfect substitutes are the exam factory for this.'),
  (11, 'homothetic vs quasilinear',
       'Homothetic: ICs are radial blowups; income expansion paths are rays; shares can be constant. Quasilinear: parallel ICs in the y direction; income expansion is horizontal (more y). 100A: know which one kills income effects on x. Do not call every u homothetic.'),
  (12, 'prefs exam move',
       'Write preferences, u, budget. Interior: MRS = p1/p2 and budget. Name the type (CD, CES, quasi, min, linear). If they ask "would they buy any of good 1," compare MRS at the axis to the price ratio. State that u is ordinal if they ask about MU comparisons.'),
  (13, 'utility trap',
       'Treating u=100 vs u=50 as "twice as happy." Adding utilities across people without a welfare story (that is later, and controversial). 100A: a monotone transform leaves demand unchanged. If your FOC used a transform that is not increasing, you broke representation.'),
  (14, 'FOC trap',
       'Writing MRS = p2/p1 (flipped). Forgetting the budget. Using Lagrange at a min{} kink. 100A: if second-order / convexity fails, a critical point can be a min. Convex prefs + linear budget: the FOC is typically sufficient. Mention convexity if they ask "why is this a max."')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 2. Demand, Slutsky & Labor Supply
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'demand'
CROSS JOIN (VALUES
  (0,  'Marshallian demand',
       'x(p,m): ordinary demand from the UMP. Homogeneous of degree 0 in (p,m): doubling prices and income does not change x (no money illusion). 100A: Walras''s law: p · x(p,m) = m. Adding-up and homogeneity are the first "restrictions from theory" before Slutsky.'),
  (1,  'indirect utility and expenditure',
       'v(p,m) = u(x(p,m)). e(p,u) = min expenditure to reach u. 100A: e(p, v(p,m)) = m and v(p, e(p,u)) = u. Roy''s identity: x_i = - (dv/dp_i) / (dv/dm). Shephard: Hicksian h_i = de/dp_i. These are how you go from a value function to demand without re-solving.'),
  (2,  'Hicksian demand',
       'h(p,u): cheapest bundle that hits u (EMP). 100A: compensated demand; no income effect by construction. At the original (p,u), Marshallian and Hicksian agree. Price derivatives of h are substitution effects and the substitution matrix is negative semidefinite, symmetric.'),
  (3,  'Slutsky equation',
       'dx_i/dp_j = dh_i/dp_j - x_j dx_i/dm. Own-price: substitution term is negative (Hicksian), income term -x dx/dm. 100A: Giffen = income effect swamps substitution (inferior and a large budget share). Draw both: Hicks holds u, Slutsky holds purchasing power of the old bundle.'),
  (4,  'Hicks vs Slutsky compensation',
       'Hicks: change p, then adjust m so the consumer is on the old IC. Slutsky: adjust m so the old bundle is just affordable. 100A: they coincide for tiny changes. On a graph, Slutsky''s pivot is through the old bundle; Hicks is tangent to the old IC. Exams want both names.'),
  (5,  'normal, inferior, Giffen, ordinary',
       'Normal: dx/dm positive. Inferior: negative. Ordinary: dx/dp own negative. Giffen: own-price positive (must be inferior). 100A: Giffen is rare and not "upward-sloping demand as a default." Quasilinear: x is ordinary and independent of m (interior).'),
  (6,  'complements and substitutes (Slutsky)',
       'Net (Hicksian) substitutes: dh_i/dp_j positive. Gross (Marshallian) can go the other way because of income effects. 100A: two goods with only an income effect can look like gross complements. Say net vs gross if they ask "are they substitutes."'),
  (7,  'elasticity from demand',
       'Own-price elasticity = (p/x) dx/dp. Income elasticity = (m/x) dx/dm. 100A: CD own-price is -1; income is 1. Elasticity is local; a linear demand is elastic at high p. Relating to revenue: if |e| is greater than 1, a small price cut raises expenditure on that good.'),
  (8,  'labor-leisure',
       'u(c, leisure), budget: c = w(T - leisure) + y (nonlabor income). Price of leisure is w. 100A: a wage increase has substitution (work more) and income (work less if leisure is normal). Backward-bending labor supply is an income-effect story, not a contradiction of "people like money."'),
  (9,  'reservation wage',
       'The wage that makes the person indifferent between working a bit and taking all leisure. 100A: if y is high or MU of leisure at T is high, reservation wage is high. A means-tested transfer that falls with earnings is a tax on work — kinked budget, same toolkit as a nonlinear price.'),
  (10, 'intertemporal (light)',
       'Two-period: u(c1,c2), budget PV: c1 + c2/(1+r) = m1 + m2/(1+r). Price of future consumption is 1/(1+r). 100A: r up, substitution toward c1 (save less / borrow more) vs income effect. Saving is a demand for future goods. Same MRS = price ratio.'),
  (11, 'revealed preference (WARP)',
       'If x is chosen when y is affordable, y must not be chosen when x is affordable (strict version). 100A: a cheap test of the model without writing u. Two-bundle violations are the exam picture. SARP/GARP are the full story; 100A usually wants WARP and the idea.'),
  (12, 'demand exam move',
       'Name UMP vs EMP. Write Slutsky with signs. If they change p, say substitution (always opposite own p for Hicks) plus income (sign from normal/inferior). Labor: redraw as leisure priced at w. If they give v or e, use Roy or Shephard instead of re-maximizing.'),
  (13, 'Slutsky trap',
       'Putting the income term on the wrong good (use x_j, the good whose price changed). Claiming Giffen for a normal good. 100A: own substitution dh_i/dp_i is at most 0, not the Marshallian derivative. Mixing Hicksian and Marshallian slopes on one graph without labeling compensation.'),
  (14, 'labor-supply trap',
       'Treating a wage rise as only "the opportunity cost of leisure rose" and ignoring income. Treating nonlabor income as a price. 100A: y shifts the intercept, w rotates through (T, y) in leisure-consumption space. A parallel shift is not a wage change.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 3. Choice under Uncertainty
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'uncertainty'
CROSS JOIN (VALUES
  (0,  'lotteries',
       'A list of outcomes and probabilities. 100A: the object of choice is the lottery, not a sure bundle. Independence and continuity get you expected-utility form (vNM). If they skip axioms, still write EU = sum p_s u(w_s).'),
  (1,  'expected utility',
       'vNM: preferences over lotteries represented by EU of a Bernoulli u on outcomes. Unique up to positive affine transform (a u + b, a positive) — unlike ordinal u in certainty. 100A: curvature of u now means something: risk attitude. Do not apply a monotone transform and claim the same EU ranking of all lotteries.'),
  (2,  'risk aversion',
       'Concave u (Jensen: EU(w) at most u(Ew)). Prefers the expected wealth for sure to the lottery. 100A: convex u is risk loving; linear is risk neutral. Draw the chord vs the function. Insurance exists because of concavity, not because "people hate losing."'),
  (3,  'Arrow-Pratt',
       'Absolute risk aversion r_A = minus u-double-prime over u-prime. Relative r_R = minus w times that. 100A: higher r_A, more willing to pay to avoid a given additive risk. DARA: r_A falls in wealth (richer people buy less insurance for a fixed dollar risk). CRRA: r_R constant (isoelastic u).'),
  (4,  'certainty equivalent and risk premium',
       'CE: sure amount with u(CE) = EU(lottery). Risk premium = Ew - CE, nonnegative if risk averse. 100A: a fair insurance premium equals expected loss; a risk-averse person pays more than that, up to the premium that makes CE match. Fair full insurance is chosen if u is concave and the insurer is fair.'),
  (5,  'fair insurance',
       'Premium = p times coverage, p = probability of loss (actuarially fair). FOC: equal MU of wealth in both states (full insurance) when fair and interior. 100A: if loaded (price above p), partial coverage. If they force a deductible, that is a constraint, not the unconstrained FOC.'),
  (6,  'diversification',
       'Independent risks: a portfolio average has lower variance. Risk averse likes that. 100A: if risks are perfectly correlated, diversification does nothing. Insurance companies live on many independent risks plus a law of large numbers, not on "being less risk averse as a person."'),
  (7,  'state-contingent claims',
       'Think of consumption in each state as a different good; prices are state prices. 100A: MRS between states = ratio of state prices. Complete markets: you can buy any pattern of state consumption. Incomplete: cannot insure some risks. This is the bridge to GE later.'),
  (8,  'St. Petersburg and bounded u',
       'Infinite expected money with a tiny tail: a bounded or strongly concave u keeps EU finite. 100A: the parable is "EU needs a u that is not linear in money." You will not compute an infinite series on the exam; you will say why linear-in-money fails.'),
  (9,  'Allais / independence (light)',
       'Common-consequence problems where people violate independence. 100A: Campbell wants you to know EU is a model, not a law of psychology. For the problem set, still use EU unless they say otherwise. Prospect theory is a critique, not the 100A default tool.'),
  (10, 'risk vs uncertainty (Knight, light)',
       'Risk: known probabilities. Uncertainty: you do not have a unique p. 100A: almost everything you compute is risk. If they say ambiguity, you cannot write a unique EU without extra assumptions. Do not hide behind that on a standard insurance problem.'),
  (11, 'small risks',
       'For a tiny additive risk, the risk premium is about (1/2) sigma^2 r_A (Arrow-Pratt approximation). 100A: this is why r_A is the local price of risk. A first-order (non-smooth) risk can have a first-order premium — usually beyond 100A unless they hint.'),
  (12, 'uncertainty exam move',
       'Write states, p, wealth in each, u. Risk averse iff u concave. Fair insurance: full cover if interior. Compute CE from u(CE)=EU. If they give a derivative, r_A is minus u-double-prime over u-prime. Affine transforms of u do not change choices; nonlinear transforms do.'),
  (13, 'EU trap',
       'Using ordinal (any increasing) transforms of u. Comparing MU across people. Calling variance the definition of risk aversion (mean-variance is a special case, e.g. quadratic or normal). 100A: two lotteries with the same mean, the risk averse likes the less spread one if second-order stochastic dominance holds — variance is a proxy, not the axiom.'),
  (14, 'insurance trap',
       'Buying full insurance when the premium is loaded, as if fair. Treating the premium as a sure loss subtracted after u, inconsistently across states. 100A: wealth in the no-loss state is w - premium; in the loss state is w - premium - loss + indemnity. Write both before differentiating.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 4. Exchange Equilibrium & Welfare
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'exchange'
CROSS JOIN (VALUES
  (0,  'Edgeworth box',
       'Two people, two goods, fixed endowments. Width and height are total resources. A point is an allocation. 100A: ICs for A from southwest, B from northeast. Feasible = inside the box. The endowment is one point; trade moves to another.'),
  (1,  'Pareto efficient',
       'No reallocation makes one better without making the other worse. In the box: tangency of ICs (MRS^A = MRS^B) if interior, or a boundary if someone is at zero. 100A: the contract curve is the set of PE points. PE is not "fair" and not unique.'),
  (2,  'MRS equalization',
       'Interior PE: MRS^A = MRS^B so they agree on the tradeoff. 100A: if MRS differ, there is a mutually beneficial trade (lens between ICs). This is the same math as one consumer facing prices, but here the "price" will be endogenous.'),
  (3,  'Walrasian (competitive) equilibrium',
       'Prices p such that both maximize u given p · x = p · endowment, and markets clear. 100A: each is tangent to the same budget line through the endowment. So MRS^A = MRS^B = p1/p2, and PE. Relative prices only: you can normalize p2 = 1.'),
  (4,  'first welfare theorem',
       'A competitive equilibrium allocation is Pareto efficient (under local nonsatiation, complete markets, no externalities). 100A: "the market is efficient" means this, not "we like the endowment." If the endowment is unequal, the CE can be efficient and awful. That is the equity gap.'),
  (5,  'second welfare theorem',
       'Any interior PE allocation is a CE for some redistribution of endowments (convex prefs, etc.). 100A: prices can support a fair allocation if you can lump-sum transfer first. The theorem is not "just redistribute with taxes on goods" — distortionary taxes break the support.'),
  (6,  'offer curves',
       'Each trader''s chosen net trade as prices vary, given their endowment. Intersection: CE. 100A: a way to find p without guessing. If offer curves miss, no interior CE (maybe a boundary). Two CD consumers: you can solve shares and market clearing in algebra.'),
  (7,  'gross substitutes and uniqueness (light)',
       'If excess demand has gross substitutes, CE prices are unique (up to scale) and tatonnement is well behaved. 100A: you will not prove Sonnenschein; you should know CE need not be unique in general, and that CD usually behaves.'),
  (8,  'welfare weights and SWF',
       'A social welfare function W(u^A, u^B). Max W on the utility possibility set. 100A: different weights pick different PE points. Utilitarian vs maximin are normative. The second theorem says a CE can implement the planner''s PE if you can transfer endowments.'),
  (9,  'autarky vs trade',
       'No trade: consume endowments. Trade to CE: both (weakly) better in the usual interior case with different MRS at the endowment. 100A: if MRS already equal at omega, no gains. Measuring "gains from trade" is EV/CV if they ask, not "GDP."'),
  (10, 'local nonsatiation and cheap points',
       'FWT needs local nonsatiation so people spend their budget (no bliss inside). 100A: if someone satiates, they might not clear a market. Mention it if they give a bliss point inside the box.'),
  (11, 'numeraire and price level',
       'Only relative prices are determined. 100A: if you "increase all p," demands do not change (homogeneity). There is no money in this model; do not talk about inflation. Clearing is on quantities, not a dollar GDP.'),
  (12, 'exchange exam move',
       'Draw the box, mark omega, sketch ICs, contract curve (MRS equal). CE: one budget through omega, double tangency, check adding-up. State FWT (CE is PE) and SWT (PE supported after transfers). If they give CD, write share rules and p from market clearing.'),
  (13, 'efficiency trap',
       'Calling the endowment PE. Calling CE "the fair allocation." Equating PE with max total u (that needs cardinal and weights). 100A: many PE points; CE picks one given omega. A move that helps A a lot and hurts B a little can be PE-incomparable — use ICs, not a sum of u unless they specified W.'),
  (14, 'price trap',
       'Treating absolute price levels as determined. Forgetting market clearing (two FOCs plus one budget may not use the second market — Walras''s law, drop one equation). 100A: if you normalize p2=1, solve for p1 from one market. Do not "set p=MC"; there is no firm yet.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 5. Producer Theory
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'producer'
CROSS JOIN (VALUES
  (0,  'technology / production function',
       'q = f(z), z inputs. Isoquants: f = constant. TRS (MRTS) = MP1/MP2. 100A: convex technology (convex isoquants, diminishing MRTS) matches convex cost. Returns to scale: f(t z) vs t f(z) for t greater than 1 — IRS/CRS/DRS. Not the same as diminishing MP (one input).'),
  (1,  'profit max',
       'max p f(z) - w · z. FOC: p MP_i = w_i (value marginal product). 100A: this is the factor demand. Hotelling: supply and factor demands are derivatives of the profit function. If f is CRS, profit is zero in a competitive input-output price regime or the problem is unbounded.'),
  (2,  'cost min',
       'min w · z s.t. f(z) = q. Lagrangian: w_i = mu MP_i, so MRTS = w1/w2. 100A: mu is MC. Shephard: conditional factor demand is dc/dw_i. Cost function c(w,q) is the object you take to the output market. Always min cost before you pick q, unless they give c already.'),
  (3,  'conditional vs unconditional factor demand',
       'Conditional: z(w,q) from cost min. Unconditional: z(w,p) from profit max (output endogenous). 100A: the first holds q fixed; the second lets q adjust. A wage change with q fixed is not the long-run industry story.'),
  (4,  'cost curves',
       'MC = dc/dq, AC = c/q. MC crosses AC at AC min. 100A: if c(q) = FC + VC(q), shutdown uses AVC. Envelope: MC = mu from the cost-min Lagrange. For Cobb-Douglas production, c is a power of q times a wage index — know the exponent from returns to scale.'),
  (5,  'short vs long run',
       'Short run: some z fixed, SMC from the variable input. Long run: all z free, LMC is the envelope of SMCs. 100A: LeChatelier: long-run factor demand is more elastic (more substitution). Do not put diminishing MP and DRS on the same sentence as if they were twins.'),
  (6,  'supply of a competitive firm',
       'p = MC(q), q at least 0, and p at least min AVC in the SR (otherwise q=0). 100A: inverse supply is the MC above shutdown. Profit = pq - c. Zero profit is p = min AC in the LR with free entry, not a FOC of a single firm with a U-shaped AC and no entry.'),
  (7,  'CRS and the firm',
       'If f is CRS and p is such that max profit is 0, any scale is optimal (or none). 100A: industry supply can still be well defined via entry of identical CRS plants, or via a factor-price that adjusts. A single CRS firm with p above unit cost wants infinite q — that is why we need decreasing returns or a fixed factor or a market.'),
  (8,  'Cobb-Douglas production',
       'q = A z1^a z2^b. Cost min: input shares a/(a+b) and b/(a+b) of cost. 100A: if a+b=1, CRS, AC independent of q. If a+b less than 1, DRS, AC rises. MP and MRTS are the usual calculus. Do not mix with Cobb-Douglas utility shares without changing the story (here shares of cost, not of income).'),
  (9,  'profit function properties',
       'pi(p,w) convex in prices, homogeneous of degree 1, increasing in p, decreasing in w. 100A: Hotelling''s lemma: d pi/dp = q, d pi/dw_i = -z_i. If they give pi, you can recover supply without re-solving the FOC. Same spirit as e(p,u) for the consumer.'),
  (10, 'opportunity cost of capital',
       'Economic cost includes the rental of owned capital. 100A: accounting profit can be positive when economic profit is zero. The competitive LR is zero economic profit. Campbell will ding "the firm is losing money" if you forgot implicit costs.'),
  (11, 'supply vs MC of a monopolist (preview)',
       'A competitive firm has a supply curve (p=MC). A monopolist does not: the same MC with different D gives different q. 100A: do not draw a monopoly "supply curve." That is next section; mention it so you do not import it early.'),
  (12, 'producer exam move',
       'Write f, then either profit FOC p MP = w or cost min MRTS = w1/w2 then p = MC. State SR vs LR and shutdown. If CRS, discuss zero profit / unboundedness. If they give c(q), skip z and go straight to p=MC. Envelope if they ask "where does MC come from."'),
  (13, 'returns-to-scale trap',
       'Diminishing MP of one input implies DRS (false). IRS implies monopoly (not automatically; it suggests natural monopoly if it persists at market q). 100A: MP is a partial; RTS is a full scaling. Isoquants can be convex with any RTS.'),
  (14, 'FOC trap',
       'Setting MP1/MP2 = w2/w1 (flipped). Using p=AC as a firm FOC. 100A: p=AC is an entry/zero-profit condition, not the firm''s first-order condition. A firm with U-shaped AC still sets p=MC; AC tells profit and entry.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 6. Partial Equilibrium
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'partial'
CROSS JOIN (VALUES
  (0,  'partial vs general equilibrium',
       'Partial: one market, income and other prices held fixed (demand and supply as given curves). GE: all markets, incomes endogenous. 100A: PE is the workhorse for tax incidence and monopoly. It is consistent with GE if quasilinear (no income effects, one numeraire). Know when the shortcut is licensed.'),
  (1,  'market demand and supply',
       'Sum of individual Marshallian x_i(p,m_i) and of firm supplies. 100A: a price change in PE moves along those curves. Shifts: tastes, number of firms, input prices, technology. Homogeneity still lurks: if this good''s p is the only p, we already chose a numeraire.'),
  (2,  'competitive PE',
       'p such that D(p)=S(p). Efficiency: MB=MC, max CS+PS. 100A: this is FWT in one market. Integrals of D and S are CS and PS if we treat them as Marshallian — exact welfare if quasilinear, otherwise CV/EV is the grown-up version.'),
  (3,  'CS, PS, CV, EV',
       'CS under Marshallian D is a welfare measure. CV/EV use expenditure function: EV = e(p0,u1) - e(p0,u0), etc. 100A: for a price fall, CV and EV sandwich CS if the good is normal. If they say "surplus triangles," they usually want Marshallian. If they say "Hicksian," integrate h.'),
  (4,  'tax in PE',
       'Wedge t between p_b and p_s, D(p_b)=S(p_s), p_b = p_s + t. Incidence: dp_b/dt = S'' / (S'' - D'') in the usual linearization (more inelastic side pays more). 100A: DWL ≈ (1/2) t Delta q. Statutory incidence does not matter (unless there is a kink or evasion). Same graph as Econ 1, now with derivatives.'),
  (5,  'subsidy and price controls',
       'Subsidy: reverse wedge, too much q, DWL. Ceiling: shortage, DWL plus rationing (who gets the good is extra). 100A: with a ceiling, surplus calculation needs a rationing rule. Do not just shade as if quantity magically equals D at the ceiling without saying who is served.'),
  (6,  'short-run industry supply',
       'Horizontal sum of firm MC above AVC, n fixed. 100A: a demand shock mostly changes p if MC is steep (inelastic S). Profits can be positive. This is not the long-run story.'),
  (7,  'long-run with free entry',
       'Identical firms, U-shaped AC: p = min AC, n adjusts so n q*(min AC) = D(p). Horizontal LR supply if factor prices fixed. 100A: upward LR supply if a factor is scarce (industry expansion bids up w). Zero economic profit is the entry condition.'),
  (8,  'identifying D vs S (light)',
       'A shock that moves only S traces out D, and vice versa. 100A: this is why "we saw p and q rise so demand rose" needs a story about which curve moved. Two observations do not identify two curves without an instrument or a shifter. Campbell/CORE energy: do not overclaim from a scatter.'),
  (9,  'elasticity and DWL',
       'More elastic D or S, more Delta q for a tax, more DWL. 100A: a tax on an inelastic good raises revenue with little DWL (Ramsey intuition). Perfect inelastic S: sellers pay the tax, q unchanged, DWL zero in PE. State the extreme if they draw it.'),
  (10, 'when PE welfare lies',
       'Income effects, missing markets, externalities, market power: the PE surplus story is incomplete. 100A: quasilinear plus complete markets plus price taking is the clean case. If they ask "is this tax efficient in GE," you may need the GE section.'),
  (11, 'numeraire in PE',
       'We measure surplus in dollars of the other goods. 100A: that is an approximation to MU of income constant (quasilinear). If MU of income varies a lot, CS is a messy welfare metric. Say so if they push.'),
  (12, 'partial exam move',
       'Write D(p), S(p), equilibrium. Tax: two prices, one q, incidence from slopes, DWL triangle. Entry: p to min AC, n from demand. If they want exact welfare, name CV/EV vs Marshallian. Mention quasilinear if they ask why triangles are "right."'),
  (13, 'incidence trap',
       'Assigning the tax to whoever the law names. Using CS from a Marshallian D as exact when they just taught income effects. 100A: a Giffen good makes PE diagrams weird — unlikely, but own-price slope is the Marshallian one, not Hicksian, on the D you drew from UMP.'),
  (14, 'entry trap',
       'Setting p=MC and p=AC as the same firm''s two FOCs without n adjusting. Drawing SR supply as horizontal at min AC. 100A: SR: n fixed, S slopes with MC. LR: n free, p pinned by min AC if factors are cheap at all scales.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 7. GE with Production
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'geprod'
CROSS JOIN (VALUES
  (0,  'Robinson Crusoe',
       'One person, production and consumption. Max u s.t. the PPF. Tangency: MRS = MRT (= p ratio if there were markets). 100A: MRT is the slope of the PPF, extra good 1 in terms of good 2 from shifting inputs. This is PE for a planner and CE for a consumer-owner of the firm.'),
  (1,  'MRT',
       'MRT_{12} = MC1/MC2 = extra good 2 forgone for a unit of 1 along the PPF. 100A: at efficiency, MRS = MRT. In a CE, both equal p1/p2. If MRS is greater than MRT, produce more of 1. Compute MRT from the transformation function or from MC ratio.'),
  (2,  'firm and household in CE',
       'Households own firms, take profits as income, supply factors, demand goods. Firms take prices, max profit. 100A: Walrasian equilibrium: all goods and factor markets clear. FWT still: CE is PE if the usual hypotheses (no externalities, local nonsatiation, convexity for existence).'),
  (3,  'production Edgeworth',
       'Two goods, two inputs, fixed input totals. Efficient production: isoquants tangent (MRTS^1 = MRTS^2). Contract curve in input space maps to the PPF. 100A: if MRTS differ, move inputs across firms and expand the PPF. This is the production analog of MRS equalization.'),
  (4,  'PPF from the contract curve',
       'Each efficient input allocation gives a (q1,q2) pair; the outer frontier is the PPF. 100A: bowed-out PPF from different factor intensities (increasing MRT). A linear PPF is one-factor or identical intensities. Do not draw a PPF from two ICs — those are preferences.'),
  (5,  'full efficiency conditions',
       'Exchange: MRS^A = MRS^B. Production: MRTS equal across firms. Top-level: MRS = MRT. 100A: CE prices do all three with one p vector (and w for factors). That is why "decentralize with prices" is the SWT story with production too.'),
  (6,  'factor prices',
       'w_i = p MP_i in each use (or else firms reallocate). 100A: one w per factor in a competitive factor market. If two firms have different VMP, inputs should move. This is the intensive-margin analog of MRTS tangency.'),
  (7,  'GDP as p · q',
       'Value of output equals factor payments plus profit (Euler: under CRS, profit 0 and p q = w z). 100A: this is an accounting identity in the model, not "GDP is welfare." Welfare is u, or a SWF on the utility possibility frontier that the PPF and prefs determine.'),
  (8,  'distorting taxes in GE',
       'A tax on one good drives MRS vs MRT apart (consumers see p+t, firms see p). 100A: that is the GE DWL of a commodity tax. Lump-sum taxes do not (second best vs first best). SWT used lump-sum on purpose.'),
  (9,  'existence/convexity (light)',
       'Need convex prefs and convex production sets for standard CE existence. IRS can break the competitive model (natural monopoly). 100A: you will not prove Debreu; you should say "nonconvexity, maybe no CE" if they give a big IRS firm.'),
  (10, 'closed vs open (light)',
       'A small open economy faces world p; specialize by comparative advantage (MRT vs world price). 100A: like Crusoe facing a linear budget from trade instead of the PPF alone. Gains from trade: consume outside autarky PPF. Distribution across people is a separate transfer question.'),
  (11, 'profits and income',
       'Household income = w · labor + profit dividends + endowment goods. 100A: if you forget profit in the budget, market clearing will not hold when firms make money. In CRS zero-profit CE, it drops out. With DRS or a fixed factor, profit is the residual.'),
  (12, 'GE-production exam move',
       'Write MRS = MRT = p1/p2 and MRTS = w1/w2. Crusoe: one tangency on the PPF. Two firms: input box tangency then PPF. FWT/SWT in one sentence each. If a tax, show MRS not equal MRT. If they give CD utility and CD production, shares plus adding-up.'),
  (13, 'PPF trap',
       'Setting MRS = MRTS (wrong objects). Drawing the PPF bowed in without a story. 100A: MRTS lives in input space; MRT lives in output space. Mixing the two boxes is the classic miss. Also: a CE is a point on the PPF, not the whole PPF.'),
  (14, 'welfare trap',
       'Maximizing p · q and calling it Pareto. Using profit as social surplus when there are consumers with income effects. 100A: PE is about u, not about the size of GDP. A move along the PPF that helps owners of one factor can hurt the other — SWT transfers are the textbook fix.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 8. Monopoly & Pricing Power
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'monopoly'
CROSS JOIN (VALUES
  (0,  'monopoly problem',
       'max p(q) q - c(q), or max p, q=D(p). FOC: MR = MC. Then p from D(q*). 100A: MR = p + q dp/dq = p (1 + 1/e) with e the elasticity (negative). Markup p - MC = -p/e. Never read p off MR. Inverse elasticity rule is the Lerner index (p-MC)/p = -1/e.'),
  (1,  'MR for linear demand',
       'p = a - b q, MR = a - 2 b q, same intercept, twice the slope, hits q-axis at half. 100A: TR max at MR=0, which is the unit-elastic point. Profit max is left of that if MC is positive. Produce in the elastic region of demand.'),
  (2,  'DWL of monopoly',
       'q_m less than q_c, p_m greater than p_c. DWL is the missing trades where MB is still above MC. 100A: profit is a transfer from CS, not DWL. If you shade profit as DWL you fail. Efficiency requires p=MC (or MR=MC only if MR=p, i.e. price taking).'),
  (3,  'Lerner and elasticity',
       'More inelastic D, bigger markup. 100A: a monopolist with perfectly elastic D is a price taker (e to -infinity, Lerner 0). Do not say "monopolists always have inelastic demand" — they choose a point where |e| is at least 1 if MC is at least 0.'),
  (4,  'natural monopoly',
       'ATC falling through the relevant D, so one firm is cheaper. Unregulated: monopoly FOC. P=MC may not cover ATC. P=ATC: zero profit, still DWL vs MC. 100A: two-part tariff can get close to efficient q if you can charge an entry fee. IRS is the cost story.'),
  (5,  'price discrimination degrees',
       '1st: each unit at WTP (perfect), q efficient, CS extracted. 2nd: menus, quantity discounts, self-selection. 3rd: group prices, MR1=MR2=MC. 100A: needs power, sorting, no resale. Perfect PD is efficient but not "good for consumers." 3rd degree: higher p in the less elastic segment.'),
  (6,  'two-part tariff',
       'Entry fee + per-unit p. If identical consumers and you set p=MC, the fee can skim CS. 100A: with heterogeneous consumers, p above MC and a smaller fee is typical (keep the low types). This is 2nd-degree energy. Contrast a single monopoly price.'),
  (7,  'durable goods / Coase conjecture (light)',
       'A durable monopolist competing with future selves may have to cut p, eroding power. 100A: commitment (rent, destroy unused capacity) can restore monopoly profit. If they mention used markets, this is the parable. Not the default static problem.'),
  (8,  'monopsony (factor market)',
       'One buyer of an input faces an upward S: ME greater than w. Hire where VMP = ME, w off S. 100A: too little employment. A min wage can raise w and employment (the Econ 1 exception, now with a FOC). Dual to monopoly on the demand side.'),
  (9,  'cartel as shared monopoly',
       'Industry MR=MC if they collude. Incentive to shade extra output (MR of the cartel is not MR of the deviant). 100A: this is why cartels need enforcement. Antitrust is the legal constraint. Stability is a game — next section.'),
  (10, 'quality and variety (light)',
       'A monopolist may distort quality as well as q. 100A: the Spence/Mussa-Rosen flavor is "too little quality for low types" in 2nd degree. If they only give p(q), stick to q. Do not invent a quality FOC they did not teach.'),
  (11, 'supply curve reminder',
       'No supply curve: the pair (p,q) depends on D, not only on MC. 100A: shifting D along a monopolist''s MC does not trace a function p(q) independent of D. If they ask for supply, say it does not exist, then write MR=MC.'),
  (12, 'monopoly exam move',
       'Write TR, MR, set MR=MC, p=P(q). Lerner if they give e. Shade profit (p-AC)q and DWL vs p=MC. PD: name the degree, the ranking of prices by elasticity, and whether q is efficient. Natural monopoly: ATC vs D, then P=MC vs P=ATC.'),
  (13, 'MR trap',
       'MR = p - b q with the wrong b, or MR=p. Setting P=MC for a monopolist. 100A: for p=a-bq, MR=a-2bq, not a-bq. If demand is p=A/q (unit elastic), TR is constant and MR=0 — profit max is then min cost or a corner, not an interior MR=MC with positive MC.'),
  (14, 'PD trap',
       'Charging different prices because MC differs and calling it discrimination (it might just be cost). Forcing 3rd-degree prices without MR1=MR2. 100A: if resale is free, 3rd degree collapses. If groups have the same e, they get the same p.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 9. Games & Oligopoly
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'games'
CROSS JOIN (VALUES
  (0,  'game ingredients',
       'Players, strategies, payoffs. Simultaneous vs sequential. 100A: write the normal form (matrix) or extensive form (tree). A strategy is a full plan, including off-path in a tree. Do not confuse an action at one node with a strategy.'),
  (1,  'Nash equilibrium',
       'Each player''s strategy is a best response to the others. 100A: not necessarily efficient, unique, or in dominant strategies. Mixed Nash: indifferent among actions in the support. To find NE, underline best responses. "Nash" is not "the social optimum."'),
  (2,  'dominant strategies and PD',
       'A strategy that is best no matter what the other does. Prisoner''s dilemma: dominant defect, NE is (D,D), but (C,C) Pareto-dominates it. 100A: cartels and public goods are PD-shaped. Repeated play can support cooperation (folk, grim) — name the tension even if you skip the theorem.'),
  (3,  'SPNE / backward induction',
       'In a finite tree of perfect information, start at the end. SPNE: NE in every subgame. 100A: this kills non-credible threats (entry deterrence that would not fight after entry). Stackelberg is a tree; Cournot is simultaneous.'),
  (4,  'Cournot',
       'Simultaneous quantities, p(Q), Q=q1+q2. Each max pi treating the other''s q as fixed. Best response q_i(q_j). NE: intersection. 100A: q between monopoly and competitive. More firms, closer to p=MC. Homogeneous good, one p. FOC: MR_i = MC, where MR_i uses dP/dQ times q_i.'),
  (5,  'Bertrand',
       'Simultaneous prices, homogeneous, constant MC: NE is p=MC (the Bertrand paradox) with two firms if they can serve the whole market. 100A: capacity constraints, product differentiation, or repeated play restore margins. Do not apply Cournot intuition to a price game with identical goods.'),
  (6,  'differentiated Bertrand',
       'Each faces a downward D_i(p_i, p_j). NE: p above MC, strategic complements (best responses upward). 100A: this is closer to "real" retail than homogeneous Bertrand. Markup depends on own elasticity given the rival''s p.'),
  (7,  'Stackelberg',
       'Leader sets q first, follower best-responds (Cournot BR). Leader picks a point on the follower''s BR. 100A: leader typically produces more than Cournot, higher profit than the follower. SPNE, not a simultaneous NE. Commitment (capacity) is the economic point.'),
  (8,  'collusion vs Cournot',
       'Joint max: monopoly q split. Each wants to expand (MR of the firm above MR of the cartel). 100A: incentive compatibility of a cartel is a repeated-game constraint. Antitrust raises the expected cost of cheating detection. Static Cournot is the one-shot baseline.'),
  (9,  'strategic substitutes vs complements',
       'Quantities: usually substitutes (BR downward). Prices with differentiation: complements (BR upward). 100A: a tax or a cost shock to one firm then has opposite rival responses. Name the slope of the BR if they ask "does the rival expand."'),
  (10, 'mixed strategies (1 level)',
       'Randomize to keep the other indifferent. 100A: matching pennies, inspection games. Probabilities come from the opponent''s payoffs, not your own (the usual surprise). Expected payoff of a mixed NE is the indifferent value.'),
  (11, 'entry',
       'Incumbent may overinvest or limit-price; SPNE asks whether fighting after entry is optimal. 100A: a sunk cost of entry vs expected Cournot profit. Contestability (hit-and-run) is the extreme of zero sunk cost. Barriers are technology plus sunkness plus strategy.'),
  (12, 'games exam move',
       'Write players, strategies, payoffs. Simultaneous: BR and NE. Tree: backward induction / SPNE. Oligopoly: name Cournot (q), Bertrand (p), Stackelberg (q leader). Compare q and p to monopoly and to n to infinity. If PD, mark the dominant strategy and the Pareto-better cell.'),
  (13, 'Nash trap',
       'Picking the Pareto-best cell and calling it Nash. Using mixed-strategy probabilities from your own payoffs. 100A: a cell can be better for both and still not NE (PD). Also: two NE can exist (chicken, coordination) — list both unless they ask for a refinement.'),
  (14, 'oligopoly trap',
       'Using monopoly MR on industry Q as each firm''s FOC in Cournot (that is collusion). Applying homogeneous Bertrand but drawing p above MC "because duopoly." 100A: the model name determines the FOC. If goods are identical and prices are the strategy, p=MC is the default NE.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

-- =====================================================================
-- 10. Externalities & Asymmetric Information
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'info'
CROSS JOIN (VALUES
  (0,  'externality in 100A',
       'Private FOC ignores a cost or benefit. Negative: MSC = MC + MD, market q too high. Positive: MSB = MB + MB_ext, q too low. 100A: FWT fails because the price does not see the missing margin. Draw MPC vs MSC (or MPB vs MSB). PE triangles are back, with the social curve.'),
  (1,  'Pigouvian tax',
       't = MD at the efficient q (not at the old q, if MD slopes). Then private MC + t = MSC, q* efficient. 100A: quantity instruments (cap) vs prices (tax) under uncertainty about costs (Weitzman) — 100A may only want the certainty case. Incidence of the tax is still elasticities; efficiency is the shift of the curve.'),
  (2,  'Coase',
       'With well-defined rights and zero bargaining cost, the efficient q is reached; who pays depends on the right. 100A: the surplus split is not unique. Many parties, asymmetric info, and holdout break Coase. It is a benchmark that FWT can be restored by completing the market in "rights," not a "do nothing" policy lemma.'),
  (3,  'public goods',
       'Nonrival, nonexcludable. Efficient: sum MRS = MRT (Samuelson). Private provision: each sets MRS = MRT, free ride, too little. 100A: Lindahl prices personalize p so each MRS = p_i and sum p_i = MC. Preference revelation is the implementation problem. Distinct from a rival commons.'),
  (4,  'commons',
       'Rival, hard to exclude: each user''s FOC uses average return, not marginal social. Too much z. 100A: a tax or a quota or property rights can implement z*. Ostrom: community rules can work; 100A still wants the FOC gap (private vs social MP).'),
  (5,  'adverse selection',
       'Hidden type. Akerlof: average quality in the market depends on price, demand sees the average, unraveling. 100A: competitive p = E[quality | sell at p]; if that is less than high types'' reservation, they exit. Insurance: high risks buy, premiums rise. Mandates, subsidies, underwriting are patches.'),
  (6,  'lemons math (1 level)',
       'Sellers know theta, buyers offer p based on E[theta | theta in the selling set]. 100A: a cutoff: sell if reservation(theta) is at most p. Equilibrium consistency of that cutoff is the object. If only lemons remain, p is low. Warranties and reputation are signals (next cards).'),
  (7,  'signaling (Spence, light)',
       'Education (or a warranty) is cheaper for high types, so a separating equilibrium can reveal type. 100A: the signal can be socially wasteful (education as a rat race) even if it sorts. Pooling: everyone sends the same signal, beliefs off path matter. Riley/Cho-Kreps are refinements — name separating vs pooling if they ask.'),
  (8,  'screening',
       'The uninformed party offers a menu; types self-select (2nd-degree PD, insurance contracts). 100A: incentive compatibility and individual rationality. High types get information rent. Do not confuse with signaling (informed party moves first).'),
  (9,  'moral hazard',
       'Hidden action after a contract. Insurance: less care. Firm: manager effort. 100A: a second-best contract trades insurance vs incentives (or rent vs effort). Deductibles and performance pay are the tools. First-best (full insurance, first-best effort) is not incentive compatible if effort is costly and unseen.'),
  (10, 'principal-agent FOC idea',
       'Principal max expected profit s.t. agent IR and IC. 100A: IC often "make effort better than shirk" in a two-action model. Limited liability or risk aversion of the agent blocks selling the firm to the agent. Contrast: if effort were observed, a forcing contract implements first best.'),
  (11, 'why FWT fails here',
       'Externalities: missing prices. Public goods: nonexcludability. Asymmetric info: the allocation cannot condition on the unknown, or markets infer and unravel. 100A: the course''s last move is "which hypothesis of FWT broke." Do not say "markets always fail" or "never fail" — name the missing market or the hidden variable.'),
  (12, 'info exam move',
       'Externality: MSC vs MPC, Pigou t=MD(q*), Coase rights. Public good: sum MRS = MC. Lemons: p = E[theta|sell], cutoff. Signal vs screen: who offers. Hazard: action after contract, IC. End with which FWT assumption failed.'),
  (13, 'externality trap',
       'Taxing the wrong party (producer vs consumer) without checking who generates MD. Setting t = MD at the unregulated q when MD depends on q. 100A: pecuniary externalities (you lost because a price moved) are not inefficiencies in complete competitive markets. Do not Pigou a pecuniary effect.'),
  (14, 'info trap',
       'Calling lemons moral hazard (type vs action). Calling a deductible "adverse selection" without a hidden type. 100A: selection is who buys; hazard is what they do after. Signaling is the informed moving first; screening is the uninformed offering a menu. Mixing the four words is the cheap miss.')
) AS c(pos, front, back)
WHERE d.slug = 'econ100a';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'econ100a';
