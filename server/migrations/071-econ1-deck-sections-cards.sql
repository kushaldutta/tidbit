-- Migration 071: ECON 1 — Introduction to Economics, full deck rebuild.
-- UC Berkeley Fall 2026: James D. Campbell, MoWe 13:00-13:59, Wheeler 150
-- (lecture 001). Survey of micro and macro; credit restriction vs ECON 2.
-- Texts: CORE The Economy + OpenStax Principles (both free). Sequence
-- follows Campbell's usual outline (methodology through trade/Fed).
-- Applications: climate, immigration, healthcare, housing, min wage, trade.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'econ-1');

DELETE FROM public.tidbits
WHERE category_id = 'econ-1';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ-1');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'econ-1');

UPDATE public.decks
SET title = 'ECON 1',
    description = 'Introduction to Economics — Campbell: markets, market failures, and macro',
    cover_emoji = '📈'
WHERE slug = 'econ-1';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('method',      'Economics, Scarcity & Choice',
   'Methodology, opportunity cost, PPF, gains from trade, games', 0),
  ('production',  'Production & Costs',
   'Technology, costs, comparative advantage, automation', 1),
  ('sandd',       'Supply, Demand & Surplus',
   'Competitive markets, equilibrium, consumer and producer surplus', 2),
  ('apps',        'Elasticity, Taxes & Price Controls',
   'Elasticities, tax incidence, ceilings and floors', 3),
  ('power',       'Market Power',
   'Monopoly, price discrimination, oligopoly', 4),
  ('labor',       'Labor Markets',
   'Wages, minimum wage, immigration, discrimination', 5),
  ('failures',    'Information, Insurance & Externalities',
   'Adverse selection, healthcare, environment, Coase', 6),
  ('measure',     'Macro Measurement',
   'GDP, inflation, unemployment, real vs nominal', 7),
  ('fiscal',      'Spending, Multipliers & Fiscal Policy',
   'Aggregate demand, MPC, taxes, stimulus, budgets', 8),
  ('money',       'Money, the Fed & Trade',
   'Banks, monetary policy, comparative advantage, FX', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'econ-1'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Economics, Scarcity & Choice
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'method'
CROSS JOIN (VALUES
  (0,  'ECON 1 (Campbell) in one sentence',
       'A survey of how people choose under scarcity and how the whole economy is measured and steered — graphs and stories, not 100A math. Texts: CORE The Economy and OpenStax Principles (both free). FA26: Jim Campbell, MoWe 1pm, Wheeler 150. Credit restriction: no units after ECON 2.'),
  (1,  'scarcity',
       'Wants exceed available resources, so every choice has a next-best alternative. 1: economics is the study of tradeoffs, not "money." If something is free at the register, it can still be scarce (time, attention, a public good''s congestion).'),
  (2,  'opportunity cost',
       'The value of the best forgone alternative. 1: include explicit money costs and implicit costs (what else that hour or dollar could do). "It was free" is a fail if you sat in line for two hours. Sunk costs are not opportunity costs going forward.'),
  (3,  'sunk cost',
       'A cost already paid that you cannot recover. Rational choice ignores it. 1: "I already bought the ticket so I should go even though I am sick" is the sunk-cost fallacy. Compare only future costs and benefits.'),
  (4,  'positive vs normative',
       'Positive: what is / what would happen (testable). Normative: what should happen (values). 1: "A $15 minimum wage reduces teen employment" is positive. "We should raise it anyway" is normative. Mix them on an exam and you lose the distinction even if both sentences are interesting.'),
  (5,  'models and ceteris paribus',
       'A model is a simplified story with a few moving parts. Ceteris paribus: hold other things fixed. 1: Campbell/CORE care about history and data, but you still need the toy model first. A model that "leaves out the real world" is not automatically wrong — ask whether it answers the question.'),
  (6,  'incentives',
       'People respond to costs and benefits at the margin. 1: a tax, a subsidy, a fine, a grade curve. Unintended consequences: a well-meant rule that changes the payoff and the behavior. "People are greedy" is not the 1 slogan; "people respond to payoffs" is.'),
  (7,  'marginal thinking',
       'Compare extra benefit of one more unit to extra cost. Do it if MB is at least MC. 1: average cost of all units is the wrong comparison. "I already studied 4 hours" does not tell you whether hour 5 is worth it.'),
  (8,  'PPF',
       'Production possibilities frontier: combinations of two goods an economy can produce given resources and technology. Points on the curve are efficient; inside is waste; outside is impossible now. 1: bowing out usually means increasing opportunity cost (resources are not equally good at both goods).'),
  (9,  'gains from trade / specialization',
       'Specialize in comparative advantage, trade, both sides can consume outside their PPF. 1: this is the first "markets can make a bigger pie" result. It does not say the gains are equal or that losers from trade do not exist (later: trade week).'),
  (10, 'absolute vs comparative advantage',
       'Absolute: can produce more with the same inputs. Comparative: lower opportunity cost. 1: you can have absolute advantage in both goods and still gain from trade. The exam trick is computing OC as "what you give up of the other good."'),
  (11, 'game theory (1 level)',
       'Payoff matrix, dominant strategy, Nash equilibrium (each is best-responding). Prisoner''s dilemma: both defect even though both would prefer cooperate/cooperate. 1: oligopoly and climate later reuse this. A Nash is not "the social best."'),
  (12, 'growth and inequality (CORE open)',
       'Long-run living standards rose with technology and institutions; the distribution of those gains is a separate fact. 1: GDP per person is not the same as a typical person''s experience. Campbell wants you to read a chart and say what it does and does not show.'),
  (13, 'method exam move',
       'Name the tradeoff, write the opportunity cost, say positive or normative. If they give two countries and two goods, compute comparative advantage before you talk about "who is better." If they give a 2x2 game, look for dominant strategies, then Nash.'),
  (14, 'method trap',
       'Treating sunk costs as opportunity costs. Confusing absolute and comparative advantage. Calling a value judgment "the economic fact." 1: "efficient" on a PPF is about no waste, not "fair."')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 2. Production & Costs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'production'
CROSS JOIN (VALUES
  (0,  'inputs and technology',
       'Labor, capital, land, and know-how turn into output. Technology is the recipe. 1: a better recipe shifts the PPF out. Automation is a change in the mix of labor and capital, not automatically "no jobs exist" — it changes which jobs and wages (labor week).'),
  (1,  'short run vs long run (firm)',
       'Short run: some input is fixed (usually capital). Long run: all inputs can be chosen. 1: diminishing returns is a short-run story. Scale (IRS/CRS/DRS) is long-run. Do not mix the two graphs.'),
  (2,  'diminishing marginal product',
       'Add more of one input holding others fixed: extra output eventually falls. 1: the 10th cook in a tiny kitchen. This is why MC often rises. It is not "the 10th cook is worse as a person."'),
  (3,  'fixed vs variable cost',
       'FC: paid even at q=0 in the short run (rent). VC: rises with q (materials, hourly labor). TC = FC + VC. 1: shutdown depends on whether price covers AVC, not ATC (sunk FC).'),
  (4,  'ATC, AVC, AFC, MC',
       'Averages: ATC = TC/q, AVC = VC/q, AFC = FC/q (falls as q rises). MC is extra cost of one more unit. 1: MC crosses ATC and AVC at their minima. If MC is below ATC, ATC is still falling.'),
  (5,  'profit vs economic profit',
       'Accounting profit ignores implicit costs. Economic profit subtracts opportunity cost of owner time and capital. 1: zero economic profit is a normal return — the firm is covering its next-best use of resources, not "failing."'),
  (6,  'economies of scale',
       'Long-run ATC falling as scale rises (spreading setup costs, specialization). Diseconomies: ATC rising (coordination). 1: a natural monopoly is a cost story — one firm can serve the market cheaper. Not the same as "they bribed the legislature" (that can also happen).'),
  (7,  'supply from MC (competitive)',
       'A price-taking firm produces where P = MC, if P is at least AVC (short run). The MC curve above AVC is the firm''s supply. 1: this is the micro foundation of the market supply curve. If P is below AVC, produce zero and lose only FC.'),
  (8,  'entry and long-run zero profit',
       'In a competitive industry with free entry, economic profit is competed to zero: P = min ATC. 1: that is why "everyone is getting rich in this market" is not an equilibrium story. Barriers to entry (next section) stop this.'),
  (9,  'comparative advantage as a production story',
       'Different opportunity costs across people or countries come from different technologies or factor mixes. 1: a high-wage country can still import labor-intensive goods. "We are more productive at everything" does not kill trade.'),
  (10, 'automation / AI (Campbell)',
       'A technology shock that substitutes for some tasks and complements others. 1: demand for some skills rises, some falls. "Robots take all jobs" ignores new tasks and income that becomes demand. Still: transition costs and who bears them are real — that is distribution, not a PPF denial.'),
  (11, 'productivity',
       'Output per hour (or per worker). Long-run average wages track productivity more than they track "how hard people try." 1: a productivity increase can be drawn as more output from the same inputs — PPF out, or a lower MC for the same q.'),
  (12, 'production exam move',
       'Label short vs long run. Write TC = FC + VC. For a competitive firm: produce if P is at least AVC, at q where P = MC. Economic profit = TR - TC including implicit costs. If they mention entry, long-run P heads toward min ATC.'),
  (13, 'cost-curve trap',
       'Using ATC as the shutdown test. Saying MC is always above ATC. Treating zero economic profit as "the firm should close." 1: AFC falling does not mean ATC falling if AVC is rising faster.'),
  (14, 'scale trap',
       'Calling diminishing MP "diseconomies of scale." One is short-run, one-input; the other is long-run, all inputs. 1: you can have diminishing MP and still have economies of scale. Mixing them is a free point for the grader.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 3. Supply, Demand & Surplus
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sandd'
CROSS JOIN (VALUES
  (0,  'demand',
       'Willingness to pay at each quantity (or quantity demanded at each price). Downward sloping: substitution and income effects, plus diminishing extra benefit. 1: a change in price is a movement along the curve. Income, tastes, prices of related goods, expectations, number of buyers shift the curve.'),
  (1,  'supply',
       'Willingness to sell / MC of extra units. Usually upward sloping. 1: input prices, technology, number of sellers, expectations, prices of alternative outputs shift supply. A price change is a movement along, not a "supply increase."'),
  (2,  'equilibrium',
       'Price where Qd = Qs. Surplus (excess supply) if P is too high; shortage if too low. 1: in a competitive market the price adjusts. "There is a shortage so demand rose" is sloppy — a shortage is a price stuck below equilibrium (often a control).'),
  (3,  'shifters vs movement along',
       'If the story is "the good got more expensive," quantity demanded falls — along D. If "income rose" (normal good), D shifts right, then P and Q both tend to rise. 1: always say which curve moved, then the new equilibrium. Two curves moving: P or Q can be ambiguous — say so.'),
  (4,  'substitutes and complements',
       'Substitutes: P of A up, demand for B up (tea and coffee). Complements: P of A up, demand for B down (phones and apps). 1: this is a demand shifter. On the supply side, two goods in production can be substitutes in production or joint products — different story.'),
  (5,  'normal vs inferior goods',
       'Normal: income up, demand up. Inferior: income up, demand down (instant noodles for some people). 1: inferior is not "bad quality" as a moral claim; it is an income-demand relationship. A recession can raise demand for inferior goods.'),
  (6,  'consumer surplus',
       'Willingness to pay minus price actually paid, area under D above P, out to Q. 1: a lower price raises CS two ways: old buyers pay less, new buyers enter. Graph it; do not invent a formula they did not give.'),
  (7,  'producer surplus',
       'Price received minus willingness to sell (MC), area above S below P, out to Q. 1: not the same as accounting profit (no FC in the usual surplus triangle). A higher P raises PS for old units and new units.'),
  (8,  'total surplus and efficiency',
       'CS + PS (plus tax revenue if any). Competitive equilibrium maximizes it in the standard model with no externalities. 1: "efficient" here means no deadweight loss from the wrong quantity, not "everyone likes the outcome." Equity is a different axis.'),
  (9,  'deadweight loss',
       'Lost total surplus from not producing units where MB is still above MC (or producing units where MC is above MB). 1: taxes, price controls, monopoly all create DWL in the usual graphs. Size grows with the wedge and with how elastic the curves are.'),
  (10, 'who the market is for',
       'A demand curve is for a defined good, time, and place. Housing in Berkeley is not housing in the US. 1: Campbell applications (housing, healthcare) fail if you draw a national D and a local policy. Name the market before you shift it.'),
  (11, 'competitive market assumptions',
       'Many buyers and sellers, price taking, a fairly uniform product, reasonably free entry (for the long-run story). 1: if those fail, you still use S and D as a baseline, then add market power or externalities. Do not say "supply and demand is fake" — say which assumption broke.'),
  (12, 'S and D exam move',
       'Draw P on the vertical, Q horizontal. Identify the shifter in words, move one curve, mark old and new P and Q. Then CS/PS if they ask welfare. If two shocks, report what is sure and what is ambiguous.'),
  (13, 'S and D trap',
       'Saying "supply increased" when they mean quantity supplied rose because P rose. Drawing a shortage at a free-market equilibrium. 1: equilibrium is not a shortage. Also: a demand increase raises P and Q; a supply increase lowers P and raises Q — mix the P movement and you reversed a curve.'),
  (14, 'welfare trap',
       'Maximizing CS alone (consumers "win") and calling it efficient. Ignoring that a transfer from PS to CS can leave total surplus the same. 1: a price drop from a supply increase can raise both CS and PS; a price drop from a ceiling usually does not.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 4. Elasticity, Taxes & Price Controls
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'apps'
CROSS JOIN (VALUES
  (0,  'price elasticity of demand',
       '| percent change in Qd / percent change in P |. Elastic: bigger than 1 (quantity responds a lot). Inelastic: less than 1. 1: more substitutes, luxuries, long run, a narrow market definition — more elastic. Insulin is inelastic; a particular brand of cereal is elastic.'),
  (1,  'revenue and elasticity',
       'If demand is elastic, a price cut raises revenue (Q rises more than P falls). Inelastic: a price cut lowers revenue. 1: TR = P times Q. Midpoint or whatever formula they taught — use it consistently. Unit elastic: TR stays put for a small P change.'),
  (2,  'price elasticity of supply',
       'How much Qs responds to P. More elastic when firms can expand easily (spare capacity, long run, mobile inputs). 1: housing supply in a year vs a decade is the classic. Inelastic supply: P does most of the adjusting when demand shifts.'),
  (3,  'income and cross-price elasticity',
       'Income elasticity: positive for normal, negative for inferior. Cross-price: positive for substitutes, negative for complements. 1: these are shifters'' quantitative cousins. Sign first, then magnitude if they give numbers.'),
  (4,  'tax wedge',
       'A per-unit tax drives a wedge between the price buyers pay and sellers receive. Q falls. 1: it does not matter for incidence whether the statute says "buyer pays" or "seller pays" — the relative elasticities do. Draw the vertical wedge.'),
  (5,  'tax incidence',
       'Who really pays: the side that is more inelastic bears more of the tax. 1: inelastic demand (cigarettes, short-run gas) — buyers eat it. Inelastic supply (unique land) — sellers/landowners eat it. Statutory incidence is a political sentence, not the graph.'),
  (6,  'tax revenue and DWL',
       'Revenue is the rectangle (tax per unit times new Q). DWL is the missing triangle of trades. 1: more elastic curves, bigger DWL for the same tax. A tiny tax on a very inelastic good raises revenue with little DWL — that is why "sin taxes" and land taxes get theoretically loved.'),
  (7,  'subsidy',
       'A per-unit subsidy is a negative tax: wedge the other way, Q rises, DWL from overproduction (unless there is an externality). 1: incidence still follows elasticities. "The government pays so it is free" ignores the taxpayer and the extra units that cost more than they are worth.'),
  (8,  'price ceiling',
       'Legal max P (rent control). Binding if below equilibrium: shortage, queues, quality drop, black markets, misallocation. 1: CS of lucky tenants can rise; PS falls; DWL. "Rent control helps all renters" ignores the people who cannot find a unit.'),
  (9,  'price floor',
       'Legal min P (some agricultural supports; min wage is a floor in the labor market). Binding if above equilibrium: surplus. 1: who gets the extra P and who is rationed out matters. In labor: unemployment of the surplus workers (next section).'),
  (10, 'quotas and licenses',
       'A quantity cap (taxi medallions, some imports). Price rises, Q falls, DWL, rents to license holders. 1: like a tax but the wedge often becomes a private rent, not government revenue. That is why incumbents like them.'),
  (11, 'housing application',
       'Demand: income, population, rates, amenities. Supply: land, regulation, construction costs, time to build. 1: a demand boom with inelastic short-run supply mostly raises prices. A ceiling then creates a shortage. Building more is a supply shift — say which curve you moved.'),
  (12, 'apps exam move',
       'Elasticity: write the ratio and the more-than-1 / less-than-1 cutoff. Tax: wedge, new Q, buyer price vs seller price, who is inelastic, revenue rectangle, DWL triangle. Control: binding or not, shortage or surplus, then a quality/rationing sentence.'),
  (13, 'elasticity trap',
       'Using slope as elasticity (units matter; elasticity is percents). Saying "steep is inelastic" without checking the axes. 1: a linear demand is elastic at high P and inelastic at low P. One slope, two elasticities.'),
  (14, 'incidence trap',
       'Assigning the whole tax to whoever writes the check. Claiming a ceiling "lowers prices with no other effects." 1: if they give perfectly inelastic demand, buyers pay the whole tax and Q does not fall — DWL is zero in that extreme. Mention the extreme if they draw it.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 5. Market Power
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'power'
CROSS JOIN (VALUES
  (0,  'market power',
       'Ability to set P above MC without losing all customers. Comes from few rivals, differentiated products, barriers (patents, scale, network effects, regulation). 1: a price taker has a horizontal demand at market P. A monopolist faces the market demand curve.'),
  (1,  'monopoly output',
       'MR = MC, then read P off demand (not off MR). MR is below P because to sell more you cut price on all units (single-price). 1: Q is too low vs competitive, P too high, DWL. Markup is larger when demand is less elastic.'),
  (2,  'MR and the demand curve',
       'For linear demand, MR has the same intercept and twice the slope (same Q-axis intercept at half). 1: never produce where MR is negative if MC is nonnegative — that is the inelastic part of demand. TR is maximized at MR = 0, not a profit max unless MC is 0.'),
  (3,  'barriers to entry',
       'Legal (patent, license), cost (natural monopoly), strategic (sunk advertising), network. 1: without a barrier, profit invites entry and power erodes. "They are big" is not by itself a barrier. Natural monopoly: ATC still falling at market Q.'),
  (4,  'natural monopoly regulation',
       'P = MC may not cover ATC (losses). Average-cost pricing: P = ATC, zero economic profit, still some DWL vs MC pricing. 1: subsidies or two-part tariffs are the textbook patches. Unregulated monopoly: even higher P, more DWL.'),
  (5,  'price discrimination',
       'Charge different prices to different people or units, not explained by cost. Needs market power, some ability to sort, and limited resale. 1: perfect PD can produce the efficient Q (no DWL) but transfers CS to the firm. Student discounts and airline yield management are imperfect PD.'),
  (6,  'oligopoly',
       'Few firms, each watching the others. Outcomes between monopoly and competition. 1: collusion / cartel tries to mimic monopoly but has a cheating incentive (prisoner''s dilemma). Antitrust exists because the joint incentive is not the social one.'),
  (7,  'Nash in a pricing / quantity game',
       'Each firm''s best response given the other. 1: in a simple prisoner''s dilemma price-cut game, Nash is both cut even though both prefer both high. Repeated games can sustain cooperation — 1 usually just wants you to name the tension, not folk theorems.'),
  (8,  'monopolistic competition (light)',
       'Many firms, differentiated products, free entry. Long-run: zero economic profit but P above MC (excess capacity). 1: restaurants, clothes brands. Not a monopoly; not perfect competition. Variety is the usual social plus against the markup minus.'),
  (9,  'antitrust idea',
       'Rules against cartels, some mergers, exclusionary conduct. 1: the goal in the standard story is protecting competition (lower P, higher Q), not protecting a particular competitor. A firm that wins with a better product is not automatically illegal.'),
  (10,  'innovation tradeoff',
       'Patents create temporary monopoly to reward R&D. 1: too little protection, too little invention; too much, high P and blocking. Campbell/CORE like this as a "markets plus institutions" point, not "monopoly is always bad."'),
  (11,  'welfare vs "high profits"',
       'High accounting profit can be a barrier-to-entry rent or a return to a scarce talent / past innovation. 1: the DWL is from Q too low, not from the existence of a rich owner. Taxing profits is a different policy than forcing P = MC.'),
  (12,  'power exam move',
       'Draw D, MR, MC (and ATC if profit). Mark MR = MC, go up to D for P. Shade profit (P - ATC) times Q and DWL vs competitive Q. If PD, say what extra Q is sold and whether CS is extracted. If oligopoly, write the dilemma: cooperate vs cheat.'),
  (13,  'monopoly trap',
       'Setting P = MC for a monopolist. Reading P off the MR curve. Saying monopoly always has positive economic profit (not if ATC is high). 1: a monopolist can lose money. Power is about the demand they face, not a guaranteed gold mine.'),
  (14,  'PD trap',
       'Calling a cost-based quantity discount "price discrimination" without a sorting story. Claiming PD is always worse for consumers (some get a lower P they would not have been offered). 1: without preventing resale, PD collapses to one price.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 6. Labor Markets
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'labor'
CROSS JOIN (VALUES
  (0,  'labor demand',
       'Firms hire until the extra revenue from a worker (MRP) meets the wage. Derived demand: it comes from demand for the product and from productivity. 1: a product-demand boom or a productivity rise shifts labor demand right. Automation can shift it left for a task.'),
  (1,  'labor supply',
       'Workers trade off leisure and consumption; reservation wages differ. Market supply usually slopes up. 1: immigration, demographics, other wages, and nonwage conditions (safety, hours) shift supply. A wage change is a movement along if those stay fixed.'),
  (2,  'equilibrium wage',
       'Competitive labor market: wage where labor D = S. 1: "the wage is unfair" is normative. "The wage is below MRP because of monopsony or bargaining" is a model. Compensating differentials: worse jobs pay more, other things equal.'),
  (3,  'human capital',
       'Education and training raise productivity, so they can raise wages. 1: signaling (a degree mainly sorts talent) is the competing story. Both can be true in parts. Campbell/CORE: education also has insurance, matching, and inequality angles.'),
  (4,  'minimum wage as a floor',
       'Binding floor: wage up for those who keep jobs, employment down in the simple competitive graph (surplus of labor). 1: size of the job loss depends on elasticity of labor demand. If demand is inelastic, small employment effect, bigger income transfer to workers who stay.'),
  (5,  'monopsony (light)',
       'A single or dominant employer faces an upward-sloping labor supply: to hire more, raise the wage for all. Then a min wage can raise both W and employment (classic exception). 1: do not lead with monopsony unless they hint at a company town or thin market. It is the "it depends" graph.'),
  (6,  'immigration',
       'Labor supply shift in the receiving market; also demand if immigrants buy goods. 1: native wages in competing occupations can fall, complementary jobs can gain, and consumers get lower prices. Distributional: some natives lose even if GDP rises. Say the market (skill, place).'),
  (7,  'discrimination',
       'Pay or hiring gaps not explained by productivity. Taste-based: employer/customer prejudice (costly to the discriminator in competitive models). Statistical: using a group average as a signal. 1: a raw wage gap is not automatically discrimination — occupation, hours, and human capital also sit in the gap. Policy still cares about the unexplained part.'),
  (8,  'unions and bargaining',
       'Collective bargaining can raise wages for members, possibly reduce employment in the competitive graph, or counter monopsony. 1: like market power on the seller side of labor. Effects depend on the alternative (competitive vs concentrated employers).'),
  (9,  'compensating differentials',
       'Risk, night shifts, unpleasant work: higher pay, other things equal. 1: if two jobs pay the same but one is worse, people will leave until pay or conditions adjust. Observed gaps mix this with barriers and discrimination — do not pick only one story without a hint.'),
  (10, 'superstar / inequality in pay',
       'Technology and global markets can make small talent differences into large income differences (winner-take-most). 1: this is a demand-for-talent story, not "effort scaled linearly." CORE emphasizes institutions and bargaining too, not only this.'),
  (11, 'firm-specific vs general skills',
       'General skills raise your wage at many firms; specific skills raise productivity here. 1: who pays for training depends on who captures the return. Poaching is the general-skill problem. A reason some firms underinvest in training.'),
  (12, 'labor exam move',
       'Draw labor D and S, wage on the vertical. Min wage: horizontal floor, mark employment vs unemployment (gap between S and D at the floor) in the competitive case. Immigration: S shift, then a sentence on who gains. If they say one employer, consider monopsony.'),
  (13, 'min-wage trap',
       'Claiming a min wage always costs jobs as a law of nature (elasticity and monopsony). Claiming it never costs jobs because you like the policy. 1: state the graph you are using. Empirics can go either way by market; the exam still wants the competitive diagram unless they change the setup.'),
  (14, 'gap trap',
       'Reading a male-female or native-immigrant average wage difference as 100% discrimination or 100% productivity. 1: decompose in words: hours, occupation, experience, then unexplained. Campbell wants the careful sentence, not a culture-war slogan.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 7. Information, Insurance & Externalities
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'failures'
CROSS JOIN (VALUES
  (0,  'asymmetric information',
       'One side knows more. 1: used cars, insurance, labor, healthcare. Markets can unravel or get the wrong mix of types. Not every information gap is a failure — prices also convey information (Hayek energy, light).'),
  (1,  'adverse selection',
       'Hidden type: the people most likely to need insurance are most likely to buy it, so premiums rise and healthier people drop out. 1: Akerlof lemons: sellers of bad cars stay, buyers expect lemons, prices fall. Mandates, subsidies, and underwriting are patches. Pre-existing condition rules interact with this.'),
  (2,  'moral hazard',
       'Hidden action: once insured, you take more risk or use more care. 1: copays, deductibles, monitoring. Not "people are evil" — incentives changed. Distinct from adverse selection (type vs action). Exams love mixing the two names.'),
  (3,  'healthcare as an Econ 1 application',
       'Demand is inelastic when sick; third-party payment; asymmetric info between patient, doctor, insurer. 1: more insurance can raise use (moral hazard) and premiums (selection). "Healthcare should be free" skips scarcity of doctors and machines. "Leave it to the market" skips selection and equity.'),
  (4,  'insurance math (1 level)',
       'A fair premium equals expected payout. Risk-averse people pay more than expected loss for peace of mind. 1: diversification across many independent risks is why insurance can exist. If risks are correlated (pandemic, flood in one coast), private insurance struggles — that is a correlation problem.'),
  (5,  'principal-agent',
       'Principal wants an outcome; agent takes the action. 1: shareholders vs managers, patients vs doctors, voters vs politicians. Incentive pay, monitoring, reputation. Education and contracts week in Campbell''s outline lives here.'),
  (6,  'externality',
       'A cost or benefit of an action that falls on someone outside the market transaction. Negative: too much Q (pollution). Positive: too little Q (vaccines, some R&D). 1: the private MC or MB curve is the wrong one. Social MC = private MC plus external cost.'),
  (7,  'Pigouvian tax / subsidy',
       'Tax equal to the external marginal cost (or subsidy for external benefit) to align private and social. 1: if you get the number right, Q goes to the efficient level and DWL from the externality shrinks. Incidence still depends on elasticities. Not a "punishment" story — a price of the missing cost.'),
  (8,  'Coase theorem (1 level)',
       'If property rights are clear and bargaining is cheap, parties can trade to the efficient outcome regardless of who has the right (the distribution of surplus changes). 1: real climate and neighbor disputes have many parties and high transaction costs, so Coase is a benchmark, not a "do nothing" slogan.'),
  (9,  'public goods',
       'Nonrival and nonexcludable: one person''s use does not leave less, and you cannot cheaply keep nonpayers out. 1: free-rider problem, underprovision if left to voluntary pay. Distinct from a common resource (rival but nonexcludable: fisheries — too much use).'),
  (10, 'common resources / tragedy',
       'Rival + hard to exclude: each user ignores the cost to others, overuse. 1: quotas, property rights, community rules (Ostrom), not only "privatize or collapse." Climate has public-good and common-resource pieces depending on the frame.'),
  (11, 'climate as externality',
       'GHG: global negative externality, damages in the future, free-rider countries. 1: a carbon price is the Pigou tool; standards and subsidies are other tools with different incidence. "If it is a problem, ban it" vs "price it" is the Econ 1 fork. Uncertainty about damages does not make the externality vanish.'),
  (12, 'failures exam move',
       'Name the missing information or the missing price. Selection vs hazard: type vs action. Externality: draw MSC vs MPC (or MSB vs MPB), mark market Q vs efficient Q, then tax/subsidy/Coase/quantity rule. Say who has the right in Coase.'),
  (13, 'info trap',
       'Calling every insurance problem moral hazard. Calling a lemon market "externality." 1: lemons are selection (quality is a type). Pollution is an externality (a missing price). You can have both in healthcare. Use the word that matches the mechanism.'),
  (14, 'externality trap',
       'Taxing production when the externality is on consumption, or vice versa, without thinking who generates the harm. Claiming Coase means "courts are unnecessary." 1: if bargaining is impossible, you need a tax, a standard, or a right plus enforcement. Also: not every side effect is an externality economists would tax (pecuniary: you lost because a price moved).')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 8. Macro Measurement
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'measure'
CROSS JOIN (VALUES
  (0,  'GDP',
       'Market value of final goods and services produced in a country in a period. 1: C + I + G + NX (expenditure). Also income and production sides in principle. Intermediate goods are not counted separately. A used-car sale is not this year''s production (the dealer margin might be).'),
  (1,  'what GDP misses',
       'Home production, black markets, environment, leisure, inequality, health. 1: GDP is a production/income meter, not "happiness" or "welfare." Campbell lists happiness next to unemployment on purpose — do not treat GDP as the goal of policy by itself.'),
  (2,  'real vs nominal',
       'Nominal: current prices. Real: chain or base-year prices to isolate quantity. 1: growth in nominal GDP can be inflation. Always use real for "did we produce more." Per person: divide by population before you brag about a big country.'),
  (3,  'GDP deflator and CPI',
       'Deflator: prices of what is produced (including exports, excluding imports). CPI: prices of a consumer basket (including imports, excluding exports, with housing weight). 1: they can diverge. Inflation is the percent change in a price index, not the level of the index.'),
  (4,  'inflation',
       'Sustained rise in the general price level. 1: not a one-good spike. Winners and losers: borrowers vs lenders if inflation is unexpected (real interest = i minus inflation). Menu costs, shoe-leather, confusion — the usual costs. Deflation has its own debt-burden story.'),
  (5,  'indexing and real variables',
       'Real wage = nominal wage / price level. Real interest ≈ i - inflation. 1: a 4% raise with 5% inflation is a real pay cut. COLAs try to index. If you forget to real-ify, you will call a nominal boom "growth."'),
  (6,  'unemployment rate',
       'Unemployed / labor force. Labor force = employed + unemployed (actively looking). 1: a discouraged worker who quit looking is out of the labor force, so the rate can fall for a bad reason. U-6 and participation exist because the headline rate is narrow.'),
  (7,  'types of unemployment',
       'Frictional: matching. Structural: skills/location/institutions mismatch. Cyclical: shortfall of demand in a slump. 1: the natural rate is frictional + structural. Policy that "sets unemployment to zero" is not a 1 goal; frictional is part of a working labor market.'),
  (8,  'labor force participation',
       'Labor force / working-age population. 1: aging, school, caregiving, disability, and boom/bust all move it. Comparing unemployment across decades without participation is incomplete. A recession can lower participation and hide pain.'),
  (9,  'Okun (light)',
       'When output is below potential, unemployment tends to be above the natural rate. 1: GDP and unemployment move together over the cycle, not dollar-for-dollar in a way you must memorize, but "recession means fewer jobs" is the link to the next section.'),
  (10, 'potential vs actual GDP',
       'Potential: normal-capacity output. Gap: actual minus potential. 1: a negative gap is slack (cyclical unemployment). A positive gap can mean overheating and inflation pressure. Potential grows with labor, capital, and technology (later growth).'),
  (11, 'happiness / beyond GDP (Campbell)',
       'Surveys of life satisfaction, health, environment, inequality. 1: they can move with income at low levels and flatten. Use them as a complement. "GDP is useless" is as wrong as "GDP is all that matters."'),
  (12, 'measure exam move',
       'Write the GDP identity. Say final vs intermediate. Convert nominal to real if prices changed. Unemployment: name the denominator (labor force) and whether someone is discouraged. Inflation: percent change in the index they named (CPI vs deflator).'),
  (13, 'GDP trap',
       'Counting a used good as GDP. Counting transfer payments as G (they are not purchases of goods). Adding intermediate + final. 1: G is government purchases, not the whole budget. NX can be negative; GDP can still be large.'),
  (14, 'unemployment trap',
       'Treating everyone without a job as unemployed. Saying the unemployment rate is the fraction of the population without work. 1: kids, retirees, full-time students not looking are not unemployed. A falling rate plus falling participation is not automatically a healthy labor market.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 9. Spending, Multipliers & Fiscal Policy
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'fiscal'
CROSS JOIN (VALUES
  (0,  'aggregate demand idea',
       'Spending on domestic output: C + I + G + NX. 1: in a slump, demand can be below potential; output and jobs fall. This is the Keynesian 1 story. Classical long-run: demand mostly moves prices, not long-run real output. Say which run they asked.'),
  (1,  'consumption and MPC',
       'MPC = extra consumption from an extra dollar of disposable income, between 0 and 1. MPS = 1 - MPC. 1: C depends on income, wealth, rates, confidence. A tax cut raises disposable income; how much C moves is an MPC question (and who gets the cut).'),
  (2,  'the multiplier',
       '1 / (1 - MPC) in the simplest closed economy with no taxes. A $1 extra G (or I) raises Y by more than $1 as people respent. 1: taxes, imports, and inflation leak — real-world multipliers are smaller and disputed. Still: the qualitative "rounds of spending" is the exam story.'),
  (3,  'investment',
       'Business capital, residential, inventories — not buying stocks. Sensitive to interest rates, expected profits, and animal spirits. 1: I is volatile; that is a lot of the cycle. A rate hike that chills I is a monetary-transmission preview.'),
  (4,  'government purchases vs transfers',
       'G in GDP is purchases (tanks, teacher salaries). Transfers (Social Security, unemployment insurance) are not G; they show up when recipients consume. 1: a stimulus check is not G. Automatic stabilizers: UI and a progressive tax rise/fall with Y without a new vote.'),
  (5,  'fiscal expansion',
       'Raise G or cut taxes (or raise transfers) to lift demand in a slump. 1: works better when there is slack and rates are not already offsetting. Crowding out: extra G can raise rates and reduce I if the economy is at capacity or the Fed does not accommodate.'),
  (6,  'tax multiplier vs G multiplier',
       'A $1 G increase typically moves Y more than a $1 tax cut in the simple Keynesian model, because some of the tax cut is saved. 1: if they give MPC, write both. Targeted cuts to high-MPC households (liquidity-constrained) look more like G. Timing and credibility matter off the toy model.'),
  (7,  'budget deficit and debt',
       'Deficit: G + transfers - tax revenue, a flow. Debt: stock of past borrowing. 1: a deficit in a recession can be good stabilization. Debt/GDP is the usual burden metric. "Always balance the budget" fights the automatic stabilizers. "Deficits never matter" ignores rates and who owns the debt.'),
  (8,  'crowding out',
       'Full employment: extra G competes for resources, P and/or i rise, I (and maybe NX via the dollar) fall. 1: in a deep slump with rates at the floor, crowding out is weaker — the 2008–09 / COVID argument. State the slack assumption.'),
  (9,  'supply-side vs demand-side fiscal',
       'Demand: short-run Y via spending. Supply: incentives for work, investment, productivity (tax structure, infrastructure) — slow. 1: a tax cut can be both. Do not call every tax cut "supply-side growth" in a recession homework problem that is clearly about AD.'),
  (10, 'inflation-unemployment (short run)',
       'A demand boom can raise Y and P (or raise inflation) and lower cyclical unemployment. A bust the reverse. 1: this is the short-run Phillips / AD-AS energy without requiring a full 100B graph. Long run: you cannot buy a permanently lower U with permanently higher inflation (expectations).'),
  (11, 'AD-AS in words',
       'AD slopes down (real balances, rates, NX). SRAS: sticky wages/prices, so P and Y both move in the short run. LRAS: vertical at potential. 1: a demand shock moves along SRAS; a supply shock (oil, pandemic) shifts SRAS — stagflation is the nasty case (P up, Y down).'),
  (12, 'fiscal exam move',
       'Identify slack or not. Write C + I + G + NX. If they give MPC, compute the simple multiplier and the change in Y. Separate G from transfers. Mention automatic stabilizers. If at potential, add crowding out. If they say "tax cut," ask MPC and who receives it.'),
  (13, 'multiplier trap',
       'Using 1/(1-MPC) when they also have a tax rate or imports (then the multiplier is smaller). Treating stock-market investing as I. 1: also, the multiplier is a demand-side short-run tool, not a license to ignore inflation when Y is above potential.'),
  (14, 'deficit trap',
       'Calling the debt "we owe it to ourselves" as if the distribution (who holds bonds, future taxes) did not matter. Calling a cyclically large deficit proof of a spendthrift government without looking at the gap. 1: look at the unemployment rate next to the deficit.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

-- =====================================================================
-- 10. Money, the Fed & Trade
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'money'
CROSS JOIN (VALUES
  (0,  'what money is',
       'A medium of exchange, unit of account, store of value. 1: not the same as income or wealth. Bank deposits are money for most of us. Bitcoin as money is a 1 debate about those three functions, not a morality play.'),
  (1,  'banks and fractional reserves',
       'Banks take deposits, keep a fraction as reserves, lend the rest. Lending creates deposits. 1: this is how the money supply can expand. A bank run: everyone wants cash at once — deposit insurance and a lender of last resort exist because of this.'),
  (2,  'the Fed',
       'US central bank: interest-rate policy, lender of last resort, some regulation, inflation and (dual mandate) employment. 1: it does not set market prices of apples. Tools: policy rate, balance sheet (QE), forward guidance. Independence is the "not an election-year printing press" story.'),
  (3,  'monetary expansion',
       'Lower rates: I and durables and housing up, maybe a weaker dollar and more NX, asset prices up. 1: lags are long and variable. If the problem is a supply shock, easy money mostly raises P. In a liquidity trap, rate cuts do little — fiscal may carry more (last section).'),
  (4,  'inflation as too much money (long run)',
       'Sustained inflation is a monetary phenomenon in the long-run quantity story: more money chasing output that is pinned by real factors. 1: short run is messier (oil, bottlenecks). Hyperinflation: the fiscal need to print. Do not blame "greed" as a theory of the price level.'),
  (5,  'real vs nominal interest',
       'Fisher: i ≈ r + expected inflation. The Fed sets a nominal policy rate; the real rate is what moves spending. 1: if inflation expectations jump, the same i is a lower r (easier). That is why the Fed talks about real rates and inflation expectations.'),
  (6,  'financial crisis (1 level)',
       'Leverage, falling asset prices, bank/intermediary failure, credit freeze, spending collapse. 1: 2008 is the application. Policy: backstop banks, ease money, fiscal. Moral hazard: bailouts change future risk-taking. Campbell lists crises next to finance on purpose.'),
  (7,  'gains from international trade',
       'Same comparative-advantage logic as two people. 1: winners: consumers of imports, exporters, users of cheap inputs. Losers: import-competing workers and owners. A tariff helps the protected industry, hurts buyers, and creates DWL plus foreign retaliation risk.'),
  (8,  'tariffs and quotas',
       'Tariff: tax on imports, raises domestic P, cuts imports, DWL, some government revenue. Quota: similar wedge, rents often to license holders. 1: "protect jobs" is a concentrated benefit vs a diffuse consumer cost. Infant-industry is the theoretical exception — 1 wants skepticism plus a sunset story.'),
  (9,  'exchange rates',
       'Price of one currency in another. Depreciation of the dollar: US goods cheaper to foreigners, imports dearer — NX tends to rise, other things equal. 1: rates also move with interest differentials and risk. A "strong dollar" is not a moral good; it is a relative price.'),
  (10, 'open-economy link to macro',
       'Higher domestic i: capital inflows, dollar up, NX down — extra crowding out via trade. 1: this is why fiscal/monetary mix matters in an open economy. A global slump: NX can fall because foreigners buy less, even if you did nothing.'),
  (11, 'trade agreements and politics',
       'Lowering barriers is a bargain across sectors and countries. 1: economists usually like the efficiency; politics is about compensation for losers (Trade Adjustment, training) that often does not show up. Campbell''s "talking to humans" week: do not lead with "you are stupid for opposing NAFTA."'),
  (12, 'money-and-trade exam move',
       'Money: name the function, then deposits vs cash, then the Fed''s rate channel. Crisis: leverage plus a run. Trade: compute comparative advantage, then tariff graph (P up, Q imports down, DWL). FX: depreciation raises NX in the standard story. Say ceteris paribus.'),
  (13, 'money trap',
       'The Fed "prints money" as the only description of modern policy (it sets a rate and pays interest on reserves). Calling a bank''s capital the same as reserves. 1: printing cash in a hyperinflation story is different from 2020 QE. Match the decade they are in.'),
  (14, 'trade trap',
       'Bilateral "trade deficit with country X" as a scoreboard loss. Exports good, imports bad. 1: the trade balance is also saving minus investment. A deficit can mean strong investment, not "we are losing." Tariffs on inputs raise costs for downstream US jobs.')
) AS c(pos, front, back)
WHERE d.slug = 'econ-1';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'econ-1';
